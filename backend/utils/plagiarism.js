import { pool } from '../db/index.js';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { compareTwoStrings } from 'string-similarity';
import * as mammoth from 'mammoth';

const execAsync = promisify(exec);

/**
 * Extract text content from a file based on its MIME type
 * @param {string} filePath - Path to the file
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} - Extracted text content
 */
async function extractTextFromFile(filePath, mimeType) {
  try {
    if (mimeType === 'text/plain' || mimeType?.startsWith('text/')) {
      return fs.readFileSync(filePath, 'utf8');
    } else if (mimeType === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // DOCX
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else {
      // For other types, try to read as text or return empty
      try {
        return fs.readFileSync(filePath, 'utf8');
      } catch {
        return '';
      }
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    return '';
  }
}

/**
 * Run plagiarism check for file assignments using text similarity
 * @param {number} assignmentId - The assignment ID
 * @returns {Promise<Object>} - The check result
 */
export async function runFilePlagiarismCheck(assignmentId) {
  try {
    // Get all file submissions for this assignment
    const submissionsQuery = `
      SELECT sf.id as file_id, sf.storage_path, sf.filename, sf.mime_type,
             u.name as student_name, u.roll_number, ass.id as submission_id
      FROM submission_files sf
      JOIN assignment_submissions ass ON sf.submission_id = ass.id
      JOIN users u ON ass.student_id = u.id
      WHERE ass.assignment_id = $1 AND sf.storage_path IS NOT NULL
      ORDER BY ass.submitted_at
    `;
    const submissionsResult = await pool.query(submissionsQuery, [assignmentId]);

    if (submissionsResult.rows.length < 2) {
      return { status: 'insufficient_submissions', message: 'Need at least 2 submissions to check plagiarism' };
    }

    // Extract text from all files
    const texts = [];
    for (const submission of submissionsResult.rows) {
      let text = '';
      if (submission.storage_path.startsWith('http')) {
        // For now, skip URL files
        continue;
      } else {
        // Assume local file path
        const filePath = path.join(process.cwd(), 'uploads', submission.filename); // Adjust path as needed
        if (fs.existsSync(filePath)) {
          text = await extractTextFromFile(filePath, submission.mime_type);
        }
      }
      texts.push({
        submission,
        text: text || ''
      });
    }

    if (texts.length < 2) {
      return { status: 'insufficient_text', message: 'Not enough text content to compare' };
    }

    // Compare all pairs and find similarities
    const matches = [];
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const similarity = compareTwoStrings(texts[i].text, texts[j].text);
        if (similarity > 0.1) { // Threshold for similarity
          matches.push({
            submission1_id: texts[i].submission.submission_id,
            submission2_id: texts[j].submission.submission_id,
            similarity_percentage: Math.round(similarity * 100),
            match_details: { method: 'text_similarity' }
          });
        }
      }
    }

    // Save the check result
    const insertCheckQuery = `
      INSERT INTO plagiarism_checks (assignment_id, status)
      VALUES ($1, 'completed')
      RETURNING id
    `;
    const checkResult = await pool.query(insertCheckQuery, [assignmentId]);
    const checkId = checkResult.rows[0].id;

    // Save matches
    for (const match of matches) {
      await pool.query(
        `INSERT INTO plagiarism_matches (check_id, submission1_id, submission2_id, similarity_percentage, match_details)
         VALUES ($1, $2, $3, $4, $5)`,
        [checkId, match.submission1_id, match.submission2_id, match.similarity_percentage, JSON.stringify(match.match_details)]
      );
    }

    return {
      status: 'completed',
      checkId,
      matchesFound: matches.length,
      submissionsChecked: texts.length
    };

  } catch (error) {
    console.error('Error running file plagiarism check:', error);

    await pool.query(
      `INSERT INTO plagiarism_checks (assignment_id, status) VALUES ($1, 'failed')`,
      [assignmentId]
    );

    return { status: 'failed', error: error.message };
  }
}

/**
 * Run plagiarism check for an assignment (code or file)
 * @param {number} assignmentId - The assignment ID
 * @returns {Promise<Object>} - The check result
 */
export async function runPlagiarismCheck(assignmentId) {
  // Get assignment type
  const assignmentQuery = `SELECT assignment_type FROM assignments WHERE id = $1`;
  const assignmentResult = await pool.query(assignmentQuery, [assignmentId]);
  if (assignmentResult.rowCount === 0) {
    throw new Error('Assignment not found');
  }

  const assignmentType = assignmentResult.rows[0].assignment_type;

  if (assignmentType === 'code') {
    return runCodePlagiarismCheck(assignmentId);
  } else if (assignmentType === 'file') {
    return runFilePlagiarismCheck(assignmentId);
  } else {
    return { status: 'unsupported', message: `Plagiarism checking not supported for assignment type: ${assignmentType}` };
  }
}

