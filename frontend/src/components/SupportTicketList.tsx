import { useState, useEffect } from 'react'
import { getUserTickets, getAllTickets, updateTicketStatus, getTicketDetails, addTicketComment, updateTicketStatus as updateTicket } from '../services/support'
import { useAuth } from '../context/AuthContext'
import type { SupportTicket, TicketDetails, TicketComment } from '../services/support'

interface SupportTicketListProps {
  showAllTickets?: boolean // For admin view
  courseOfferingId?: number // Filter by course
}

function SupportTicketList({ showAllTickets = false, courseOfferingId }: SupportTicketListProps) {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '' as SupportTicket['status'] | '',
    category: '' as SupportTicket['category'] | ''
  })
  const [selectedTicket, setSelectedTicket] = useState<TicketDetails | null>(null)
  const [showTicketDetail, setShowTicketDetail] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  useEffect(() => {
    loadTickets()
  }, [filters, showAllTickets])

  const loadTickets = async () => {
    try {
      setLoading(true)
      const params = {
        ...(filters.status && { status: filters.status }),
        ...(filters.category && { category: filters.category })
      }

      const data = showAllTickets
        ? await getAllTickets(params)
        : await getUserTickets(params)

      setTickets(data.tickets)
    } catch (error) {
      console.error('Failed to load tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (ticketId: number, newStatus: SupportTicket['status']) => {
    try {
      await updateTicketStatus(ticketId, { status: newStatus })
      // Update local state
      setTickets(prev => prev.map(ticket =>
        ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
      ))
      // Also update selected ticket if it's open
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null)
      }
    } catch (error) {
      console.error('Failed to update ticket status:', error)
      alert('Failed to update ticket status')
    }
  }

  const handleViewTicket = async (ticket: SupportTicket) => {
    try {
      const details = await getTicketDetails(ticket.id)
      setSelectedTicket(details)
      setShowTicketDetail(true)
    } catch (error) {
      console.error('Failed to load ticket details:', error)
      alert('Failed to load ticket details')
    }
  }

  const handleAddComment = async () => {
    if (!selectedTicket || !newComment.trim()) return

    try {
      setSubmittingComment(true)
      await addTicketComment(selectedTicket.id, {
        comment: newComment.trim(),
        is_internal: false
      })

      // Refresh ticket details
      const updatedDetails = await getTicketDetails(selectedTicket.id)
      setSelectedTicket(updatedDetails)
      setNewComment('')
    } catch (error) {
      console.error('Failed to add comment:', error)
      alert('Failed to add comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  const getStatusColor = (status: SupportTicket['status']) => {
    switch (status) {
      case 'open': return 'var(--primary)'
      case 'in_progress': return 'var(--warning)'
      case 'resolved': return 'var(--success)'
      case 'closed': return 'var(--muted)'
      default: return 'var(--muted)'
    }
  }

  const getPriorityColor = (priority: SupportTicket['priority']) => {
    switch (priority) {
      case 'urgent': return '#ef4444'
      case 'high': return '#f97316'
      case 'medium': return '#eab308'
      case 'low': return 'var(--muted)'
      default: return 'var(--muted)'
    }
  }

  if (loading) {
    return <div className="loading">Loading tickets...</div>
  }

  return (
    <div className="support-ticket-list">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>{showAllTickets ? 'All Support Tickets' : 'My Support Tickets'}</h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            className="form-select"
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as SupportTicket['status'] | '' }))}
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            className="form-select"
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as SupportTicket['category'] | '' }))}
          >
            <option value="">All Categories</option>
            <option value="bug_report">Bug Report</option>
            <option value="technical_issue">Technical Issue</option>
            <option value="feature_request">Feature Request</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="empty-state">
          <p>No tickets found matching the current filters.</p>
        </div>
      ) : (
        <div className="ticket-list">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="ticket-card" style={{
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px',
              backgroundColor: 'var(--bg-primary)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, marginBottom: '4px' }}>{ticket.title}</h4>
                  <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                    {showAllTickets && (
                      <span>By: {ticket.user_name} ({ticket.user_email}) • </span>
                    )}
                    Created: {new Date(ticket.created_at).toLocaleDateString()}
                    {ticket.course_title && <span> • Course: {ticket.course_code}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    backgroundColor: getStatusColor(ticket.status),
                    color: 'white'
                  }}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    backgroundColor: getPriorityColor(ticket.priority),
                    color: 'white'
                  }}>
                    {ticket.priority}
                  </span>
                </div>
              </div>

              <p style={{ marginBottom: '12px', color: 'var(--text)' }}>
                {ticket.description.length > 200
                  ? `${ticket.description.substring(0, 200)}...`
                  : ticket.description
                }
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                  Category: {ticket.category.replace('_', ' ')}
                  {ticket.assigned_to_name && <span> • Assigned to: {ticket.assigned_to_name}</span>}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {showAllTickets && user?.role === 'admin' && (
                    <select
                      className="form-select"
                      style={{ fontSize: '14px', padding: '4px 8px' }}
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value as SupportTicket['status'])}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  )}
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '14px', padding: '4px 8px' }}
                    onClick={() => handleViewTicket(ticket)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket Detail Modal */}
      {showTicketDetail && selectedTicket && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, marginBottom: '8px' }}>{selectedTicket.title}</h3>
                <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                  By: {selectedTicket.user_name} ({selectedTicket.user_email}) •
                  Created: {new Date(selectedTicket.created_at).toLocaleString()}
                  {selectedTicket.course_title && <span> • Course: {selectedTicket.course_code}</span>}
                </div>
              </div>
              <button
                className="btn"
                onClick={() => setShowTicketDetail(false)}
                style={{ padding: '8px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '14px',
                backgroundColor: getStatusColor(selectedTicket.status),
                color: 'white'
              }}>
                {selectedTicket.status.replace('_', ' ')}
              </span>
              <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '14px',
                backgroundColor: getPriorityColor(selectedTicket.priority),
                color: 'white'
              }}>
                {selectedTicket.priority}
              </span>
              <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '14px',
                backgroundColor: 'var(--muted)',
                color: 'white'
              }}>
                {selectedTicket.category.replace('_', ' ')}
              </span>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4>Description</h4>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{selectedTicket.description}</p>
            </div>

            {selectedTicket.comments.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4>Comments</h4>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {selectedTicket.comments.map((comment: TicketComment) => (
                    <div key={comment.id} style={{
                      padding: '12px',
                      marginBottom: '8px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '6px',
                      border: '1px solid var(--border)'
                    }}>
                      <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '4px' }}>
                        {comment.commenter_name} • {new Date(comment.created_at).toLocaleString()}
                        {comment.is_internal && <span style={{ color: '#f97316' }}> (Internal)</span>}
                      </div>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{comment.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showAllTickets && user?.role === 'admin' && (
              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <h4>Add Comment</h4>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <textarea
                      className="form-textarea"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows={3}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleAddComment}
                    disabled={submittingComment || !newComment.trim()}
                  >
                    {submittingComment ? 'Adding...' : 'Add Comment'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SupportTicketList