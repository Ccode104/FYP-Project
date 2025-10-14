import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import type { Role } from '../context/AuthContext'
import { getDashboardPathForRole, useAuth } from '../context/AuthContext'
import './Login.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verify = async () => {
    // Mock verification: require password to match role keyword or be at least 4 chars
    await new Promise((r) => setTimeout(r, 500))
    if (password === role || password.length >= 4) return true
    return false
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const ok = await verify()
    setLoading(false)
    if (!ok) {
      setError('Invalid credentials. Use password matching the role (student/teacher/ta) or at least 4 characters.')
      return
    }
    login(email, password, role)
    navigate(getDashboardPathForRole(role), { replace: true })
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
          <label className="field">
            <span className="label">Role</span>
          <select className="select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="ta">TA</option>
            </select>
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
