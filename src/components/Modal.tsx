import type { ReactNode } from 'react'
import './Modal.css'

export default function Modal({ open, onClose, title, children, actions }: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  actions?: ReactNode
}) {
  if (!open) return null
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        {title ? <h3 className="modal-title">{title}</h3> : null}
        <div className="modal-body">{children}</div>
        <div className="modal-actions">{actions}</div>
        <button className="modal-close" aria-label="Close" onClick={onClose}>×</button>
      </div>
    </div>
  )
}
