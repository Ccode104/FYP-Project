import { useState } from 'react'
import { createTicket } from '../features/support/api/support'
import type { SupportTicket } from '../features/support/api/support'

interface SupportTicketFormProps {
  courseOfferingId?: number
  onTicketCreated?: (ticket: SupportTicket) => void
  onClose?: () => void
}

function SupportTicketForm({ courseOfferingId, onTicketCreated, onClose }: SupportTicketFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'bug_report' as SupportTicket['category'],
    priority: 'medium' as SupportTicket['priority']
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.description.trim()) {
      return
    }

    try {
      setSubmitting(true)
      const data = await createTicket({
        ...formData,
        course_offering_id: courseOfferingId
      })

      if (onTicketCreated) {
        onTicketCreated(data.ticket)
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'bug_report',
        priority: 'medium'
      })

      if (onClose) {
        onClose()
      }
    } catch (error) {
      console.error('Failed to create ticket:', error)
      alert('Failed to submit ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="support-ticket-form">
      <h3>Submit Support Ticket</h3>
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input
            type="text"
            className="form-input"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Brief description of the issue"
            required
            maxLength={200}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Category *</label>
          <select
            className="form-select"
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value as SupportTicket['category'])}
            required
          >
            <option value="bug_report">Bug Report</option>
            <option value="technical_issue">Technical Issue</option>
            <option value="feature_request">Feature Request</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Priority</label>
          <select
            className="form-select"
            value={formData.priority}
            onChange={(e) => handleInputChange('priority', e.target.value as SupportTicket['priority'])}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Description *</label>
          <textarea
            className="form-textarea"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Please provide detailed information about your issue..."
            rows={6}
            required
            maxLength={2000}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          {onClose && (
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default SupportTicketForm
