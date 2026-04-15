import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function GitHubAuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const token = searchParams.get('token');
    const connected = searchParams.get('github_connected');

    if (token) {
      localStorage.setItem('auth:token', token);
    }

    if (connected === 'true') {
      setStatus('GitHub connected! Redirecting...');
      // Redirect back to assignment submission page
      setTimeout(() => {
        // Get the return URL from sessionStorage or default to assignments
        const returnUrl = sessionStorage.getItem('github_auth_return_url') || '/dashboard/student';
        sessionStorage.removeItem('github_auth_return_url');
        navigate(returnUrl);
      }, 1500);
    } else {
      navigate('/dashboard/student');
    }
  }, [searchParams, navigate]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '3px solid #e2e8f0',
          borderTopColor: '#4f46e5',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      ></div>
      <p style={{ color: '#64748b' }}>{status}</p>
    </div>
  );
}
