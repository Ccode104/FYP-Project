// Judge0 controller rewritten to use global fetch instead of axios (avoids missing dependency)
import express from 'express';

// Judge0 API configuration
// You can use the public API or your own instance
const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';

// Language ID mapping for Judge0
const LANGUAGE_IDS = {
  'python': 92,
  'python3': 92,
  'java': 91,
  'cpp': 54,
  'c++': 54,
  'c': 50,
  'javascript': 93,
  'js': 93,
  'csharp': 51,
  'go': 60,
  'rust': 73
};

// Create router
const router = express.Router();

/**
 * Execute code using Judge0 API
 */
export async function executeCode(req, res) {
  try {
    const { source_code, language, stdin, question_id } = req.body;

    if (!source_code || !language) {
      return res.status(400).json({ error: 'source_code and language are required' });
    }

    const languageId = LANGUAGE_IDS[language.toLowerCase()];
    if (!languageId) {
      return res.status(400).json({ error: `Unsupported language: ${language}. Supported: ${Object.keys(LANGUAGE_IDS).join(', ')}` });
    }

    // Determine stdin value - use provided stdin, or fetch from test case if question_id provided
    // If stdin is explicitly provided (even if empty string), use it
    // Only fetch from database if stdin is undefined/null AND question_id is provided
    let finalStdin = stdin !== undefined && stdin !== null ? stdin : '';
    
    // If question_id is provided and stdin was not provided (undefined/null), fetch from test cases
    if (question_id && (stdin === undefined || stdin === null)) {
      const { pool } = await import('../db/index.js');
      const testCaseQuery = `
        SELECT input_text, expected_text, input_path, expected_path
        FROM code_question_testcases
        WHERE question_id = $1 AND is_sample = false
        ORDER BY id
        LIMIT 1
      `;
      const testCaseResult = await pool.query(testCaseQuery, [question_id]);
      
      if (testCaseResult.rows.length > 0) {
        const testCase = testCaseResult.rows[0];
        // Use input from test case
        if (testCase.input_text) {
          finalStdin = testCase.input_text;
        } else if (testCase.input_path) {
          // If input is in a file, you'd need to fetch it from S3
          // For now, we'll use empty stdin
          finalStdin = '';
        }
      }
    }

    // Prepare submission payload (base64 encoded fields)
    // Always encode stdin, even if empty (empty string is valid stdin)
    const submissionPayload = {
      source_code: Buffer.from(source_code).toString('base64'),
      language_id: languageId,
      stdin: Buffer.from(finalStdin || '').toString('base64'), // Always encode, even if empty
      expected_output: null, // Will be set if question_id is provided
      cpu_time_limit: 2,
      memory_limit: 128000,
      wall_time_limit: 5
    };
    
    // Log for debugging
    console.log(`Judge0 submission - stdin length: ${finalStdin.length}, stdin preview: "${finalStdin.substring(0, 50)}${finalStdin.length > 50 ? '...' : ''}"`);

    // If question_id is provided, fetch expected output from test cases
    if (question_id) {
      const { pool } = await import('../db/index.js');
      const testCaseQuery = `
        SELECT input_text, expected_text, input_path, expected_path
        FROM code_question_testcases
        WHERE question_id = $1 AND is_sample = false
        ORDER BY id
        LIMIT 1
      `;
      const testCaseResult = await pool.query(testCaseQuery, [question_id]);
      
      if (testCaseResult.rows.length > 0) {
        const testCase = testCaseResult.rows[0];
        // Set expected output
        if (testCase.expected_text) {
          submissionPayload.expected_output = Buffer.from(testCase.expected_text).toString('base64');
        } else if (testCase.expected_path) {
          // If expected output is in a file, you'd need to fetch it from S3
          // For now, we'll skip this and compare in the response
        }
      }
    }

    // Build headers
    const headers = {
      'Content-Type': 'application/json'
    };

    if (JUDGE0_API_KEY) {
      headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
      headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
    }

    // Submit with wait=false first, then poll for results
    const submitUrl = `${JUDGE0_API_URL}/submissions?base64_encoded=true&wait=false&fields=*`;
    const submitResp = await fetch(submitUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(submissionPayload),
      // node fetch uses AbortController for timeout; keep default for simplicity
    });

    if (!submitResp.ok) {
      const errBody = await submitResp.text().catch(() => null);
      return res.status(500).json({ error: 'Failed to submit to Judge0', details: errBody });
    }

    const submitData = await submitResp.json();
    const token = submitData.token;

    if (!token) {
      return res.status(500).json({ error: 'Failed to get submission token from Judge0' });
    }

    // Poll for result (since wait=false, we need to poll)
    let result = null;
    let attempts = 0;
    const maxAttempts = 30;
    const pollInterval = 1000;

    const pollUrl = `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=true&fields=*`;

    while (attempts < maxAttempts) {
      // Wait
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      try {
        const pollResp = await fetch(pollUrl, { headers });
        if (!pollResp.ok) {
          attempts++;
          continue;
        }
        result = await pollResp.json();
        // Status id: 1=In Queue, 2=Processing; finished when not 1 or 2
        if (result.status && result.status.id !== 1 && result.status.id !== 2) {
          break;
        }
      } catch (pollErr) {
        // continue polling on transient errors
        console.error('Error polling Judge0 result:', pollErr);
      }
      attempts++;
    }

    // If we exhausted attempts, try one final fetch
    if ((!result || (result.status && (result.status.id === 1 || result.status.id === 2))) && attempts >= maxAttempts) {
      try {
        const finalResp = await fetch(pollUrl, { headers });
        if (finalResp.ok) result = await finalResp.json();
      } catch (err) {
        return res.status(500).json({
          error: 'Timeout waiting for code execution result',
          details: 'The code submission was accepted but the result is not yet available'
        });
      }
    }

    if (!result) {
      return res.status(500).json({ error: 'No result from Judge0' });
    }

    // Decode base64 responses safely
    const decodedResult = {
      stdout: result.stdout ? Buffer.from(result.stdout, 'base64').toString() : '',
      stderr: result.stderr ? Buffer.from(result.stderr, 'base64').toString() : '',
      compile_output: result.compile_output ? Buffer.from(result.compile_output, 'base64').toString() : '',
      message: result.message ? Buffer.from(result.message, 'base64').toString() : '',
      status: result.status,
      time: result.time,
      memory: result.memory
    };

    // Check if output matches expected (if provided)
    let passed = null;
    if (submissionPayload.expected_output) {
      const expected = Buffer.from(submissionPayload.expected_output, 'base64').toString().trim();
      const actual = decodedResult.stdout.trim();
      passed = expected === actual;
    }

    res.json({
      ...decodedResult,
      passed,
      token
    });
  } catch (err) {
    console.error('Judge0 execution error:', err);
    res.status(500).json({
      error: err.message || 'Failed to execute code',
      details: err.response?.data || null
    });
  }
}

// Mount the execute endpoint on the router
router.post('/execute', executeCode);

// Export the router as default
export default router;


