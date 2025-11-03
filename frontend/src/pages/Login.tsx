import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getDashboardPathForRole, useAuth } from '../context/AuthContext'
import { useToast } from '../components/ToastProvider'
import backgroundImg from '../assets/background.jpg'
import './Login.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { push } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    const ok = await verify()
    if (!ok) {
      setError('Invalid credentials.')
      push({ kind: 'error', message: 'Login failed' })
      setLoading(false)
      return
    }
    try {
      const u = await login(email, password)
      push({ kind: 'success', message: 'Login successful' })
      navigate(getDashboardPathForRole(u.role), { replace: true })
    } catch (e: any) {
      setError(e?.message || 'Login failed')
      push({ kind: 'error', message: 'Login failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page" style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url(${backgroundImg})` }}>
      <div className="brand-logo">Unified Academic Portal</div>
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
            {loading ? <span className="spinner" aria-hidden="true"></span> : 'Sign in'}
          </button>
        </form>

        <p className="muted mt-sm">
          No account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
