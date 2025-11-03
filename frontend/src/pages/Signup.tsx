import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Signup.css'
import { apiFetch } from '../services/api'
import { useToast } from '../components/ToastProvider'

export default function Signup() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'student'|'teacher'|'ta'>('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { push } = useToast()

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const backendRole = role === 'teacher' ? 'faculty' : role
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: { name, email, password, role: backendRole },
      })
      push({ kind: 'success', message: 'Signup successful' })
      navigate('/login', { replace: true })
    } catch (err: any) {
      setError(err?.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="heading">Create your account</h1>
        <p className="subheading">Start your journey in minutes</p>
        <form className="form" onSubmit={onSubmit} aria-live="polite">
          {error ? <div className="error-box" role="alert">{error}</div> : null}

          <label className="field">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              autoComplete="name"
              required
              placeholder=" "
              aria-label="Full name"
            />
            <span className="label">Full name</span>
          </label>

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
              autoComplete="new-password"
              required
              placeholder=" "
              aria-label="Password"
            />
            <span className="label">Password</span>
          </label>

          <label className="field">
            <span className="label">Role</span>
            <select className="select" value={role} onChange={(e) => setRole(e.target.value as any)} required aria-label="Role">
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="ta">TA</option>
            </select>
          </label>

          <button className="btn btn-primary" type="submit" disabled={loading} aria-busy={loading}>
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="muted mt-sm">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  )
}
