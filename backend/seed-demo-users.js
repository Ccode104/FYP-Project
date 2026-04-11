import 'dotenv/config';
import { pool } from './db/index.js';
import bcrypt from 'bcrypt';

async function addDemoUsers() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    console.log('🌱 Adding demo users...\n');
    
    // Faculty
    for (let i = 1; i <= 3; i++) {
      const result = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, is_active, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
         RETURNING email, role`,
        [`Faculty ${i}`, `faculty${i}@demo.com`, hashedPassword, 'faculty', true],
      );
      console.log(`✅ Faculty ${i}:`, result.rows[0].email);
    }
    
    // TAs
    for (let i = 1; i <= 2; i++) {
      const result = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, is_active, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
         RETURNING email, role`,
        [`TA ${i}`, `ta${i}@demo.com`, hashedPassword, 'ta', true],
      );
      console.log(`✅ TA ${i}:`, result.rows[0].email);
    }
    
    // Students
    for (let i = 1; i <= 5; i++) {
      const result = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, is_active, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
         RETURNING email, role`,
        [`Student ${i}`, `student${i}@demo.com`, hashedPassword, 'student', true],
      );
      console.log(`✅ Student ${i}:`, result.rows[0].email);
    }
    
    console.log('\n✅ Demo users created successfully!');
    console.log('\n📝 Demo Credentials:');
    console.log('  Admin: admin@demo.com / password123');
    console.log('  Faculty: faculty1@demo.com / password123');
    console.log('  TA: ta1@demo.com / password123');
    console.log('  Student: student1@demo.com / password123');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

addDemoUsers();
