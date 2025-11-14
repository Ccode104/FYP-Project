
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import backgroundImg from '../assets/background.jpg'
import { useToast } from '../components/ToastProvider'
import { confirmPasswordReset } from '../services/password'
import './Login.css'

export default function Reset() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { push } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) setError('Missing or invalid reset token')
  }, [token])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      await confirmPasswordReset(token, password)
      push({ kind: 'success', message: 'Password reset successful' })
      navigate('/login')
    } catch (err: any) {
      setError(err.message || 'Failed to reset password')
      push({ kind: 'error', message: 'Failed to reset password' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page" style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url(${backgroundImg})` }}>
      <div className="auth-card modal-style">
        <header className="brand compact no-brand-icon" role="banner">
          <div className="brand-text">
            <h1 className="heading">Reset password</h1>
            <p className="subheading">Enter a new password for your account.</p>
          </div>
        </header>

        <form className="form" onSubmit={onSubmit}>
          {error && <div className="error-box" role="alert">{error}</div>}

          <label className="field">
            <input
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              required
              placeholder=" "
              aria-label="New password"
            />
            <span className="label">New password</span>
          </label>

          <label className="field">
            <input
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              autoComplete="new-password"
              required
              placeholder=" "
              aria-label="Confirm password"
            />
            <span className="label">Confirm password</span>
          </label>

          <button className="btn btn-primary full" type="submit" disabled={loading || !token}>
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <p className="muted mt-sm">
          Back to <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  )
}
