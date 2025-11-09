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
    <section className="card">
      <h3>{userRole === 'student' ? 'Assignments & Quizzes' : 'Open Assignments'}</h3>
      {userRole === 'student' && presentAssignments.length === 0 && (
        <p className="muted">No unsubmitted assignments or quizzes available.</p>
      )}
      <ul className="list">
        {presentAssignments.map((a: any) => (
          <li
            key={a.id}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: (userRole==='student' && (a.assignment_type==='file' || a.assignment_type==='pdf')) ? 'pointer' : 'default' }}
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
            <span style={{ flex: 1 }}>
              {a.title}
              {a.due_at ? ` (Due: ${new Date(a.due_at).toLocaleString()})` : ''}
              {a.assignment_type && (
                <span style={{ marginLeft: 8, fontSize: '0.9em', color: '#6b7280' }}>
                  [{a.assignment_type === 'code' ? '💻 Code' : a.assignment_type === 'quiz' ? '📝 Quiz' : a.assignment_type === 'file' ? '📄 PDF' : a.assignment_type}]
                </span>
              )}
              {a.is_quiz && (
                <span style={{ marginLeft: 8, fontSize: '0.9em', color: '#6b7280' }}>
                  [📝 Quiz-based]
                </span>
              )}
            </span>

            {isBackend && userRole === 'teacher' && (
              <MenuTiny onDelete={async () => { await onTeacherDelete(Number(a.id)) }} />
            )}

            {userRole === 'student' && (
              <>
                {a.is_quiz ? (
                  <button
                    className="btn btn-primary"
                    style={{ marginLeft: 8 }}
                    onClick={() => onAttemptQuiz(a.quiz_id)}
                  >
                    Attempt Quiz
                  </button>
                ) : a.assignment_type === 'code' ? (
                  <button
                    className="btn btn-primary"
                    style={{ marginLeft: 8 }}
                    onClick={() => onStartCodeAttempt(a)}
                  >
                    Attempt Code
                  </button>
                ) : a.assignment_type === 'file' || a.assignment_type === 'pdf' ? (
                  <button
                    className="btn btn-primary"
                    style={{ marginLeft: 8 }}
                    onClick={() => {
                      onStudentClickSubmitPDF(String(a.id))
                      setTimeout(() => {
                        const form = document.querySelector('form[data-assignment-submit]') as HTMLElement | null
                        if (form) form.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                      }, 80)
                    }}
                  >
                    Submit PDF
                  </button>
                ) : null}
              </>
            )}
          </li>
        ))}
      </ul>

      {userRole === 'student' && isBackend && (
        <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border-color, #ddd)' }}>
          <h4>Submit PDF Assignment</h4>
          <form data-assignment-submit onSubmit={onSubmitLink} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <select
              className="select"
              value={selectedAssignmentId}
              onChange={(e) => onChangeSelectedAssignmentId(e.target.value)}
              style={{ minWidth: 200 }}
            >
              <option value="">Select PDF assignment</option>
              {presentAssignments
                .filter((a: any) => (a.assignment_type === 'file' || a.assignment_type === 'pdf'))
                .map((a: any) => (
                  <option key={a.id} value={String(a.id)}>{a.title}</option>
                ))}
            </select>
            <input
              className="input"
              style={{ flex: 1, minWidth: 260 }}
              placeholder="Submission URL (e.g., Google Drive link)"
              value={linkUrl}
              onChange={(e) => onChangeLinkUrl(e.target.value)}
              required
            />
            <button className="btn btn-primary" type="submit" disabled={!selectedAssignmentId || !linkUrl.trim()}>
              Submit
            </button>
          </form>
        </div>
      )}

      {userRole === 'student' && isBackend && (
        <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border-color, #ddd)' }}>
          <h4>Code Submission</h4>
          <p className="muted">Submit code for code-based assignments</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
            <select
              className="select"
              value={codeAssignmentId}
              onChange={(e) => onChangeCodeAssignmentId(e.target.value)}
            >
              <option value="">Select code assignment</option>
              {presentAssignments.filter((a: any) => a.assignment_type === 'code').map((a: any) => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
            <button
              className="btn btn-primary"
              onClick={onOpenCodeEditor}
              disabled={!codeAssignmentId}
            >
              Open Code Editor
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
