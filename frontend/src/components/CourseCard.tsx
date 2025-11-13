import type { Course } from '../data/mock'
import './CourseCard.css'

interface CourseCardProps {
  course: Course
  onClick: () => void
  pendingAssignments?: number
  pendingQuizzes?: number
  unreadNotifications?: number
}

export default function CourseCard({ 
  course, 
  onClick, 
  pendingAssignments, 
  pendingQuizzes, 
  unreadNotifications 
}: CourseCardProps) {
  const accents = ['accent-blue','accent-green','accent-purple','accent-orange','accent-pink','accent-cyan']
  const hash = Array.from(course.id).reduce((s, c) => s + c.charCodeAt(0), 0)
  const accent = accents[hash % accents.length]

  // Calculate progress based on assignments
  const totalAssignments = course.assignmentsPast.length + course.assignmentsPresent.length
  const completedAssignments = course.assignmentsPast.length
  const progressPercentage = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0
  
  // Use provided counts or fallback to course data
  const pendingCount = pendingAssignments ?? course.assignmentsPresent.length
  const quizCount = pendingQuizzes ?? 0
  const notificationCount = unreadNotifications ?? 0

  return (
    <div
      className={`card card-hover course-card ${accent} card-enhanced animate-scaleIn`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
      style={{ animationDelay: `${Math.random() * 0.3}s` }}
    >
      <div className="course-card-header">
        <div className="course-card-icon animate-float">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 14L15 11L12 8M9 11H15M7 20H17C18.1046 20 19 19.1046 19 18V8C19 6.89543 18.1046 6 17 6H7C5.89543 6 5 6.89543 5 8V18C5 19.1046 5.89543 20 7 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        {notificationCount > 0 && (
          <div className="course-card-notification">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="course-card-notification-count">{notificationCount}</span>
          </div>
        )}
      </div>
      
      <div className="course-card-content">
          <h3 className="course-card-title h5 font-semibold">{course.title}</h3>
          <p className="course-card-description text-sm leading-relaxed">{course.description}</p>
        
        {totalAssignments > 0 && (
          <div className="course-card-progress">
            <div className="course-card-progress-info">
              <span className="course-card-progress-label text-xs font-medium tracking-wide text-secondary">Progress</span>
              <span className="course-card-progress-value text-xs font-semibold text-primary">{progressPercentage}%</span>
            </div>
            <div className="course-card-progress-bar">
              <div 
                className="course-card-progress-fill" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}
        
        <div className="course-card-stats">
          <div className="course-card-stat text-sm font-medium text-secondary interactive-state">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 5.55228 9.44772 6 10 6H14C14.5523 6 15 5.55228 15 5M9 5C9 4.44772 9.44772 4 10 4H14C14.5523 4 15 4.44772 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{pendingCount} pending assignment{pendingCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="course-card-stat text-sm font-medium text-secondary interactive-state">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{quizCount} pending quiz{quizCount !== 1 ? 'zes' : ''}</span>
          </div>
        </div>
      </div>
      
      <div className="course-card-footer">
        <span className="course-card-action btn-enhanced">View Course</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 5L16 12L9 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  )
}
