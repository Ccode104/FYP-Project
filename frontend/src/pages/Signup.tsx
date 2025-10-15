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
    <div className="container auth-page">
      <div className="card auth-card">
        <h1 className="heading">Sign up</h1>
        <form className="form" onSubmit={onSubmit}>
          {error ? <div className="card" style={{ borderColor: '#ef4444', borderWidth: 1 }}>{error}</div> : null}
          <label className="field">
            <span className="label">Full name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
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
            <select className="select" value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="ta">TA</option>
            </select>
          </label>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</button>
        </form>
        <p className="muted mt-sm">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  )
}
