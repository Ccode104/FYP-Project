import { pool } from '../db/index.js';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Limits
const SAFE_LIMIT = 4000;
const WARNING_LIMIT = 6000;
const MAX_LIMIT = 8000;

function looksLikeLongFormRequest(query) {
  if (!query) return false;
  const normalized = query.toLowerCase();
  return [
    'explain in detail',
    'detailed answer',
    'long answer',
    'step by step',
    'elaborate',
    'deep dive',
    'comprehensive',
    'in depth',
    'compare',
    'discuss',
    'walk me through',
  ].some(keyword => normalized.includes(keyword));
}

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
  const rootMessage = chainMessages[0] || null;
  const rootMessageId = rootMessage?.id || messageId;

  const threadQuery = `
    WITH RECURSIVE thread_tree AS (
      SELECT id, parent_id, content, created_at, user_id, 0 AS depth
      FROM discussion_messages
      WHERE id = $1 AND course_offering_id = $2

      UNION ALL

      SELECT m.id, m.parent_id, m.content, m.created_at, m.user_id, tt.depth + 1
      FROM discussion_messages m
      INNER JOIN thread_tree tt ON m.parent_id = tt.id
      WHERE m.course_offering_id = $2
    )
    SELECT * FROM thread_tree ORDER BY created_at ASC, id ASC
  `;

  const threadResult = await pool.query(threadQuery, [rootMessageId, offeringId]);
  const threadMessages = threadResult.rows;

  const directRepliesResult = await pool.query(
    `
      SELECT COUNT(*)::int AS count
      FROM discussion_messages
      WHERE parent_id = $1 AND course_offering_id = $2
    `,
    [messageId, offeringId]
  );

  const msgMap = new Map();
  const allRawMessages = [...chainMessages, ...threadMessages];
  
  for (const msg of allRawMessages) {
    if (!msgMap.has(msg.id)) {
      msgMap.set(msg.id, msg);
    }
  }

  // Optimize and sanitize: sort by created_at
  const finalMessages = Array.from(msgMap.values()).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  
  let formattedContext = '';
  for (const msg of finalMessages) {
    const rawContent = (msg.content || '').trim();
    if (rawContent.length < 5 && msg.id !== messageId) {
      continue;
    }
    
    const sanitized = sanitizeContent(rawContent);
    const roleStr =
      msg.id === rootMessageId
        ? '[THREAD ROOT]'
        : msg.id === messageId
          ? '[TARGET MESSAGE]'
          : '[THREAD REPLY]';
    formattedContext += `--- Message ID: ${msg.id} ${roleStr} ---\n${sanitized}\n\n`;
  }

  const tokenCount = estimateTokens(formattedContext);
  const summary = `Fetched thread root, ancestor chain (${chainMessages.length}), and thread messages (${threadMessages.length}). Total context messages deduped: ${finalMessages.length}.`;

  return {
    full_context_text: formattedContext,
    context_token_count: tokenCount,
    context_used_summary: summary,
    thread_stats: {
      root_message_id: rootMessageId,
      target_message_id: messageId,
      total_thread_messages: threadMessages.length,
      direct_reply_count_for_target: directRepliesResult.rows[0]?.count || 0,
    },
  };
}

/**
 * Core function to generate the AI response or fallback
 */
