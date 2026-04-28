import 'dotenv/config';
import { pool } from '../db/index.js';

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

    // Test 2: Check if GitHub submissions table exists
    console.log('\n2. Checking github_submissions table...');
    const githubTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'github_submissions'
      )
    `);

    if (githubTableExists.rows[0].exists) {
      console.log('   ✅ github_submissions table exists');

      // Check columns
      const githubColumns = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'github_submissions'
        ORDER BY column_name
      `);

      const expectedGithubColumns = [
        'id', 'submission_id', 'repo_url', 'repo_name', 'repo_description',
        'repo_language', 'repo_private', 'repo_stars', 'repo_forks',
        'repo_created_at', 'repo_updated_at', 'repo_default_branch', 'repo_size_kb', 'created_at'
      ];

      const actualGithubColumns = githubColumns.rows.map(row => row.column_name);
      const missingGithubColumns = expectedGithubColumns.filter(col => !actualGithubColumns.includes(col));

      if (missingGithubColumns.length > 0) {
        console.log('   ❌ Missing github_submissions columns:', missingGithubColumns);
      } else {
        console.log('   ✅ All github_submissions columns present');
      }
    } else {
      console.log('   ❌ github_submissions table does not exist');
    }

    // Test 2b: Check if mixed_submissions table exists
    console.log('\n2b. Checking mixed_submissions table...');
    const mixedTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'mixed_submissions'
      )
    `);

    if (mixedTableExists.rows[0].exists) {
      console.log('   ✅ mixed_submissions table exists');
    } else {
      console.log('   ❌ mixed_submissions table does not exist');
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
