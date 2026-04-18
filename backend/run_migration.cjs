const { pool } = require('./db/index.js');
const fs = require('fs').promises;

async function runMigration() {
  try {
    const sql = await fs.readFile('./prisma/add_drive_file_id_migration.sql', 'utf8');
    
    console.log('Running migration...');
    const result = await pool.query(sql);
    console.log('Migration executed:', result.command);
    
    // Verify column exists
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'videos' AND column_name = 'drive_file_id'
    `);
    
    if (columns.rows.length > 0) {
      console.log('✅ SUCCESS: drive_file_id column added:', columns.rows[0]);
    } else {
      console.log('❌ Column still missing');
    }
    
    // Test the problematic query
    const testQuery = await pool.query(`
      SELECT id, title, drive_file_id FROM videos LIMIT 1
    `);
    console.log('✅ Query test passed:', testQuery.rows.length, 'rows');
    
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

runMigration();

