import MenuTiny from './MenuTiny'

export default function PresentAssignmentsSection({
  userRole,
  presentAssignments,
  isBackend,
  onTeacherDelete,
  onStudentClickSubmitPDF,
  onAttemptQuiz,
  onStartCodeAttempt,
  selectedAssignmentId,
  onChangeSelectedAssignmentId,
  linkUrl,
  onChangeLinkUrl,
  onSubmitLink,
  codeAssignmentId,
  onChangeCodeAssignmentId,
  onOpenCodeEditor,
}: {
  userRole?: string
  presentAssignments: any[]
  isBackend: boolean
  onTeacherDelete: (assignmentId: number) => Promise<void>
  onStudentClickSubmitPDF: (assignmentId: string) => void
  onAttemptQuiz: (quizId: any) => void
  onStartCodeAttempt: (assignment: any) => void
  selectedAssignmentId: string
  onChangeSelectedAssignmentId: (v: string) => void
  linkUrl: string
  onChangeLinkUrl: (v: string) => void
  onSubmitLink: (e: React.FormEvent) => void
  codeAssignmentId: string
  onChangeCodeAssignmentId: (v: string) => void
  onOpenCodeEditor: () => void
}) {
  return (
    <section className="assignments-section">
      <div className="section-header">
        <h2 className="section-title">
          {userRole === 'student' ? 'Your Assignments' : 'Open Assignments'}
        </h2>
        <span className="assignment-count">{presentAssignments.length} available</span>
      </div>
      
      {userRole === 'student' && presentAssignments.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <h3>All caught up!</h3>
          <p>You've completed all your assignments and quizzes.</p>
        </div>
      )}

      <div className="assignments-grid">
        {presentAssignments.map((a: any) => (
          <div
            key={a.id}
            className={`assignment-card ${(userRole==='student' && (a.assignment_type==='file' || a.assignment_type==='pdf')) ? 'clickable' : ''}`}
            onClick={() => {
              if (userRole==='student' && (a.assignment_type==='file' || a.assignment_type==='pdf')) {
                onStudentClickSubmitPDF(String(a.id))
                setTimeout(() => {
                  const form = document.querySelector('form[data-assignment-submit]') as HTMLElement | null
                  if (form) form.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                }, 80)
              }
            }}
          >
            <div className="assignment-header">
              <div className="assignment-type">
                {a.assignment_type === 'code' && '💻'}
                {a.assignment_type === 'quiz' && '📝'}
                {a.assignment_type === 'file' && '📄'}
                {a.assignment_type === 'pdf' && '📄'}
                {!a.assignment_type && a.is_quiz && '📝'}
                <span>{a.assignment_type === 'code' ? 'Code' : a.assignment_type === 'quiz' ? 'Quiz' : a.assignment_type === 'file' ? 'PDF' : a.assignment_type === 'pdf' ? 'PDF' : a.is_quiz ? 'Quiz' : 'Assignment'}</span>
              </div>
              {isBackend && userRole === 'teacher' && (
                <MenuTiny onDelete={async () => { await onTeacherDelete(Number(a.id)) }} />
              )}
            </div>

            <h3 className="assignment-title">{a.title}</h3>
            
            {a.due_at && (
              <div className="assignment-due">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Due: {new Date(a.due_at).toLocaleDateString()}
              </div>
            )}

            {userRole === 'student' && (
              <div className="assignment-actions">
                {a.is_quiz ? (
                  <button
                    className="btn-assignment attempt-quiz"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAttemptQuiz(a.quiz_id)
                    }}
                  >
                    <span>Start Quiz</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9,18 15,12 9,6"/>
                    </svg>
                  </button>
                ) : a.assignment_type === 'code' ? (
                  <button
                    className="btn-assignment attempt-code"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStartCodeAttempt(a)
                    }}
                  >
                    <span>Code Editor</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9,18 15,12 9,6"/>
                    </svg>
                  </button>
                ) : a.assignment_type === 'file' || a.assignment_type === 'pdf' ? (
                  <button
                    className="btn-assignment submit-pdf"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStudentClickSubmitPDF(String(a.id))
                      setTimeout(() => {
                        const form = document.querySelector('form[data-assignment-submit]') as HTMLElement | null
                        if (form) form.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                      }, 80)
                    }}
                  >
                    <span>Submit PDF</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21,15v4a2,2 0 0 1-2,2H5a2,2 0 0 1-2-2v-4"/>
                      <polyline points="7,10 12,15 17,10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>

      {userRole === 'student' && isBackend && (
        <div className="submission-section">
          <div className="submission-header">
            <h4>Submit PDF Assignment</h4>
            <p className="submission-description">Upload your PDF assignment via Google Drive or similar service</p>
          </div>
          <form data-assignment-submit onSubmit={onSubmitLink} className="submission-form">
            <div className="form-group">
              <label htmlFor="assignment-select">Select Assignment</label>
              <select
                id="assignment-select"
                className="form-select"
                value={selectedAssignmentId}
                onChange={(e) => onChangeSelectedAssignmentId(e.target.value)}
              >
                <option value="">Choose a PDF assignment...</option>
                {presentAssignments
                  .filter((a: any) => (a.assignment_type === 'file' || a.assignment_type === 'pdf'))
                  .map((a: any) => (
                    <option key={a.id} value={String(a.id)}>{a.title}</option>
                  ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="submission-url">Submission Link</label>
              <input
                id="submission-url"
                className="form-input"
                placeholder="Paste your Google Drive or cloud storage link"
                value={linkUrl}
                onChange={(e) => onChangeLinkUrl(e.target.value)}
                required
              />
            </div>
            <button className="btn-submit" type="submit" disabled={!selectedAssignmentId || !linkUrl.trim()}>
              <span>Submit Assignment</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21,15v4a2,2 0 0 1-2,2H5a2,2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          </form>
        </div>
      )}

      {userRole === 'student' && isBackend && (
        <div className="submission-section">
          <div className="submission-header">
            <h4>Code Assignment</h4>
            <p className="submission-description">Work on your coding assignments in our built-in editor</p>
          </div>
          <div className="code-submission-form">
            <div className="form-group">
              <label htmlFor="code-assignment-select">Select Code Assignment</label>
              <select
                id="code-assignment-select"
                className="form-select"
                value={codeAssignmentId}
                onChange={(e) => onChangeCodeAssignmentId(e.target.value)}
              >
                <option value="">Choose a code assignment...</option>
                {presentAssignments.filter((a: any) => a.assignment_type === 'code').map((a: any) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
            <button
              className="btn-code-editor"
              onClick={onOpenCodeEditor}
              disabled={!codeAssignmentId}
            >
              <span>Open Code Editor</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16,18 22,12 16,6"/>
                <polyline points="8,6 2,12 8,18"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
