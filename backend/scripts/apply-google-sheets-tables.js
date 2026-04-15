import { config } from 'dotenv';
config({ path: 'backend/.env' });

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function applyMigration() {
  console.log('Creating Google Sheets tables...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_oauth_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL CHECK (provider IN ('google', 'github')),
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, provider)
    )
  `);
  console.log('Created user_oauth_tokens table');

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_user ON user_oauth_tokens(user_id)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_provider ON user_oauth_tokens(provider)
  `);
  console.log('Created indexes for user_oauth_tokens');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS assignment_sheets (
      id BIGSERIAL PRIMARY KEY,
      assignment_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      spreadsheet_id TEXT UNIQUE NOT NULL,
      spreadsheet_url TEXT NOT NULL,
      created_by BIGINT REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  console.log('Created assignment_sheets table');

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_assignment_sheets_assignment ON assignment_sheets(assignment_id)
  `);
  console.log('Created indexes for assignment_sheets');

  console.log('Migration complete!');
  await pool.end();
}

applyMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
