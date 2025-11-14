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

      const user = await login(email, password)
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


  return (
    <div className="auth-page" style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url(${backgroundImg})` }}>
      <div className="auth-card">
        <h1 className="heading">Login</h1>
        <p className="subheading">Sign in to continue</p>

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
              aria-label="Email"
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

          <div className="forgot">
            <Link to="/forgot">Forgot password?</Link>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} aria-busy={loading}>
            {loading ? <span className="spinner" aria-hidden="false"></span> : 'Sign in'}
          </button>
        </form>

        <div className="auth-divider">or</div>

        <div style={{ marginBottom: '16px' }}>
          <label className="field select-field">
            <span className="label select-label">Sign in as</span>
            <select className="select" value={role} onChange={(e) => setRole(e.target.value as any)} required aria-label="Role">
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="ta">TA</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>

        <GoogleSignIn
          onSuccess={handleGoogleSignIn}
          onError={(error) => {
            setError(error)
            push({ kind: 'error', message: error })
          }}
          text="signin_with"
        />

        <p className="muted mt-sm">
          No account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
