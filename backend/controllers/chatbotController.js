import { pool } from '../db/index.js';
import Groq from 'groq-sdk';
import { createRequire } from 'module';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

// In-memory PDF text store (avoid DB writes)
const pdfTextStore = new Map();

// Initialize Groq client
const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey || groqApiKey === 'gsk_your_api_key_here') {
  console.warn('⚠️  WARNING: GROQ_API_KEY not set in .env file. Chatbot features will not work.');
}

const groq = new Groq({
  apiKey: groqApiKey || 'gsk_your_api_key_here' // Add to .env file
});

/**
 * Chat about a course
 * POST /api/chatbot/course/:offeringId
 * Body: { message: string, history: array }
 */
export async function chatAboutCourse(req, res) {
  try {
    const offeringId = Number(req.params.offeringId);
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get course context
    const courseData = await pool.query(`
      SELECT c.code, c.title, c.description, o.term, o.section,
             u.name as faculty_name
      FROM course_offerings o
      JOIN courses c ON o.course_id = c.id
      LEFT JOIN users u ON o.faculty_id = u.id
      WHERE o.id = $1
    `, [offeringId]);

    if (courseData.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseData.rows[0];

    // Build context
    const context = `You are a helpful AI assistant for ${course.code} - ${course.title}.
Course Description: ${course.description || 'No description available'}
Term: ${course.term}, Section: ${course.section}
Professor: ${course.faculty_name}

Answer student questions about this course. Be helpful, concise, and accurate.`;

    // Build conversation history
    const messages = [
      { role: 'system', content: context },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
    });

    const reply = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    res.json({ reply, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('chatAboutCourse error:', err);
    res.status(500).json({ error: 'Failed to process chat', details: err.message });
  }
}

/**
 * Upload PDF and extract text
 * POST /api/chatbot/pdf/upload
 * Multipart form data with 'pdf' file
 */

async function extractTextWithPdfJs(buffer) {
  // Node environment: avoid worker usage
  try { pdfjsLib.GlobalWorkerOptions.workerSrc = undefined; } catch {}
  const doc = await pdfjsLib.getDocument({
    data: buffer,
    cMapUrl: new URL('../node_modules/pdfjs-dist/cmaps/', import.meta.url).toString(),
    cMapPacked: true,
    isEvalSupported: false,
    useWorkerFetch: false,
    disableFontFace: true,
    isOffscreenCanvasSupported: false,
  }).promise;
  let fullText = '';
  const numPages = doc.numPages || 0;
  for (let p = 1; p <= numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items.map((it) => it.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

async function extractPdfText(buffer) {
  // Try pdf-parse first
  try {
    const parsed = await pdf(buffer);
    if (parsed?.text && parsed.text.trim().length > 0) return parsed.text;
  } catch {}
  // Fallback to pdfjs-dist
  try {
    const text = await extractTextWithPdfJs(buffer);
    if (text && text.trim().length > 0) return text;
  } catch {}
  throw new Error('Could not extract text from PDF (may be scanned or encrypted)');
}

export async function uploadPDF(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const buffer = req.file.buffer;
    if (!buffer || !(buffer instanceof Buffer)) {
      return res.status(400).json({ error: 'Invalid upload payload' });
    }

    const mime = req.file.mimetype || '';
    const filename = req.file.originalname || 'document';
    let text = '';

    if (mime === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
      // Extract text (with fallback)
      text = await extractPdfText(buffer);
    } else if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      filename.toLowerCase().endsWith('.docx')
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || '';
    } else if (mime === 'text/plain' || filename.toLowerCase().endsWith('.txt')) {
      text = buffer.toString('utf8');
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload PDF, DOCX, or TXT.' });
    }

    if (!text.trim()) {
      return res.status(400).json({ error: 'No extractable text found in the file.' });
    }

    // Store in-memory only (no DB)
    const id = uuidv4();
    pdfTextStore.set(id, {
      filename,
      content: text,
      uploaded_by: req.user?.id ?? null,
      uploaded_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      pdfId: id,
      filename,
      textLength: text.length
    });
  } catch (err) {
    console.error('uploadPDF error:', err && (err.stack || err));
    res.status(500).json({ error: 'Failed to process file', details: String(err?.message || err) });
  }
}

/**
 * Chat with PDF context
 * POST /api/chatbot/pdf/:pdfId/chat
 * Body: { message: string, history: array }
 */
export async function chatWithPDF(req, res) {
  try {
    const pdfId = String(req.params.pdfId);
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get PDF content from in-memory store
    const doc = pdfTextStore.get(pdfId);
    if (!doc) {
      return res.status(404).json({ error: 'PDF not found or expired' });
    }

    const pdfContent = doc.content.substring(0, 15000); // Limit context to ~15k chars

    // Build context
    const context = `You are a helpful AI assistant. Answer questions based on the following PDF document content.

Document: ${doc.filename}

Content:
${pdfContent}

Answer the user's question based on this document. If the answer is not in the document, say so.`;

    // Build conversation
    const messages = [
      { role: 'system', content: context },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 1024,
    });

    const reply = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    res.json({ reply, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('chatWithPDF error:', err);
    res.status(500).json({ error: 'Failed to process chat', details: err.message });
  }
}

/**
 * List user's uploaded PDFs (from in-memory store)
 * GET /api/chatbot/pdfs
 */
export async function listUserPDFs(req, res) {
  try {
    const items = [];
    for (const [id, v] of pdfTextStore.entries()) {
      if (!req.user?.id || v.uploaded_by === req.user.id) {
        items.push({ id, filename: v.filename, uploaded_at: v.uploaded_at, size: v.content.length });
      }
    }
    // sort newest first
    items.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
    res.json({ pdfs: items.slice(0, 50) });
  } catch (err) {
    console.error('listUserPDFs error:', err);
    res.status(500).json({ error: 'Failed to fetch PDFs' });
  }
}
