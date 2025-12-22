import { useEffect, useState } from 'react'
import { apiFetch } from '../services/api'
import './RecentActivities.css'

interface ActivityItem {
  id: string;
  action: string;
  entity_type: 'user' | 'course' | 'department' | 'offering' | 'assignment' | 'quiz' | 'enrollment' | 'support';
  entity_id: number | null;
  entity_name: string | null;
  details: Record<string, unknown>;
  created_at: string;
  admin_name: string;
  admin_email: string;
}

interface RecentActivitiesProps {
  limit?: number;
  refreshTrigger?: number;
  onNavigate?: (tab: string, filter?: string) => void;
}

export default function RecentActivities({ limit = 5, refreshTrigger, onNavigate }: RecentActivitiesProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showActivityDetailsModal, setShowActivityDetailsModal] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null)

  const loadActivities = async () => {
    try {
      setLoading(true)
      const response = await apiFetch<{ activities: ActivityItem[] }>(`/api/admin/activities?limit=${limit}`)
      setActivities(response.activities)
    } catch (err: unknown) {
      console.error('Error loading activities:', err)
      // Don't show error toast for activity loading failures to avoid spam
      // The component will show "No recent activities" instead
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActivities()
  }, [limit, refreshTrigger])

  const getActivityIcon = (type: ActivityItem['entity_type']) => {
    switch (type) {
      case 'user': return 'U'
      case 'course': return 'C'
      case 'department': return 'D'
      case 'offering': return 'O'
      case 'assignment': return 'A'
      case 'quiz': return 'Q'
      case 'enrollment': return 'E'
      case 'support': return 'S'
      default: return '•'
    }
  }

  const getActionDescription = (activity: ActivityItem) => {
    const { action, entity_type, entity_name } = activity
    const entity = entity_name || `${entity_type} #${activity.entity_id}`

    switch (action) {
      case 'create_user': return `Created user ${entity}`
      case 'update_user': return `Updated user ${entity}`
      case 'delete_user': return `Deleted user ${entity}`
      case 'create_course': return `Created course ${entity}`
      case 'update_course': return `Updated course ${entity}`
      case 'delete_course': return `Deleted course ${entity}`
      case 'create_department': return `Created department ${entity}`
      case 'update_department': return `Updated department ${entity}`
      case 'delete_department': return `Deleted department ${entity}`
      case 'create_offering': return `Created course offering ${entity}`
      case 'update_offering': return `Updated course offering ${entity}`
      case 'delete_offering': return `Deleted course offering ${entity}`
      case 'create_assignment': return `Created assignment ${entity}`
      case 'update_assignment': return `Updated assignment ${entity}`
      case 'delete_assignment': return `Deleted assignment ${entity}`
      case 'create_quiz': return `Created quiz ${entity}`
      case 'update_quiz': return `Updated quiz ${entity}`
      case 'delete_quiz': return `Deleted quiz ${entity}`
      case 'create_enrollment': return `Enrolled student in ${entity}`
      case 'delete_enrollment': return `Removed enrollment from ${entity}`
      default: return `${action.replace('_', ' ')} ${entity_type} ${entity}`
    }
  }

  const getRelativeTime = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now.getTime() - time.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return time.toLocaleDateString()
  }

  const handleViewDetails = (activity: ActivityItem) => {
    setSelectedActivity(activity)
    setShowActivityDetailsModal(true)
  }



  if (loading) {
    return (
      <div className="card">
        <h3>Recent Activities</h3>
        <div className="loading-placeholder">
          <p>Loading activities...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h3>Recent Activities</h3>
      {activities.length === 0 ? (
        <p className="muted">No recent activities</p>
      ) : (
        <div className="activities-list">
          {activities.map((activity) => (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon" style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary)',
                color: 'white',
                fontSize: '0.8em',
                fontWeight: '600',
                marginRight: '8px'
              }}>
                {getActivityIcon(activity.entity_type)}
              </div>
              <div className="activity-content">
                <div className="activity-description">
                  {getActionDescription(activity)}
                </div>
                <div className="activity-meta">
                  <span className="activity-admin">{activity.admin_name}</span>
                  <span className="activity-time">{getRelativeTime(activity.created_at)}</span>
                </div>
              </div>
              <div className="activity-actions">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleViewDetails(activity)}
                  title="View activity details"
                  style={{
                    fontWeight: '500',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '0.8em',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface)';
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showActivityDetailsModal && selectedActivity && (
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
          backdropFilter: 'blur(4px)',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: 600,
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            border: '1px solid var(--border)',
            margin: 'auto',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 className="h4" style={{ marginTop: 0, marginBottom: 20, color: 'var(--text)' }}>
              Activity Details
            </h3>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                {getActionDescription(selectedActivity)}
              </div>
              {selectedActivity.details && Object.keys(selectedActivity.details).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ marginBottom: 8 }}>Changes Made:</h4>
                  <div style={{
                    background: 'var(--surface-secondary)',
                    padding: 12,
                    borderRadius: 6,
                    border: '1px solid var(--border)'
                  }}>
                    {selectedActivity.action.startsWith('update_') && selectedActivity.details.changes ? (
                      <div style={{
                        padding: '12px',
                        borderRadius: '6px',
                        background: 'var(--surface-secondary)',
                        border: '1px solid var(--border)'
                      }}>
                        <div style={{ fontSize: '0.9em', lineHeight: '1.6' }}>
                          {Object.entries(selectedActivity.details.changes as Record<string, { old?: unknown; new?: unknown } | unknown>).map(([field, changeData]) => {
                            // Handle new format: { old: value, new: value }
                            if (typeof changeData === 'object' && changeData !== null && changeData.old !== undefined && changeData.new !== undefined) {
                              const oldVal = changeData.old === null ? 'null' : String(changeData.old)
                              const newVal = changeData.new === null ? 'null' : String(changeData.new)

                              return (
                                <div key={field}>
                                  <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>
                                    {field.replace(/_/g, ' ')}:
                                  </span>
                                  <span style={{ color: '#dc3545', marginLeft: '8px', textDecoration: 'line-through' }}>
                                    {oldVal}
                                  </span>
                                  <span style={{ color: '#28a745', marginLeft: '8px' }}>
                                    → {newVal}
                                  </span>
                                </div>
                              )
                            } else if (typeof changeData === 'object' && changeData !== null && changeData.new !== undefined) {
                              // Handle old format: { new: value }
                              const newVal = changeData.new === null ? 'null' : String(changeData.new)
                              return (
                                <div key={field}>
                                  <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>
                                    {field.replace(/_/g, ' ')}:
                                  </span>
                                  <span style={{ color: '#28a745', marginLeft: '8px' }}>
                                    {newVal}
                                  </span>
                                </div>
                              )
                            } else {
                              // Fallback
                              const val = typeof changeData === 'object' ? JSON.stringify(changeData) : String(changeData)
                              return (
                                <div key={field}>
                                  <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>
                                    {field.replace(/_/g, ' ')}:
                                  </span>
                                  <span style={{ color: '#721c24', marginLeft: '8px' }}>
                                    {val}
                                  </span>
                                </div>
                              )
                            }
                          })}
                        </div>
                      </div>
                    ) : selectedActivity.action === 'create_user' || selectedActivity.action === 'create_course' || selectedActivity.action === 'create_department' ? (
                      <div style={{
                        padding: '12px',
                        borderRadius: '6px',
                        background: 'var(--success, #d4edda)',
                        border: '1px solid var(--success-border, #c3e6cb)',
                        color: '#155724'
                      }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>New {selectedActivity.entity_type.charAt(0).toUpperCase() + selectedActivity.entity_type.slice(1)} Created</div>
                        {selectedActivity.details && (
                          <div style={{ fontSize: '0.9em', lineHeight: '1.4' }}>
                            {Object.entries(selectedActivity.details as Record<string, unknown>)
                              .filter(([key]) => !['changes', 'old_values', 'new_values'].includes(key))
                              .map(([key, value]) => (
                                <div key={key}>
                                  <span style={{ fontWeight: '500' }}>{key.replace(/_/g, ' ')}:</span> {String(value)}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ) : selectedActivity.action.includes('delete') ? (
                      <div style={{
                        padding: '12px',
                        borderRadius: '6px',
                        background: 'var(--danger, #f8d7da)',
                        border: '1px solid var(--danger-border, #f5c6cb)',
                        color: '#721c24'
                      }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{selectedActivity.entity_type.charAt(0).toUpperCase() + selectedActivity.entity_type.slice(1)} Deleted</div>
                        {selectedActivity.details && (
                          <div style={{ fontSize: '0.9em', lineHeight: '1.4' }}>
                            {Object.entries(selectedActivity.details as Record<string, unknown>)
                              .filter(([key]) => !['changes', 'old_values', 'new_values'].includes(key))
                              .map(([key, value]) => (
                                <div key={key}>
                                  <span style={{ fontWeight: '500' }}>{key.replace(/_/g, ' ')}:</span> {String(value)}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        fontFamily: 'monospace',
                        fontSize: '0.9em',
                        whiteSpace: 'pre-wrap',
                        background: 'var(--surface)',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)'
                      }}>
                        {JSON.stringify(selectedActivity.details, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div style={{ marginTop: 16, fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                <div>Performed by: {selectedActivity.admin_name} ({selectedActivity.admin_email})</div>
                <div>Time: {new Date(selectedActivity.created_at).toLocaleString()}</div>
              </div>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 24
            }}>
              <div>
                {getNavigationButton(selectedActivity)}
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setShowActivityDetailsModal(false)}
                style={{
                  fontWeight: '500',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface-secondary)';
                  e.currentTarget.style.borderColor = 'var(--border-hover, #999)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  function getNavigationButton(activity: ActivityItem) {
    if (!onNavigate) return null

    const { entity_type } = activity

    const getButtonText = () => {
      switch (entity_type) {
        case 'user': return 'Go to Users'
        case 'department': return 'Go to Departments'
        case 'course':
        case 'offering':
        case 'assignment':
        case 'quiz':
        case 'enrollment': return 'Go to Courses'
        case 'support': return 'Go to Support'
        default: return null
      }
    }

    const getTab = () => {
      switch (entity_type) {
        case 'user': return 'users'
        case 'department': return 'departments'
        case 'course':
        case 'offering':
        case 'assignment':
        case 'quiz':
        case 'enrollment': return 'courses'
        case 'support': return 'support'
        default: return null
      }
    }

    const tab = getTab()
    const buttonText = getButtonText()

    if (!tab || !buttonText) return null

    return (
      <button
        className="btn btn-primary"
        onClick={() => {
          onNavigate(tab)
          setShowActivityDetailsModal(false)
        }}
        style={{
          fontWeight: '600',
          padding: '10px 20px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: 'var(--primary)',
          color: 'white',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          fontSize: '14px',
          letterSpacing: '0.5px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--primary-hover, #0056b3)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--primary)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {buttonText}
      </button>
    )
  }
}
