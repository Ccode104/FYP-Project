import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getDashboardPathForRole, useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import GoogleSignIn from '../components/GoogleSignIn';
import backgroundImg from '../assets/background.jpg';
import './Login.css';

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher' | 'ta' | 'admin'>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async () => {
    await new Promise(r => setTimeout(r, 300));
    return password.length >= 4;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const isValid = await verify();
      if (!isValid) {
        throw new Error('Password must be at least 4 characters long');
      }

      const user = await login(email, password, role);
      push({ kind: 'success', message: 'Login successful' });
      navigate(getDashboardPathForRole(user.role), { replace: true });
    } catch (err: unknown) {
      console.error('Login failed:', err.message);
      setError(err.message || 'Login failed');
      push({ kind: 'error', message: 'Login failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (credential: string) => {
    setError(null);
    setLoading(true);
    try {
      const user = await loginWithGoogle(credential, role);
      push({ kind: 'success', message: 'Login successful' });
      navigate(getDashboardPathForRole(user.role), { replace: true });
    } catch (err: unknown) {
      console.error('Google login failed:', err.message);
      setError(err.message || 'Google login failed');
      push({ kind: 'error', message: 'Google login failed' });
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { key: 'student' as const, label: 'Student' },
    { key: 'teacher' as const, label: 'Teacher' },
    { key: 'ta' as const, label: 'TA' },
    { key: 'admin' as const, label: 'Admin' },
  ];

  return (
    <div className="login-page">
      {/* Background Layer */}
      <div className="login-bg">
        <img alt="University Campus Background" src={backgroundImg} />
        <div className="login-bg-overlay"></div>
      </div>

      <main className="login-container">
        <div className="glass-panel">
          {/* Branding Header */}
          <div className="login-header">
            <h1 className="login-title">Unified Academic Portal</h1>
            <p className="login-subtitle">Academic Excellence</p>
          </div>

          {/* Role Selector (Tabs) */}
          <div className="role-tabs">
            {roles.map(r => (
              <button
                key={r.key}
                className={`role-tab ${role === r.key ? 'active' : ''}`}
                onClick={() => setRole(r.key)}
                type="button"
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form className="login-form" onSubmit={onSubmit}>
            {error && (
              <div className="error-box" role="alert">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div className="field-bottom">
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder=" "
                required
              />
              <label htmlFor="email">Email Address</label>
            </div>

            {/* Password Field */}
            <div className="field-bottom">
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder=" "
                required
              />
              <label htmlFor="password">Secret Password</label>
            </div>

            {/* Actions Row */}
            <div className="form-actions">
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>Keep me signed in</span>
              </label>
              <Link to="/forgot" className="forgot-link">
                Forgot password?
              </Link>
            </div>

            {/* Primary Login Button */}
            <button className="login-btn-primary" type="submit" disabled={loading}>
              {loading ? (
                <svg className="animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    fill="currentColor"
                  ></path>
                </svg>
              ) : null}
              Login to Portal
            </button>

            {/* Social Divider */}
            <div className="social-divider">
              <span>Single Sign-On</span>
            </div>

            {/* Social Login */}
            <GoogleSignIn
              onSuccess={handleGoogleSignIn}
              onError={error => {
                setError(error);
                push({ kind: 'error', message: error });
              }}
              text="Continue with Google"
            />
          </form>

          {/* Footer Link */}
          <div className="login-footer">
            <p>
              Don't have an account? <Link to="/signup">Sign up</Link>
            </p>
          </div>
        </div>

        {/* Global Portal Footer */}
        <footer className="global-footer">
          <div className="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Contact Support</a>
          </div>
          <p>© 2024 Unified Academic Portal. Designed for Excellence.</p>
        </footer>
      </main>

      {/* Floating Help Button */}
      <button className="help-btn" aria-label="Help">
        <span className="material-symbols-outlined">help</span>
      </button>
    </div>
  );
}
