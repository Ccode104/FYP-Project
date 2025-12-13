import { useState, useEffect } from 'react'
import { getAssignmentRubric } from '../../services/rubrics'
import type { RubricWithCriteria, RubricCriterion, RubricGrade } from '../../services/rubrics'

interface RubricGradingFormProps {
  assignmentId: number
  onGrade: (rubricGrades: RubricGrade[], overallFeedback?: string) => void
  push: (message: { kind: 'success' | 'error' | 'info'; message: string }) => void
}

function RubricGradingForm({ assignmentId, onGrade, push }: RubricGradingFormProps) {
  const [rubric, setRubric] = useState<RubricWithCriteria | null>(null)
  const [loading, setLoading] = useState(true)
  const [grades, setGrades] = useState<Record<number, { score: number; feedback: string }>>({})
  const [overallFeedback, setOverallFeedback] = useState('')

  useEffect(() => {
    loadRubric()
  }, [assignmentId])

  const loadRubric = async () => {
    try {
      setLoading(true)
      const data = await getAssignmentRubric(assignmentId)
      if (data.rubric) {
        setRubric(data.rubric)
        // Initialize grades with default values
        const initialGrades: Record<number, { score: number; feedback: string }> = {}
        data.criteria.forEach((criterion: RubricCriterion) => {
          initialGrades[criterion.id] = { score: 0, feedback: '' }
        })
        setGrades(initialGrades)
      }
    } catch (error) {
      console.error('Failed to load rubric:', error)
      push({ kind: 'error', message: 'Failed to load grading rubric' })
    } finally {
      setLoading(false)
    }
  }

  const handleScoreChange = (criterionId: number, score: number) => {
    setGrades(prev => ({
      ...prev,
      [criterionId]: { ...prev[criterionId], score }
    }))
  }

  const handleFeedbackChange = (criterionId: number, feedback: string) => {
    setGrades(prev => ({
      ...prev,
      [criterionId]: { ...prev[criterionId], feedback }
    }))
  }

  const calculateTotalScore = () => {
    if (!rubric?.criteria) return 0

    let totalWeightedScore = 0
    let totalWeight = 0

    rubric.criteria.forEach(criterion => {
      const grade = grades[criterion.id]
      if (grade) {
        totalWeightedScore += (grade.score * criterion.weight)
        totalWeight += criterion.weight
      }
    })

    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!rubric?.criteria) {
      push({ kind: 'error', message: 'No rubric available for grading' })
      return
    }

    const rubricGrades: RubricGrade[] = rubric.criteria.map(criterion => ({
      criterionId: criterion.id,
      score: grades[criterion.id]?.score || 0,
      feedback: grades[criterion.id]?.feedback || ''
    }))

    onGrade(rubricGrades, overallFeedback)
  }

  if (loading) {
    return <div className="loading">Loading rubric...</div>
  }

  if (!rubric) {
    return (
      <div className="rubric-notice">
        <p>No grading rubric assigned to this assignment. Using standard grading.</p>
      </div>
    )
  }

  const totalScore = calculateTotalScore()

  return (
    <div className="rubric-grading-form">
      <h4 style={{ marginTop: 0, marginBottom: '16px' }}>Grade Using Rubric: {rubric.title}</h4>

      {rubric.description && (
        <div className="rubric-description" style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
          <strong>Description:</strong> {rubric.description}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="rubric-criteria">
          {rubric.criteria.map((criterion: RubricCriterion) => (
            <div key={criterion.id} className="rubric-criterion" style={{ marginBottom: '20px', padding: '16px', border: '1px solid var(--border)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h5 style={{ margin: 0, marginBottom: '4px' }}>{criterion.title}</h5>
                  {criterion.description && (
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>{criterion.description}</p>
                  )}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--muted)', marginLeft: '16px' }}>
                  Max: {criterion.max_points} pts<br/>
                  Weight: {criterion.weight}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Score:</label>
                <input
                  type="number"
                  min="0"
                  max={criterion.max_points}
                  step="0.5"
                  value={grades[criterion.id]?.score || 0}
                  onChange={(e) => handleScoreChange(criterion.id, parseFloat(e.target.value) || 0)}
                  className="form-input"
                  style={{ width: '80px' }}
                  required
                />
                <span style={{ fontSize: '14px', color: 'var(--muted)' }}>/ {criterion.max_points}</span>
              </div>

              <div>
                <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                  Criterion Feedback (optional):
                </label>
                <textarea
                  value={grades[criterion.id]?.feedback || ''}
                  onChange={(e) => handleFeedbackChange(criterion.id, e.target.value)}
                  rows={2}
                  className="form-textarea"
                  placeholder="Provide specific feedback for this criterion..."
                  style={{ fontSize: '14px' }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rubric-summary" style={{ marginTop: '20px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <strong>Calculated Total Score:</strong>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)' }}>
              {totalScore.toFixed(1)} / 100
            </span>
          </div>

          <div>
            <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
              Overall Feedback (optional):
            </label>
            <textarea
              value={overallFeedback}
              onChange={(e) => setOverallFeedback(e.target.value)}
              rows={3}
              className="form-textarea"
              placeholder="Provide overall feedback for the assignment..."
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: '20px' }}>
          <button type="submit" className="btn btn-primary">
            Submit Rubric Grades
          </button>
        </div>
      </form>
    </div>
  )
}

export default RubricGradingForm
