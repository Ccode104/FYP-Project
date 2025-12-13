import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getProctoringDashboard } from '../services/quizzes'
import { useToast } from './ToastProvider'

interface ProctoringSummary {
  total_sessions: number
  active_sessions: number
  suspended_sessions: number
  total_violations: number
  compliance_rate: number
}

interface CourseAnalytics {
  course_offering_id: number
  term: string
  code: string
  title: string
  sessions: number
  active_sessions: number
  suspended_sessions: number
  violations: number
  compliance_rate: number
}

interface RecentViolation {
  violation_type: string
  severity: number
  description: string
  timestamp: string
  student_name: string
  quiz_title: string
  course_code: string
}

interface RiskDistribution {
  low: number
  medium: number
  high: number
  critical: number
}

interface DashboardData {
  summary: ProctoringSummary
  courses: CourseAnalytics[]
  recent_violations: RecentViolation[]
  risk_distribution: RiskDistribution
}

interface ProctoringAnalyticsProps {
  courseId: string
}

export default function ProctoringAnalytics({ courseId }: ProctoringAnalyticsProps) {
  const { user } = useAuth()
  const { push } = useToast()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [courseId])

  const loadDashboardData = async () => {
    try {
      const response = await getProctoringDashboard()
      const data = response as DashboardData
      // Filter data for this specific course
      const courseData = {
        ...data,
        courses: data.courses.filter((course: CourseAnalytics) =>
          course.code === courseId || course.course_offering_id.toString() === courseId
        ),
        recent_violations: data.recent_violations.filter((violation: RecentViolation) =>
          violation.course_code === courseId
        )
      }
      setDashboardData(courseData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      push({ kind: 'error', message: 'Failed to load proctoring analytics' })
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 1: return '#fbbf24' // warning
      case 2: return '#f59e0b' // minor
      case 3: return '#ef4444' // major
      case 4: return '#dc2626' // critical
      default: return '#6b7280'
    }
  }

  const getSeverityLabel = (severity: number) => {
    switch (severity) {
      case 1: return 'Warning'
      case 2: return 'Minor'
      case 3: return 'Major'
      case 4: return 'Critical'
      default: return 'Unknown'
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return '#10b981'
      case 'medium': return '#f59e0b'
      case 'high': return '#ef4444'
      case 'critical': return '#dc2626'
      default: return '#6b7280'
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p className="muted">Loading proctoring analytics...</p>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <section className="assignments-section">
        <div className="section-header">
          <h2 className="section-title">Proctoring Analytics</h2>
        </div>
        <div className="card">
          <p className="muted">No proctoring data available for this course.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="assignments-section">
      <div className="section-header">
        <h2 className="section-title">Proctoring Analytics</h2>
        <span className="assignment-count">{dashboardData.summary.total_sessions} sessions</span>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '2em', color: '#3b82f6' }}>
            {dashboardData.summary.total_sessions}
          </h3>
          <p style={{ margin: 0, fontSize: '0.9em', color: '#6b7280' }}>Total Sessions</p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '2em', color: '#10b981' }}>
            {dashboardData.summary.active_sessions}
          </h3>
          <p style={{ margin: 0, fontSize: '0.9em', color: '#6b7280' }}>Active Sessions</p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '2em', color: '#ef4444' }}>
            {dashboardData.summary.suspended_sessions}
          </h3>
          <p style={{ margin: 0, fontSize: '0.9em', color: '#6b7280' }}>Suspended Sessions</p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '2em', color: '#f59e0b' }}>
            {dashboardData.summary.compliance_rate}%
          </h3>
          <p style={{ margin: 0, fontSize: '0.9em', color: '#6b7280' }}>Avg Compliance</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Course Analytics */}
        <div>
          <h3 style={{ marginBottom: '16px' }}>Course Analytics</h3>
          <div className="card">
            <div style={{ display: 'grid', gap: '12px' }}>
              {dashboardData.courses.map((course) => (
                <div
                  key={course.course_offering_id}
                  style={{
                    padding: '16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedCourse === course.course_offering_id ? '#f3f4f6' : 'white'
                  }}
                  onClick={() => setSelectedCourse(course.course_offering_id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0' }}>
                        {course.code} - {course.title}
                      </h4>
                      <p style={{ margin: '0 0 8px 0', fontSize: '0.9em', color: '#6b7280' }}>
                        {course.term}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: course.compliance_rate >= 80 ? '#10b981' : course.compliance_rate >= 60 ? '#f59e0b' : '#ef4444' }}>
                        {course.compliance_rate}%
                      </div>
                      <div style={{ fontSize: '0.8em', color: '#6b7280' }}>compliance</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '0.9em' }}>
                    <div>
                      <span style={{ color: '#6b7280' }}>Sessions:</span> {course.sessions}
                    </div>
                    <div>
                      <span style={{ color: '#6b7280' }}>Active:</span> {course.active_sessions}
                    </div>
                    <div>
                      <span style={{ color: '#6b7280' }}>Suspended:</span> {course.suspended_sessions}
                    </div>
                    <div>
                      <span style={{ color: '#6b7280' }}>Violations:</span> {course.violations}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Risk Distribution & Recent Violations */}
        <div>
          {/* Risk Distribution */}
          <h3 style={{ marginBottom: '16px' }}>Risk Distribution</h3>
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'grid', gap: '12px' }}>
              {Object.entries(dashboardData.risk_distribution).map(([level, count]) => (
                <div key={level} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ textTransform: 'capitalize', color: getRiskColor(level) }}>
                    {level}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '100px',
                        height: '8px',
                        background: '#e5e7eb',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min((count / Math.max(...Object.values(dashboardData.risk_distribution))) * 100, 100)}%`,
                          height: '100%',
                          background: getRiskColor(level)
                        }}
                      />
                    </div>
                    <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'right' }}>
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Violations */}
          <h3 style={{ marginBottom: '16px' }}>Recent Violations (24h)</h3>
          <div className="card">
            <div style={{ display: 'grid', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
              {dashboardData.recent_violations.length === 0 ? (
                <p style={{ margin: 0, color: '#6b7280', fontStyle: 'italic' }}>No recent violations</p>
              ) : (
                dashboardData.recent_violations.map((violation, _index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px',
                      borderRadius: '6px',
                      background: '#f9fafb',
                      border: `1px solid ${getSeverityColor(violation.severity)}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '0.9em' }}>
                        {violation.violation_type}
                      </span>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background: getSeverityColor(violation.severity),
                          color: 'white',
                          fontSize: '0.7em',
                          fontWeight: 'bold'
                        }}
                      >
                        {getSeverityLabel(violation.severity)}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0', fontSize: '0.85em', color: '#374151' }}>
                      {violation.student_name} - {violation.quiz_title}
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.8em', color: '#6b7280' }}>
                      {new Date(violation.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
