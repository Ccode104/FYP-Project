import { useState, useEffect } from 'react'
import { apiFetch } from '../services/api'

interface AssignmentProgressProps {
  courseId: string
}

export default function AssignmentProgress({ courseId }: AssignmentProgressProps) {
  const [progress, setProgress] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const data = await apiFetch<any[]>(`/api/courses/${courseId}/assignments`)
        const submissions = await apiFetch<any[]>(`/api/student/courses/${courseId}/submissions`)
        
        // Map assignments with their submission status
        const progressData = data.map(assignment => {
          const submission = submissions.find(s => s.assignment_id === assignment.id)
          return {
            ...assignment,
            status: submission ? 'Submitted' : 'Pending',
            submittedAt: submission?.submitted_at,
            score: submission?.score,
            feedback: submission?.feedback,
            isLate: submission && assignment.due_at && 
                    new Date(submission.submitted_at) > new Date(assignment.due_at)
          }
        })

        setProgress(progressData)
      } catch (err: any) {
        setError(err.message || 'Failed to load progress')
      } finally {
        setLoading(false)
      }
    }

    if (courseId) {
      void fetchProgress()
    }
  }, [courseId])

  if (loading) return <div>Loading assignment progress...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="assignment-progress">
      <div className="progress-grid">
        {progress.map((item) => (
          <div key={item.id} className="progress-card">
            <div className="progress-header">
              <h4>{item.title}</h4>
              <span className={`status-badge ${item.status.toLowerCase()}`}>
                {item.status}
              </span>
            </div>
            <div className="progress-details">
              <div>
                <strong>Type:</strong> {item.assignment_type || 'Regular'}
              </div>
              <div>
                <strong>Due:</strong> {item.due_at ? new Date(item.due_at).toLocaleString() : 'No deadline'}
              </div>
              {item.submittedAt && (
                <div>
                  <strong>Submitted:</strong> {new Date(item.submittedAt).toLocaleString()}
                  {item.isLate && <span className="late-badge">Late</span>}
                </div>
              )}
              {item.score !== undefined && (
                <div>
                  <strong>Score:</strong> {item.score}/{item.max_score || 100}
                </div>
              )}
              {item.feedback && (
                <div className="feedback">
                  <strong>Feedback:</strong>
                  <p>{item.feedback}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
