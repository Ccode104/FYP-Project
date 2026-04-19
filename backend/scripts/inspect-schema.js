import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL =
  'postgresql://postgres:BT22CSE104atvnit@db.vzizykcqdyyhbbhmmpcs.supabase.co:5432/postgres';

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const coResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'course_offerings'
    `);
    console.log(
      'Course_offerings columns:',
      coResult.rows.map(r => r.column_name)
    );
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
