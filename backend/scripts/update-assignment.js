import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL =
  'postgresql://postgres:BT22CSE104atvnit@db.vzizykcqdyyhbbhmmpcs.supabase.co:5432/postgres';

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const query = `
      SELECT a.id, a.title, a.assignment_type, c.code as course_code
      FROM assignments a
      JOIN course_offerings co ON a.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      WHERE c.code = 'CS201' 
        AND a.title ILIKE '%lab-04-graph-optimization%'
    `;

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      console.log(
        'No assignment found with title containing "lab-04-graph-optimization" in course CS201'
      );
      return;
    }

    const assignment = result.rows[0];
    console.log('Assignment ID:', assignment.id);
    console.log('Current assignment_type:', assignment.assignment_type);
    console.log('Title:', assignment.title);
    console.log('Course code:', assignment.course_code);

    if (assignment.assignment_type !== 'github') {
      await pool.query('UPDATE assignments SET assignment_type = $1 WHERE id = $2', [
        'github',
        assignment.id,
      ]);
      console.log('Updated assignment_type to "github"');
    } else {
      console.log('No update needed - assignment_type is already "github"');
    }
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
