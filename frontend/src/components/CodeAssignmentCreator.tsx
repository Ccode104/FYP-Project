import { useState, useEffect } from 'react'
import { useToast } from './ToastProvider'

interface CodeQuestion {
  id: number
  title: string
  description: string
  constraints?: string
  test_cases?: any[]
}

interface CodeAssignmentCreatorProps {
  courseOfferingId: string
  onComplete: () => void
}

export default function CodeAssignmentCreator({ courseOfferingId, onComplete }: CodeAssignmentCreatorProps) {
  const toast = useToast()
  let push: (opts: { kind?: 'success' | 'error' | string; message?: string }) => void = (opts) => {
    if (!opts) return
    const kind = (opts as any)?.kind
    const msg = (opts as any)?.message ?? opts
    if (kind === 'error') console.error(msg)
    else if (kind === 'success') console.log(msg)
    else console.log(msg)
  }
  if (toast && typeof (toast as any).push === 'function') {
    push = (toast as any).push
  }

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [maxScore, setMaxScore] = useState('100')
  const [availableQuestions, setAvailableQuestions] = useState<CodeQuestion[]>([])
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadQuestions()
  }, [courseOfferingId])

  const loadQuestions = async () => {
    try {
      const { apiFetch } = await import('../services/api')
      const questions = await apiFetch<CodeQuestion[]>(`/api/courses/${courseOfferingId}/code-questions`)
      setAvailableQuestions(questions || [])
    } catch (err: any) {
      console.error('Failed to load questions:', err)
      push({ kind: 'error', message: 'Failed to load code questions' })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleQuestion = (questionId: number) => {
    const newSelected = new Set(selectedQuestionIds)
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId)
    } else {
      newSelected.add(questionId)
    }
    setSelectedQuestionIds(newSelected)
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      push({ kind: 'error', message: 'Assignment title is required' })
      return
    }
    if (selectedQuestionIds.size === 0) {
      push({ kind: 'error', message: 'Select at least one question' })
      return
    }

    setIsSubmitting(true)
    try {
      const { apiFetch } = await import('../services/api')
      await apiFetch('/api/assignments', {
        method: 'POST',
        body: {
          course_offering_id: Number(courseOfferingId),
          title,
          description: description || null,
          assignment_type: 'code',
          release_at: startAt || null,
          due_at: endAt || null,
          max_score: Number(maxScore) || 100,
          question_ids: Array.from(selectedQuestionIds)
        }
      })
      push({ kind: 'success', message: 'Code assignment created successfully' })
      onComplete()
    } catch (e: any) {
      push({ kind: 'error', message: e?.message || 'Failed to create assignment' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div>Loading questions...</div>
  }

  return (
    <div className="form" style={{ maxWidth: 900 }}>
      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <h4 style={{ marginTop: 0 }}>Assignment Details</h4>
        
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Assignment Title *</div>
          <input
            className="input"
            style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Programming Assignment 1"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Description</div>
          <textarea
            className="input"
            style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 72 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional assignment instructions..."
            rows={3}
          />
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Start Time</div>
            <input
              className="input"
              style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>End Time</div>
            <input
              className="input"
              style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Max Score</div>
          <input
            className="input"
            style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
            type="number"
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            placeholder="100"
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <h4 style={{ marginTop: 0 }}>Select Questions ({selectedQuestionIds.size} selected)</h4>
        
        {availableQuestions.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: '#666' }}>
            No code questions available. Create questions first.
          </div>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {availableQuestions.map((q) => {
              const isSelected = selectedQuestionIds.has(q.id)
              const sampleTestCases = q.test_cases?.filter(tc => tc.is_sample) || []
              
              return (
                <div
                  key={q.id}
                  className="card"
                  style={{
                    marginBottom: 12,
                    padding: 16,
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #007bff' : '1px solid #ddd',
                    backgroundColor: isSelected ? '#f0f8ff' : '#fff'
                  }}
                  onClick={() => toggleQuestion(q.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleQuestion(q.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ marginTop: 4 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>{q.title}</div>
                      <div style={{ marginBottom: 8, color: '#666', fontSize: '0.9em' }}>
                        {q.description.substring(0, 150)}{q.description.length > 150 ? '...' : ''}
                      </div>
                      {q.constraints && (
                        <div style={{ marginBottom: 8, fontSize: '0.85em', color: '#888' }}>
                          <strong>Constraints:</strong> {q.constraints}
                        </div>
                      )}
                      {sampleTestCases.length > 0 && (
                        <div style={{ fontSize: '0.85em', color: '#666' }}>
                          <strong>Sample Test Cases:</strong> {sampleTestCases.length}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onComplete}>Cancel</button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitting || selectedQuestionIds.size === 0}
        >
          {isSubmitting ? 'Creating...' : 'Create Assignment'}
        </button>
      </div>
    </div>
  )
}

