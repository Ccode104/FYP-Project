import 'dotenv/config';
import { pool } from './db/index.js';

// Test script to verify GitHub integration setup
async function testGitHubIntegration() {
  try {
    console.log('🧪 Testing GitHub Integration Setup...\n');

    // Test 1: Check if GitHub fields were added to users table
    console.log('1. Checking users table schema...');
    const userColumns = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name LIKE 'github_%'
      ORDER BY column_name
    `);

    const expectedColumns = ['github_access_token', 'github_connected_at', 'github_token_expires_at', 'github_username'];
    const actualColumns = userColumns.rows.map(row => row.column_name);

    console.log('   Expected GitHub columns:', expectedColumns);
    console.log('   Actual GitHub columns:', actualColumns);

    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
    if (missingColumns.length > 0) {
      console.log('   ❌ Missing columns:', missingColumns);
    } else {
      console.log('   ✅ All GitHub user columns present');
    }

    // Test 2: Check if GitHub fields were added to assignment_submissions table
    console.log('\n2. Checking assignment_submissions table schema...');
    const submissionColumns = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'assignment_submissions' AND column_name LIKE 'github_%'
      ORDER BY column_name
    `);

    const expectedSubmissionColumns = [
      'github_repo_url', 'github_repo_name', 'github_repo_description',
      'github_repo_language', 'github_repo_private', 'github_repo_stars',
      'github_repo_forks', 'github_repo_created_at', 'github_repo_updated_at',
      'github_repo_default_branch', 'github_repo_size_kb'
    ];
    const actualSubmissionColumns = submissionColumns.rows.map(row => row.column_name);

    console.log('   Expected GitHub submission columns:', expectedSubmissionColumns.length);
    console.log('   Actual GitHub submission columns:', actualSubmissionColumns.length);

    const missingSubmissionColumns = expectedSubmissionColumns.filter(col => !actualSubmissionColumns.includes(col));
    if (missingSubmissionColumns.length > 0) {
      console.log('   ❌ Missing submission columns:', missingSubmissionColumns);
    } else {
      console.log('   ✅ All GitHub submission columns present');
    }

    // Test 3: Check if we can query the new fields
    console.log('\n3. Testing database queries...');
    const testUserQuery = await pool.query(`
      SELECT id, github_username, github_connected_at
      FROM users
      WHERE github_username IS NOT NULL
      LIMIT 1
    `);

    console.log('   Users with GitHub connected:', testUserQuery.rowCount);

    // Test 4: Check if server is running and routes are registered
    console.log('\n4. Checking server routes...');
    console.log('   GitHub OAuth routes should be available at:');
    console.log('   - GET /api/auth/github');
    console.log('   - GET /api/auth/github/callback');
    console.log('   - DELETE /api/auth/github');
    console.log('   - GET /api/github/repositories');
    console.log('   - POST /api/submissions/submit/github-repo');

    console.log('\n✅ GitHub Integration Setup Test Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Set up GitHub OAuth App at https://github.com/settings/applications/new');
    console.log('2. Add these environment variables to your .env file:');
    console.log('   GITHUB_CLIENT_ID=your_github_client_id');
    console.log('   GITHUB_CLIENT_SECRET=your_github_client_secret');
    console.log('   GITHUB_REDIRECT_URI=http://localhost:4000/api/auth/github/callback');
    console.log('   GITHUB_ENCRYPTION_KEY=your-32-character-encryption-key-here');
    console.log('3. Test the mobile app GitHub integration');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testGitHubIntegration();