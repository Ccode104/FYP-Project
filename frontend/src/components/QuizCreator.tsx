import { useState } from 'react'
import { useToast } from './ToastProvider'
import { createQuizAssignment } from '../services/assignments'

interface QuizQuestion {
  id: string
  question_text: string
  question_type: 'mcq' | 'short' | 'true_false'
  metadata: {
    choices?: string[]
    correct_answer?: string | number
  }
}

interface QuizCreatorProps {
  courseOfferingId: string
  onComplete: () => void
}

export default function QuizCreator({ courseOfferingId, onComplete }: QuizCreatorProps) {
  // call the hook at the top-level (unconditionally)
  const toast = useToast()
  // Safe fallback for toast push so missing/partial provider doesn't crash the app
  let push: (opts: { kind?: 'success' | 'error' | string; message?: string }) => void = (opts) => {
    if (!opts) return
    if ((opts as any).kind === 'error') console.error(opts.message ?? opts)
    else if ((opts as any).kind === 'success') console.log(opts.message ?? opts)
    else console.log(opts)
  }
  if (toast && typeof (toast as any).push === 'function') {
    push = (toast as any).push
  } else {
    // Helpful dev hint if provider isn't wired
    console.warn('ToastProvider not present or push not available — using console fallback for toasts.')
  }

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [maxScore, setMaxScore] = useState('100')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [currentType, setCurrentType] = useState<'mcq' | 'short' | 'true_false'>('mcq')
  const [mcqChoices, setMcqChoices] = useState(['', '', '', ''])
  const [correctAnswer, setCorrectAnswer] = useState<string | number>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // compute filtered MCQ choices so indices match stored choices
  const validMcqChoices = mcqChoices.filter(c => c.trim() !== '')

  const addQuestion = () => {
    if (!currentQuestion.trim()) {
      push({ kind: 'error', message: 'Question text is required' })
      return
    }

    const newQuestion: QuizQuestion = {
      id: Date.now().toString(),
      question_text: currentQuestion,
      question_type: currentType,
      metadata: {}
    }

    if (currentType === 'mcq') {
      const validChoices = mcqChoices.filter(c => c.trim() !== '')
      if (validChoices.length < 2) {
        push({ kind: 'error', message: 'MCQ must have at least 2 choices' })
        return
      }
      // require correctAnswer to be a number and in range of the filtered choices
      if (correctAnswer === '' || typeof correctAnswer !== 'number' || correctAnswer < 0 || correctAnswer >= validChoices.length) {
        push({ kind: 'error', message: 'Select a valid correct answer' })
        return
      }
      newQuestion.metadata = {
        choices: validChoices,
        correct_answer: Number(correctAnswer)
      }
    } else if (currentType === 'true_false') {
      if (correctAnswer !== 'true' && correctAnswer !== 'false') {
        push({ kind: 'error', message: 'Select true or false as correct answer' })
        return
      }
      newQuestion.metadata = {
        choices: ['True', 'False'],
        correct_answer: correctAnswer === 'true' ? 0 : 1
      }
    } else {
      // Short answer - store expected answer as string
      newQuestion.metadata = {
        correct_answer: correctAnswer as string
      }
    }

    setQuestions([...questions, newQuestion])
    // Reset form
    setCurrentQuestion('')
    setCurrentType('mcq')
    setMcqChoices(['', '', '', ''])
    setCorrectAnswer('')
    push({ kind: 'success', message: 'Question added' })
  }

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id))
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      push({ kind: 'error', message: 'Quiz title is required' })
      return
    }

    if (questions.length === 0) {
      push({ kind: 'error', message: 'Add at least one question' })
      return
    }

    setIsSubmitting(true)
    try {
      await createQuizAssignment({
        course_offering_id: Number(courseOfferingId),
        title,
        description,
        start_at: startAt || null,
        end_at: endAt || null,
        max_score: Number(maxScore) || 100,
        questions: questions.map(q => ({
          question_text: q.question_text,
          question_type: q.question_type,
          metadata: q.metadata
        }))
      })
      push({ kind: 'success', message: 'Quiz created successfully' })
      onComplete()
    } catch (e: any) {
      push({ kind: 'error', message: e?.message || 'Failed to create quiz' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="form" style={{ maxWidth: 800 }}>
      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <h4 style={{ marginTop: 0 }}>Quiz Details</h4>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Quiz Title *</div>
          <input
            className="input"
            style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Midterm Quiz - Chapter 1-5"
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Description</div>
          <textarea
            className="input"
            style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 72 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional quiz instructions..."
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
        <h4 style={{ marginTop: 0 }}>Add Question</h4>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Question Type</div>
          <select
            className="select"
            style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
            value={currentType}
            onChange={(e) => {
              setCurrentType(e.target.value as any)
              setCorrectAnswer('')
              if (e.target.value === 'mcq') setMcqChoices(['', '', '', ''])
            }}
          >
            <option value="mcq">Multiple Choice (MCQ)</option>
            <option value="true_false">True/False</option>
            <option value="short">Short Answer</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Question Text *</div>
          <textarea
            className="input"
            style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 72 }}
            value={currentQuestion}
            onChange={(e) => setCurrentQuestion(e.target.value)}
            placeholder="Enter your question here..."
            rows={3}
          />
        </div>

        {currentType === 'mcq' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Choices</div>
              {mcqChoices.map((choice, idx) => (
                <input
                  key={idx}
                  className="input"
                  style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginBottom: 8 }}
                  value={choice}
                  onChange={(e) => {
                    const updated = [...mcqChoices]
                    updated[idx] = e.target.value
                    setMcqChoices(updated)
                  }}
                  placeholder={`Choice ${idx + 1}`}
                />
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Correct Answer *</div>
              <select
                className="select"
                style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                value={correctAnswer}
                onChange={(e) => {
                  const v = e.target.value
                  setCorrectAnswer(v === '' ? '' : Number(v))
                }}
              >
                <option value="">Select correct choice</option>
                {validMcqChoices.map((choice, idx) => (
                  <option key={idx} value={idx}>Choice {idx + 1}: {choice.substring(0, 30)}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {currentType === 'true_false' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Correct Answer *</div>
            <select
              className="select"
              style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
            >
              <option value="">Select answer</option>
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          </div>
        )}

        {currentType === 'short' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Expected Answer (optional for grading reference)</div>
            <input
              className="input"
              style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              placeholder="Expected answer or keywords..."
            />
          </div>
        )}

        <button className="btn btn-primary" onClick={addQuestion}>
          Add Question
        </button>
      </div>

      {questions.length > 0 && (
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <h4 style={{ marginTop: 0 }}>Questions ({questions.length})</h4>
          <ul className="list">
            {questions.map((q, idx) => (
              <li key={q.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <strong>Q{idx + 1}.</strong> {q.question_text}
                    <span className="muted" style={{ marginLeft: 8 }}>
                      ({q.question_type === 'mcq' ? 'MCQ' : q.question_type === 'true_false' ? 'True/False' : 'Short Answer'})
                    </span>
                    {q.question_type === 'mcq' && q.metadata.choices && (
                      <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                        {q.metadata.choices.map((choice, i) => (
                          <li key={i} style={{ color: i === Number(q.metadata.correct_answer) ? 'green' : 'inherit' }}>
                            {choice} {i === Number(q.metadata.correct_answer) && '✓'}
                          </li>
                        ))}
                      </ul>
                    )}
                    {q.question_type === 'true_false' && (
                      <div style={{ marginTop: 4 }}>
                        Correct: <strong>{Number(q.metadata.correct_answer) === 0 ? 'True' : 'False'}</strong>
                      </div>
                    )}
                  </div>
                  <button
                    className="btn"
                    onClick={() => removeQuestion(q.id)}
                    style={{ marginLeft: 8 }}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Quiz'}
        </button>
      </div>
    </div>
  )
}
