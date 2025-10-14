import pkg from 'pg';
const { Pool } = pkg;
import { logger } from '../utils/logger.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL not set in env');
}

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: true,
    require: true
  }
});

pool.on('error', (err) => logger.error('Postgres pool error', err));
