import { pool } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';
import { initializeChatbotAgent, updatePdfTextStore } from '../agents/chatbotAgents.js';
import { logger } from '../utils/logger.js';

// In-memory PDF text store (avoid DB writes)
const pdfTextStore = new Map();

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function chunkTextHierarchical(text, chunkSize = 900, overlap = 150) {
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const chunks = [];
  let buffer = '';
  let index = 0;

  for (const paragraph of paragraphs) {
    if ((buffer + ' ' + paragraph).length > chunkSize) {
      if (buffer) {
        chunks.push({ index: index++, content: buffer.trim() });
      }
      buffer = paragraph;
    } else {
      buffer = `${buffer} ${paragraph}`.trim();
    }
  }

  if (buffer) {
    chunks.push({ index: index++, content: buffer.trim() });
  }

  // Add overlap to preserve context
  const overlapped = chunks.map((chunk, i) => {
    if (i === 0) return chunk;
    const prev = chunks[i - 1];
    const overlapText = prev.content.slice(-overlap);
    return {
      ...chunk,
      content: `${overlapText} ${chunk.content}`.trim()
    };
  });

  return overlapped;
}

async function storeDocumentInDb({ id, userId, filename, content, usedOCR }) {
  await pool.query(
    `INSERT INTO ai_documents (id, user_id, filename, content, used_ocr, created_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (id) DO UPDATE
     SET filename = EXCLUDED.filename,
         content = EXCLUDED.content,
         used_ocr = EXCLUDED.used_ocr`,
    [id, userId, filename, content, usedOCR]
  );

  await pool.query('DELETE FROM ai_document_chunks WHERE document_id = $1', [id]);

  const chunks = chunkTextHierarchical(content);
  for (const chunk of chunks) {
    const chunkLabel = `${id}:${chunk.index + 1}`;
    await pool.query(
      `INSERT INTO ai_document_chunks (document_id, chunk_index, content, content_tsv, metadata, created_at)
       VALUES ($1, $2, $3, to_tsvector('english', $3), $4, now())`,
      [
        id,
        chunk.index,
        chunk.content,
        JSON.stringify({ chunkLabel })
      ]
    );
  }
}

function buildResourceText(resource) {
  return normalizeWhitespace(
    `${resource.title || resource.filename || ''}\n${resource.description || ''}`.trim()
  );
}

async function indexCourseResource(resource) {
  const content = buildResourceText(resource);
  if (!content) return;

  const chunks = chunkTextHierarchical(content, 600, 100);
  await pool.query('DELETE FROM ai_course_chunks WHERE resource_id = $1', [resource.id]);

  for (const chunk of chunks) {
    await pool.query(
      `INSERT INTO ai_course_chunks (resource_id, course_offering_id, chunk_index, content, content_tsv, metadata, created_at)
       VALUES ($1, $2, $3, $4, to_tsvector('english', $4), $5, now())`,
      [
        resource.id,
        resource.course_offering_id,
        chunk.index,
        chunk.content,
        JSON.stringify({ resourceType: resource.resource_type })
      ]
    );
  }
}

export async function reindexCourseResources(req, res) {
  try {
    const { offeringId } = req.params;
    const result = await pool.query(
      `SELECT id, course_offering_id, title, description, filename, resource_type
       FROM resources
       WHERE course_offering_id = $1`,
      [offeringId]
    );

    for (const resource of result.rows) {
      await indexCourseResource(resource);
    }

    res.json({ success: true, indexed: result.rows.length });
  } catch (error) {
    console.error('reindexCourseResources error:', error);
    res.status(500).json({ error: 'Failed to reindex resources' });
  }
}

// Initialize OpenRouter client
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

if (!OPENROUTER_API_KEY) {
  console.warn(
    '⚠️  WARNING: OPENROUTER_API_KEY not set in .env file. Chatbot features will not work.'
  );
}

// Initialize the agent
let chatbotAgent = null;
(async () => {
  try {
    chatbotAgent = await initializeChatbotAgent();
  } catch (error) {
    console.error('Failed to initialize chatbot agent:', error);
  }
})();

/* ------------------------------------------------------------------
 * 🧠 CHAT ABOUT A COURSE
 * POST /api/chatbot/course/:offeringId
 * Body: { message: string, history: array }
 * ------------------------------------------------------------------ */
