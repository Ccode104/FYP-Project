import { useState } from 'react'
import './Modal.css'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  confirmVariant?: 'primary' | 'danger'
  requireTyping?: boolean
  typeText?: string
  loading?: boolean
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  confirmVariant = 'danger',
  requireTyping = false,
  typeText = '',
  loading = false
}: ConfirmationModalProps) {
  const [typedText, setTypedText] = useState('')

  if (!isOpen) return null

  const handleConfirm = () => {
    if (requireTyping && typedText !== typeText) return
    onConfirm()
  }

  const canConfirm = !requireTyping || typedText === typeText

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <p className="modal-message">{message}</p>

          {requireTyping && (
            <div className="confirmation-input">
              <p className="muted" style={{ marginBottom: '8px', fontSize: '0.9em' }}>
                Type <strong>{typeText}</strong> to confirm:
              </p>
              <input
                type="text"
                className="input"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder={`Type "${typeText}"`}
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={`btn btn-${confirmVariant}`}
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
