import { pool } from '../db/index.js';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Limits
const SAFE_LIMIT = 4000;
const WARNING_LIMIT = 6000;
const MAX_LIMIT = 8000;

/**
 * Sanitizes text to remove potential PII
 */
function sanitizeContent(text) {
  if (!text) return '';
  let sanitized = text;
  
  // Remove emails
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL REMOVED]');
  // Remove phone numbers (simple heuristics)
  sanitized = sanitized.replace(/(?:\+\d{1,3}\s*)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE REMOVED]');
  // Remove potential student IDs (heuristic: 8-10 digit numbers usually)
  sanitized = sanitized.replace(/\b\d{8,10}\b/g, '[ID REMOVED]');

  return sanitized;
}

/**
 * Estimates token count for a given text
 */
function estimateTokens(text) {
  if (!text) return 0;
  // Simple heuristic: 1 token ~ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Builds the context tree for the given message
 * Returns { context_used_summary, full_context_text, context_token_count }
 */
export async function buildContextTree(messageId, offeringId) {
  // 1. Fetch the parent chain up to the root
  const chainQuery = `
    WITH RECURSIVE message_chain AS (
      SELECT id, parent_id, content, created_at, user_id, 1 as depth
      FROM discussion_messages
      WHERE id = $1 AND course_offering_id = $2
      
      UNION ALL
      
      SELECT m.id, m.parent_id, m.content, m.created_at, m.user_id, mc.depth + 1
      FROM discussion_messages m
      INNER JOIN message_chain mc ON m.id = mc.parent_id
      WHERE m.course_offering_id = $2
    )
    SELECT * FROM message_chain ORDER BY depth DESC;
  `;
  
  const chainResult = await pool.query(chainQuery, [messageId, offeringId]);
  const chainMessages = chainResult.rows;

  // 2. Fetch direct replies to this message (excluding the message itself)
  const repliesQuery = `
    SELECT id, parent_id, content, created_at, user_id
    FROM discussion_messages
    WHERE parent_id = $1 AND course_offering_id = $2
    ORDER BY created_at ASC
  `;
  const repliesResult = await pool.query(repliesQuery, [messageId, offeringId]);
  const replyMessages = repliesResult.rows;

  // 3. Fetch top K (e.g. 10) most recent messages in the offering for general context
  const recentQuery = `
    SELECT id, parent_id, content, created_at, user_id
    FROM discussion_messages
    WHERE course_offering_id = $1
    ORDER BY created_at DESC
    LIMIT 10
  `;
  const recentResult = await pool.query(recentQuery, [offeringId]);
  
  // Create a merged map of messages to avoid duplicates
  const msgMap = new Map();
  const allRawMessages = [...chainMessages, ...replyMessages, ...recentResult.rows];
  
  for (const msg of allRawMessages) {
    if (!msgMap.has(msg.id)) {
      msgMap.set(msg.id, msg);
    }
  }

  // Optimize and sanitize: sort by created_at
  const finalMessages = Array.from(msgMap.values()).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  
  let formattedContext = '';
  for (const msg of finalMessages) {
    // Remove very short / low-value messages unless it's the target message
    const rawContent = (msg.content || '').trim();
    if (rawContent.length < 5 && msg.id !== messageId) {
      continue;
    }
    
    const sanitized = sanitizeContent(rawContent);
    const roleStr = msg.id === messageId ? '[TARGET MESSAGE (TAGGED AI)]' : '[Context]';
    formattedContext += `--- Message ID: ${msg.id} ${roleStr} ---\n${sanitized}\n\n`;
  }

  const tokenCount = estimateTokens(formattedContext);
  const summary = `Fetched parent chain (${chainMessages.length}), direct replies (${replyMessages.length}), and recent messages. Total context messages deduped: ${finalMessages.length}.`;

  return {
    full_context_text: formattedContext,
    context_token_count: tokenCount,
    context_used_summary: summary
  };
}

/**
 * Core function to generate the AI response or fallback
 */
export async function generateAiResponse(messageId, offeringId, userQuery) {
  const contextData = await buildContextTree(messageId, offeringId);
  let { full_context_text, context_token_count, context_used_summary } = contextData;

  const extractedQuery = userQuery ? sanitizeContent(userQuery) : "Please assist with the tagged message.";
  const queryTokens = estimateTokens(extractedQuery);
  const instructionTokens = 500; // rough estimate for system prompts
  
  let totalEstimated = context_token_count + queryTokens + instructionTokens;

  // WARNING_LIMIT: Apply aggressive summarization / trimming
  if (totalEstimated >= WARNING_LIMIT && totalEstimated < MAX_LIMIT) {
    // Trim context down to roughly fit SAFE_LIMIT
    const maxContextChars = (SAFE_LIMIT - queryTokens - instructionTokens) * 4;
    full_context_text = "... [TRUNCATED] ...\n" + full_context_text.slice(-maxContextChars);
    totalEstimated = SAFE_LIMIT;
    context_used_summary += ' (Aggressively truncated due to WARNING_LIMIT).';
  }

  // FALLBACK MODE (MAX_LIMIT)
  if (totalEstimated >= MAX_LIMIT) {
    return {
      mode: 'fallback_prompt',
      content: generateFallbackPrompt(full_context_text, extractedQuery),
      context_used: context_used_summary + ' (Exceeded MAX_LIMIT, generated fallback).'
    };
  }

  // Proceed with LLM Call
  const systemPrompt = `You are an AI assistant in an educational discussion forum.
Your task is to respond to a user who tagged you.
You are given the context of the discussion thread, including parent messages and recent replies.
Provide a concise, helpful, and highly relevant answer based on the context.
Do NOT reveal sensitive data.`;

  const userPrompt = `Context:
${full_context_text}

User Query:
${extractedQuery}

Please provide your answer.`;

  try {
    if (!OPENROUTER_API_KEY) {
      console.warn('OPENROUTER_API_KEY not set, returning fallback simulation');
      return {
         mode: 'direct_answer',
         content: '[Simulation Mode - No API Key] This is a mock AI response to the query: ' + extractedQuery,
         context_used: context_used_summary
      };
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000', // Update with actual site URL
        'X-Title': 'Discussion AI Assistant'
      },
      body: JSON.stringify({
        model: 'minimax/minimax-m2.5:free',
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
      throw new Error(`OpenRouter API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const answer = data.choices[0]?.message?.content || 'Unable to generate response.';

    return {
      mode: 'direct_answer',
      content: answer,
      context_used: context_used_summary
    };

  } catch (err) {
    console.error('generateAiResponse OpenRouter error:', err);
    // On error, fallback to prompt
    return {
      mode: 'fallback_prompt',
      content: generateFallbackPrompt(full_context_text, extractedQuery),
      context_used: context_used_summary + ' (Fell back due to API Error).'
    };
  }
}

function generateFallbackPrompt(context, query) {
  return `Please copy and paste the following prompt into ChatGPT or another LLM:

Instruction: You are an educational assistant. Please read the context below and answer the specific question. Keep it concise.

--- Discussion Context ---
${context}

--- Question ---
${query}
`;
}