export async function chatAboutCourse(req, res) {
  try {
    const offeringId = Number(req.params.offeringId);
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!chatbotAgent) {
      return res.status(500).json({ error: 'Chatbot agent not initialized' });
    }

    // Prepare input for the agent
    const agentInput = `Course ID: ${offeringId}
Document IDs: none
Enable Web Search: false
User Question: ${message}

Chat History:
${history.map(h => `${h.role}: ${h.content}`).join('\n')}

Please answer the user's question about this specific course using available tools if needed.`;

    // Call the agent
    const result = await chatbotAgent.call({
      input: agentInput,
    });

    const reply = result.output || 'Sorry, I could not generate a response.';

    res.json({ reply, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('chatAboutCourse error:', err);
    res
      .status(500)
      .json({ error: 'Failed to process chat', details: err.message });
  }
}

/* ------------------------------------------------------------------
 * 📄 EXTRACT TEXT FROM PDF USING pdfjs-dist (AWS Friendly)
 * ------------------------------------------------------------------ */
async function extractTextWithPdfJs(buffer) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = undefined;
  } catch {}

  // Convert Buffer to Uint8Array for PDF.js
  const uint8Array = new Uint8Array(buffer);

  const doc = await pdfjsLib.getDocument({
    data: uint8Array,
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
  try {
    const text = await extractTextWithPdfJs(buffer);
    if (text && text.trim().length > 0) {return text;}
    // If no text found, PDF might be scanned but OCR for PDFs is complex
    // For now, we'll skip OCR for PDFs and return empty text
    console.log('No text found in PDF - may be scanned image');
    return '';
  } catch (err) {
    console.error('PDF text extraction failed:', err);
    throw new Error(
      'Could not extract text from PDF (possibly scanned or encrypted)'
    );
  }
}

async function performOCR(buffer) {
  const worker = await createWorker('eng');
  try {
    const { data: { text } } = await worker.recognize(buffer);
    return text || '';
  } finally {
    await worker.terminate();
  }
}


/* ------------------------------------------------------------------
 * 📤 UPLOAD DOCUMENT (PDF/DOCX/TXT/IMAGES)
 * POST /api/chatbot/document/upload
 * ------------------------------------------------------------------ */
export async function uploadDocument(req, res) {
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
    let usedOCR = false;

    if (mime === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
      text = await extractPdfText(buffer);
      if (text.trim().length === 0) {
        usedOCR = true;
      }
    } else if (
      mime ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      filename.toLowerCase().endsWith('.docx')
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || '';
    } else if (
      mime === 'text/plain' ||
      filename.toLowerCase().endsWith('.txt')
    ) {
      text = buffer.toString('utf8');
    } else if (
      mime.startsWith('image/') ||
      filename.toLowerCase().match(/\.(png|jpg|jpeg|gif|bmp|tiff)$/i)
    ) {
      // Image files - use OCR
      text = await performOCR(buffer);
      usedOCR = true;
    } else {
      return res.status(400).json({
        error: 'Unsupported file type. Please upload PDF, DOCX, TXT, or image files (PNG, JPG, JPEG, etc.).',
      });
    }

    if (!text.trim()) {
      return res
        .status(400)
        .json({ error: 'No extractable text found in the file.' });
    }

    const id = uuidv4();
    pdfTextStore.set(id, {
      filename,
      content: text,
      uploaded_by: req.user?.id ?? null,
      uploaded_at: new Date().toISOString(),
      usedOCR,
    });

    // Update the agent's PDF store
    updatePdfTextStore(pdfTextStore);

    await storeDocumentInDb({
      id,
      userId: req.user?.id ?? null,
      filename,
      content: normalizeWhitespace(text),
      usedOCR
    });

    res.json({
      success: true,
      documentId: id,
      filename,
      textLength: text.length,
      usedOCR,
    });
  } catch (err) {
    console.error('uploadDocument error:', err && (err.stack || err));
    res.status(500).json({
      error: 'Failed to process file',
      details: String(err?.message || err),
    });
  }
}

/* ------------------------------------------------------------------
 * 💬 CHAT WITH DOCUMENT CONTEXT
 * POST /api/chatbot/document/:documentId/chat
 * ------------------------------------------------------------------ */
