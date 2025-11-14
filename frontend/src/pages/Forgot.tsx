import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import backgroundImg from '../assets/background.jpg'
import { useToast } from '../components/ToastProvider'
import { requestPasswordReset } from '../services/password'
import './Login.css'

export default function Forgot() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const { push } = useToast()
  const navigate = useNavigate()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await requestPasswordReset(email)
      setSent(true)
      push({ kind: 'success', message: 'If the email exists, a reset link has been sent.' })
      if ((res as any)?.token) navigate(`/reset?token=${encodeURIComponent((res as any).token)}`) // DEV ONLY: remove this line for prod
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link')
      push({ kind: 'error', message: 'Failed to send reset link' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page" style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url(${backgroundImg})` }}>
      <div className="auth-card modal-style">
        <header className="brand compact no-brand-icon" role="banner">
          <div className="brand-text">
            <h1 className="heading">Forgot password</h1>
            <p className="subheading">Enter your email to receive a reset link.</p>
          </div>
        </header>

        <form className="form" onSubmit={onSubmit}>
          {error && <div className="error-box" role="alert">{error}</div>}
          {sent && <div className="error-box" style={{background:'#ecfeff',color:'#155e75',border:'1px solid #a5f3fc'}}>If the email exists, a reset link has been sent.</div>}

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

          <button className="btn btn-primary full" type="submit" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="muted mt-sm">
          Remembered it? <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  )
}
