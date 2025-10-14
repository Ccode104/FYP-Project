import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Signup.css'

export default function Signup() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    // Mock signup flow – redirect to login
    navigate('/login', { replace: true })
  }

  return (
    <div className="container auth-page">
      <div className="card auth-card">
        <h1 className="heading">Sign up</h1>
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
          <button className="btn btn-primary" type="submit">Create account</button>
        </form>
        <p className="muted mt-sm">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  )
}
