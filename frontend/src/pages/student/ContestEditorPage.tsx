import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useCourse } from '../../context/CourseContext'
import './CodeSubmissionView.css'
import { useToast } from '../../components/ToastProvider'
import { apiFetch } from '../../services/api'
import CodeEditor from '../../components/CodeEditor'
import Leaderboard from '../../components/Leaderboard'
import AchievementBadge from '../../components/AchievementBadge'
import UserStats from '../../components/UserStats'

// Add CodeQuestion type for frontend usage
interface CodeQuestion {
  id: string | number
  title?: string
  description?: string
  constraints?: string
  sample_input?: string
  sample_output?: string
  test_input?: string
  expected_output?: string
  test_cases?: Array<{
    id?: number
    is_sample?: boolean
    input_text?: string
    expected_text?: string
    input_path?: string
    expected_path?: string
  }>
}

interface Contest {
  id: number
  title: string
  description: string
  start_at: string
  end_at: string
  max_score: number
  allow_multiple_submissions: boolean
  created_by: number
  questions?: CodeQuestion[]
}

export default function ContestEditorPage() {
  const { courseId, contestId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { setCourseTitle } = useCourse()
  const toast = useToast()
  const push = (opts: { kind?: 'success' | 'error' | string; message?: string }) => {
    if (toast && typeof (toast as unknown).push === 'function') {
      (toast as unknown).push(opts)
    } else {
      console.log(opts)
    }
  }

  const [selectedContest, setSelectedContest] = useState<Contest | null>(null)
  const [codeEditor, setCodeEditor] = useState<Record<string, string>>({})
  const [codeLang, setCodeLang] = useState<Record<string, string>>({})
  const [runResults, setRunResults] = useState<Record<string, any>>({})
  const [isRunningCode, setIsRunningCode] = useState<Record<string, boolean>>({})
  const [savedQuestions, setSavedQuestions] = useState<Record<string, boolean>>({}) // Track which questions have been saved
  const [isSavingCode, setIsSavingCode] = useState<Record<string, boolean>>({}) // Track saving state per question
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0)
  const [consoleExpanded, setConsoleExpanded] = useState<boolean>(false) // Console section collapsed by default
  const [activeConsoleTab, setActiveConsoleTab] = useState<'test-cases' | 'test-results'>('test-cases')
  const [customTestCases, setCustomTestCases] = useState<Record<string, Array<{ id: string, input: string, expected: string, result?: unknown }>>>({})
  const [testCaseResults, setTestCaseResults] = useState<Record<string, Record<string, any>>>({})
  const [questionTimers, setQuestionTimers] = useState<Record<string, { startTime: number, elapsedTime: number }>>({})
  const [currentQuestionStartTime, setCurrentQuestionStartTime] = useState<number>(Date.now())
  const [currentQuestionElapsedTime, setCurrentQuestionElapsedTime] = useState<number>(0)
  const [showGamification, setShowGamification] = useState<boolean>(false)
  const [gamificationData, setGamificationData] = useState<any>(null)
  const previousQuestionRef = useRef<string | null>(null)

  // Get current question based on index
  const currentQuestion = useMemo(() => {
    return selectedContest?.questions?.[currentQuestionIndex] || null
  }, [selectedContest, currentQuestionIndex])

  // Format elapsed time as HH:MM:SS
  const formatElapsedTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Set course title in navbar and clear it on unmount
  useEffect(() => {
    const title = selectedContest ? `${selectedContest.title} - Contest Editor` : 'Contest Editor'
    setCourseTitle(title)

    return () => {
      setCourseTitle(null)
    }
  }, [selectedContest, setCourseTitle])

  // Timer effect - update current question elapsed time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentQuestionElapsedTime(Date.now() - currentQuestionStartTime)
    }, 1000)

    return () => clearInterval(timer)
  }, [currentQuestionStartTime])

  // Handle question switching - save previous question time and start/restore timer for new question
  useEffect(() => {
    if (currentQuestion) {
      const currentQuestionId = currentQuestion.id.toString()
      const previousQuestionId = previousQuestionRef.current

      // Save time for the previous question before switching
      if (previousQuestionId && previousQuestionId !== currentQuestionId) {
        setQuestionTimers(prev => ({
          ...prev,
          [previousQuestionId]: {
            ...prev[previousQuestionId],
            elapsedTime: currentQuestionElapsedTime
          }
        }))
      }

      // Handle timer for current question
      const existingTimer = questionTimers[currentQuestionId]
      const now = Date.now()

      if (existingTimer) {
        // Restore saved time for this question
        setCurrentQuestionStartTime(now - existingTimer.elapsedTime)
        setCurrentQuestionElapsedTime(existingTimer.elapsedTime)
      } else {
        // Start fresh timer for new question
        setCurrentQuestionStartTime(now)
        setCurrentQuestionElapsedTime(0)

        // Initialize timer record
        setQuestionTimers(prev => ({
          ...prev,
          [currentQuestionId]: {
            startTime: now,
            elapsedTime: 0
          }
        }))
      }

      // Update previous question ref
      previousQuestionRef.current = currentQuestionId
    }
  }, [currentQuestion?.id])

  // Load contest data
  useEffect(() => {
    if (!courseId || !contestId) return

    const loadContest = async () => {
      try {
        // Load contest details
        const contest = await apiFetch<Contest>(`/api/course-offerings/${courseId}/contests/${contestId}`)

        // Load questions for this contest
        const questions = await apiFetch<CodeQuestion[]>(`/api/contests/${contestId}/questions`)

        setSelectedContest({ ...contest, questions })

        // Initialize editors and languages
        const editors: Record<string, string> = {}
        const langs: Record<string, string> = {}
        const testCases: Record<string, Array<{ id: string, input: string, expected: string, result?: unknown }>> = {}
        questions.forEach(q => {
          editors[q.id] = ''
          langs[q.id] = 'python'

          // Initialize test cases for each question
          const questionTestCases: Array<{ id: string, input: string, expected: string, result?: unknown }> = []

          // Add sample test cases from the question
          if (q.test_cases && Array.isArray(q.test_cases)) {
            q.test_cases.filter((tc: unknown) => tc.is_sample === true).forEach((tc: unknown, idx: number) => {
              questionTestCases.push({
                id: `sample-${idx}`,
                input: tc.input_text || '',
                expected: tc.expected_text || '',
                result: undefined
              })
            })
          } else if (q.sample_input && q.sample_output) {
            questionTestCases.push({
              id: 'sample-0',
              input: q.sample_input,
              expected: q.sample_output,
              result: undefined
            })
          }

          testCases[q.id] = questionTestCases
        })
        setCodeEditor(editors)
        setCodeLang(langs)
        setCustomTestCases(testCases)
        setRunResults({})
        setSavedQuestions({})
      } catch (err: unknown) {
        push({ kind: 'error', message: err?.message || 'Failed to load contest' })
        navigate(`/courses/${courseId}`)
      }
    }

    loadContest()
  }, [courseId, contestId, navigate])

  // Add a new custom test case
  const addTestCase = (questionId: string | number) => {
    const questionIdStr = String(questionId)
    setCustomTestCases(prev => ({
      ...prev,
      [questionIdStr]: [
        ...(prev[questionIdStr] || []),
        {
          id: `custom-${Date.now()}`,
          input: '',
          expected: '',
          result: undefined
        }
      ]
    }))
  }

  // Update a test case
  const updateTestCase = (questionId: string | number, testCaseId: string, field: 'input' | 'expected', value: string) => {
    const questionIdStr = String(questionId)
    setCustomTestCases(prev => ({
      ...prev,
      [questionIdStr]: (prev[questionIdStr] || []).map(tc =>
        tc.id === testCaseId ? { ...tc, [field]: value } : tc
      )
    }))
  }

  // Remove a test case
  const removeTestCase = (questionId: string | number, testCaseId: string) => {
    const questionIdStr = String(questionId)
    setCustomTestCases(prev => ({
      ...prev,
      [questionIdStr]: (prev[questionIdStr] || []).filter(tc => tc.id !== testCaseId)
    }))
  }

  // Run code against all test cases for a question
  const runCodeForQuestion = async (q: CodeQuestion) => {
    const src = codeEditor[q.id] ?? ''
    const lang = codeLang[q.id] ?? 'python'
    if (!src.trim()) return push({ kind: 'error', message: 'Write your code first' })

    const questionIdStr = String(q.id)
    const testCases = customTestCases[questionIdStr] || []

    if (testCases.length === 0) {
      push({ kind: 'error', message: 'No test cases available for this question' })
      return
    }

    // Set loading state for this question
    setIsRunningCode(prev => ({ ...prev, [q.id]: true }))

    // Clear previous results
    setTestCaseResults(prev => ({
      ...prev,
      [questionIdStr]: {}
    }))

    const results: Record<string, any> = {}

    // Run code against each test case
    for (const testCase of testCases) {
      try {
        const payload = {
          source_code: src,
          language: lang,
          stdin: testCase.input
        }
        const res = await apiFetch('/api/judge', { method: 'POST', body: payload })
        const stdout = (res.stdout ?? '').toString().trim()
        const stderr = (res.stderr ?? '').toString()
        const compileOutput = (res.compile_output ?? '').toString()

        const expected = testCase.expected.trim()
        const ok = stdout === expected

        // Determine status message
        let message = 'Failed'
        if (res.status) {
          if (res.status.id === 3) {
            message = ok ? 'Passed' : 'Failed - Output mismatch'
          } else if (res.status.id === 4) {
            message = 'Failed - Wrong Answer'
          } else if (res.status.id === 5) {
            message = 'Failed - Time Limit Exceeded'
          } else if (res.status.id === 6) {
            message = 'Failed - Compilation Error'
          } else if (res.status.id === 7) {
            message = 'Failed - Runtime Error'
          } else {
            message = res.status.description || 'Failed'
          }
        }

        results[testCase.id] = {
          ok,
          stdout,
          stderr: stderr || compileOutput,
          message,
          status: res.status,
          expected,
          actual: stdout
        }
      } catch (err: unknown) {
        results[testCase.id] = {
          ok: false,
          message: err?.message || 'Judge failed',
          error: err?.message || 'Execution error'
        }
      }
    }

    // Update test case results
    setTestCaseResults(prev => ({
      ...prev,
      [questionIdStr]: results
    }))

    // Update custom test cases with results
    setCustomTestCases(prev => ({
      ...prev,
      [questionIdStr]: testCases.map(tc => ({
        ...tc,
        result: results[tc.id]
      }))
    }))

    // Clear loading state
    setIsRunningCode(prev => ({ ...prev, [q.id]: false }))

    // Show summary
    const passedCount = Object.values(results).filter((r: unknown) => r.ok).length
    const totalCount = testCases.length

    if (passedCount === totalCount) {
      push({ kind: 'success', message: `All ${totalCount} test cases passed!` })
    } else {
      push({ kind: 'error', message: `${passedCount}/${totalCount} test cases passed` })
    }
  }

  if (!selectedContest) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading contest...</div>
      </div>
    )
  }

  return (
    <div className="code-editor-fullscreen">
      {/* Merged Top Header with Back Button, Contest Title, Question Navigation, and Controls */}
      <div className="code-editor-merged-header">
        {/* Left section: Back button and Contest title */}
        <div className="header-left-section">
          <button className="btn-back-compact" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <span className="assignment-title">{selectedContest.title}</span>
        </div>

        {/* Center section: Question Navigation */}
        {selectedContest.questions && selectedContest.questions.length > 1 && (
          <div className="question-navigation">
            {selectedContest.questions.map((q: CodeQuestion, idx: number) => (
              <button
                key={q.id}
                className={`question-tab ${idx === currentQuestionIndex ? 'active' : ''} ${savedQuestions[q.id] ? 'saved' : ''}`}
                onClick={() => setCurrentQuestionIndex(idx)}
              >
                {idx + 1}
                {savedQuestions[q.id] && <span className="saved-indicator">✓</span>}
              </button>
            ))}
          </div>
        )}

        {/* Right section: Timer, Language Selector, and Submit Button */}
        <div className="header-right-section">
          {/* Timer Display - moved adjacent to language selector */}
          <div className="session-timer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
            <span className="timer-text">{formatElapsedTime(currentQuestionElapsedTime)}</span>
          </div>

          <div className="language-selector">
            <select
              className="language-select"
              value={currentQuestion ? codeLang[currentQuestion.id] || 'python' : 'python'}
              onChange={(e) => {
                if (currentQuestion) {
                  setCodeLang(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))
                }
              }}
            >
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
              <option value="javascript">JavaScript</option>
            </select>
          </div>

          {/* Code Action Buttons */}
          <div className="code-actions">
            <button
              className={`btn-gamification-toggle ${showGamification ? 'active' : ''}`}
              onClick={() => setShowGamification(!showGamification)}
              title={showGamification ? 'Hide gamification' : 'Show gamification'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {showGamification ? 'Hide Stats' : 'Show Stats'}
            </button>
            <button
              className={`btn-console-toggle ${consoleExpanded ? 'active' : ''}`}
              onClick={() => setConsoleExpanded(!consoleExpanded)}
              title={consoleExpanded ? 'Hide console' : 'Show console'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
              {consoleExpanded ? 'Hide Console' : 'Show Console'}
            </button>
            <button
              className="btn-run"
              onClick={() => currentQuestion && void runCodeForQuestion(currentQuestion)}
              disabled={!currentQuestion || !codeEditor[currentQuestion.id]?.trim() || isRunningCode[currentQuestion.id]}
            >
              {currentQuestion && isRunningCode[currentQuestion.id] ? (
                <>
                  <span className="loading-indicator"></span>
                  Running...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Run
                </>
              )}
            </button>
            <button
              className={`btn-submit ${currentQuestion && savedQuestions[currentQuestion.id] ? 'saved' : ''}`}
              onClick={async () => {
                if (!currentQuestion) return
                if (!codeEditor[currentQuestion.id]?.trim()) {
                  push({ kind: 'error', message: 'Write your code first' })
                  return
                }
                setIsSavingCode(prev => ({ ...prev, [currentQuestion.id]: true }))
                try {
                  const submissionResult = await apiFetch('/api/contest-submissions/submit', {
                    method: 'POST',
                    body: {
                      contest_id: Number(selectedContest.id),
                      question_id: Number(currentQuestion.id),
                      language: codeLang[currentQuestion.id] || 'python',
                      code: codeEditor[currentQuestion.id],
                      started_at: questionTimers[currentQuestion.id]?.startTime ? new Date(questionTimers[currentQuestion.id].startTime).toISOString() : undefined,
                      time_spent_seconds: Math.floor(currentQuestionElapsedTime / 1000)
                    }
                  })

                  // Handle gamification data
                  if (submissionResult.gamification) {
                    setGamificationData(submissionResult.gamification)

                    // Show achievement notifications
                    if (submissionResult.gamification.unlocked_achievements?.length > 0) {
                      submissionResult.gamification.unlocked_achievements.forEach((achievement: unknown) => {
                        push({
                          kind: 'success',
                          message: `🏆 Achievement Unlocked: ${achievement.name}! +${achievement.points_reward} points`
                        })
                      })
                    }

                    // Show score feedback
                    const score = submissionResult.gamification.score
                    if (score > 0) {
                      push({
                        kind: 'success',
                        message: `🎯 Scored ${score} points! ${submissionResult.gamification.all_tests_passed ? 'All tests passed!' : 'Keep trying!'}`                        })
                    }
                  }

                  setSavedQuestions(prev => ({ ...prev, [currentQuestion.id]: true }))
                  push({ kind: 'success', message: `Question ${currentQuestionIndex + 1} code saved successfully` })
                } catch (err: unknown) {
                  push({ kind: 'error', message: err?.message || 'Failed to save code' })
                } finally {
                  setIsSavingCode(prev => ({ ...prev, [currentQuestion.id]: false }))
                }
              }}
              disabled={!currentQuestion || !codeEditor[currentQuestion.id]?.trim() || isSavingCode[currentQuestion.id]}
            >
              {currentQuestion && isSavingCode[currentQuestion.id] ? (
                <>
                  <span className="loading-indicator"></span>
                  Submitting...
                </>
              ) : currentQuestion && savedQuestions[currentQuestion.id] ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Submitted
                </>
              ) : (
                'Submit'
              )}
            </button>
          </div>

          {selectedContest.questions && selectedContest.questions.length > 1 && (
            <button
              className="btn-submit-assignment-header"
              onClick={async () => {
                // Check if all questions have code
                const allHaveCode = selectedContest.questions.every((q: CodeQuestion) => {
                  return codeEditor[q.id]?.trim()
                })

                if (!allHaveCode) {
                  push({ kind: 'error', message: 'Please write code for all questions before final submission' })
                  return
                }

                // Check if all questions are saved
                const allSaved = selectedContest.questions.every((q: CodeQuestion) => {
                  return savedQuestions[q.id]
                })

                if (!allSaved) {
                  const confirmSave = confirm('Some questions are not saved. Do you want to save all questions and submit?')
                  if (!confirmSave) return

                  // Save all unsaved questions first
                  for (const q of selectedContest.questions) {
                    if (!savedQuestions[q.id] && codeEditor[q.id]?.trim()) {
                      try {
                        await apiFetch('/api/contest-submissions/submit', {
                          method: 'POST',
                          body: {
                            contest_id: Number(selectedContest.id),
                            question_id: Number(q.id),
                            language: codeLang[q.id] || 'python',
                            code: codeEditor[q.id]
                          }
                        })
                        setSavedQuestions(prev => ({ ...prev, [q.id]: true }))
                      } catch (err: unknown) {
                        push({ kind: 'error', message: `Failed to save question ${q.id}: ${err?.message}` })
                        return
                      }
                    }
                  }
                }

                // All questions are now saved. The submission is complete.
                // The backend creates/updates the submission when code is saved,
                // so all questions are already stored in the database.

                push({ kind: 'success', message: 'Contest submission completed! All questions have been saved and submitted.' })

                // Navigate back to course
                navigate(`/courses/${courseId}`)
              }}
              disabled={selectedContest.questions.some((q: CodeQuestion) => !codeEditor[q.id]?.trim())}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Submit Contest
            </button>
          )}
        </div>
      </div>

      {/* Main Content - Full Width Code Editor */}
      <div className="code-editor-main-content">
        {/* Left Pane - Problem Description */}
        <div className="leetcode-left-pane">
          {currentQuestion && (
            <div className="problem-description">
              <div className="problem-header">
                <h3 className="problem-title">{currentQuestion.title || 'Untitled Question'}</h3>
                <div className="problem-meta">
                  {savedQuestions[currentQuestion.id] && (
                    <span className="saved-status">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Saved
                    </span>
                  )}
                </div>
              </div>

              <div className="problem-content">
                <div className="problem-text">
                  {currentQuestion.description}
                </div>

                {currentQuestion.constraints && (
                  <div className="constraints-section">
                    <h4>Constraints</h4>
                    <div className="constraints-content">
                      {currentQuestion.constraints}
                    </div>
                  </div>
                )}

                {(() => {
                  // Get sample test cases from test_cases array (backend) or direct properties (local)
                  let sampleCases: unknown[] = []
                  if (currentQuestion.test_cases && Array.isArray(currentQuestion.test_cases)) {
                    sampleCases = currentQuestion.test_cases.filter((tc: unknown) => tc.is_sample === true)
                  } else if (currentQuestion.sample_input && currentQuestion.sample_output) {
                    // Fallback to direct properties for local mode
                    sampleCases = [{ input_text: currentQuestion.sample_input, expected_text: currentQuestion.sample_output }]
                  }

                  return sampleCases.length > 0 ? (
                    <div className="examples-section">
                      <h4>Examples</h4>
                      {sampleCases.map((tc: unknown, tcIdx: number) => (
                        <div key={tcIdx} className="example-item">
                          <div className="example-header">
                            <strong>Example {tcIdx + 1}:</strong>
                          </div>
                          <div className="example-content">
                            <div className="example-input">
                              <strong>Input:</strong>
                              <pre>{tc.input_text || '(empty)'}</pre>
                            </div>
                            <div className="example-output">
                              <strong>Output:</strong>
                              <pre>{tc.expected_text || '(empty)'}</pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Right Pane - Full Code Editor */}
        <div className="code-editor-full-pane">
          {/* Code Editor Section - Takes full height */}
          <div className="code-editor-full-container">
            <div className="code-editor-full-wrapper">
              {/* Code Editor Area */}
              <div className="code-editor-area">
                {currentQuestion && (
                  <CodeEditor
                    value={codeEditor[currentQuestion.id] || ''}
                    onChange={(code) => setCodeEditor(prev => ({ ...prev, [currentQuestion.id]: code }))}
                    onSubmit={(code, lang) => {
                      setCodeEditor(prev => ({ ...prev, [currentQuestion.id]: code }))
                      setCodeLang(prev => ({ ...prev, [currentQuestion.id]: lang }))
                    }}
                    defaultLanguage={codeLang[currentQuestion.id] || 'python'}
                  />
                )}
              </div>
              {/* Testcases and Results Bar at Bottom of Code Editor */}
              {consoleExpanded && (
                <div className="testcases-bar">
                  <div className="testcases-bar-header" onClick={() => setConsoleExpanded(false)}>
                    <span>Testcases and Results Bar</span>
                    {currentQuestion && customTestCases[String(currentQuestion.id)] && (
                      <span className="test-count">
                        ({customTestCases[String(currentQuestion.id)].length} test case{customTestCases[String(currentQuestion.id)].length !== 1 ? 's' : ''})
                      </span>
                    )}
                    <button className="testcases-toggle expanded">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>

                  <div className="testcases-content">
                    <div className="testcases-tabs">
                      <button
                        className={`testcases-tab ${activeConsoleTab === 'test-cases' ? 'active' : ''}`}
                        onClick={() => setActiveConsoleTab('test-cases')}
                      >
                        Test Cases
                      </button>
                      <button
                        className={`testcases-tab ${activeConsoleTab === 'test-results' ? 'active' : ''}`}
                        onClick={() => setActiveConsoleTab('test-results')}
                      >
                        Test Results
                      </button>
                    </div>

                    <div className="testcases-tab-content">
                      <div>
                        {activeConsoleTab === 'test-cases' && currentQuestion && (
                          <div className="test-cases-content">
                            <div className="test-cases-header">
                              <h4>Test Cases</h4>
                              <button
                                className="add-test-case-btn"
                                onClick={() => addTestCase(currentQuestion.id)}
                                title="Add new test case"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <line x1="12" y1="5" x2="12" y2="19" />
                                  <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Add Test Case
                              </button>
                            </div>

                            <div className="test-cases-list">
                              {customTestCases[String(currentQuestion.id)]?.length ? customTestCases[String(currentQuestion.id)].map((testCase, idx) => (
                                <div key={testCase.id} className="test-case-item">
                                  <div className="test-case-header">
                                    <span className="test-case-number">Test Case {idx + 1}</span>
                                    {testCase.id.startsWith('custom-') && (
                                      <button
                                        className="remove-test-case-btn"
                                        onClick={() => removeTestCase(currentQuestion.id, testCase.id)}
                                        title="Remove test case"
                                      >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <line x1="18" y1="6" x2="6" y2="18" />
                                          <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                      </button>
                                    )}
                                    {testCase.result && (
                                      <span className={`test-case-status ${testCase.result.ok ? 'passed' : 'failed'}`}>
                                        {testCase.result.ok ? '✓ Passed' : '✗ Failed'}
                                      </span>
                                    )}
                                  </div>

                                  <div className="test-case-inputs">
                                    <div className="test-case-field">
                                      <label>Input:</label>
                                      <textarea
                                        value={testCase.input}
                                        onChange={(e) => updateTestCase(currentQuestion.id, testCase.id, 'input', e.target.value)}
                                        placeholder="Enter input for test case..."
                                        rows={2}
                                      />
                                    </div>
                                    <div className="test-case-field">
                                      <label>Expected Output:</label>
                                      <textarea
                                        value={testCase.expected}
                                        onChange={(e) => updateTestCase(currentQuestion.id, testCase.id, 'expected', e.target.value)}
                                        placeholder="Enter expected output..."
                                        rows={2}
                                      />
                                    </div>
                                  </div>

                                  {testCase.result && (
                                    <div className="test-case-result">
                                      <div className="result-summary">
                                        <span className={`result-status ${testCase.result.ok ? 'success' : 'error'}`}>
                                          {testCase.result.message}
                                        </span>
                                      </div>
                                      {testCase.result.stdout !== undefined && testCase.result.stdout !== '' && (
                                        <div className="result-detail">
                                          <strong>Your Output:</strong>
                                          <pre>{testCase.result.stdout}</pre>
                                        </div>
                                      )}
                                      {testCase.result.stderr && testCase.result.stderr.trim() !== '' && (
                                        <div className="result-detail error">
                                          <strong>Error:</strong>
                                          <pre>{testCase.result.stderr}</pre>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )) : (
                                <div className="no-test-cases">
                                  No test cases available. Click "Add Test Case" to create one.
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {activeConsoleTab === 'test-results' && (
                          <div className="test-results-content">
                            {(() => {
                              const testCases = customTestCases[String(currentQuestion.id)] || []
                              const passedCount = testCases.filter(tc => tc.result?.ok).length
                              const totalCount = testCases.length

                              return currentQuestion && isRunningCode[currentQuestion.id] ? (
                                <div className="testcases-loading">
                                  <span className="loading-indicator"></span>
                                  Running test cases...
                                </div>
                              ) : currentQuestion && testCases.some(tc => tc.result) ? (
                                <div className="test-results-summary">
                                  <h4>Test Results Summary</h4>
                                  <div className="summary-stats">
                                    <div className="stat-item">
                                      <span className="stat-label">Passed:</span>
                                      <span className="stat-value success">{passedCount}</span>
                                    </div>
                                    <div className="stat-item">
                                      <span className="stat-label">Failed:</span>
                                      <span className="stat-value error">{totalCount - passedCount}</span>
                                    </div>
                                    <div className="stat-item">
                                      <span className="stat-label">Total:</span>
                                      <span className="stat-value">{totalCount}</span>
                                    </div>
                                    <div className="stat-item">
                                      <span className="stat-label">Success Rate:</span>
                                      <span className="stat-value">{totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0}%</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="testcases-placeholder">
                                  Run your code to see test results here
                                </div>
                              )
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Gamification Sidebar */}
      {showGamification && (
        <div className="gamification-sidebar">
          <div className="gamification-content">
            {/* User Stats */}
            <div className="gamification-section">
              <UserStats compact />
            </div>

            {/* Contest Leaderboard */}
            <div className="gamification-section">
              <Leaderboard
                type="contest"
                referenceId={selectedContest?.id}
                limit={10}
              />
            </div>

            {/* Achievements */}
            <div className="gamification-section">
              <AchievementBadge compact />
            </div>

            {/* Course Leaderboard */}
            <div className="gamification-section">
              <Leaderboard
                type="course"
                referenceId={selectedContest ? parseInt(courseId || '0') : undefined}
                limit={10}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
