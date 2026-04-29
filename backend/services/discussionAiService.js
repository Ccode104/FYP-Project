import { pool } from '../db/index.js';
import { logAiQuery } from './aiLogger.js';

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

function isModelError(errorData) {
  const msg = String(errorData?.error?.message || '').toLowerCase();
  return msg.includes('model') || msg.includes('unsupported') || msg.includes('not found');
}

function buildOpenRouterBody(model, messages, stream = false) {
  return {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 1024,
    stream,
  };
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
  const citationMetadata = [];

  for (const msg of finalMessages) {
    const rawContent = (msg.content || '').trim();
    if (rawContent.length < 5 && msg.id !== messageId) {
      continue;
    }
    
    // Scan for citations in the content
    const assignmentMatches = rawContent.match(/\/courses\/\d+\/assignments\/(\d+)/g);
    if (assignmentMatches) {
      for (const match of assignmentMatches) {
        const id = match.split('/').pop();
        const meta = await fetchAssignmentMetadata(id);
        if (meta) citationMetadata.push(meta);
      }
    }

    const quizMatches = rawContent.match(/\/courses\/\d+\/quizzes\/(\d+)/g);
    if (quizMatches) {
      for (const match of quizMatches) {
        const id = match.split('/').pop();
        const meta = await fetchQuizMetadata(id);
        if (meta) citationMetadata.push(meta);
      }
    }

    const videoMatches = rawContent.match(/\/courses\/\d+\/video\/(\d+)/g) || rawContent.match(/\/videos\/(\d+)/g);
    if (videoMatches) {
      for (const match of videoMatches) {
        const id = match.split('/').pop();
        const meta = await fetchVideoMetadata(id);
        if (meta) citationMetadata.push(meta);
      }
    }

    const sanitized = sanitizeContent(rawContent).replace(/^<!--DELETED-->/, '');
    
    // Track if message is in the direct chain
    const isDirectBranch = chainMessages.some(m => m.id === msg.id);

    // Compute depth roughly based on parent pointers
    let depth = 0;
    let currId = msg.parent_id;
    while(currId && msgMap.has(currId)) {
      depth++;
      currId = msgMap.get(currId).parent_id;
    }

    let roleStr = `[Depth: ${depth}]`;
    if (msg.id === rootMessageId) roleStr += ' [THREAD ROOT]';
    else if (msg.id === messageId) roleStr += ' [TARGET MESSAGE]';
    else if (isDirectBranch) roleStr += ' [DIRECT ANCESTOR BRANCH]';
    else roleStr += ' [SIBLING BRANCH - LOWER PRIORITY]';

    formattedContext += `--- Message ID: ${msg.id} ${roleStr} ---\n${sanitized}\n\n`;
  }

  // Add resolved citation metadata to the context
  if (citationMetadata.length > 0) {
    formattedContext = `--- RESOLVED RESOURCE CITATIONS ---\n${Array.from(new Set(citationMetadata)).join('\n\n')}\n\n` + formattedContext;
  }

  const tokenCount = estimateTokens(formattedContext);
  const summary = `Fetched thread root, ancestor chain (${chainMessages.length}), and thread messages (${threadMessages.length}). Resolved ${citationMetadata.length} citations.`;

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
    final_messages: finalMessages,
  };
}

/**
 * Helper to fetch assignment metadata for citations
 */
async function fetchAssignmentMetadata(assignmentId) {
  try {
    const res = await pool.query(
      `SELECT a.title, a.description, a.due_at, a.assignment_type, c.code
       FROM assignments a
       JOIN course_offerings co ON a.course_offering_id = co.id
       JOIN courses c ON co.course_id = c.id
       WHERE a.id = $1`,
      [assignmentId]
    );
    if (res.rowCount > 0) {
      const a = res.rows[0];
      return `[Citation Metadata for Assignment ${assignmentId}]
Title: ${a.title}
Course: ${a.code}
Type: ${a.assignment_type}
Due: ${a.due_at}
Description: ${a.description || 'No description'}`;
    }
  } catch (e) {
    console.error('fetchAssignmentMetadata error:', e);
  }
  return null;
}

/**
 * Helper to fetch quiz metadata for citations
 */
async function fetchQuizMetadata(quizId) {
  try {
    const res = await pool.query(
      `SELECT q.title, q.description, q.time_limit, q.start_at, q.end_at, c.code
       FROM quizzes q
       JOIN course_offerings co ON q.course_offering_id = co.id
       JOIN courses c ON co.course_id = c.id
       WHERE q.id = $1`,
      [quizId]
    );
    if (res.rowCount > 0) {
      const q = res.rows[0];
      return `[Citation Metadata for Quiz ${quizId}]
Title: ${q.title}
Course: ${q.code}
Time Limit: ${q.time_limit} mins
Available: ${q.start_at} to ${q.end_at}
Description: ${q.description || 'No description'}`;
    }
  } catch (e) {
    console.error('fetchQuizMetadata error:', e);
  }
  return null;
}

/**
 * Helper to fetch video metadata for citations
 */
