/**
 * Apply AI-Enhanced Code Editor Tables Migration
 */

import 'dotenv/config';
import { pool } from '../db/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyAIEditorMigration() {
  const client = await pool.connect();
  try {
    console.log('🚀 Applying AI-Enhanced Code Editor migration...');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, './migrations/migrations/add_ai_enhanced_editor_tables.sql'),
      'utf8'
    );

    // Split by semicolon and execute each statement
    const statements = migrationSQL.split(';').filter(s => s.trim());
    
    let count = 0;
    for (const statement of statements) {
      if (statement.trim()) {
        await client.query(statement);
        count++;
      }
    }

    console.log(`✅ Migration applied successfully! (${count} statements executed)`);
    console.log('\n📊 New tables created:');
    console.log('   - code_analysis_logs');
    console.log('   - logical_bug_injections');
    console.log('   - ai_query_logs');
    console.log('   - contest_editor_settings');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
}

applyAIEditorMigration();
