import { useEffect, useState } from 'react'
import { apiFetch } from '../services/api'
import { useToast } from './ToastProvider'
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
}

export default function RecentActivities({ limit = 5, refreshTrigger }: RecentActivitiesProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const { push } = useToast()

  const loadActivities = async () => {
    try {
      setLoading(true)
      const response = await apiFetch<{ activities: ActivityItem[] }>(`/api/admin/activities?limit=${limit}`)
      setActivities(response.activities)
    } catch (err: any) {
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
      case 'user': return '👤'
      case 'course': return '📚'
      case 'department': return '🏢'
      case 'offering': return '📋'
      case 'assignment': return '📝'
      case 'quiz': return '❓'
      case 'enrollment': return '📝'
      case 'support': return '🆘'
      default: return '📋'
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
    // Show details in a modal or alert
    const details = getActivityDetails(activity)
    alert(details)
  }

  const getActivityDetails = (activity: ActivityItem) => {
    const { action, entity_type, entity_name, details } = activity
    let detailText = `${getActionDescription(activity)}\n\n`

    if (details && Object.keys(details).length > 0) {
      detailText += 'Changes made:\n'
      if (action === 'update_user' && details.changes) {
        const changes = details.changes as Record<string, any>
        Object.entries(changes).forEach(([field, value]) => {
          detailText += `• ${field}: ${value}\n`
        })
      } else {
        detailText += JSON.stringify(details, null, 2)
      }
    }

    detailText += `\nPerformed by: ${activity.admin_name} (${activity.admin_email})`
    detailText += `\nTime: ${new Date(activity.created_at).toLocaleString()}`

    return detailText
  }

  const getEntityLink = (activity: ActivityItem) => {
    if (!activity.entity_id) return null

    switch (activity.entity_type) {
      case 'user':
        return `/admin/users?search=${encodeURIComponent(activity.admin_email)}`
      case 'course':
        return `/admin/courses?search=${encodeURIComponent(activity.entity_name || '')}`
      case 'department':
        return `/admin/departments?search=${encodeURIComponent(activity.entity_name || '')}`
      default:
        return null
    }
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
              <div className="activity-icon">
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
                >
                  👁 View Details
                </button>
                {getEntityLink(activity) && (
                  <a
                    href={getEntityLink(activity)!}
                    className="btn btn-sm btn-link"
                    title="View related item"
                  >
                    🔗 View Item
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}