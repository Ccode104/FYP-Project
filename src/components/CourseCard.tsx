import type { Course } from '../data/mock'
import './CourseCard.css'

export default function CourseCard({ course, onClick }: { course: Course; onClick: () => void }) {
  const accents = ['accent-blue','accent-green','accent-purple','accent-orange','accent-pink','accent-cyan']
  const hash = Array.from(course.id).reduce((s, c) => s + c.charCodeAt(0), 0)
  const accent = accents[hash % accents.length]

  return (
    <div
      className={`card card-hover course-card ${accent}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
    >
      <h4 style={{ margin: '0 0 8px' }}>{course.title}</h4>
      <p className="muted" style={{ margin: 0 }}>{course.description}</p>
    </div>
  )
}
