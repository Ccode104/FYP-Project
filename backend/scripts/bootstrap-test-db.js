import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { pool } from '../db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

const setupFiles = [
  'prisma/schema.sql',
  'prisma/migrations/comprehensive_lms_schema.sql',
  'prisma/migrations/codex_bootstrap_compat.sql',
  'prisma/migrations/codex_bootstrap_compat_2.sql',
  'prisma/live_lectures_migration.sql',
  'prisma/migrations/add_live_lecture_participant_states.sql',
  'prisma/migrations/add_whiteboard_table.sql',
  'prisma/migrations/add_assignment_comments.sql',
  'prisma/migrations/add_contests_tables.sql',
  'prisma/migrations/add_ai_enhanced_editor_tables.sql',
  'prisma/migrations/add_flexible_assignments.sql',
  'prisma/migrations/add_file_size_limit_to_assignments.sql',
  'prisma/migrations/add_github_integration_fields.sql',
  'prisma/migrations/add_github_repository_submission_fields.sql',
  'prisma/migrations/add_grading_system_tables.sql',
  'prisma/migrations/add_plagiarism_tables.sql',
  'prisma/migrations/add_resume_requests_table.sql',
  'prisma/migrations/add_template_driver_code_to_code_questions.sql',
  'prisma/migrations/add_user_approval_system.sql',
  'prisma/migrations/add_viva_tables.sql',
  'prisma/migrations/add_zip_file_support_to_assignment_submissions.sql',
  'prisma/migrations/enhanced_proctoring_schema.sql',
  'prisma/migrations/fix_proctoring_session_foreign_key.sql',
  'prisma/migrations/make_password_hash_nullable.sql',
  'prisma/migrations/refactor_assignments_single_type.sql',
  'prisma/migrations/refactor_submissions_schema.sql',
  'prisma/migrations/add_super_admin.sql',
  'sql/bootstrap-test-data.sql'
];

async function ensureSetupHistory() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS codex_setup_history (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `);
}

function readSql(relativePath) {
  const absolutePath = path.join(backendRoot, relativePath);
  return {
    absolutePath,
    relativePath,
    sql: fs.readFileSync(absolutePath, 'utf8')
  };
}

function checksumFor(sql) {
  return crypto.createHash('sha256').update(sql).digest('hex');
}

async function alreadyApplied(relativePath, checksum) {
  const result = await pool.query(
    'SELECT checksum FROM codex_setup_history WHERE filename = $1',
    [relativePath]
  );
  if (result.rowCount === 0) {
    return false;
  }
  if (result.rows[0].checksum !== checksum) {
    console.warn(`Skipping ${relativePath} with checksum drift because it was already applied`);
  }
  return true;
}

async function markApplied(relativePath, checksum) {
  await pool.query(
    `INSERT INTO codex_setup_history (filename, checksum)
     VALUES ($1, $2)
     ON CONFLICT (filename) DO NOTHING`,
    [relativePath, checksum]
  );
}

async function runSqlFile(relativePath) {
  const { sql } = readSql(relativePath);
  const checksum = checksumFor(sql);

  if (await alreadyApplied(relativePath, checksum)) {
    console.log(`Skipping ${relativePath} (already applied)`);
    return;
  }

  console.log(`Applying ${relativePath}`);
  await pool.query(sql);
  await markApplied(relativePath, checksum);
}

async function verifyCounts() {
  const tables = [
    'users',
    'courses',
    'course_offerings',
    'resources',
    'assignments',
    'assignment_comments',
    'assignment_submissions',
    'file_submissions',
    'github_submissions',
    'mixed_submissions',
    'assignment_component_submissions',
    'quizzes',
    'proctoring_sessions',
    'resume_requests',
    'code_questions',
    'contests',
    'contest_submissions',
    'code_analysis_logs',
    'ai_query_logs',
    'plagiarism_checks',
    'grading_tasks',
    'regrade_requests',
    'viva_sessions',
    'live_lectures',
    'whiteboard_states',
    'support_tickets',
    'messages',
    'notifications'
  ];

  console.log('\nVerification counts:');
  for (const table of tables) {
    const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
    console.log(`${table}: ${result.rows[0].count}`);
  }
}

async function bootstrap() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  await ensureSetupHistory();

  for (const file of setupFiles) {
    await runSqlFile(file);
  }

  await verifyCounts();
}

bootstrap()
  .catch((error) => {
    console.error('Database bootstrap failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
