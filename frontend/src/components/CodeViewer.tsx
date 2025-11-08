import './CodeEditor.css'

interface CodeViewerProps {
  code: string
  language: string
  studentName?: string
  studentEmail?: string
  submittedAt?: string
  onGrade?: (score: number, feedback: string) => void
}

export default function CodeViewer({ 
  code, 
  language, 
  studentName, 
  studentEmail, 
  submittedAt,
  onGrade 
}: CodeViewerProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    alert('Code copied to clipboard!')
  }

  const handleGrade = () => {
    const score = prompt('Enter score (0-100):')
    if (score === null) return
    const numScore = parseFloat(score)
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      alert('Please enter a valid score between 0 and 100')
      return
    }
    const feedback = prompt('Enter feedback (optional):') || ''
    if (onGrade) {
      onGrade(numScore, feedback)
    }
  }

  return (
    <div className="code-viewer-container">
      <div className="code-viewer-header">
        <div className="code-viewer-info">
          <span><strong>Language:</strong> {language}</span>
          {studentName && <span><strong>Student:</strong> {studentName}</span>}
          {studentEmail && <span><strong>Email:</strong> {studentEmail}</span>}
          {submittedAt && <span><strong>Submitted:</strong> {new Date(submittedAt).toLocaleString()}</span>}
        </div>
        <div className="code-viewer-actions">
          <button className="btn" onClick={handleCopy}>
            Copy Code
          </button>
          {onGrade && (
            <button className="btn btn-primary" onClick={handleGrade}>
              Grade
            </button>
          )}
        </div>
      </div>
      <pre className="code-viewer-code">{code}</pre>
    </div>
  )
}