export async function generateAiResponse(messageId, offeringId, userQuery) {
  const contextData = await buildContextTree(messageId, offeringId);
  let { full_context_text, context_token_count, context_used_summary, thread_stats } = contextData;

  const extractedQuery = userQuery ? sanitizeContent(userQuery) : "Please assist with the tagged message.";
  const queryTokens = estimateTokens(extractedQuery);
  const instructionTokens = 500; // rough estimate for system prompts
  
  let totalEstimated = context_token_count + queryTokens + instructionTokens;

  if (looksLikeLongFormRequest(extractedQuery)) {
    return {
      mode: 'fallback_prompt',
      content: generateFallbackPrompt(full_context_text, extractedQuery),
      context_used: context_used_summary + ' (Used fallback because the request appears to need a long-form answer.)',
    };
  }

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
Your task is to respond to a user who tagged you inside a single discussion thread.
You are given only the context for that thread.
Do not count or describe unrelated course messages as part of the thread.
If the user asks about counts, use the provided thread statistics exactly.
Thread statistics:
- Total messages in this thread: ${thread_stats.total_thread_messages}
- Direct replies to the target message: ${thread_stats.direct_reply_count_for_target}
Provide a concise, helpful, and highly relevant answer based on the context.
Do NOT reveal sensitive data.`;

  const userPrompt = `Context:
${full_context_text}

User Query:
${extractedQuery}

Please provide your answer.`;

  try {
    if (!OPENROUTER_API_KEY) {
      console.warn('OPENROUTER_API_KEY not set, returning fallback prompt');
      return {
        mode: 'fallback_prompt',
        content: generateFallbackPrompt(full_context_text, extractedQuery),
        context_used: context_used_summary + ' (Fell back because API Key is missing).',
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000', // Update with actual site URL
        'X-Title': 'Discussion AI Assistant',
      },
      body: JSON.stringify({
        model: 'minimax/minimax-m2.5:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const answer = data.choices[0]?.message?.content || 'Unable to generate response.';

    return {
      mode: 'direct_answer',
      content: answer,
      context_used: context_used_summary,
    };
  } catch (err) {
    console.error('generateAiResponse error:', err);
    const isTimeout = err.name === 'AbortError';
    return {
      mode: 'fallback_prompt',
      content: generateFallbackPrompt(full_context_text, extractedQuery),
      context_used: context_used_summary + (isTimeout ? ' (Request timed out after 2m).' : ' (Fell back due to API Error).'),
    };
  }
}

/**
 * Streaming version of AI response generation
 */
export async function generateAiResponseStream(messageId, offeringId, userQuery) {
  const contextData = await buildContextTree(messageId, offeringId);
  let { full_context_text, context_token_count, context_used_summary, thread_stats } = contextData;

  const extractedQuery = userQuery ? sanitizeContent(userQuery) : 'Please assist with the tagged message.';
  const queryTokens = estimateTokens(extractedQuery);
  const instructionTokens = 500;

  let totalEstimated = context_token_count + queryTokens + instructionTokens;

  // Fallback checks (same as non-streaming)
  if (looksLikeLongFormRequest(extractedQuery) || totalEstimated >= MAX_LIMIT || !OPENROUTER_API_KEY) {
    return {
      mode: 'fallback_prompt',
      content: generateFallbackPrompt(full_context_text, extractedQuery),
      context_used: context_used_summary + ' (Immediate fallback triggered).',
    };
  }

  if (totalEstimated >= WARNING_LIMIT) {
    const maxContextChars = (SAFE_LIMIT - queryTokens - instructionTokens) * 4;
    full_context_text = '... [TRUNCATED] ...\n' + full_context_text.slice(-maxContextChars);
    context_used_summary += ' (Aggressively truncated).';
  }

  const systemPrompt = `You are an AI assistant in an educational discussion forum.
Your task is to respond to a user who tagged you inside a single discussion thread.
Thread statistics:
- Total messages in this thread: ${thread_stats.total_thread_messages}
- Direct replies to the target message: ${thread_stats.direct_reply_count_for_target}
Provide a concise, helpful answer based on the context.`;

  const userPrompt = `Context:\n${full_context_text}\n\nUser Query:\n${extractedQuery}\n\nPlease provide your answer.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Discussion AI Assistant',
      },
      body: JSON.stringify({
        model: 'minimax/minimax-m2.5:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    return {
      mode: 'stream',
      stream: response.body,
      context_used: context_used_summary,
      fallback_prompt: generateFallbackPrompt(full_context_text, extractedQuery),
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('generateAiResponseStream error:', err);
    return {
      mode: 'fallback_prompt',
      content: generateFallbackPrompt(full_context_text, extractedQuery),
      context_used: context_used_summary + ' (Stream fell back due to error or timeout).',
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