export async function chatWithDocument(req, res) {
  try {
    const documentId = String(req.params.documentId);
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!chatbotAgent) {
      return res.status(500).json({ error: 'Chatbot agent not initialized' });
    }

    // Prepare input for the agent
    const agentInput = `Course ID: none
Document IDs: ${documentId}
Enable Web Search: false
User Question: ${message}

Chat History:
${history.map(h => `${h.role}: ${h.content}`).join('\n')}

Please answer the user's question about the uploaded document using available tools if needed.`;

    // Call the agent
    const result = await chatbotAgent.call({
      input: agentInput,
    });

    const reply = result.output || 'Sorry, I could not generate a response.';

    res.json({ reply, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('chatWithDocument error:', err);
    res
      .status(500)
      .json({ error: 'Failed to process chat', details: err.message });
  }
}

/* ------------------------------------------------------------------
 * 🤖 ENHANCED UNIFIED AI CHAT (Course + Documents + Resources + Web Search)
 * POST /api/chatbot/chat
 * ------------------------------------------------------------------ */
export async function chatWithAI(req, res) {
  try {
    const { courseId, documentIds = [], message, history = [], enableWebSearch = false } = req.body;
    const userId = req.user?.id;

    logger.info('Chatbot request', {
      userId,
      courseId,
      documentIds: documentIds.length,
      messageLength: message?.length,
      enableWebSearch
    });

    if (!message) {
      logger.warn('Chatbot request missing message', { userId });
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!chatbotAgent) {
      logger.error('Chatbot agent not initialized');
      return res.status(500).json({ error: 'Chatbot agent not initialized' });
    }

    // Hybrid query classification: Keywords + AI fallback
    let detectedTool = null;
    let confidence = 0;
    console.log(`Chatbot: Classifying query "${message}"`);

    // Step 1: Keyword-based detection for high-confidence patterns
    const lowerMessage = message.toLowerCase();

    // Course-related keywords
    if (lowerMessage.match(/\b(course|class|syllabus|professor|instructor|teacher|what is this course)\b/)) {
      detectedTool = 'course_info';
      confidence = 0.9;
    }
    // Assignment/quiz keywords
    else if (lowerMessage.match(/\b(assignment|quiz|deadline|due|submit|homework|exam|test)\b/)) {
      detectedTool = 'assignments_quizzes';
      confidence = 0.9;
    }
    // Document-related keywords
    else if (lowerMessage.match(/\b(document|file|upload|pdf|note|pyq|material|tell me about|what is this|describe|summary)\b/) ||
             documentIds.length > 0) {
      detectedTool = 'document_search';
      confidence = 0.8;
    }
    // Programming/web search keywords
    else if (lowerMessage.match(/\b(how to|what is|explain|code|program|algorithm|language|framework|library)\b/)) {
      detectedTool = enableWebSearch ? 'web_search' : null;
      confidence = 0.7;
    }

    console.log(`Chatbot: Keyword detection - Tool: ${detectedTool}, Confidence: ${confidence}`);

    // Step 2: AI classification for low-confidence or ambiguous queries
    if (!detectedTool || confidence < 0.8) {
      try {
        const classificationPrompt = `Classify this question into one of these categories:
- course_info: Questions about course details, syllabus, professor, course structure
- assignments_quizzes: Questions about assignments, quizzes, deadlines, submissions
- document_search: Questions about uploaded documents, course materials, notes, PYQs
- web_search: Programming questions, general knowledge, how-to guides
- unknown: If you cannot classify with confidence

Question: "${message}"
Context: Course ID ${courseId}, ${documentIds.length} documents available, Web search ${enableWebSearch ? 'enabled' : 'disabled'}

Respond with only the category name and confidence score (0-1), e.g.: "course_info:0.95"`;

        const response = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'FYP Coding Platform'
          },
          body: JSON.stringify({
            model: 'google/gemini-flash-1.5-free',
            messages: [{ role: 'user', content: classificationPrompt }],
            max_tokens: 20,
            temperature: 0.1
          })
        });

        if (!response.ok) {
          throw new Error(`OpenRouter error: ${response.statusText}`);
        }

        const classification = await response.json();
        const result = classification.choices[0]?.message?.content?.trim();
        if (result && result.includes(':')) {
          const [tool, conf] = result.split(':');
          const aiConfidence = parseFloat(conf);

          if (aiConfidence > confidence && tool !== 'unknown') {
            detectedTool = tool;
            confidence = aiConfidence;
          }
        }
      } catch (error) {
        console.error('AI classification failed:', error);
      }
    }

    // Prepare input for the agent
    const agentInput = `Course ID: ${courseId || 'none'}
Document IDs: ${documentIds.join(', ') || 'none'}
User ID: ${userId}
Enable Web Search: ${enableWebSearch}
Detected Tool: ${detectedTool || 'auto'} (confidence: ${confidence})
User Question: ${message}

TOOL SELECTION GUIDANCE:
${detectedTool ? `HIGH CONFIDENCE: Use ${detectedTool} tool for this query.` : 'AUTO-DETECT: Choose the most appropriate tool based on the question.'}

TOOL PARAMETERS FORMAT:
- course_info: Just the course ID number
- assignments_quizzes: JSON {"courseId": "${courseId}", "userId": "${userId}"}
- document_search: JSON {"documentIds": [${documentIds.map(id => `"${id}"`).join(', ')}], "courseId": "${courseId}", "query": "${message}"}
- web_search: The search query string

AVAILABLE TOOLS:
- course_info: Course information and syllabus
- assignments_quizzes: Personal assignment and quiz deadlines
- document_search: Search uploaded documents and course materials
- web_search: General knowledge and programming help

RESPONSE FORMAT:
First, think about which tool to use.
Then, call that tool with the correct parameters.
Finally, provide a helpful response.

Chat History:
${history.map(h => `${h.role}: ${h.content}`).join('\n')}

QUESTION: ${message}`;

    // Call the agent
    const result = await chatbotAgent.call({
      input: agentInput,
    });

    const reply = result.output || 'Sorry, I could not generate a response.';

    // Check if web search was used (from agent's intermediate steps if available)
    let usedWebSearch = false;
    let webSearchResult = null;

    if (result.intermediateSteps) {
      for (const step of result.intermediateSteps) {
        if (step.action.tool === 'web_search') {
          usedWebSearch = true;
          webSearchResult = step.observation;
          break;
        }
      }
    }

    logger.info('Chatbot response generated', {
      userId,
      replyLength: reply.length,
      usedWebSearch
    });

    res.json({
      reply,
      timestamp: new Date().toISOString(),
      usedWebSearch,
      webSearchResult
    });
  } catch (err) {
    logger.error('chatWithAI error:', err, { userId: req.user?.id });
    res
      .status(500)
      .json({ error: 'Failed to process chat', details: err.message });
  }
}