/**
 * Run plagiarism check using Moss for all code submissions in an assignment
 * @param {number} assignmentId - The assignment ID
 * @returns {Promise<Object>} - The check result with report URL
 */
async function runCodePlagiarismCheck(assignmentId) {
  try {
    // Get all code submissions for this assignment
    const submissionsQuery = `
      SELECT cs.id, cs.code, cs.language, u.name as student_name, u.roll_number
      FROM code_submissions cs
      JOIN assignment_submissions ass ON cs.submission_id = ass.id
      JOIN users u ON ass.student_id = u.id
      WHERE ass.assignment_id = $1 AND cs.code IS NOT NULL AND cs.code != ''
      ORDER BY ass.submitted_at
    `;
    const submissionsResult = await pool.query(submissionsQuery, [assignmentId]);

    if (submissionsResult.rows.length < 2) {
      // Not enough submissions to check
      return { status: 'insufficient_submissions', message: 'Need at least 2 submissions to check plagiarism' };
    }

    // Create temporary directory for files
    const tempDir = path.join(process.cwd(), 'temp_plagiarism', `assignment_${assignmentId}_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const filePaths = [];
    const language = submissionsResult.rows[0].language || 'c'; // Assume same language

    // Write each submission to a file
    for (const submission of submissionsResult.rows) {
      const filename = `${submission.student_name.replace(/[^a-zA-Z0-9]/g, '_')}_${submission.roll_number || submission.id}.txt`;
      const filePath = path.join(tempDir, filename);
      fs.writeFileSync(filePath, submission.code);
      filePaths.push(filePath);
    }

    // Run Moss
    const mossScriptPath = path.join(process.cwd(), 'moss.pl');
    const command = `perl "${mossScriptPath}" -l ${language} ${filePaths.map(f => `"${f}"`).join(' ')}`;

    console.log('Running Moss command:', command);

    const { stdout, stderr } = await execAsync(command, { cwd: process.cwd() });

    // Parse the output to get the report URL
    const urlMatch = stdout.match(/http:\/\/moss\.stanford\.edu\/results\/\d+\/\d+/);
    const reportUrl = urlMatch ? urlMatch[0] : null;

    // Clean up temp files
    fs.rmSync(tempDir, { recursive: true, force: true });

    if (!reportUrl) {
      throw new Error('Failed to get report URL from Moss output');
    }

    // Save the check result to database
    const insertCheckQuery = `
      INSERT INTO plagiarism_checks (assignment_id, report_url, status)
      VALUES ($1, $2, 'completed')
      RETURNING id
    `;
    const checkResult = await pool.query(insertCheckQuery, [assignmentId, reportUrl]);
    const checkId = checkResult.rows[0].id;

    // For now, we don't parse the detailed matches from Moss output
    // In a full implementation, you might need to scrape the Moss results page
    // or use their API if available

    return {
      status: 'completed',
      checkId,
      reportUrl,
      submissionsChecked: submissionsResult.rows.length
    };

  } catch (error) {
    console.error('Error running plagiarism check:', error);

    // Save failed check
    await pool.query(
      `INSERT INTO plagiarism_checks (assignment_id, status) VALUES ($1, 'failed')`,
      [assignmentId]
    );

    return { status: 'failed', error: error.message };
  }
}

/**
 * Get plagiarism check results for an assignment
 * @param {number} assignmentId - The assignment ID
 * @returns {Promise<Array>} - Array of check results
 */
export async function getPlagiarismChecks(assignmentId) {
  const query = `
    SELECT pc.*, COUNT(pm.id) as match_count
    FROM plagiarism_checks pc
    LEFT JOIN plagiarism_matches pm ON pc.id = pm.check_id
    WHERE pc.assignment_id = $1
    GROUP BY pc.id
    ORDER BY pc.checked_at DESC
  `;
  const result = await pool.query(query, [assignmentId]);
  return result.rows;
}

/**
 * Get detailed matches for a check
 * @param {number} checkId - The check ID
 * @returns {Promise<Array>} - Array of matches
 */
export async function getPlagiarismMatches(checkId) {
  const query = `
    SELECT pm.*, u1.name as student1_name, u2.name as student2_name
    FROM plagiarism_matches pm
    JOIN assignment_submissions as1 ON pm.submission1_id = as1.id
    JOIN assignment_submissions as2 ON pm.submission2_id = as2.id
    JOIN users u1 ON as1.student_id = u1.id
    JOIN users u2 ON as2.student_id = u2.id
    WHERE pm.check_id = $1
    ORDER BY pm.similarity_percentage DESC
  `;
  const result = await pool.query(query, [checkId]);
  return result.rows;
}