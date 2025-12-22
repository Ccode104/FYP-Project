import { useState, useEffect } from 'react'
import {
  getOverview,
  listUsers,
  listCourses,
  listOfferings,
  listAssignments,
  listQuizzes,
  listEnrollments
} from '../services/admin'
import { getAllTickets } from '../services/support'

interface ReportStats {
  totalUsers: number
  activeUsers: number
  totalStudents: number
  totalFaculty: number
  totalTAs: number
  totalAdmins: number
  totalCourses: number
  totalOfferings: number
  totalEnrollments: number
  totalAssignments: number
  totalQuizzes: number
  totalSupportTickets: number
  openTickets: number
  resolvedTickets: number
}

function Reports() {
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    loadReportData()
  }, [])

  const loadReportData = async () => {
    try {
      setLoading(true)
      setError('')

      // Load all data in parallel
      const [
        ,
        usersData,
        coursesData,
        offeringsData,
        assignmentsData,
        quizzesData,
        enrollmentsData,
        ticketsData
      ] = await Promise.all([
        getOverview(),
        listUsers(),
        listCourses(),
        listOfferings(),
        listAssignments(),
        listQuizzes(),
        listEnrollments(),
        getAllTickets()
      ])

      // Calculate statistics
      const users = usersData.users || []
      const courses = coursesData.courses || []
      const offerings = offeringsData.offerings || []
      const assignments = assignmentsData.assignments || []
      const quizzes = quizzesData.quizzes || []
      const enrollments = enrollmentsData.enrollments || []
      const tickets = ticketsData.tickets || []

      const reportStats: ReportStats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.is_active).length,
        totalStudents: users.filter(u => u.role === 'student').length,
        totalFaculty: users.filter(u => u.role === 'faculty').length,
        totalTAs: users.filter(u => u.role === 'ta').length,
        totalAdmins: users.filter(u => u.role === 'admin').length,
        totalCourses: courses.length,
        totalOfferings: offerings.length,
        totalEnrollments: enrollments.length,
        totalAssignments: assignments.length,
        totalQuizzes: quizzes.length,
        totalSupportTickets: tickets.length,
        openTickets: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
        resolvedTickets: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
      }

      setStats(reportStats)
    } catch (err: unknown) {
      console.error('Failed to load report data:', err)
      setError(err?.message || 'Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = () => {
    if (!stats) return

    const reportData = {
      generatedAt: new Date().toISOString(),
      ...stats
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lms-report-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="reports-loading">
        <div className="loading-spinner"></div>
        <p>Loading report data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="reports-error">
        <p>Error loading reports: {error}</p>
        <button className="btn btn-primary" onClick={loadReportData}>Retry</button>
      </div>
    )
  }

  if (!stats) {
    return <div className="reports-empty">No data available</div>
  }

  return (
    <div className="reports-container">
      <div className="reports-header">
        <div>
          <h2>System Reports & Analytics</h2>
          <p className="muted">Comprehensive overview of LMS system statistics</p>
        </div>
        <button className="btn btn-primary" onClick={exportReport}>
          📊 Export Report
        </button>
      </div>

      {/* User Statistics */}
      <section className="report-section">
        <h3>User Statistics</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-label">Total Users</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-value">{stats.activeUsers}</div>
              <div className="stat-label">Active Users</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-value">{stats.totalStudents}</div>
              <div className="stat-label">Students</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-value">{stats.totalFaculty}</div>
              <div className="stat-label">Faculty</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-value">{stats.totalTAs}</div>
              <div className="stat-label">Teaching Assistants</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-value">{stats.totalAdmins}</div>
              <div className="stat-label">Administrators</div>
            </div>
          </div>
        </div>
      </section>

      {/* Course Statistics */}
      <section className="report-section">
        <h3>Course Statistics</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-value">{stats.totalCourses}</div>
              <div className="stat-label">Total Courses</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-value">{stats.totalOfferings}</div>
              <div className="stat-label">Course Offerings</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-value">{stats.totalEnrollments}</div>
              <div className="stat-label">Total Enrollments</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-value">{stats.totalOfferings > 0 ? Math.round((stats.totalEnrollments / stats.totalOfferings) * 10) / 10 : 0}</div>
              <div className="stat-label">Avg Students per Course</div>
            </div>
          </div>
        </div>
      </section>

      {/* Academic Content Statistics */}
      <section className="report-section">
        <h3>Academic Content</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-value">{stats.totalAssignments}</div>
              <div className="stat-label">Assignments</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-value">{stats.totalQuizzes}</div>
              <div className="stat-label">Quizzes</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-value">{stats.totalOfferings > 0 ? Math.round(((stats.totalAssignments + stats.totalQuizzes) / stats.totalOfferings) * 10) / 10 : 0}</div>
              <div className="stat-label">Avg Assessments per Course</div>
            </div>
          </div>
        </div>
      </section>

      {/* Support Statistics */}
      <section className="report-section">
        <h3>Support & Maintenance</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-value">{stats.totalSupportTickets}</div>
              <div className="stat-label">Total Tickets</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-value">{stats.openTickets}</div>
              <div className="stat-label">Open Tickets</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-value">{stats.resolvedTickets}</div>
              <div className="stat-label">Resolved Tickets</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-value">{stats.totalSupportTickets > 0 ? Math.round((stats.resolvedTickets / stats.totalSupportTickets) * 100) : 0}%</div>
              <div className="stat-label">Resolution Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* System Health Summary */}
      <section className="report-section">
        <h3>System Health Summary</h3>
        <div className="health-summary">
          <div className="health-item">
            <span className="health-label">User Activity:</span>
            <span className="health-value">
              {stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% Active
            </span>
          </div>
          <div className="health-item">
            <span className="health-label">Course Utilization:</span>
            <span className="health-value">
              {stats.totalEnrollments > 0 ? 'Active' : 'Low Activity'}
            </span>
          </div>
          <div className="health-item">
            <span className="health-label">Support Load:</span>
            <span className="health-value">
              {stats.openTickets < 10 ? 'Light' : stats.openTickets < 25 ? 'Moderate' : 'High'}
            </span>
          </div>
          <div className="health-item">
            <span className="health-label">Content Creation:</span>
            <span className="health-value">
              {(stats.totalAssignments + stats.totalQuizzes) > stats.totalOfferings ? 'Excellent' : 'Good'}
            </span>
          </div>
        </div>
      </section>

      <div className="report-footer">
        <p className="muted">Report generated on {new Date().toLocaleString()}</p>
        <button className="btn btn-secondary" onClick={loadReportData}>🔄 Refresh Data</button>
      </div>
    </div>
  )
}

export default Reports
