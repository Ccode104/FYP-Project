import pkg from 'pg';
const { Pool } = pkg;
import { logger } from '../utils/logger.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL not set in env');
}

// SSL configuration - only use SSL if DATABASE_URL contains SSL requirements
// For local development, SSL is usually not required
const sslConfig = connectionString.includes('sslmode=require') || connectionString.includes('ssl=true')
  ? {
      rejectUnauthorized: false, // Set to true in production with proper certificates
      require: true
    }
  : false;

export const pool = new Pool({
  connectionString,
  ssl: sslConfig
});

pool.on('error', (err) => logger.error('Postgres pool error', err));
