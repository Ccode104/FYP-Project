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

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    login(email, password, role)
    navigate(getDashboardPathForRole(role), { replace: true })
  }

  return (
    <div className="container auth-page">
      <div className="card auth-card">
        <h1 className="heading">Login</h1>
        <form className="form" onSubmit={onSubmit}>
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
              <option value="admin">Admin</option>
            </select>
          </label>
          <button className="btn btn-primary" type="submit">Sign in</button>
        </form>
        <p className="muted mt-sm">
          No account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
