import 'dotenv/config';
import fetch from 'node-fetch';

async function testLogin() {
  try {
    console.log('🔐 Testing login with admin@demo.com / password123...\n');
    
    const response = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@demo.com',
        password: 'password123',
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ LOGIN SUCCESSFUL!');
      console.log('📊 Response:', {
        status: response.status,
        user: data.user,
        token: data.token ? '✅ Token received' : '❌ No token',
      });
    } else {
      console.log('❌ LOGIN FAILED');
      console.log('📊 Response:', {
        status: response.status,
        message: data.message || data.error,
      });
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('💡 Is the backend running on http://localhost:4000?');
  }
}

testLogin();
