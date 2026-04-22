import { pool } from './db/index.js';
import { generateAiResponse, buildContextTree } from './services/discussionAiService.js';

async function setupTestData() {
  const offRes = await pool.query('SELECT id FROM course_offerings LIMIT 1');
  const offeringId = offRes.rows[0]?.id || 1;
  const userRes = await pool.query('SELECT id FROM users LIMIT 2');
  const user1 = userRes.rows[0]?.id || 1;
  const user2 = userRes.rows[1]?.id || 2;

  console.log('Using offeringId:', offeringId, 'user1:', user1, 'user2:', user2);
  console.log('Inserting test messages...');
  // Root message
  const r1 = await pool.query(`INSERT INTO discussion_messages (course_offering_id, user_id, content) VALUES ($1, $2, 'How does Dijkstra work?') RETURNING id`, [offeringId, user1]);
  const rootId = r1.rows[0].id;

  // Child 1
  const r2 = await pool.query(`INSERT INTO discussion_messages (course_offering_id, user_id, parent_id, content) VALUES ($1, $2, $3, 'It uses a priority queue.') RETURNING id`, [offeringId, user2, rootId]);
  const child1Id = r2.rows[0].id;

  // Child 2
  const r3 = await pool.query(`INSERT INTO discussion_messages (course_offering_id, user_id, parent_id, content) VALUES ($1, $2, $3, 'Can you give an example? my email is test@example.com.') RETURNING id`, [offeringId, user1, child1Id]);
  const child2Id = r3.rows[0].id;

  // Child 3 (Tagged AI)
  const r4 = await pool.query(`INSERT INTO discussion_messages (course_offering_id, user_id, parent_id, content) VALUES ($1, $2, $3, '@ai can you provide a code example?') RETURNING id`, [offeringId, user2, child2Id]);
  const taggedId = r4.rows[0].id;

  return { offeringId, taggedId, user1 };
}

async function runTest() {
  try {
    const { offeringId, taggedId, user1 } = await setupTestData();
    console.log('Test data created. Tagged Message ID:', taggedId);

    console.log('\\n--- Testing buildContextTree ---');
    const context = await buildContextTree(taggedId, offeringId);
    console.log(context.context_used_summary);
    console.log('Token count:', context.context_token_count);
    if (context.full_context_text.includes('test@example.com')) {
      console.error('FAIL: Email not sanitized!');
    } else if (context.full_context_text.includes('[EMAIL REMOVED]')) {
      console.log('PASS: Email sanitized.');
    }

    console.log('\\n--- Testing generateAiResponse (Normal) ---');
    const response = await generateAiResponse(taggedId, offeringId, 'can you provide a code example?');
    console.log('Mode:', response.mode);
    console.log('Content snippet:', response.content.substring(0, 100));
    console.log('Context used:', response.context_used);

    console.log('\\n--- Testing generateAiResponse (Fallback Mode) ---');
    // Inject huge context to simulate limits. Since we can't easily fake the DB, we can manually call generateFallbackPrompt or monkey-patch to test limit logic, but let's just insert a massive message.
    const massiveText = 'word '.repeat(35000); // 175k chars ~ 43k tokens
    await pool.query(`INSERT INTO discussion_messages (course_offering_id, user_id, parent_id, content) VALUES ($1, $2, $3, $4)`, [offeringId, user1, taggedId, massiveText]);
    
    const fallbackResponse = await generateAiResponse(taggedId, offeringId, 'can you provide a code example?');
    console.log('Mode:', fallbackResponse.mode);
    console.log('Context used:', fallbackResponse.context_used);
    if (fallbackResponse.mode === 'fallback_prompt') {
      console.log('PASS: Triggered fallback mode for massive context.');
    } else {
      console.error('FAIL: Did not trigger fallback mode!');
    }

    // Clean up
    await pool.query('DELETE FROM discussion_messages WHERE course_offering_id = $1', [offeringId]);
    console.log('\\nTest completed and cleaned up.');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    process.exit(0);
  }
}

runTest();
