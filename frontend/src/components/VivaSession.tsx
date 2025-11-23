import { useState, useEffect } from 'react'
import { getVivaSessionDetails, generateVivaQuestions } from '../services/viva'
import type { VivaSessionDetails, VivaParticipant } from '../services/viva'

interface VivaSessionProps {
  sessionId: number
  onClose?: () => void
}

function VivaSession({ sessionId, onClose }: VivaSessionProps) {
  const [session, setSession] = useState<VivaSessionDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedParticipant, setSelectedParticipant] = useState<VivaParticipant | null>(null)
  const [generatingQuestions, setGeneratingQuestions] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState<string>('')

  useEffect(() => {
    loadSessionDetails()
  }, [sessionId])

  const loadSessionDetails = async () => {
    try {
      setLoading(true)
      const data = await getVivaSessionDetails(sessionId)
      // Create a complete session object with participants
      const completeSession: VivaSessionDetails = {
        ...data.session,
        course_code: '', // These would come from the backend response
        course_title: '',
        participants: data.participants || []
      }
      setSession(completeSession)
      // Auto-select first participant if available
      if (data.participants && data.participants.length > 0) {
        setSelectedParticipant(data.participants[0])
      }
    } catch (error) {
      console.error('Failed to load viva session:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateQuestions = async () => {
    if (!selectedParticipant || !session) return

    try {
      setGeneratingQuestions(true)
      setGeneratedQuestions('')

      const data = await generateVivaQuestions({
        vivaSessionId: session.id,
        studentId: selectedParticipant.student_id,
        difficulty: 'medium',
        count: 3
      })

      setGeneratedQuestions(data.questions)
    } catch (error) {
      console.error('Failed to generate questions:', error)
      setGeneratedQuestions('Failed to generate questions. Please try again.')
    } finally {
      setGeneratingQuestions(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading viva session...</div>
  }

  if (!session) {
    return <div className="error">Failed to load viva session</div>
  }

  return (
    <div className="viva-session">
      <div className="viva-header" style={{ marginBottom: '24px' }}>
        <h2>{session.title}</h2>
        {session.description && (
          <p style={{ color: 'var(--muted)', marginTop: '8px' }}>{session.description}</p>
        )}
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '14px' }}>
          <span><strong>Course:</strong> {session.course_code} - {session.course_title}</span>
          <span><strong>Duration:</strong> {session.duration_minutes} minutes</span>
          <span><strong>Status:</strong> {session.status}</span>
        </div>
      </div>

      <div className="viva-content" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
        {/* Participants List */}
        <div className="participants-panel">
          <h3>Participants ({session.participants?.length || 0})</h3>
          <div className="participants-list" style={{ marginTop: '12px' }}>
            {session.participants?.map((participant) => (
              <div
                key={participant.id}
                className={`participant-item ${selectedParticipant?.id === participant.id ? 'selected' : ''}`}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: selectedParticipant?.id === participant.id ? 'var(--bg-secondary)' : 'transparent'
                }}
                onClick={() => setSelectedParticipant(participant)}
              >
                <div style={{ fontWeight: 'bold' }}>{participant.student_name}</div>
                <div style={{ fontSize: '14px', color: 'var(--muted)' }}>{participant.student_email}</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  Status: <span style={{
                    color: participant.status === 'completed' ? 'var(--success)' :
                           participant.status === 'in_progress' ? 'var(--primary)' : 'var(--muted)'
                  }}>{participant.status}</span>
                  {participant.score && <span> | Score: {participant.score}</span>}
                </div>
              </div>
            )) || <p>No participants found</p>}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="session-content">
          {selectedParticipant ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3>Session with {selectedParticipant.student_name}</h3>
                <button
                  className="btn btn-primary"
                  onClick={handleGenerateQuestions}
                  disabled={generatingQuestions}
                >
                  {generatingQuestions ? 'Generating...' : 'Generate AI Questions'}
                </button>
              </div>

              {/* AI Generated Questions */}
              {generatedQuestions && (
                <div className="ai-questions" style={{ marginBottom: '24px' }}>
                  <h4>AI-Generated Questions</h4>
                  <div style={{
                    padding: '16px',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace'
                  }}>
                    {generatedQuestions}
                  </div>
                </div>
              )}

              {/* Grading Section */}
              <div className="grading-section">
                <h4>Grade Participant</h4>
                <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <p>Grading functionality would go here...</p>
                  <p>Score: {selectedParticipant.score || 'Not graded'}</p>
                  {selectedParticipant.feedback && (
                    <div>
                      <strong>Feedback:</strong>
                      <p>{selectedParticipant.feedback}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="no-selection">
              <p>Select a participant to begin the viva session</p>
            </div>
          )}
        </div>
      </div>

      {onClose && (
        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <button className="btn" onClick={onClose}>Close Session</button>
        </div>
      )}
    </div>
  )
}

export default VivaSession