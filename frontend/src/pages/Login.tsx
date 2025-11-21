import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getDashboardPathForRole, useAuth } from '../context/AuthContext'
import { useToast } from '../components/ToastProvider'
import GoogleSignIn from '../components/GoogleSignIn'
import backgroundImg from '../assets/background.jpg'
import './Login.css'

export default function Login() {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const { push } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'student'|'teacher'|'ta'|'admin'>('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verify = async () => {
    await new Promise((r) => setTimeout(r, 300))
    return password.length >= 4
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const isValid = await verify()
      if (!isValid) {
        throw new Error('Password must be at least 4 characters long')
      }

      const user = await login(email, password, role)
      push({ kind: 'success', message: 'Login successful' })
      navigate(getDashboardPathForRole(user.role), { replace: true })
    } catch (err: any) {
      console.error('Login failed:', err.message)
      setError(err.message || 'Login failed')
      push({ kind: 'error', message: 'Login failed' })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async (credential: string) => {
    setError(null)
    setLoading(true)
    try {
      const user = await loginWithGoogle(credential, role)
      push({ kind: 'success', message: 'Login successful' })
      navigate(getDashboardPathForRole(user.role), { replace: true })
    } catch (err: any) {
      console.error('Google login failed:', err.message)
      setError(err.message || 'Google login failed')
      push({ kind: 'error', message: 'Google login failed' })
    } finally {
      setLoading(false)
    }
  }

  const RoleTabs = () => (
    <div className="role-tabs" role="tablist" aria-label="Select role">
      {[
        { key: 'student' as const, label: 'Student' },
        { key: 'teacher' as const, label: 'Teacher' },
        { key: 'ta' as const, label: 'TA' },
        { key: 'admin' as const, label: 'Admin' },
      ].map(t => (
        <button
          key={t.key}
          role="tab"
          aria-selected={role === t.key}
          className={`role-tab ${role === t.key ? 'active' : ''}`}
          onClick={() => setRole(t.key)}
          type="button"
        >
          {t.label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="auth-page" style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url(${backgroundImg})` }}>
      <div className="auth-card modal-style">
        <header className="brand compact" role="banner">
          <div className="brand-icon" aria-hidden>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
              <rect x="3" y="7" width="18" height="12" rx="2.5" stroke="#4f46e5" strokeWidth="1.5"/>
              <path d="M7 7V5.8C7 5.35817 7.35817 5 7.8 5H16.2C16.6418 5 17 5.35817 17 5.8V7" stroke="#4f46e5" strokeWidth="1.5"/>
              <path d="M3 12H21" stroke="#4f46e5" strokeWidth="1.5"/>
            </svg>
          </div>
          <div className="brand-text">
            <h1 className="heading">Login to Campus</h1>
            <p className="subheading">Seamless access. Choose your role and continue.</p>
          </div>
        </header>

        <RoleTabs />

        <form className="form" onSubmit={onSubmit} aria-live="polite">
          {error && <div className="error-box" role="alert">{error}</div>}

          <label className="field">
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
              placeholder=" "
              aria-label="Email or username"
            />
            <span className="label">Email</span>
          </label>

          <label className="field">
            <input
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
              placeholder=" "
              aria-label="Password"
            />
            <span className="label">Password</span>
          </label>

          <div className="form-row space-between">
            <div />
            <div className="forgot">
              <Link to="/forgot">Forgot password?</Link>
            </div>
          </div>

          <button className="btn btn-primary full" type="submit" disabled={loading} aria-busy={loading}>
            {loading ? <span className="spinner" aria-hidden="false"></span> : 'Log in'}
          </button>
        </form>

        <div className="auth-divider">Or login with</div>

        <GoogleSignIn
          onSuccess={handleGoogleSignIn}
          onError={(error) => {
            setError(error)
            push({ kind: 'error', message: error })
          }}
          text="signin_with"
        />

        <p className="muted mt-sm">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
