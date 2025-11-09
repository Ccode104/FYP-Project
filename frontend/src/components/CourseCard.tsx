import type { Course } from '../data/mock'
import './CourseCard.css'

export default function CourseCard({ course, onClick }: { course: Course; onClick: () => void }) {
  const accents = ['accent-blue','accent-green','accent-purple','accent-orange','accent-pink','accent-cyan']
  const hash = Array.from(course.id).reduce((s, c) => s + c.charCodeAt(0), 0)
  const accent = accents[hash % accents.length]

  // Calculate progress based on assignments
  const totalAssignments = course.assignmentsPast.length + course.assignmentsPresent.length
  const completedAssignments = course.assignmentsPast.length
  const progressPercentage = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0

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
        <div className="course-card-badge">
          <span className="course-card-badge-text">{course.assignmentsPresent.length} Active</span>
        </div>
      </div>
      
      <div className="course-card-content">
          <h3 className="course-card-title h5 font-semibold">{course.title}</h3>
          <p className="course-card-description text-sm leading-relaxed">{course.description}</p>
        
        {totalAssignments > 0 && (
          <div className="course-card-progress">
            <div className="course-card-progress-info">
              <span className="course-card-progress-label text-xs font-medium tracking-wide text-secondary">Progress</span>
              <span className="course-card-progress-value text-xs font-semibold text-primary">{Math.round(progress)}%</span>
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
            <span>{totalAssignments} assignments</span>
          </div>
          <div className="course-card-stat text-sm font-medium text-secondary interactive-state">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 11H13L11 13L9 11H3M21 20H3C2.44772 20 2 19.5523 2 19V5C2 4.44772 2.44772 4 3 4H21C21.5523 4 22 4.44772 22 5V19C22 19.5523 21.5523 20 21 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{course.notes.length} notes</span>
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
