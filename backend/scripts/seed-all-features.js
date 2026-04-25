import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pool } from '../db/index.js';

const steps = [
  ['Schema fixes', path.resolve(process.cwd(), 'sql', 'demo-schema-fixes.sql')],
  ['Cleanup', path.resolve(process.cwd(), 'sql', 'demo-cleanup.sql')],
  ['Seed data', path.resolve(process.cwd(), 'sql', 'demo-seed.sql')],
];

const colors = {
  success: '\x1b[32m',
  error: '\x1b[31m',
  info: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(message, type = 'info') {
  console.log(`${colors[type] || colors.info}${message}${colors.reset}`);
}

async function seedDemoReadyData() {
  const client = await pool.connect();

  try {
    log('\nStarting demo-ready database reset and seed...\n');
    await client.query('BEGIN');

    for (const [label, filePath] of steps) {
      log(`- ${label}`);
      const sql = fs.readFileSync(filePath, 'utf8');
      await client.query(sql);
    }

    await client.query('COMMIT');

    log('\nDemo seed complete.\n', 'success');
    log('Credentials:', 'success');
    log('  student@gmail.com / password123', 'success');
    log('  teacher@gmail.com / password123', 'success');
    log('  ta@gmail.com / password123', 'success');
    log('  superadmin@gmail.com / password123', 'success');
  } catch (error) {
    await client.query('ROLLBACK');
    log(`\nSeed failed: ${error.message}`, 'error');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemoReadyData().catch(() => {
  process.exit(1);
});
