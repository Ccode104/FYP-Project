import axios from 'axios';
import 'dotenv/config';

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:4000';

// Test authentication - you'll need to replace with actual token
const AUTH_TOKEN = 'your-jwt-token-here'; // Replace with actual token

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`
};

async function testAPI(endpoint, method = 'GET', body = null) {
  try {
    const config = {
      method,
      headers,
      url: `${BASE_URL}${endpoint}`
    };

    if (body) {
      config.data = body;
    }

    const response = await axios(config);

    console.log(`\n=== ${method} ${endpoint} ===`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));

    return { status: response.status, data: response.data };
  } catch (error) {
    console.error(`Error testing ${endpoint}:`, error.response?.data || error.message);
    return { status: error.response?.status || 500, error: error.response?.data || error.message };
  }
}

async function runTests() {
  console.log('🧪 Testing New LMS APIs\n');

  // Test Rubrics API
  console.log('📏 Testing Rubrics API');

  // Create a rubric
  const rubricData = {
    title: 'Code Quality Rubric',
    description: 'Evaluates code quality aspects',
    course_offering_id: 1, // Replace with actual course offering ID
    criteria: [
      { title: 'Code Structure', description: 'Organization and readability', max_points: 25, weight: 1.0 },
      { title: 'Functionality', description: 'Correctness of implementation', max_points: 25, weight: 1.0 },
      { title: 'Best Practices', description: 'Following coding standards', max_points: 25, weight: 1.0 },
      { title: 'Documentation', description: 'Comments and documentation', max_points: 25, weight: 1.0 }
    ]
  };

  await testAPI('/api/rubrics', 'POST', rubricData);

  // Get rubrics for course
  await testAPI('/api/rubrics/course/1'); // Replace with actual course offering ID

  // Test Support Tickets API
  console.log('\n🎫 Testing Support Tickets API');

  // Create a ticket
  const ticketData = {
    title: 'Cannot access assignment submission',
    description: 'Getting 403 error when trying to submit assignment #5',
    category: 'bug_report',
    priority: 'high',
    course_offering_id: 1 // Optional
  };

  await testAPI('/api/support/tickets', 'POST', ticketData);

  // Get user tickets
  await testAPI('/api/support/tickets');

  // Test Viva AI Questions API
  console.log('\n🎓 Testing Viva AI Questions API');

  // Generate viva questions
  const vivaData = {
    vivaSessionId: 1, // Replace with actual viva session ID
    studentId: 1,     // Replace with actual student ID
    difficulty: 'medium',
    count: 3
  };

  await testAPI('/api/viva/generate-questions', 'POST', vivaData);

  console.log('\n✅ API Testing Complete');
  console.log('\n📝 Note: Replace AUTH_TOKEN, course_offering_id, vivaSessionId, and studentId with actual values');
  console.log('🔧 Use the Swagger UI at /api-docs for interactive testing');
}

// Instructions for manual testing
function printManualTestInstructions() {
  console.log('\n📋 Manual Testing Instructions:');
  console.log('1. Get JWT token by logging in via /api/auth/login');
  console.log('2. Replace AUTH_TOKEN in this script');
  console.log('3. Update IDs with actual database values');
  console.log('4. Run: node test-new-apis.js');
  console.log('\n🔗 Swagger Documentation: http://localhost:4000/api-docs');
}

if (AUTH_TOKEN === 'your-jwt-token-here') {
  printManualTestInstructions();
} else {
  runTests();
}
