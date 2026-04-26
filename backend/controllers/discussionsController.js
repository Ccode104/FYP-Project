import { pool } from '../db/index.js';
import { generateAiResponse, generateAiResponseStream } from '../services/discussionAiService.js';

const messageSelect = `
  SELECT m.id, m.course_offering_id, m.user_id, m.parent_id, m.content, m.created_at,
         CASE
           WHEN m.user_id IS NULL THEN 'AI Assistant'
           ELSE u.name
         END AS author_name,
         CASE
           WHEN m.user_id IS NULL THEN 'assistant'::text
           ELSE u.role::text
         END AS author_role
  FROM discussion_messages m
  LEFT JOIN users u ON u.id = m.user_id
`;

async function hasAccess(offeringId, user) {
  if (!user) {
    return false;
  }
  if (user.role === 'admin') {
    return true;
  }
  const id = Number(offeringId);
  if (!id) {
    return false;
  }

  if (user.role === 'faculty') {
    const r = await pool.query('SELECT 1 FROM course_offerings WHERE id=$1 AND faculty_id=$2', [
      id,
      user.id,
    ]);
    if (r.rowCount > 0) {
      return true;
    }
  }

  if (user.role === 'ta') {
    const r = await pool.query('SELECT 1 FROM ta_assignments WHERE course_offering_id=$1 AND ta_id=$2', [
      id,
      user.id,
    ]);
    if (r.rowCount > 0) {
      return true;
    }
  }

  if (user.role === 'student') {
    const r = await pool.query('SELECT 1 FROM enrollments WHERE course_offering_id=$1 AND student_id=$2', [
      id,
      user.id,
    ]);
    if (r.rowCount > 0) {
      return true;
    }
  }

  return false;
}

export async function listMessages(req, res) {
  try {
    const offeringId = Number(req.params.offeringId);
    if (!offeringId) {
      return res.status(400).json({ error: 'Invalid offeringId' });
    }
    if (!(await hasAccess(offeringId, req.user))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const after = req.query.after ? new Date(String(req.query.after)) : null;
    const limit = Math.min(Number(req.query.limit || 200), 500);

    const params = [offeringId];
    let where = 'WHERE m.course_offering_id = $1';
    if (after && !isNaN(after.getTime())) {
      params.push(after.toISOString());
      where += ` AND m.created_at > $${params.length}`;
    }

    const q = `
      ${messageSelect}
      ${where}
      ORDER BY m.created_at ASC, m.id ASC
      LIMIT ${limit}
    `;
    const r = await pool.query(q, params);
    res.json({ messages: r.rows });
  } catch (err) {
    console.error('listMessages error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function postMessage(req, res) {
  try {
    const offeringId = Number(req.params.offeringId);
    const user = req.user;
    const { content, parent_id } = req.body || {};

    if (!offeringId) {
      return res.status(400).json({ error: 'Invalid offeringId' });
    }
    if (!(await hasAccess(offeringId, user))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const text = (content || '').toString().trim();
    if (!text) {
      return res.status(400).json({ error: 'Content required' });
    }

    let parentId = parent_id ? Number(parent_id) : null;
    if (Number.isNaN(parentId)) {
      parentId = null;
    }

    // Anyone with access can create a top-level message or reply
    if (parentId) {
      // Validate parent exists and belongs to same offering
      const p = await pool.query(
        'SELECT id FROM discussion_messages WHERE id=$1 AND course_offering_id=$2',
        [parentId, offeringId]
      );
      if (p.rowCount === 0) {
        return res.status(400).json({ error: 'Invalid parent_id' });
      }
    }

    const insertResult = await pool.query(
      `INSERT INTO discussion_messages (course_offering_id, user_id, parent_id, content)
       VALUES ($1,$2,$3,$4)
       RETURNING id`,
      [offeringId, user.id || null, parentId, text]
    );

    const newId = insertResult.rows[0].id;
    const r = await pool.query(`${messageSelect} WHERE m.id = $1`, [newId]);

    res.status(201).json({ message: r.rows[0] });
  } catch (err) {
    console.error('postMessage error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAiAssist(req, res) {
  try {
    const offeringId = Number(req.params.offeringId);
    const messageId = Number(req.params.messageId);
    const { user_query, stream } = req.body || {};

    if (!offeringId || !messageId) {
      return res.status(400).json({ error: 'Invalid offeringId or messageId' });
    }

    if (!(await hasAccess(offeringId, req.user))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const rootResult = await pool.query(
      `
        WITH RECURSIVE message_chain AS (
          SELECT id, parent_id
          FROM discussion_messages
          WHERE id = $1 AND course_offering_id = $2
          UNION ALL
          SELECT m.id, m.parent_id
          FROM discussion_messages m
          INNER JOIN message_chain mc ON m.id = mc.parent_id
          WHERE m.course_offering_id = $2
        )
        SELECT id FROM message_chain ORDER BY parent_id NULLS FIRST, id ASC LIMIT 1
      `,
      [messageId, offeringId]
    );

    const threadRootId = rootResult.rows[0]?.id || messageId;

    if (stream) {
      const aiResult = await generateAiResponseStream(messageId, offeringId, user_query);

      if (aiResult.mode === 'stream') {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        let fullContent = '';
        const reader = aiResult.stream.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunkStr = decoder.decode(value, { stream: true });
            const lines = chunkStr.split('\n');

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const dataStr = trimmed.slice(6);
              if (dataStr === '[DONE]') break;

              try {
                const data = JSON.parse(dataStr);
                const delta = data.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
                }
              } catch (e) {
                // Skip partial/malformed JSON
              }
            }
          }

          // Save final result to DB
          if (fullContent.trim()) {
            const insertResult = await pool.query(
              `INSERT INTO discussion_messages (course_offering_id, user_id, parent_id, content)
               VALUES ($1, NULL, $2, $3) RETURNING id`,
              [offeringId, threadRootId, fullContent]
            );
            const aiMessageResult = await pool.query(`${messageSelect} WHERE m.id = $1`, [
              insertResult.rows[0].id,
            ]);
            res.write(
              `data: ${JSON.stringify({
                done: true,
                ai_message: aiMessageResult.rows[0],
                mode: 'direct_answer',
              })}\n\n`
            );
          } else {
            // Fallback if empty stream
            res.write(`data: ${JSON.stringify({ mode: 'fallback_prompt', content: aiResult.fallback_prompt })}\n\n`);
          }
          res.end();
          return;
        } catch (streamErr) {
          console.error('Stream processing error:', streamErr);
          res.write(
            `data: ${JSON.stringify({
              mode: 'fallback_prompt',
              content: aiResult.fallback_prompt,
              error: 'Stream interrupted',
            })}\n\n`
          );
          res.end();
          return;
        }
      } else {
        // Immediate fallback
        return res.json(aiResult);
      }
    }

    // Non-streaming fallback
    const aiResult = await generateAiResponse(messageId, offeringId, user_query);
    if (aiResult.mode === 'direct_answer') {
      const insertResult = await pool.query(
        `INSERT INTO discussion_messages (course_offering_id, user_id, parent_id, content)
         VALUES ($1, NULL, $2, $3) RETURNING id`,
        [offeringId, threadRootId, aiResult.content]
      );
      const aiMessageResult = await pool.query(`${messageSelect} WHERE m.id = $1`, [
        insertResult.rows[0].id,
      ]);
      return res.json({ ...aiResult, ai_message: aiMessageResult.rows[0] });
    } else {
      return res.json(aiResult);
    }
  } catch (err) {
    console.error('getAiAssist error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
