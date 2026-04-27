/**
 * AI Assistant Controller
 * Handles AI-assisted learning with query limiting and responsible AI practices
 */

import { pool } from '../db/index.js';

// Use Groq API for AI responses (already integrated in the project)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Process AI query with rate limiting and responsible AI
 */
export async function processAIQuery(req, res) {
  try {
    const { question_id, code, language, query_type, user_query, contest_mode } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' });
    }

    // Check rate limit
    const rateLimitResult = await checkAIQueryLimit(userId, question_id);
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: 'AI query limit reached',
        remaining: 0,
        reset_at: rateLimitResult.reset_at
      });
    }

    // Build prompt based on query type
    const systemPrompt = buildSystemPrompt(contest_mode);
    const userPrompt = buildUserPrompt(query_type, code, language, user_query);

    // Get AI response
    const aiResponse = await getGroqResponse(systemPrompt, userPrompt);

    // Log the query
    await logAIQuery(userId, question_id, query_type, code, aiResponse, contest_mode);

    // Return response
    res.json({
      type: query_type,
      content: aiResponse,
      remaining_queries: rateLimitResult.remaining - 1
    });
  } catch (error) {
    console.error('AI query error:', error);
    res.status(500).json({ error: 'Failed to process AI query' });
  }
}

/**
 * Check if user has queries remaining
 */
async function checkAIQueryLimit(userId, questionId) {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as query_count, MAX(created_at) as last_query
       FROM ai_query_logs
       WHERE user_id = $1 AND question_id = $2
       AND created_at > NOW() - INTERVAL '1 day'`,
      [userId, questionId]
    );

    const queryCount = parseInt(result.rows[0].query_count) || 0;
    const limit = 15; // Default limit per question per day

    return {
      allowed: queryCount < limit,
      remaining: Math.max(0, limit - queryCount),
      reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Default to allowing on error
    return { allowed: true, remaining: 10 };
  }
}

/**
 * Build system prompt based on contest mode
 */
function buildSystemPrompt(contestMode) {
  const basePrompt = `You are an expert coding tutor helping students solve programming problems.

IMPORTANT RULES:
1. Focus on UNDERSTANDING, not solutions
2. Provide hints and explanations, not complete code
3. Use Socratic method - ask clarifying questions
4. Point out common mistakes without fixing them
5. Explain concepts step by step
6. Use the student's code as reference`;

  const contestModeAddition = contestMode
    ? `\n\n🏆 CONTEST MODE:
- Student is in a programming contest
- Be even more cautious about giving away solutions
- Focus on debugging logic and understanding approach
- Encourage the student to think independently
- Provide algorithmic insights, not implementations`
    : '';

  return basePrompt + contestModeAddition;
}

/**
 * Build user prompt based on query type
 */
function buildUserPrompt(queryType, code, language, userQuery) {
  const codeContext = `\n\nStudent's code (${language}):\n\`\`\`\n${code.substring(0, 500)}\n\`\`\``;

  switch (queryType) {
    case 'hint':
      return `The student is stuck and needs a hint to proceed.
${userQuery ? `Their concern: "${userQuery}"` : 'They have not specified what is wrong.'}
${codeContext}

Provide a helpful hint that guides them toward the solution without giving away the answer.`;

    case 'explanation':
      return `The student wants to understand their code better.
${codeContext}

Explain what this code does, line by line. Identify any logical issues or improvements.`;

    case 'debugging':
      return `The student is debugging their code.
Issue: ${userQuery}
${codeContext}

Help them identify and understand the problem. Ask questions to help them think through it.`;

    case 'algorithm':
      return `The student needs help understanding the algorithmic approach.
${userQuery ? `They want to know: "${userQuery}"` : ''}
${codeContext}

Explain the algorithm clearly, discuss time/space complexity, and suggest optimizations.`;

    default:
      return `${userQuery}${codeContext}`;
  }
}

/**
 * Get response from Groq AI API
 */
async function getGroqResponse(systemPrompt, userPrompt) {
  try {
    if (!OPENROUTER_API_KEY) {
      console.warn('OPENROUTER_API_KEY not set, returning mock response');
      return getMockAIResponse();
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'FYP Coding Platform'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Unable to generate response';
  } catch (error) {
    console.error('Groq API error:', error);
    // Fall back to an educational, non-solution hint when the real API fails
    return getMockAIResponse();
  }
}

/**
 * Get mock AI response for testing
 */
function getMockAIResponse() {
  const responses = [
    'Think about what happens when the input is empty or has only one element.',
    'Your loop condition looks correct, but check the initialization. Are you starting from the right index?',
    'This looks like you\'re trying to solve a classic algorithm problem. Have you considered using a hash set or map to track values?',
    'The logic is close! But think about edge cases. What happens at the boundary conditions?',
    'Great approach! To optimize further, think about whether you can reduce the number of iterations or use a more efficient data structure.'
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Log AI query for analytics
 */
async function logAIQuery(userId, questionId, queryType, code, response, contestMode) {
  try {
    await pool.query(
      `INSERT INTO ai_query_logs (
        user_id, question_id, query_type, code_hash, response_preview, contest_mode, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        userId,
        questionId,
        queryType,
        hashCode(code),
        response.substring(0, 200),
        contestMode || false
      ]
    );
  } catch (error) {
    console.error('Failed to log AI query:', error);
    // Don't fail the request due to logging errors
  }
}

/**
 * Get AI query history for a question
 */
export async function getAIQueryHistory(req, res) {
  try {
    const { questionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await pool.query(
      `SELECT id, query_type, created_at, response_preview
       FROM ai_query_logs
       WHERE user_id = $1 AND question_id = $2
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId, questionId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching AI history:', error);
    res.status(500).json({ error: 'Failed to fetch AI history' });
  }
}

/**
 * Get user's AI usage statistics
 */
export async function getAIUsageStats(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await pool.query(
      `SELECT
        COUNT(*) as total_queries,
        COUNT(DISTINCT question_id) as questions_asked_about,
        COUNT(CASE WHEN query_type = 'hint' THEN 1 END) as hint_queries,
        COUNT(CASE WHEN query_type = 'explanation' THEN 1 END) as explanation_queries,
        COUNT(CASE WHEN query_type = 'debugging' THEN 1 END) as debugging_queries,
        COUNT(CASE WHEN query_type = 'algorithm' THEN 1 END) as algorithm_queries,
        COUNT(CASE WHEN contest_mode = true THEN 1 END) as contest_queries,
        DATE(MAX(created_at)) as last_query_date
       FROM ai_query_logs
       WHERE user_id = $1`,
      [userId]
    );

    res.json(result.rows[0] || {});
  } catch (error) {
    console.error('Error fetching AI stats:', error);
    res.status(500).json({ error: 'Failed to fetch AI statistics' });
  }
}

/**
 * Simple hash function
 */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

/**
 * Create AI logging tables
 */
export async function createAILogTables() {
  const sql = `
    CREATE TABLE IF NOT EXISTS ai_query_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id INTEGER REFERENCES code_questions(id) ON DELETE SET NULL,
      query_type VARCHAR(50),
      code_hash VARCHAR(255),
      response_preview TEXT,
      contest_mode BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_ai_query_user ON ai_query_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_query_question ON ai_query_logs(question_id);
    CREATE INDEX IF NOT EXISTS idx_ai_query_date ON ai_query_logs(created_at);
  `;

  try {
    const statements = sql.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }
    console.log('✅ AI logging tables created');
  } catch (error) {
    console.error('Error creating AI tables:', error);
  }
}