async function fetchVideoMetadata(videoId) {
  try {
    const res = await pool.query(
      `SELECT v.title, v.description, v.youtube_url, c.code
       FROM videos v
       JOIN course_offerings co ON v.course_offering_id = co.id
       JOIN courses c ON co.course_id = c.id
       WHERE v.id = $1`,
      [videoId]
    );
    if (res.rowCount > 0) {
      const v = res.rows[0];
      return `[Citation Metadata for Video ${videoId}]
Title: ${v.title}
Course: ${v.code}
URL: ${v.youtube_url}
Description: ${v.description || 'No description'}`;
    }
  } catch (e) {
    console.error('fetchVideoMetadata error:', e);
  }
  return null;
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

IMPORTANT CONTEXT PRIORITIZATION:
The discussion tree has been flattened into a list, but each message is labeled with its [Depth] and branch status.
- Prioritize messages labeled [DIRECT ANCESTOR BRANCH] (this is the conversation path leading directly to the target).
- Messages labeled [SIBLING BRANCH - LOWER PRIORITY] belong to other conversations in the same thread and should generally be ignored unless highly relevant.
- You are replying to the [TARGET MESSAGE]. Provide a concise, helpful, and highly relevant answer based on the context.
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

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    async function sendRequest(model) {
      return fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000', // Update with actual site URL
          'X-Title': 'Discussion AI Assistant',
        },
        body: JSON.stringify(buildOpenRouterBody(model, messages, false)),
        signal: controller.signal,
      });
    }

    let response = await sendRequest('minimax/minimax-m2.5:free');
    let errorData = null;
    if (!response.ok) {
      errorData = await response.json().catch(() => null);
      console.warn(`Primary model failed with status ${response.status}. Retrying with fallback model...`);
      response = await sendRequest('gpt-4o-mini');
      if (!response.ok) {
        errorData = await response.json().catch(() => null);
      }
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${errorData?.error?.message || response.statusText || 'Unknown error'}`);
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

IMPORTANT CONTEXT PRIORITIZATION:
The discussion tree has been flattened into a list, but each message is labeled with its [Depth] and branch status.
- Prioritize messages labeled [DIRECT ANCESTOR BRANCH] (this is the conversation path leading directly to the target).
- Messages labeled [SIBLING BRANCH - LOWER PRIORITY] belong to other conversations in the same thread and should generally be ignored unless highly relevant.
- You are replying to the [TARGET MESSAGE]. Provide a concise, helpful answer based on its direct context.`;

  const userPrompt = `Context:\n${full_context_text}\n\nUser Query:\n${extractedQuery}\n\nPlease provide your answer.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  async function sendRequest(model) {
    return fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Discussion AI Assistant',
      },
      body: JSON.stringify(buildOpenRouterBody(model, messages, true)),
      signal: controller.signal,
    });
  }

  try {
    let response = await sendRequest('minimax/minimax-m2.5:free');
    let errorData = null;

    if (!response.ok) {
      errorData = await response.json().catch(() => null);
      console.warn(`Primary model failed with status ${response.status}. Retrying with fallback model...`);
      response = await sendRequest('gpt-4o-mini');
      if (!response.ok) {
        errorData = await response.json().catch(() => null);
      }
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorMessage = errorData?.error?.message || response.statusText || 'Unknown error';
      throw new Error(`OpenRouter API error: ${errorMessage}`);
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

async function fetchResourceMetadata(offeringId, resourceIds) {
  if (!Array.isArray(resourceIds) || resourceIds.length === 0) {
    return '';
  }

  const sanitizedIds = resourceIds.filter(id => Number.isInteger(id) && id > 0);
  if (sanitizedIds.length === 0) {
    return '';
  }

  const placeholders = sanitizedIds.map((_, idx) => `$${idx + 1}`).join(', ');
  const params = [...sanitizedIds, offeringId];
  const q = `
    SELECT id, title, description, resource_type, filename, storage_path
    FROM resources
    WHERE course_offering_id = $${sanitizedIds.length + 1}
      AND id IN (${placeholders})
  `;

  const r = await pool.query(q, params);
  if (!r.rows.length) {
    return '';
  }

  return r.rows
    .map(resource => {
      const description = resource.description || 'No description available.';
      return `- [${resource.resource_type}] ${resource.title}: ${description}`;
    })
    .join('\n');
}

function buildDeepDivePrompt(contextData, userQuery, selectedResourcesText) {
  const { full_context_text, context_used_summary, final_messages } = contextData;
  const lastAiMessage = final_messages
    .filter(msg => msg.user_id === null)
    .slice(-1)[0];

  const previousAiContent = lastAiMessage ? `Previous AI answer:\n${sanitizeContent(lastAiMessage.content)}\n\n` : '';
  const resourcesContent = selectedResourcesText
    ? `Selected resources and metadata:\n${selectedResourcesText}\n\n`
    : '';

  return `Please copy and paste the following prompt into ChatGPT or another LLM:

Instruction: You are an educational assistant. Use the context and any selected resources to answer the user's deep dive question. Keep the response grounded in the provided discussion thread and resource metadata.

--- Thread Summary ---
${context_used_summary}

${previousAiContent}${resourcesContent}--- Discussion Context ---
${full_context_text}

--- Deep Dive Question ---
${userQuery}

If the user asks for examples or step-by-step guidance, include those in a concise manner. Do not invent context that is not present in the thread.`;
}

export async function generateDeepDivePrompt(messageId, offeringId, userQuery, resourceIds = []) {
  const contextData = await buildContextTree(messageId, offeringId);
  const resourceText = await fetchResourceMetadata(offeringId, resourceIds);
  const prompt = buildDeepDivePrompt(contextData, sanitizeContent(userQuery), resourceText);

  return {
    mode: 'deep_dive_prompt',
    prompt,
    context_used: contextData.context_used_summary,
    resource_metadata: resourceText || undefined,
  };
}
