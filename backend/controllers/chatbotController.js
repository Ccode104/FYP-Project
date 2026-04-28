import { pool } from '../db/index.js';
import { initializeChatbotAgent } from '../agents/chatbotAgents.js';
import { logger } from '../utils/logger.js';

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
 * 🤖 ENHANCED UNIFIED AI CHAT (Course + Web Search)
 * POST /api/chatbot/chat
 * ------------------------------------------------------------------ */
export async function chatWithAI(req, res) {
  try {
    const { courseId, message, history = [], enableWebSearch = false } = req.body;
    const userId = req.user?.id;

    logger.info('Chatbot request', {
      userId,
      courseId,
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
- web_search: Programming questions, general knowledge, how-to guides
- unknown: If you cannot classify with confidence

Question: "${message}"
Context: Course ID ${courseId}, Web search ${enableWebSearch ? 'enabled' : 'disabled'}

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
User ID: ${userId}
Enable Web Search: ${enableWebSearch}
Detected Tool: ${detectedTool || 'auto'} (confidence: ${confidence})
User Question: ${message}

TOOL SELECTION GUIDANCE:
${detectedTool ? `HIGH CONFIDENCE: Use ${detectedTool} tool for this query.` : 'AUTO-DETECT: Choose the most appropriate tool based on the question.'}

TOOL PARAMETERS FORMAT:
- course_info: Just the course ID number
- assignments_quizzes: JSON {"courseId": "${courseId}", "userId": "${userId}"}
- web_search: The search query string

AVAILABLE TOOLS:
- course_info: Course information and syllabus
- assignments_quizzes: Personal assignment and quiz deadlines
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
 * 💾 SAVE CHAT SESSION
 * POST /api/chatbot/chats
 * ------------------------------------------------------------------ */
export async function saveChatSession(req, res) {
  try {
    const { title, messages, courseId } = req.body;
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

    const chatData = {
      id: session.id.toString(),
      title: session.title,
      courseId: session.course_id,
      messages: messagesResult.rows,
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

    // Verify ownership
    const verifyResult = await pool.query(
      'SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (verifyResult.rowCount === 0) {
      return res.status(404).json({ error: 'Chat session not found or access denied' });
    }

    // Delete session (cascades to messages and documents)
    await pool.query('DELETE FROM chat_sessions WHERE id = $1', [sessionId]);

    res.json({ success: true });
  } catch (err) {
    console.error('deleteChatSession error:', err);
    res.status(500).json({ error: 'Failed to delete chat session' });
  }
}

