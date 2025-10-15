import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getDashboardPathForRole, useAuth } from '../context/AuthContext'
import { useToast } from '../components/ToastProvider'
import './Login.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { push } = useToast()

  const verify = async () => {
    // Basic client-side check; server does real auth
    await new Promise((r) => setTimeout(r, 300))
    return password.length >= 4
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const ok = await verify()
    if (!ok) {
      setLoading(false)
      setError('Invalid credentials.')
      push({ kind: 'error', message: 'Login failed' })
      return
    }
    try {
      const u = await login(email, password, 'student')
      setLoading(false)
      push({ kind: 'success', message: 'Login successful' })
      navigate(getDashboardPathForRole(u.role), { replace: true })
    } catch (e: any) {
      setLoading(false)
      setError(e?.message || 'Login failed')
      push({ kind: 'error', message: 'Login failed' })
    }
  }

  return (
    <div className="container auth-page">
      <div className="card auth-card">
        <h1 className="heading">Login</h1>
        <form className="form" onSubmit={onSubmit}>
          {error ? <div className="card" style={{ borderColor: '#ef4444', borderWidth: 1 }}>{error}</div> : null}
          <label className="field">
            <span className="label">Email</span>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>
          <label className="field">
            <span className="label">Password</span>
            <input
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Verifying…' : 'Sign in'}</button>
        </form>
        <p className="muted mt-sm">
          No account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