/* ------------------------------------------------------------------
 * 📚 LIST USER UPLOADED DOCUMENTS
 * GET /api/chatbot/documents
 * ------------------------------------------------------------------ */
export async function listUserDocuments(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const result = await pool.query(
      `SELECT id, filename, created_at as uploaded_at, length(content) as size, used_ocr as "usedOCR"
       FROM ai_documents
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({ documents: result.rows });
  } catch (err) {
    console.error('listUserDocuments error:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
}

export async function createRagTables() {
  const sql = `
    CREATE TABLE IF NOT EXISTS ai_documents (
      id UUID PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      filename TEXT NOT NULL,
      content TEXT NOT NULL,
      used_ocr BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS ai_document_chunks (
      id BIGSERIAL PRIMARY KEY,
      document_id UUID REFERENCES ai_documents(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      content_tsv tsvector,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS ai_course_chunks (
      id BIGSERIAL PRIMARY KEY,
      resource_id BIGINT REFERENCES resources(id) ON DELETE CASCADE,
      course_offering_id BIGINT REFERENCES course_offerings(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      content_tsv tsvector,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_ai_documents_user ON ai_documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_chunks_doc ON ai_document_chunks(document_id);
    CREATE INDEX IF NOT EXISTS idx_ai_chunks_tsv ON ai_document_chunks USING GIN (content_tsv);
    CREATE INDEX IF NOT EXISTS idx_ai_course_chunks_offering ON ai_course_chunks(course_offering_id);
    CREATE INDEX IF NOT EXISTS idx_ai_course_chunks_tsv ON ai_course_chunks USING GIN (content_tsv);
  `;

  try {
    const statements = sql.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }
    console.log('✅ RAG tables ready');
  } catch (error) {
    console.error('Error creating RAG tables:', error);
  }
}

export { indexCourseResource };

/* ------------------------------------------------------------------
 * 💾 SAVE CHAT SESSION
 * POST /api/chatbot/chats
 * ------------------------------------------------------------------ */
export async function saveChatSession(req, res) {
  try {
    const { title, messages, uploadedDocuments, courseId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!title || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid chat data' });
    }

    // Insert chat session
    const sessionResult = await pool.query(
      `INSERT INTO chat_sessions (user_id, title, course_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, title, courseId || null]
    );

    const sessionId = sessionResult.rows[0].id;

    // Insert messages
    for (const message of messages) {
      await pool.query(
        `INSERT INTO chat_messages (chat_session_id, role, content, timestamp)
         VALUES ($1, $2, $3, $4)`,
        [sessionId, message.role, message.content, message.timestamp]
      );
    }

    // Insert uploaded documents
    if (uploadedDocuments && Array.isArray(uploadedDocuments)) {
      for (const doc of uploadedDocuments) {
        await pool.query(
          `INSERT INTO chat_documents (chat_session_id, document_id, filename, used_ocr)
           VALUES ($1, $2, $3, $4)`,
          [sessionId, doc.id, doc.filename, doc.usedOCR || false]
        );
      }
    }

    res.json({ success: true, sessionId });
  } catch (err) {
    console.error('saveChatSession error:', err);
    res.status(500).json({ error: 'Failed to save chat session' });
  }
}

/* ------------------------------------------------------------------
 * 📖 LOAD USER CHAT SESSIONS
 * GET /api/chatbot/chats
 * ------------------------------------------------------------------ */
export async function loadUserChatSessions(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get chat sessions with message count
    const sessionsResult = await pool.query(
      `SELECT
        cs.id,
        cs.title,
        cs.course_id,
        cs.created_at,
        cs.updated_at,
        COUNT(cm.id) as message_count
       FROM chat_sessions cs
       LEFT JOIN chat_messages cm ON cs.id = cm.chat_session_id
       WHERE cs.user_id = $1
       GROUP BY cs.id, cs.title, cs.course_id, cs.created_at, cs.updated_at
       ORDER BY cs.updated_at DESC`,
      [userId]
    );

    const sessions = sessionsResult.rows.map(session => ({
      id: session.id.toString(),
      title: session.title,
      courseId: session.course_id,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      messageCount: parseInt(session.message_count)
    }));

    res.json({ sessions });
  } catch (err) {
    console.error('loadUserChatSessions error:', err);
    res.status(500).json({ error: 'Failed to load chat sessions' });
  }
}

/* ------------------------------------------------------------------
 * 📝 LOAD CHAT SESSION DETAILS
 * GET /api/chatbot/chats/:sessionId
 * ------------------------------------------------------------------ */
export async function loadChatSession(req, res) {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify ownership and get session info
    const sessionResult = await pool.query(
      `SELECT id, title, course_id, created_at, updated_at
       FROM chat_sessions
       WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (sessionResult.rowCount === 0) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    const session = sessionResult.rows[0];

    // Get messages
    const messagesResult = await pool.query(
      `SELECT role, content, timestamp
       FROM chat_messages
       WHERE chat_session_id = $1
       ORDER BY timestamp ASC`,
      [sessionId]
    );

    // Get uploaded documents
    const documentsResult = await pool.query(
      `SELECT document_id as id, filename, used_ocr as usedOCR
       FROM chat_documents
       WHERE chat_session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );

    const chatData = {
      id: session.id.toString(),
      title: session.title,
      courseId: session.course_id,
      messages: messagesResult.rows,
      uploadedDocuments: documentsResult.rows,
      createdAt: session.created_at,
      updatedAt: session.updated_at
    };

    res.json({ session: chatData });
  } catch (err) {
    console.error('loadChatSession error:', err);
    res.status(500).json({ error: 'Failed to load chat session' });
  }
}

/* ------------------------------------------------------------------
 * 🗑️ DELETE CHAT SESSION
 * DELETE /api/chatbot/chats/:sessionId
 * ------------------------------------------------------------------ */
export async function deleteChatSession(req, res) {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Delete session (cascade will handle messages and documents)
    const result = await pool.query(
      `DELETE FROM chat_sessions
       WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('deleteChatSession error:', err);
    res.status(500).json({ error: 'Failed to delete chat session' });
  }
}
