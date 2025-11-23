import { useState, useEffect } from 'react'
import { getUserTickets, getAllTickets, updateTicketStatus } from '../services/support'
import { useAuth } from '../context/AuthContext'
import type { SupportTicket } from '../services/support'

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
    } catch (error) {
      console.error('Failed to update ticket status:', error)
      alert('Failed to update ticket status')
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SupportTicketList