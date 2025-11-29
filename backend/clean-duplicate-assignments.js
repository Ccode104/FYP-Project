import 'dotenv/config';
import { pool } from './db/index.js';

async function cleanDuplicateAssignments() {
  try {
    console.log('Checking for duplicate assignments in CSE304...');

    // Get CSE304 course offering
    const offeringRes = await pool.query(`
      SELECT co.id FROM course_offerings co
      JOIN courses c ON co.course_id = c.id
      WHERE c.code = 'CSE304'
    `);

    if (offeringRes.rowCount === 0) {
      console.log('CSE304 course offering not found');
      return;
    }

    const offeringId = offeringRes.rows[0].id;

    // Get all assignments for CSE304
    const assignmentsRes = await pool.query(`
      SELECT id, title, assignment_type,
             (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) as submission_count
      FROM assignments a
      WHERE course_offering_id = $1
      ORDER BY title, id
    `, [offeringId]);

    console.log('Current assignments:');
    assignmentsRes.rows.forEach(row => {
      console.log(`${row.id}: ${row.title} (${row.assignment_type}) - ${row.submission_count} submissions`);
    });

    // Group by title and find duplicates
    const titleGroups = {};
    assignmentsRes.rows.forEach(row => {
      if (!titleGroups[row.title]) {
        titleGroups[row.title] = [];
      }
      titleGroups[row.title].push(row);
    });

    // For each title with duplicates, keep the preferred one, remove others
    for (const [title, assignments] of Object.entries(titleGroups)) {
      if (assignments.length > 1) {
        console.log(`\nDuplicates found for "${title}":`);
        assignments.forEach(a => console.log(`  ${a.id}: ${a.assignment_type} - ${a.submission_count} submissions`));

        // Define preference order for assignment types
        const typePreference = { 'ppt': 1, 'pdf': 1, 'code': 2, 'mixed': 3, 'practice': 4 };

        // Sort by: first no submissions, then by preferred type
        assignments.sort((a, b) => {
          // First prioritize no submissions
          if (a.submission_count !== b.submission_count) {
            return a.submission_count - b.submission_count;
          }
          // Then by type preference (lower number = higher preference)
          const aPref = typePreference[a.assignment_type] || 99;
          const bPref = typePreference[b.assignment_type] || 99;
          return aPref - bPref;
        });

        const toKeep = assignments[0];
        const toDelete = assignments.slice(1);

        console.log(`Keeping assignment ${toKeep.id} (${toKeep.submission_count} submissions)`);
        console.log(`Deleting assignments: ${toDelete.map(a => a.id).join(', ')}`);

        // Delete the ones with submissions
        for (const assignment of toDelete) {
          await pool.query('DELETE FROM assignments WHERE id = $1', [assignment.id]);
          console.log(`Deleted assignment ${assignment.id}`);
        }
      }
    }

    console.log('\nCleanup completed!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

cleanDuplicateAssignments();