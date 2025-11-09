import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState, useRef } from 'react'
import { courses } from '../../data/mock'
import { useAuth } from '../../context/AuthContext'
import { getUserCourses } from '../../data/userCourses'
import { addCustomAssignment } from '../../data/courseOverlays'
import { addSubmission } from '../../data/submissions'
import './CourseDetails.css'
import './CourseDetails.overrides.css'
import { useToast } from '../../components/ToastProvider'
import { apiFetch } from '../../services/api'
import QuizCreator from '../../components/QuizCreator'
import VideoUpload from '../../components/VideoUpload'
import InteractiveVideoPlayer from '../../components/InteractiveVideoPlayer'
import VideoQuestionManager from '../../components/VideoQuestionManager'
import VideoQuizResults from '../../components/VideoQuizResults'
import Modal from '../../components/Modal'
import Chatbot from '../../components/Chatbot'
import TeacherCodeSubmissionViewer from '../../components/course/TeacherCodeSubmissionViewer'
import BackendSubmissions from '../../components/course/BackendSubmissions'
import BackendGrading from '../../components/course/BackendGrading'
import StudentProgressEmbed from '../../components/course/StudentProgressEmbed'
import CourseProgressEmbed from '../../components/course/CourseProgressEmbed'
import MenuTiny from '../../components/course/MenuTiny'
import PyqList from '../../components/course/PyqList'
import NotesList from '../../components/course/NotesList'
import DiscussionForum from '../../components/course/DiscussionForum'
import PresentAssignmentsSection from '../../components/course/PresentAssignmentsSection'
import TeacherAssignments from '../../components/course/TeacherAssignments'
import { listDiscussionMessages, postDiscussionMessage, type DiscussionMessage } from '../../services/discussion'

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

function loadLocalCodeQuestions(courseId: string): CodeQuestion[] {
  try {
    const raw = localStorage.getItem(`codeQuestions:${courseId}`)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function saveLocalCodeQuestions(courseId: string, items: CodeQuestion[]) {
  try { localStorage.setItem(`codeQuestions:${courseId}`, JSON.stringify(items)) } catch { }
}

export default function CourseDetails() {
  const { courseId } = useParams()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'assignment' | 'present' | 'past' | 'pyq' | 'notes' | 'quizzes' | 'quizzes_submitted' | 'manage' | 'submissions' | 'grading' | 'progress' | 'discussion' | 'chatbot' | 'pdfchat' | 'videos'>('present')
  const [backendVideos, setBackendVideos] = useState<any[]>([])
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null)
  const [videoQuestions, setVideoQuestions] = useState<any[]>([])
  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0)
  const videoRefForFaculty = useRef<HTMLVideoElement>(null)
  const [assignmentCreationType, setAssignmentCreationType] = useState<'selection' | 'code' | 'quiz' | 'pdf'>('selection')
  const [showVideoUpload, setShowVideoUpload] = useState(false)
  const isBackend = !!courseId && /^\d+$/.test(courseId)
  const toast = useToast()
  const push = (opts: { kind?: 'success' | 'error' | string; message?: string }) => {
    if (toast && typeof (toast as any).push === 'function') {
      (toast as any).push(opts)
    } else {
      console.log(opts)
    }
  }

  // Backend data states
  const [backendAssignments, setBackendAssignments] = useState<any[]>([])
  const [backendPYQ, setBackendPYQ] = useState<any[]>([])
  const [backendNotes, setBackendNotes] = useState<any[]>([])
  const [backendQuizzes, setBackendQuizzes] = useState<any[]>([])
  const [myQuizAttempts, setMyQuizAttempts] = useState<any[]>([])
  const [mySubmissions, setMySubmissions] = useState<any[] | null>(null) // Track student's submissions - null means not loaded yet
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('')
  const [discussionMessages, setDiscussionMessages] = useState<DiscussionMessage[]>([])
  const [discussionLoading, setDiscussionLoading] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyContent, setReplyContent] = useState('')

  const course = useMemo(() => {
    if (!courseId) return undefined
    if (/^\d+$/.test(courseId)) {
      // backend mode uses offeringId; we won't have local course meta
      return { id: courseId, title: `Offering #${courseId}`, description: 'Backend course offering', assignmentsPast: [], assignmentsPresent: [], pyq: [], notes: [] }
    }
    const fromDefault = courses.find((c) => c.id === courseId)
    if (fromDefault) return fromDefault
    if (!user) return undefined
    const mine = getUserCourses(user.id)
    return mine.find((c) => c.id === courseId)
  }, [courseId, user])

  // Compute present assignments (not past due date)
  const allPresentAssignments = useMemo(() => {
    if (isBackend) {
      return backendAssignments.filter((a: any) => {
        if (!a.due_at) return true
        return new Date(a.due_at) >= new Date()
      })
    }
    return course?.assignmentsPresent || []
  }, [isBackend, backendAssignments, course])

  // Teacher view: list all assignments (backend: from API; local: present + past)
  const teacherAssignments = useMemo(() => {
    if (isBackend) return backendAssignments || []
    const present = course?.assignmentsPresent || []
    const past = (course as any)?.assignmentsPast || []
    return [...present, ...past]
  }, [isBackend, backendAssignments, course])

  // For students: filter out submitted assignments and combine with unsubmitted quizzes
  const presentAssignments = useMemo(() => {
    console.log('=== presentAssignments memo recalculating ===')
    console.log('user?.role:', user?.role)
    console.log('allPresentAssignments count:', allPresentAssignments?.length)
    console.log('mySubmissions count:', mySubmissions?.length)
    console.log('myQuizAttempts count:', myQuizAttempts?.length)
    console.log('backendQuizzes count:', backendQuizzes?.length)
    console.log('isBackend:', isBackend)

    if (user?.role !== 'student') {
      console.log('Not a student, returning all assignments')
      return allPresentAssignments
    }

    if (!isBackend) {
      console.log('Not backend mode, returning all assignments')
      return allPresentAssignments
    }

    // Get set of submitted assignment IDs (only if submissions are loaded)
    const submittedAssignmentIds = mySubmissions ? new Set(
      mySubmissions.map((s: any) => {
        const id = s.assignment_id || s.id // Handle both submission formats
        return String(id)
      })
    ) : new Set()
    console.log('submittedAssignmentIds:', Array.from(submittedAssignmentIds))
    console.log('mySubmissions loaded:', mySubmissions !== null)

    // Get set of attempted quiz IDs
    const attemptedQuizIds = new Set(
      (myQuizAttempts || []).map((a: any) => String(a.quiz_id))
    )
    console.log('attemptedQuizIds:', Array.from(attemptedQuizIds))

    // Filter assignments: only show unsubmitted ones (only if submissions are loaded)
    const unsubmittedAssignments = mySubmissions ? allPresentAssignments.filter((a: any) => {
      const assignmentId = String(a.id)
      const isSubmitted = submittedAssignmentIds.has(assignmentId)
      console.log(`Assignment ${assignmentId} (${a.title}): isSubmitted=${isSubmitted}, assignment_type=${a.assignment_type}`)
      return !isSubmitted
    }) : allPresentAssignments // If submissions not loaded yet, show all assignments
    console.log('unsubmittedAssignments count:', unsubmittedAssignments.length)
    console.log('unsubmittedAssignments details:', unsubmittedAssignments.map(a => ({
      id: a.id,
      title: a.title,
      assignment_type: a.assignment_type,
      is_quiz: a.is_quiz
    })))

    // Get unsubmitted quizzes and convert them to assignment-like objects
    const unsubmittedQuizzes = (backendQuizzes || [])
      .filter((q: any) => !attemptedQuizIds.has(String(q.id)))
      .map((q: any) => ({
        id: `quiz_${q.id}`, // Prefix to avoid ID conflicts
        title: q.title,
        assignment_type: 'quiz',
        due_at: q.end_at || q.due_at,
        release_at: q.start_at,
        is_quiz: true,
        quiz_id: q.id,
        quiz_data: q
      }))
    console.log('unsubmittedQuizzes count:', unsubmittedQuizzes.length)

    const result = [...unsubmittedAssignments, ...unsubmittedQuizzes]
    console.log('Final presentAssignments count:', result.length)
    console.log('Final result details:', result.map(r => ({
      id: r.id,
      title: r.title,
      assignment_type: r.assignment_type,
      is_quiz: r.is_quiz
    })))
    console.log('presentAssignments filtering status:', {
      allPresentAssignments: allPresentAssignments.length,
      mySubmissionsLoaded: mySubmissions !== null,
      mySubmissionsCount: mySubmissions?.length || 0,
      unsubmittedAssignments: unsubmittedAssignments.length,
      unsubmittedQuizzes: unsubmittedQuizzes.length
    })
    return result
  }, [allPresentAssignments, mySubmissions, myQuizAttempts, backendQuizzes, user?.role, isBackend])

  const [file, setFile] = useState<File | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const submitAssignment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !courseId) return alert('Please choose a file to upload!')
    // Record submission for teacher/TA views
    addSubmission(courseId, user?.name ?? 'Student', file.name)
    setTimeout(() => {
      alert(`Submitted ${file.name} for ${course?.title}`)
      setFile(null)
    }, 200)
  }

  // Code submission states
  const [showCodeEditor, setShowCodeEditor] = useState(false)
  const [codeAssignmentId, setCodeAssignmentId] = useState<string>('')
  const [viewingCodeSubmission, setViewingCodeSubmission] = useState<any>(null)

  // --- Added states for code-question management & editors ---
  const [codeQuestions, setCodeQuestions] = useState<CodeQuestion[]>(() => loadLocalCodeQuestions(courseId ?? ''))
  const [newCodeQ, setNewCodeQ] = useState<CodeQuestion>({
    id: Date.now().toString(), title: '', description: '', constraints: '', sample_input: '', sample_output: '', test_input: '', expected_output: ''
  })
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Record<string, boolean>>({})
  const [selectedCodeAssignment, setSelectedCodeAssignment] = useState<any>(null)
  const [codeEditor, setCodeEditor] = useState<Record<string, string>>({})
  const [codeLang, setCodeLang] = useState<Record<string, string>>({})
  const [runResults, setRunResults] = useState<Record<string, any>>({})
  const [isRunningCode, setIsRunningCode] = useState<Record<string, boolean>>({})
  const [savedQuestions, setSavedQuestions] = useState<Record<string, boolean>>({}) // Track which questions have been saved
  const [isSavingCode, setIsSavingCode] = useState<Record<string, boolean>>({}) // Track saving state per question
  const [tabInternal, setTabInternal] = useState<string>('')

  // Load code questions from backend or local storage
  useEffect(() => {
    if (!courseId) return
    if (isBackend) {
      // Load from backend API
      (async () => {
        try {
          const questions = await apiFetch<CodeQuestion[]>(`/api/courses/${courseId}/code-questions`)
          setCodeQuestions(questions || [])
        } catch (err: any) {
          console.error('Failed to load code questions:', err)
          // Fallback to empty array
          setCodeQuestions([])
        }
      })()
    } else {
      // Load from local storage
      setCodeQuestions(loadLocalCodeQuestions(courseId))
    }
  }, [courseId, isBackend])

  // Submit code assignment (backend endpoint assumed; fallback to localStorage)
  const submitCodeAssignment = async () => {
    if (!selectedCodeAssignment) return push({ kind: 'error', message: 'No code assignment selected' })
    // build answers payload
    const answers = Object.entries(codeEditor).reduce<Record<string, any>>((acc, [qid, src]) => {
      acc[qid] = { source_code: src, language: codeLang[qid] ?? 'python' }
      return acc
    }, {})

    if (isBackend) {
      try {
        await apiFetch('/api/submissions/submit/code', {
          method: 'POST',
          body: {
            assignment_id: Number(selectedCodeAssignment.id),
            answers
          }
        })
        push({ kind: 'success', message: 'Code submitted' })
        setShowCodeEditor(false)
        // Reload submissions to update the list
        if (user?.role === 'student' && user?.id && courseId) {
          try {
            const submissions = await apiFetch<any[]>(`/api/student/courses/${courseId}/submissions`)
            setMySubmissions(submissions || [])
          } catch { }
        }
      } catch (err: any) {
        push({ kind: 'error', message: err?.message || 'Submission failed' })
      }
      return
    }

    // Local mode: persist to localStorage
    try {
      const key = `localCodeSubmissions:${courseId}`
      const existing = JSON.parse(localStorage.getItem(key) || '[]')
      existing.push({
        id: Date.now().toString(),
        assignment_id: selectedCodeAssignment.id,
        student_name: user?.name ?? 'Student',
        code: codeEditor,
        langs: codeLang,
        submitted_at: new Date().toISOString()
      })
      localStorage.setItem(key, JSON.stringify(existing))
      push({ kind: 'success', message: 'Code saved locally' })
      setShowCodeEditor(false)
    } catch (err: any) {
      push({ kind: 'error', message: err?.message || 'Failed to save locally' })
    }
  }

  const [newAssnTitle, setNewAssnTitle] = useState('')
  const [newAssnDesc, setNewAssnDesc] = useState('')
  const [newAssnType, setNewAssnType] = useState<'file' | 'code' | 'link'>('file')
  const [newAssnRelease, setNewAssnRelease] = useState('')
  const [newAssnDue, setNewAssnDue] = useState('')
  const [newAssnMax, setNewAssnMax] = useState('100')
  const [newAssnMulti, setNewAssnMulti] = useState(false)
  const addAssn = async () => {
    if (!courseId) return
    const title = newAssnTitle.trim()
    if (!title) return
    if (isBackend) {
      // create real assignment with extended fields
      await apiFetch('/api/assignments', {
        method: 'POST',
        body: {
          course_offering_id: Number(courseId),
          title,
          description: newAssnDesc,
          assignment_type: newAssnType,
          release_at: newAssnRelease || null,
          due_at: newAssnDue || null,
          max_score: Number(newAssnMax) || 100,
          allow_multiple_submissions: newAssnMulti,
        },
      })
      const data = await apiFetch<any[]>(`/api/courses/${courseId}/assignments`)
      setBackendAssignments(data)
      push({ kind: 'success', message: 'Assignment added' })
    } else {
      addCustomAssignment(courseId, title, newAssnDue.trim() || undefined)
    }
    // reset
    setNewAssnTitle('')
    setNewAssnDesc('')
    setNewAssnType('file')
    setNewAssnRelease('')
    setNewAssnDue('')
    setNewAssnMax('100')
    setNewAssnMulti(false)
    setTab('present')
  }

  // create a code assignment (teacher) using selected code question ids
  const createCodeAssignment = async () => {
    if (!courseId) return push({ kind: 'error', message: 'Course missing' })
    const title = newAssnTitle.trim()
    if (!title) return push({ kind: 'error', message: 'Title required' })
    const qids = Object.entries(selectedQuestionIds).filter(([, v]) => v).map(([k]) => k)
    if (qids.length === 0) return push({ kind: 'error', message: 'Select at least one question' })

    if (isBackend) {
      try {
        // Convert question IDs to numbers (backend expects numeric IDs)
        const questionIds = qids.map(id => {
          const numId = Number(id)
          if (isNaN(numId)) {
            throw new Error(`Invalid question ID: ${id}`)
          }
          return numId
        })

        await apiFetch('/api/assignments', {
          method: 'POST',
          body: {
            course_offering_id: Number(courseId),
            title,
            description: newAssnDesc || null,
            assignment_type: 'code',
            question_ids: questionIds,
            release_at: newAssnRelease || null,
            due_at: newAssnDue || null,
            max_score: Number(newAssnMax) || 100,
            allow_multiple_submissions: newAssnMulti || false
          }
        })

        // Refresh assignments list
        const data = await apiFetch<any[]>(`/api/courses/${courseId}/assignments`)
        setBackendAssignments(data)
        push({ kind: 'success', message: 'Code assignment created successfully' })

        // Reset form
        setNewAssnTitle('')
        setNewAssnDesc('')
        setNewAssnRelease('')
        setNewAssnDue('')
        setNewAssnMax('100')
        setNewAssnMulti(false)
        setSelectedQuestionIds({})
        setAssignmentCreationType('selection')
        setTab('present')
      } catch (err: any) {
        console.error('Error creating code assignment:', err)
        push({ kind: 'error', message: err?.message || 'Failed to create assignment. Check console for details.' })
      }
    } else {
      // local mode: create custom assignment and embed question ids in localStorage mapping
      const assn = addCustomAssignment(courseId, title, newAssnDue.trim() || undefined)
      // store mapping of custom code assignments
      const key = `customCodeAssignments:${courseId}`
      const existing = JSON.parse(localStorage.getItem(key) || '[]')
      existing.push({ id: assn.id ?? Date.now().toString(), title, question_ids: qids })
      localStorage.setItem(key, JSON.stringify(existing))
      push({ kind: 'success', message: 'Local code assignment created' })

      // Reset form
      setNewAssnTitle('')
      setNewAssnDesc('')
      setSelectedQuestionIds({})
      setAssignmentCreationType('selection')
      setTab('present')
    }
  }

  // Teacher: save a new code question locally (or POST to backend)
  const saveCodeQuestion = async () => {
    if (!courseId) return push({ kind: 'error', message: 'Course missing' })

    // Validate required fields
    if (!newCodeQ.title?.trim()) {
      return push({ kind: 'error', message: 'Question title is required' })
    }
    if (!newCodeQ.description?.trim()) {
      return push({ kind: 'error', message: 'Question description is required' })
    }

    if (isBackend) {
      try {
        // Prepare test cases from the form fields
        const testCases = []

        // Add sample test case if provided
        if (newCodeQ.sample_input || newCodeQ.sample_output) {
          testCases.push({
            is_sample: true,
            input_text: newCodeQ.sample_input || null,
            expected_text: newCodeQ.sample_output || null
          })
        }

        // Add hidden test case if provided
        if (newCodeQ.test_input || newCodeQ.expected_output) {
          testCases.push({
            is_sample: false,
            input_text: newCodeQ.test_input || null,
            expected_text: newCodeQ.expected_output || null
          })
        }

        // Prepare request body (course_offering_id is optional, used for filtering only)
        const requestBody: any = {
          title: newCodeQ.title,
          description: newCodeQ.description,
          constraints: newCodeQ.constraints || null
        }

        // Only include test_cases if we have at least one
        if (testCases.length > 0) {
          requestBody.test_cases = testCases
        }

        console.log('Creating code question with body:', requestBody)

        // Create the question
        const created = await apiFetch('/api/code-questions', {
          method: 'POST',
          body: requestBody
        })

        console.log('Question created:', created)

        // Reload questions from backend
        try {
          const updated = await apiFetch<any[]>(`/api/courses/${courseId}/code-questions`)
          setCodeQuestions(updated || [])
        } catch (reloadErr: any) {
          console.warn('Failed to reload questions, but question was created:', reloadErr)
          // Still show success even if reload fails
        }

        push({ kind: 'success', message: 'Question saved successfully' })

        // Reset form
        setNewCodeQ({
          id: Date.now().toString(),
          title: '',
          description: '',
          constraints: '',
          sample_input: '',
          sample_output: '',
          test_input: '',
          expected_output: ''
        })
      } catch (err: any) {
        console.error('Error saving code question:', err)

        // Provide more helpful error messages
        let errorMessage = 'Failed to save question'
        if (err?.message) {
          if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
            errorMessage = 'Cannot connect to server. Please check if the backend server is running on http://localhost:4000'
          } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
            errorMessage = 'Authentication failed. Please log in again.'
          } else if (err.message.includes('403') || err.message.includes('Forbidden')) {
            errorMessage = 'You do not have permission to create code questions. Only faculty, TA, or admin can create questions.'
          } else {
            errorMessage = err.message
          }
        }

        push({ kind: 'error', message: errorMessage })
      }
    } else {
      // local mode
      const item = { ...newCodeQ, id: newCodeQ.id || Date.now().toString() }
      const updatedLocal = [...codeQuestions.filter(q => String(q.id) !== String(item.id)), item]
      setCodeQuestions(updatedLocal)
      saveLocalCodeQuestions(courseId, updatedLocal)
      setNewCodeQ({
        id: Date.now().toString(),
        title: '',
        description: '',
        constraints: '',
        sample_input: '',
        sample_output: '',
        test_input: '',
        expected_output: ''
      })
      push({ kind: 'success', message: 'Question saved locally' })
    }
  }

  // Student: start attempting a code assignment (load questions then switch to attempt tab)
  const startCodeAttempt = async (assignment: any) => {
    if (!assignment) return
    let qs: CodeQuestion[] = []
    if (isBackend) {
      try {
        qs = await apiFetch<CodeQuestion[]>(`/api/assignments/${assignment.id}/questions`)
      } catch (err: any) {
        push({ kind: 'error', message: err?.message || 'Failed to load questions' })
      }
    } else {
      // local: read mapping and load questions from local storage
      const key = `customCodeAssignments:${courseId}`
      const mapping = JSON.parse(localStorage.getItem(key) || '[]').find((x: any) => String(x.id) === String(assignment.id))
      const ids = mapping?.question_ids || []
      const all = loadLocalCodeQuestions(courseId!)
      qs = all.filter(q => ids.includes(q.id))
    }
    setSelectedCodeAssignment({ ...assignment, questions: qs })
    // prefill editors for each question
    const editors: Record<string, string> = {}
    const langs: Record<string, string> = {}
    qs.forEach(q => { editors[q.id] = ''; langs[q.id] = 'python' })
    setCodeEditor(editors)
    setCodeLang(langs)
    setRunResults({})
    setSavedQuestions({}) // Reset saved questions when starting new attempt
    setTabInternal('code_attempt')
    setTab('quizzes') // keep outer tab consistent (optional)
  }

  // run code for a question using judge endpoint (uses SAMPLE test cases, not hidden ones)
  const runCodeForQuestion = async (q: CodeQuestion) => {
    const src = codeEditor[q.id] ?? ''
    const lang = codeLang[q.id] ?? 'python'
    if (!src.trim()) return push({ kind: 'error', message: 'Write your code first' })

    // Set loading state for this question
    setIsRunningCode(prev => ({ ...prev, [q.id]: true }))

    // Clear previous results for this question
    setRunResults(prev => {
      const updated = { ...prev }
      delete updated[q.id]
      return updated
    })

    // Get sample test case (for "Run Code", students should test against sample cases)
    let sampleInput = ''
    let sampleOutput = ''

    // First try to get from test_cases array (from backend)
    if (q.test_cases && Array.isArray(q.test_cases)) {
      const sampleCase = q.test_cases.find((tc: any) => tc.is_sample === true)
      if (sampleCase) {
        sampleInput = sampleCase.input_text || ''
        sampleOutput = sampleCase.expected_text || ''
      }
    }

    // Fallback to direct properties (for local mode or older format)
    if (!sampleInput && q.sample_input) {
      sampleInput = q.sample_input
      sampleOutput = q.sample_output || ''
    }

    if (!sampleInput) {
      setIsRunningCode(prev => ({ ...prev, [q.id]: false }))
      push({ kind: 'error', message: 'No sample test case available for this question' })
      return
    }

    try {
      const payload = {
        source_code: src,
        language: lang,
        stdin: sampleInput // Use sample input, not hidden test input
      }
      const res = await apiFetch('/api/judge', { method: 'POST', body: payload })
      const stdout = (res.stdout ?? '').toString()
      const stderr = (res.stderr ?? '').toString()
      const compileOutput = (res.compile_output ?? '').toString()

      // Check if output matches expected sample output
      const ok = stdout.trim() === sampleOutput.trim()

      // Determine status message
      let message = 'Failed'
      if (res.status) {
        if (res.status.id === 3) {
          // Accepted
          message = ok ? 'Passed' : 'Failed - Output mismatch'
        } else if (res.status.id === 4) {
          // Wrong Answer
          message = 'Failed - Wrong Answer'
        } else if (res.status.id === 5) {
          // Time Limit Exceeded
          message = 'Failed - Time Limit Exceeded'
        } else if (res.status.id === 6) {
          // Compilation Error
          message = 'Failed - Compilation Error'
        } else if (res.status.id === 7) {
          // Runtime Error
          message = 'Failed - Runtime Error'
        } else {
          message = res.status.description || 'Failed'
        }
      }

      setRunResults(r => ({
        ...r,
        [q.id]: {
          ok,
          stdout,
          stderr: stderr || compileOutput,
          message,
          status: res.status,
          expected: sampleOutput,
          actual: stdout
        }
      }))

      if (ok) {
        push({ kind: 'success', message: 'Sample test case passed!' })
      } else {
        push({ kind: 'error', message: `Sample test case failed. Expected: "${sampleOutput}", Got: "${stdout}"` })
      }
    } catch (err: any) {
      setRunResults(r => ({
        ...r,
        [q.id]: {
          ok: false,
          message: err?.message || 'Judge failed',
          error: err?.message || 'Execution error'
        }
      }))
      push({ kind: 'error', message: err?.message || 'Judge service unavailable' })
    } finally {
      // Clear loading state
      setIsRunningCode(prev => ({ ...prev, [q.id]: false }))
    }
  }

  // Load backend data once per offering id
  useEffect(() => {
    let cancelled = false
    if (!isBackend || !courseId) return
      ; (async () => {
        try { 
          console.log('Loading assignments...')
          const data = await apiFetch<any[]>(`/api/courses/${courseId}/assignments`)
          console.log('Loaded assignments:', data)
          if (!cancelled) setBackendAssignments(data) 
        } catch { }
        try { const pyq = await apiFetch<any[]>(`/api/courses/${courseId}/pyqs`); if (!cancelled) setBackendPYQ(pyq) } catch { }
        try { const notes = await apiFetch<any[]>(`/api/courses/${courseId}/notes`); if (!cancelled) setBackendNotes(notes) } catch { }
        // quizzes list for offering + my attempts
        try {
          const quizzesMod = await import('../../services/quizzes')
          const quizzes = await quizzesMod.listCourseQuizzes(Number(courseId))
          if (!cancelled) setBackendQuizzes(quizzes)
          if (!cancelled && user?.role === 'student' && user?.id) {
            const attempts = await quizzesMod.getQuizAttempts(Number(user.id))
            if (!cancelled) setMyQuizAttempts(attempts)
          }
        } catch { }
        // Load student's submissions to track which assignments have been submitted
        if (user?.role === 'student' && user?.id) {
          try {
            console.log('Loading student submissions...')
            const submissions = await apiFetch<any[]>(`/api/student/courses/${courseId}/submissions`)
            console.log('Loaded submissions:', submissions)
            console.log('Submission details:', submissions?.map(s => ({
              id: s.id,
              assignment_id: s.assignment_id,
              student_id: s.student_id,
              submitted_at: s.submitted_at
            })))
            if (!cancelled) setMySubmissions(submissions || [])
          } catch (err) {
            console.error('Failed to load student submissions:', err)
            if (!cancelled) setMySubmissions([])
          }
        }
        // Load discussion messages
        if (isBackend && courseId) {
          try {
            const messages = await listDiscussionMessages(courseId)
            if (!cancelled) setDiscussionMessages(messages || [])
          } catch (err) {
            console.error('Failed to load discussion messages:', err)
            if (!cancelled) setDiscussionMessages([])
          }
        }
      })()
    return () => { cancelled = true }
  }, [courseId, isBackend, user?.id, user?.role])

  // Load discussion messages when tab is active
  useEffect(() => {
    if (tab === 'discussion' && isBackend && courseId) {
      setDiscussionLoading(true)
      listDiscussionMessages(courseId)
        .then(messages => {
          setDiscussionMessages(messages || [])
        })
        .catch(err => {
          console.error('Failed to load discussion messages:', err)
          push({ kind: 'error', message: 'Failed to load discussion messages' })
        })
        .finally(() => {
          setDiscussionLoading(false)
        })
    }
  }, [tab, isBackend, courseId])

  // Load videos when the Videos tab is activated (backend mode)
  useEffect(() => {
    if (tab !== 'videos' || !isBackend || !courseId) return
    let cancelled = false
      ; (async () => {
        try {
          const { getVideosByCourseOffering } = await import('../../services/videos')
          const videosData = await getVideosByCourseOffering(courseId)
          if (!cancelled) setBackendVideos(videosData.videos || [])
        } catch (err) {
          console.error('Failed to load videos for course offering:', err)
          if (!cancelled) setBackendVideos([])
        }
      })()
    return () => { cancelled = true }
  }, [tab, isBackend, courseId])

  // Redirect teachers to the new 'Assignment' tab if they are on hidden tabs
  useEffect(() => {
    if (user?.role === 'teacher') {
      const hiddenForTeacher = new Set(['present', 'past', 'progress', 'chatbot', 'pdfchat'])
      if (hiddenForTeacher.has(tab)) {
        setTab('assignment')
      }
    }
  }, [user?.role, tab])

  // Handle posting a new discussion message
  const handlePostMessage = async () => {
    if (!newPostContent.trim() || !courseId || !isBackend) return

    setDiscussionLoading(true)
    try {
      const result = await postDiscussionMessage(courseId, newPostContent.trim())
      if (result.message) {
        setDiscussionMessages(prev => [result.message, ...prev])
        setNewPostContent('')
        push({ kind: 'success', message: 'Message posted successfully' })
      }
    } catch (err: any) {
      console.error('Failed to post message:', err)
      push({ kind: 'error', message: err.message || 'Failed to post message' })
    } finally {
      setDiscussionLoading(false)
    }
  }

  // Handle posting a reply
  const handlePostReply = async (parentId: number) => {
    if (!replyContent.trim() || !courseId || !isBackend) return

    setDiscussionLoading(true)
    try {
      const result = await postDiscussionMessage(courseId, replyContent.trim(), parentId)
      if (result.message) {
        setDiscussionMessages(prev => [result.message, ...prev])
        setReplyContent('')
        setReplyingTo(null)
        push({ kind: 'success', message: 'Reply posted successfully' })
      }
    } catch (err: any) {
      console.error('Failed to post reply:', err)
      push({ kind: 'error', message: err.message || 'Failed to post reply' })
    } finally {
      setDiscussionLoading(false)
    }
  }

  // Organize messages into threads (top-level messages with their replies)
  const discussionThreads = useMemo(() => {
    const threads: DiscussionMessage[] = []
    const repliesMap = new Map<number, DiscussionMessage[]>()

    // Separate top-level messages from replies
    discussionMessages.forEach(msg => {
      if (msg.parent_id === null) {
        threads.push(msg)
      } else {
        if (!repliesMap.has(msg.parent_id)) {
          repliesMap.set(msg.parent_id, [])
        }
        repliesMap.get(msg.parent_id)!.push(msg)
      }
    })

    // Sort threads by created_at (newest first)
    threads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Sort replies by created_at (oldest first)
    repliesMap.forEach(replies => {
      replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    })

    return { threads, repliesMap }
  }, [discussionMessages])

  // Load questions when video is selected
  useEffect(() => {
    if (!selectedVideo || user?.role !== 'teacher') return;
    (async () => {
      try {
        const { getVideoQuizQuestions } = await import('../../services/videos');
        const questionsData = await getVideoQuizQuestions(selectedVideo.id);
        setVideoQuestions(questionsData.questions || []);
      } catch { }
    })();
  }, [selectedVideo, user?.role])

  return (
    <>

      <div className="course-details-page">
        <div className="container">
          <header className="course-header">
            <div className="course-header-content">
              <button className="back-button" onClick={() => navigate(-1)} aria-label="Go back">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
              <div className="course-title-section">
                <h1 className="course-title">{course?.title || 'Course'}</h1>
                <p className="course-role">{user?.role.toUpperCase()} Dashboard</p>
              </div>
            </div>
            <div className="course-header-actions">
              
            </div>
          </header>

          <nav className="tabs-modern">
            <div className="tabs-container">
              {user?.role === 'student' ? (
                <>
                  <button className={`tab-button ${tab === 'present' ? 'active' : ''}`} onClick={() => setTab('present')} aria-pressed={tab === 'present'}>
                    <span className="tab-icon">📚</span>
                    Assignments
                  </button>
                  <button className={`tab-button ${tab === 'pyq' ? 'active' : ''}`} onClick={() => setTab('pyq')} aria-pressed={tab === 'pyq'}>
                    <span className="tab-icon">📝</span>
                    PYQ
                  </button>
                  <button className={`tab-button ${tab === 'notes' ? 'active' : ''}`} onClick={() => setTab('notes')} aria-pressed={tab === 'notes'}>
                    <span className="tab-icon">📖</span>
                    Notes
                  </button>
                  {isBackend && (
                    <button className={`tab-button ${tab === 'progress' ? 'active' : ''}`} onClick={() => setTab('progress')} aria-pressed={tab === 'progress'}>
                      <span className="tab-icon">📊</span>
                      Progress
                    </button>
                  )}
                  {isBackend && (
                    <button className={`tab-button ${tab === 'discussion' ? 'active' : ''}`} onClick={() => setTab('discussion')} aria-pressed={tab === 'discussion'}>
                      <span className="tab-icon">💬</span>
                      Discussion
                    </button>
                  )}
                  {isBackend && (
                    <button className={`tab-button ${tab === 'videos' ? 'active' : ''}`} onClick={() => setTab('videos')} aria-pressed={tab === 'videos'}>
                      <span className="tab-icon">🎥</span>
                      Videos
                    </button>
                  )}
                  {isBackend && (
                    <button className={`tab-button ${tab === 'chatbot' ? 'active' : ''}`} onClick={() => setTab('chatbot')} aria-pressed={tab === 'chatbot'}>
                      <span className="tab-icon">🤖</span>
                      AI Assistant
                    </button>
                  )}
                  {isBackend && (
                    <button className={`tab-button ${tab === 'pdfchat' ? 'active' : ''}`} onClick={() => setTab('pdfchat')} aria-pressed={tab === 'pdfchat'}>
                      <span className="tab-icon">📄</span>
                      PDF Q&A
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button className={`tab-button ${tab === 'assignment' ? 'active' : ''}`} onClick={() => setTab('assignment')} aria-pressed={tab === 'assignment'}>
                    <span className="tab-icon">📋</span>
                    Assignment
                  </button>
                  <button className={`tab-button ${tab === 'pyq' ? 'active' : ''}`} onClick={() => setTab('pyq')} aria-pressed={tab === 'pyq'}>
                    <span className="tab-icon">📝</span>
                    PYQ
                  </button>
                  <button className={`tab-button ${tab === 'notes' ? 'active' : ''}`} onClick={() => setTab('notes')} aria-pressed={tab === 'notes'}>
                    <span className="tab-icon">📖</span>
                    Notes
                  </button>
                  {isBackend && (
                    <button className={`tab-button ${tab === 'discussion' ? 'active' : ''}`} onClick={() => setTab('discussion')} aria-pressed={tab === 'discussion'}>
                      <span className="tab-icon">💬</span>
                      Discussion
                    </button>
                  )}
                </>
              )}
              {user?.role === 'teacher' && (
                <>
                  <button className={`tab-button ${tab === 'manage' ? 'active' : ''}`} onClick={() => setTab('manage')} aria-pressed={tab === 'manage'}>
                    <span className="tab-icon">⚙️</span>
                    Manage Assignment
                  </button>
                  <button className={`tab-button ${tab === 'submissions' ? 'active' : ''}`} onClick={() => setTab('submissions')} aria-pressed={tab === 'submissions'}>
                    <span className="tab-icon">📥</span>
                    Submissions
                  </button>
                </>
              )}
              {user?.role === 'ta' && (
                <button className={`tab-button ${tab === 'grading' ? 'active' : ''}`} onClick={() => setTab('grading')} aria-pressed={tab === 'grading'}>
                  <span className="tab-icon">✅</span>
                  Grading
                </button>
              )}
            </div>
          </nav>

          {user?.role === 'teacher' && tab === 'assignment' && (
            <TeacherAssignments
              assignments={teacherAssignments as any[]}
              onViewCode={(submission) => { setShowCodeEditor(true); setViewingCodeSubmission(submission) }}
            />
          )}

          {tab === 'present' && (
            <PresentAssignmentsSection
              userRole={user?.role}
              presentAssignments={presentAssignments as any[]}
              isBackend={isBackend}
              onTeacherDelete={async (id: number) => {
                try {
                  const mod = await import('../../services/assignments')
                  await mod.deleteAssignmentApi(Number(id))
                  push({ kind: 'success', message: 'Assignment deleted' })
                  const data = await apiFetch<any[]>(`/api/courses/${courseId}/assignments`)
                  setBackendAssignments(data)
                } catch (e: any) {
                  push({ kind: 'error', message: e?.message || 'Failed' })
                }
              }}
              onStudentClickSubmitPDF={(id: string) => setSelectedAssignmentId(id)}
              onAttemptQuiz={(quizId: any) => { location.assign(`/quizzes/${quizId}`) }}
              onStartCodeAttempt={(assignment: any) => { void startCodeAttempt(assignment) }}
              selectedAssignmentId={selectedAssignmentId}
              onChangeSelectedAssignmentId={(v: string) => setSelectedAssignmentId(v)}
              linkUrl={linkUrl}
              onChangeLinkUrl={(v: string) => setLinkUrl(v)}
              onSubmitLink={async (e: React.FormEvent) => {
                e.preventDefault()
                if (!selectedAssignmentId || !linkUrl.trim()) {
                  return push({ kind: 'error', message: 'Please select an assignment and provide a URL' })
                }
                try {
                  await apiFetch('/api/submissions/submit/link', {
                    method: 'POST',
                    body: { assignment_id: Number(selectedAssignmentId), url: linkUrl.trim() }
                  })
                  push({ kind: 'success', message: 'Assignment submitted successfully' })
                  setLinkUrl('')
                  setSelectedAssignmentId('')
                  if (user?.id) {
                    try {
                      const submissions = await apiFetch<any[]>(`/api/student/courses/${courseId}/submissions`)
                      setMySubmissions(submissions || [])
                    } catch { }
                  }
                } catch (err: any) {
                  push({ kind: 'error', message: err?.message || 'Submission failed' })
                }
              }}
              codeAssignmentId={codeAssignmentId}
              onChangeCodeAssignmentId={(v: string) => setCodeAssignmentId(v)}
              onOpenCodeEditor={() => {
                if (!codeAssignmentId) {
                  push({ kind: 'error', message: 'Please select a code assignment' })
                  return
                }
                setShowCodeEditor(true)
              }}
            />
          )}

          {tab === 'past' && (
            <section className="card">
              <h3>Past Assignments</h3>
              <ul className="list">
                {isBackend ? (
                  backendAssignments.filter((a: any) => {
                    if (!a.due_at) return false
                    return new Date(a.due_at) < new Date()
                  }).map((a: any) => (
                    <li key={a.id}>
                      {a.title} {a.due_at ? `(Due: ${new Date(a.due_at).toLocaleString()})` : ''}
                    </li>
                  ))
                ) : (
                  course?.assignmentsPast.map((a) => (
                    <li key={a.id}>
                      {a.title} {a.submitted ? '✓ Submitted' : ''}
                    </li>
                  )) || []
                )}
              </ul>
            </section>
          )}


          {user?.role === 'teacher' && tab === 'manage' && (
            <section className="card">
              {assignmentCreationType === 'selection' && (
                <>
                  <h3>Create Assignment</h3>
                  <p className="muted" style={{ marginBottom: 16 }}>Choose the type of assignment you want to create:</p>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 16, maxWidth: 800 }}>
                    <button
                      className="btn btn-primary"
                      style={{ padding: 24, fontSize: 16, height: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                      onClick={() => setAssignmentCreationType('code')}
                    >
                      <span style={{ fontSize: 32 }}>💻</span>
                      <span>Code-based</span>
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{ padding: 24, fontSize: 16, height: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                      onClick={() => setAssignmentCreationType('quiz')}
                    >
                      <span style={{ fontSize: 32 }}>📝</span>
                      <span>Quiz-based</span>
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{ padding: 24, fontSize: 16, height: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                      onClick={() => setAssignmentCreationType('pdf')}
                    >
                      <span style={{ fontSize: 32 }}>📄</span>
                      <span>PDF Submission</span>
                    </button>
                  </div>
                </>
              )}

              {assignmentCreationType === 'pdf' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                    <button className="btn" onClick={() => setAssignmentCreationType('selection')} style={{ marginRight: 8 }}>← Back</button>
                    <h3 style={{ margin: 0 }}>Create PDF Submission Assignment</h3>
                  </div>
                  <div className="form" style={{ maxWidth: 640 }}>
                    <label className="field">
                      <span className="label">Title</span>
                      <input className="input" value={newAssnTitle} onChange={(e) => setNewAssnTitle(e.target.value)} />
                    </label>
                    <label className="field">
                      <span className="label">Description</span>
                      <input className="input" value={newAssnDesc} onChange={(e) => setNewAssnDesc(e.target.value)} />
                    </label>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <label className="field">
                        <span className="label">Release at</span>
                        <input className="input" value={newAssnRelease} onChange={(e) => setNewAssnRelease(e.target.value)} />
                      </label>
                      <label className="field">
                        <span className="label">Due at</span>
                        <input className="input" value={newAssnDue} onChange={(e) => setNewAssnDue(e.target.value)} />
                      </label>
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <label className="field">
                        <span className="label">Max score</span>
                        <input className="input" value={newAssnMax} onChange={(e) => setNewAssnMax(e.target.value)} />
                      </label>
                      <label className="field" style={{ alignItems: 'center' }}>
                        <span className="label">Allow multiple submissions</span>
                        <input type="checkbox" checked={newAssnMulti} onChange={(e) => setNewAssnMulti(e.target.checked)} />
                      </label>
                    </div>
                    <div>
                      <button className="btn btn-primary" onClick={() => { setNewAssnType('file'); addAssn(); }}>Create PDF Assignment</button>
                    </div>
                  </div>
                </>
              )}

              {assignmentCreationType === 'code' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                    <button className="btn" onClick={() => setAssignmentCreationType('selection')} style={{ marginRight: 8 }}>← Back</button>
                    <h3 style={{ margin: 0 }}>Create Code-based Assignment</h3>
                  </div>
                  <div className="form" style={{ maxWidth: 900 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
                      <div>
                        <label className="field"><span className="label">Title</span><input className="input" value={newAssnTitle} onChange={(e) => setNewAssnTitle(e.target.value)} /></label>
                        <label className="field"><span className="label">Description</span><input className="input" value={newAssnDesc} onChange={(e) => setNewAssnDesc(e.target.value)} /></label>
                        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <label className="field"><span className="label">Release at</span><input className="input" value={newAssnRelease} onChange={(e) => setNewAssnRelease(e.target.value)} /></label>
                          <label className="field"><span className="label">Due at</span><input className="input" value={newAssnDue} onChange={(e) => setNewAssnDue(e.target.value)} /></label>
                        </div>
                        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <label className="field"><span className="label">Max score</span><input className="input" value={newAssnMax} onChange={(e) => setNewAssnMax(e.target.value)} /></label>
                          <label className="field" style={{ alignItems: 'center' }}><span className="label">Allow multiple submissions</span><input type="checkbox" checked={newAssnMulti} onChange={(e) => setNewAssnMulti(e.target.checked)} /></label>
                        </div>
                        <div style={{ marginTop: 12 }}>
                          <button className="btn btn-primary" onClick={createCodeAssignment}>Create Code Assignment (with selected questions)</button>
                        </div>
                      </div>
                      <aside>
                        <h4 style={{ marginTop: 0 }}>Question Manager</h4>
                        <div style={{ marginBottom: 8 }}>
                          <label className="field"><span className="label">Title</span><input className="input" value={newCodeQ.title} onChange={(e) => setNewCodeQ(q => ({ ...q, title: e.target.value }))} /></label>
                          <label className="field"><span className="label">Description</span><textarea className="input" rows={3} value={newCodeQ.description} onChange={(e) => setNewCodeQ(q => ({ ...q, description: e.target.value }))} /></label>
                          <label className="field"><span className="label">Constraints</span><input className="input" value={newCodeQ.constraints} onChange={(e) => setNewCodeQ(q => ({ ...q, constraints: e.target.value }))} /></label>
                          <label className="field"><span className="label">Sample Input</span><textarea className="input" rows={2} value={newCodeQ.sample_input} onChange={(e) => setNewCodeQ(q => ({ ...q, sample_input: e.target.value }))} /></label>
                          <label className="field"><span className="label">Sample Output</span><textarea className="input" rows={2} value={newCodeQ.sample_output} onChange={(e) => setNewCodeQ(q => ({ ...q, sample_output: e.target.value }))} /></label>
                          <label className="field"><span className="label">Test Input (hidden)</span><textarea className="input" rows={2} value={newCodeQ.test_input} onChange={(e) => setNewCodeQ(q => ({ ...q, test_input: e.target.value }))} /></label>
                          <label className="field"><span className="label">Expected Output (hidden)</span><textarea className="input" rows={2} value={newCodeQ.expected_output} onChange={(e) => setNewCodeQ(q => ({ ...q, expected_output: e.target.value }))} /></label>
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button className="btn btn-primary" onClick={saveCodeQuestion}>Save Question</button>
                          </div>
                        </div>
                        <div>
                          <h5>Available Questions</h5>
                          {codeQuestions.length === 0 ? (
                            <p className="muted">No questions</p>
                          ) : (
                            <ul className="list" style={{ maxHeight: 260, overflow: 'auto' }}>
                              {codeQuestions.map(q => {
                                // Convert ID to string for consistent key handling
                                const qId = String(q.id)
                                return (
                                  <li key={qId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input
                                      type="checkbox"
                                      checked={!!selectedQuestionIds[qId]}
                                      onChange={(e) => setSelectedQuestionIds(m => ({ ...m, [qId]: e.target.checked }))}
                                      aria-label={`Select question ${q.title ?? qId}`}
                                    />
                                    <div style={{ flex: 1 }}>
                                      <strong>{q.title || `Question ${qId}`}</strong>
                                      <div className="muted" style={{ fontSize: 12 }}>
                                        {q.description?.substring(0, 60) || 'No description'}
                                        {q.description && q.description.length > 60 ? '...' : ''}
                                      </div>
                                      {q.test_cases && q.test_cases.length > 0 && (
                                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                                          {q.test_cases.filter((tc: any) => tc.is_sample).length} sample test case(s)
                                        </div>
                                      )}
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </div>
                      </aside>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {user?.role === 'teacher' && tab === 'submissions' && (
            <section className="card">
              <h3>Submissions</h3>
              {isBackend ? (
                <BackendSubmissions assignments={backendAssignments} onViewCode={(submission) => {
                  setViewingCodeSubmission(submission)
                  setShowCodeEditor(true)
                }} />
              ) : (
                <p className="muted">Submissions view available in backend mode only.</p>
              )}
            </section>
          )}

          {user?.role === 'ta' && tab === 'grading' && (
            <section className="card">
              <h3>Grading</h3>
              {isBackend ? (
                <BackendGrading assignments={backendAssignments} onSave={(sid, letter) => {
                  push({ kind: 'success', message: `Grade ${letter} saved for submission ${sid}` })
                }} />
              ) : (
                <p className="muted">Grading view available in backend mode only.</p>
              )}
            </section>
          )}


          {tab === 'discussion' && isBackend && (
            <DiscussionForum
              loading={discussionLoading}
              threads={discussionThreads.threads}
              repliesMap={discussionThreads.repliesMap}
              newPostContent={newPostContent}
              onChangeNewPost={setNewPostContent}
              onPost={handlePostMessage}
              replyingTo={replyingTo}
              replyContent={replyContent}
              onReplyChange={setReplyContent}
              onStartReply={(id) => setReplyingTo(id)}
              onSubmitReply={(id) => void handlePostReply(id)}
              onCancelReply={() => { setReplyingTo(null); setReplyContent('') }}
            />
          )}

          {tab === 'pyq' && (
            <PyqList isBackend={isBackend} items={backendPYQ as any[]} />
          )}

          {tab === 'notes' && (
            <NotesList isBackend={isBackend} items={backendNotes as any[]} />
          )}

          {tab === 'progress' && isBackend && (
            <section className="card">
              <h3>Progress</h3>
              {user?.role === 'student' ? (
                <StudentProgressEmbed offeringId={courseId || ''} assignmentTotal={backendAssignments.length} />
              ) : (
                <CourseProgressEmbed offeringId={courseId || ''} />
              )}
            </section>
          )}

          {user?.role === 'teacher' && tab === 'manage' && assignmentCreationType === 'quiz' && (
            <section className="card">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <button className="btn" onClick={() => setAssignmentCreationType('selection')} style={{ marginRight: 8 }}>← Back</button>
                <h3 style={{ margin: 0 }}>Create Quiz</h3>
              </div>
              <QuizCreator courseOfferingId={courseId || ''} onComplete={() => {
                setAssignmentCreationType('selection')
                push({ kind: 'success', message: 'Quiz created' })
              }} />
            </section>
          )}

          {tabInternal === 'code_attempt' && selectedCodeAssignment && (
            <section className="card">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <button className="btn" onClick={() => { setTabInternal(''); setSelectedCodeAssignment(null) }} style={{ marginRight: 8 }}>← Back</button>
                <h3 style={{ margin: 0 }}>{selectedCodeAssignment.title}</h3>
              </div>
              {selectedCodeAssignment.questions && selectedCodeAssignment.questions.length > 0 ? (
                <div>
                  {selectedCodeAssignment.questions.map((q: CodeQuestion, idx: number) => (
                    <div key={q.id} style={{ marginBottom: 24, padding: 16, border: '1px solid #ddd', borderRadius: 4 }}>
                      <h4>Question {idx + 1}: {q.title || 'Untitled'}</h4>
                      <div style={{ marginBottom: 12, whiteSpace: 'pre-wrap' }}>{q.description}</div>
                      {q.constraints && (
                        <div style={{ marginBottom: 12, padding: 8, backgroundColor: '#fff3cd', borderRadius: 4 }}>
                          <strong>Constraints:</strong> {q.constraints}
                        </div>
                      )}
                      {(() => {
                        // Get sample test cases from test_cases array (backend) or direct properties (local)
                        let sampleCases: any[] = []
                        if (q.test_cases && Array.isArray(q.test_cases)) {
                          sampleCases = q.test_cases.filter((tc: any) => tc.is_sample === true)
                        } else if (q.sample_input && q.sample_output) {
                          // Fallback to direct properties for local mode
                          sampleCases = [{ input_text: q.sample_input, expected_text: q.sample_output }]
                        }

                        return sampleCases.length > 0 ? (
                          <div style={{ marginBottom: 12 }}>
                            <strong>Sample Test Cases:</strong>
                            {sampleCases.map((tc: any, idx: number) => (
                              <div key={idx} style={{ marginTop: 8 }}>
                                <div style={{ backgroundColor: '#f8f9fa', padding: 12, borderRadius: 4, fontSize: '0.9em' }}>
                                  <div style={{ marginBottom: 8 }}>
                                    <strong>Input:</strong>
                                    <pre style={{ marginTop: 4, marginBottom: 0, padding: 8, backgroundColor: '#ffffff', borderRadius: 4, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9em' }}>
                                      {tc.input_text || '(empty)'}
                                    </pre>
                                  </div>
                                  <div>
                                    <strong>Expected Output:</strong>
                                    <pre style={{ marginTop: 4, marginBottom: 0, padding: 8, backgroundColor: '#ffffff', borderRadius: 4, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9em' }}>
                                      {tc.expected_text || '(empty)'}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null
                      })()}
                      <div style={{ marginBottom: 8 }}>
                        <select className="select" value={codeLang[q.id] || 'python'} onChange={(e) => setCodeLang(prev => ({ ...prev, [q.id]: e.target.value }))}>
                          <option value="python">Python</option>
                          <option value="java">Java</option>
                          <option value="cpp">C++</option>
                          <option value="c">C</option>
                          <option value="javascript">JavaScript</option>
                        </select>
                      </div>
                      <textarea
                        className="input"
                        value={codeEditor[q.id] || ''}
                        onChange={(e) => setCodeEditor(prev => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder="Write your code here..."
                        rows={10}
                        style={{ fontFamily: 'monospace', fontSize: '14px', width: '100%', marginBottom: 8 }}
                      />
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                          className="btn"
                          onClick={() => void runCodeForQuestion(q)}
                          disabled={!codeEditor[q.id]?.trim() || isRunningCode[q.id]}
                          style={{ position: 'relative' }}
                        >
                          {isRunningCode[q.id] ? (
                            <>
                              <span className="spinner" style={{ marginRight: 8 }}></span>
                              Running...
                            </>
                          ) : (
                            'Run Code'
                          )}
                        </button>
                        <button
                          className="btn"
                          onClick={async () => {
                            if (!codeEditor[q.id]?.trim()) {
                              push({ kind: 'error', message: 'Write your code first' })
                              return
                            }
                            setIsSavingCode(prev => ({ ...prev, [q.id]: true }))
                            try {
                              await apiFetch('/api/submissions/submit/code', {
                                method: 'POST',
                                body: {
                                  assignment_id: Number(selectedCodeAssignment.id),
                                  question_id: Number(q.id),
                                  language: codeLang[q.id] || 'python',
                                  code: codeEditor[q.id]
                                }
                              })
                              setSavedQuestions(prev => ({ ...prev, [q.id]: true }))
                              push({ kind: 'success', message: `Question ${idx + 1} code saved successfully` })
                            } catch (err: any) {
                              push({ kind: 'error', message: err?.message || 'Failed to save code' })
                            } finally {
                              setIsSavingCode(prev => ({ ...prev, [q.id]: false }))
                            }
                          }}
                          disabled={!codeEditor[q.id]?.trim() || isSavingCode[q.id]}
                          style={{
                            backgroundColor: savedQuestions[q.id] ? '#10b981' : undefined,
                            color: savedQuestions[q.id] ? 'white' : undefined
                          }}
                        >
                          {isSavingCode[q.id] ? (
                            <>
                              <span className="spinner" style={{ marginRight: 8, display: 'inline-block' }}></span>
                              Saving...
                            </>
                          ) : savedQuestions[q.id] ? (
                            '✓ Saved'
                          ) : (
                            'Save Code'
                          )}
                        </button>
                      </div>
                      {isRunningCode[q.id] && (
                        <div style={{ marginTop: 12, padding: 16, backgroundColor: '#e7f3ff', borderRadius: 4, border: '1px solid #b3d9ff', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span className="spinner" style={{ display: 'inline-block' }}></span>
                          <span style={{ color: '#0066cc', fontWeight: 500 }}>Running the test cases...</span>
                        </div>
                      )}
                      {runResults[q.id] && !isRunningCode[q.id] && (
                        <div style={{ marginTop: 12, padding: 12, backgroundColor: runResults[q.id].ok ? '#d4edda' : '#f8d7da', borderRadius: 4 }}>
                          <div style={{ marginBottom: 8 }}>
                            <strong>Result:</strong> {runResults[q.id].message || (runResults[q.id].ok ? 'Passed' : 'Failed')}
                          </div>
                          {runResults[q.id].stdout !== undefined && runResults[q.id].stdout !== '' && (
                            <div style={{ marginTop: 8 }}>
                              <strong>Output:</strong>
                              <pre style={{ marginTop: 4, fontSize: '0.9em', backgroundColor: '#f8f9fa', padding: 8, borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                                {runResults[q.id].stdout || '(empty)'}
                              </pre>
                            </div>
                          )}
                          {runResults[q.id].expected && (
                            <div style={{ marginTop: 8 }}>
                              <strong>Expected:</strong>
                              <pre style={{ marginTop: 4, fontSize: '0.9em', backgroundColor: '#f8f9fa', padding: 8, borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                                {runResults[q.id].expected}
                              </pre>
                            </div>
                          )}
                          {runResults[q.id].stderr && runResults[q.id].stderr.trim() !== '' && (
                            <div style={{ marginTop: 8 }}>
                              <strong>Error:</strong>
                              <pre style={{ marginTop: 4, fontSize: '0.9em', color: '#dc3545', backgroundColor: '#fff5f5', padding: 8, borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                                {runResults[q.id].stderr}
                              </pre>
                            </div>
                          )}
                          {runResults[q.id].error && (
                            <div style={{ marginTop: 8, color: '#dc3545' }}>
                              <strong>Error:</strong> {runResults[q.id].error}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No questions found for this assignment.</p>
              )}
              {selectedCodeAssignment.questions && selectedCodeAssignment.questions.length > 0 && (
                <div style={{
                  marginTop: 24,
                  padding: 16,
                  backgroundColor: '#f9fafb',
                  border: '2px solid #6366f1',
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h4 style={{ margin: 0, marginBottom: 4 }}>Final Submission</h4>
                    <p style={{ margin: 0, fontSize: '0.9em', color: '#6b7280' }}>
                      {(() => {
                        const savedCount = selectedCodeAssignment.questions.filter((q: CodeQuestion) => savedQuestions[q.id]).length
                        const totalCount = selectedCodeAssignment.questions.length
                        return `Saved ${savedCount} of ${totalCount} questions`
                      })()}
                    </p>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{
                      fontSize: '16px',
                      padding: '12px 24px',
                      fontWeight: 600
                    }}
                    onClick={async () => {
                      // Check if all questions have code
                      const allHaveCode = selectedCodeAssignment.questions.every((q: CodeQuestion) => {
                        return codeEditor[q.id]?.trim()
                      })

                      if (!allHaveCode) {
                        push({ kind: 'error', message: 'Please write code for all questions before final submission' })
                        return
                      }

                      // Check if all questions are saved
                      const allSaved = selectedCodeAssignment.questions.every((q: CodeQuestion) => {
                        return savedQuestions[q.id]
                      })

                      if (!allSaved) {
                        const confirmSave = confirm('Some questions are not saved. Do you want to save all questions and submit?')
                        if (!confirmSave) return

                        // Save all unsaved questions first
                        for (const q of selectedCodeAssignment.questions) {
                          if (!savedQuestions[q.id] && codeEditor[q.id]?.trim()) {
                            try {
                              await apiFetch('/api/submissions/submit/code', {
                                method: 'POST',
                                body: {
                                  assignment_id: Number(selectedCodeAssignment.id),
                                  question_id: Number(q.id),
                                  language: codeLang[q.id] || 'python',
                                  code: codeEditor[q.id]
                                }
                              })
                              setSavedQuestions(prev => ({ ...prev, [q.id]: true }))
                            } catch (err: any) {
                              push({ kind: 'error', message: `Failed to save question ${q.id}: ${err?.message}` })
                              return
                            }
                          }
                        }
                      }

                      // Final submission - ensure all questions are saved, then mark as complete
                      try {
                        // Ensure all questions are saved (submit any unsaved ones)
                        for (const q of selectedCodeAssignment.questions) {
                          if (codeEditor[q.id]?.trim() && !savedQuestions[q.id]) {
                            try {
                              await apiFetch('/api/submissions/submit/code', {
                                method: 'POST',
                                body: {
                                  assignment_id: Number(selectedCodeAssignment.id),
                                  question_id: Number(q.id),
                                  language: codeLang[q.id] || 'python',
                                  code: codeEditor[q.id]
                                }
                              })
                              setSavedQuestions(prev => ({ ...prev, [q.id]: true }))
                            } catch (err: any) {
                              push({ kind: 'error', message: `Failed to save question ${q.id}: ${err?.message}` })
                              return
                            }
                          }
                        }

                        // All questions are now saved. The submission is complete.
                        // The backend creates/updates the submission when code is saved,
                        // so all questions are already stored in the database.

                        push({ kind: 'success', message: 'Assignment submitted successfully! All questions have been saved and submitted.' })

                        // Reload submissions to update the list
                        if (user?.role === 'student' && user?.id && courseId) {
                          try {
                            const submissions = await apiFetch<any[]>(`/api/student/courses/${courseId}/submissions`)
                            setMySubmissions(submissions || [])
                          } catch { }
                        }

                        // Close the code attempt view and go back
                        setTabInternal('')
                        setSelectedCodeAssignment(null)
                        setCodeEditor({})
                        setCodeLang({})
                        setSavedQuestions({})
                        setRunResults({})
                      } catch (err: any) {
                        push({ kind: 'error', message: err?.message || 'Final submission failed' })
                      }
                    }}
                    disabled={selectedCodeAssignment.questions.some((q: CodeQuestion) => !codeEditor[q.id]?.trim())}
                  >
                    Final Submit Assignment
                  </button>
                </div>
              )}
            </section>
          )}

          {showCodeEditor && viewingCodeSubmission && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="card" style={{ maxWidth: '95%', maxHeight: '95%', overflow: 'auto', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Code Submission - {viewingCodeSubmission.student_name || viewingCodeSubmission.student_email}</h3>
                    <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.9em' }}>
                      Submitted: {viewingCodeSubmission.submitted_at ? new Date(viewingCodeSubmission.submitted_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <button className="btn" onClick={() => { setShowCodeEditor(false); setViewingCodeSubmission(null) }}>Close</button>
                </div>

                {viewingCodeSubmission.code && viewingCodeSubmission.code.length > 0 ? (
                  <TeacherCodeSubmissionViewer
                    submission={viewingCodeSubmission}
                    onGrade={async (score, feedback) => {
                      try {
                        await apiFetch('/api/submissions/grade', {
                          method: 'POST',
                          body: {
                            submission_id: viewingCodeSubmission.id,
                            score,
                            feedback
                          }
                        })
                        push({ kind: 'success', message: 'Graded successfully' })
                        setShowCodeEditor(false)
                        setViewingCodeSubmission(null)
                      } catch (err: any) {
                        push({ kind: 'error', message: err?.message || 'Grading failed' })
                      }
                    }}
                    push={push}
                  />
                ) : (
                  <p className="muted">No code submissions found.</p>
                )}
              </div>
            </div>
          )}

          {tab === 'chatbot' && isBackend && (
            <section className="card">
              <h3>AI Assistant — Course</h3>
              <p className="muted" style={{ marginTop: 4 }}>Ask questions about this course and get AI-powered answers.</p>
              <div style={{ marginTop: 12 }}>
                <Chatbot type="course" offeringId={Number(courseId)} />
              </div>
            </section>
          )}
          {tab === 'pdfchat' && isBackend && (
            <section className="card">
              <h3>AI Assistant — PDF</h3>
              <p className="muted" style={{ marginTop: 4 }}>Upload a PDF, then ask questions about its content.</p>
              <div style={{ marginTop: 12 }}>
                <Chatbot type="pdf" />
              </div>
            </section>
          )}
          {tab === 'videos' && isBackend && (
            <section className="card">
              {user?.role === 'teacher' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0 }}>Video Lectures</h3>
                  <button className="btn btn-primary" onClick={() => setShowVideoUpload(true)}>
                    📹 Upload Video Lecture
                  </button>
                </div>
              )}
              {user?.role !== 'teacher' && (
                <h3 style={{ marginBottom: 16 }}>Video Lectures</h3>
              )}

              {selectedVideo ? (
                <div>
                  <button className="btn" onClick={() => setSelectedVideo(null)} style={{ marginBottom: 16 }}>
                    ← Back to Videos
                  </button>
                  <div className="video-viewer">
                    <h4>{selectedVideo.title}</h4>
                    {selectedVideo.description && (
                      <p className="muted" style={{ marginBottom: 16 }}>{selectedVideo.description}</p>
                    )}
                    <div style={{ marginBottom: 8 }}>
                      <strong>Duration:</strong> {selectedVideo.duration
                        ? (() => {
                          const totalSeconds = Math.floor(selectedVideo.duration);
                          const hours = Math.floor(totalSeconds / 3600);
                          const minutes = Math.floor((totalSeconds % 3600) / 60);
                          const seconds = totalSeconds % 60;
                          if (hours > 0) {
                            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                          }
                          return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                        })()
                        : 'N/A'}
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <strong>Uploaded:</strong> {new Date(selectedVideo.upload_timestamp).toLocaleString()}
                    </div>
                    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                      {user?.role === 'student' ? (
                        <InteractiveVideoPlayer
                          video={selectedVideo}
                          userRole={user?.role || 'student'}
                          onComplete={(score, maxScore) => {
                            push({
                              kind: 'success',
                              message: `Quiz completed! Score: ${score}/${maxScore}`,
                            });
                          }}
                        />
                      ) : (
                        <div className="faculty-video-container">
                          <div className="faculty-video-wrapper">
                            <video
                              ref={videoRefForFaculty}
                              src={selectedVideo.video_url}
                              controls
                              onTimeUpdate={(e) => {
                                setCurrentVideoTime(e.currentTarget.currentTime);
                              }}
                              className="faculty-video-player"
                            >
                              Your browser does not support the video tag.
                            </video>
                          </div>
                          <VideoQuestionManager
                            videoId={selectedVideo.id}
                            videoDuration={selectedVideo.duration}
                            currentTime={currentVideoTime}
                            onTimeSelect={(time) => {
                              if (videoRefForFaculty.current) {
                                videoRefForFaculty.current.currentTime = time;
                              }
                            }}
                          />
                          <VideoQuizResults videoId={selectedVideo.id} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {backendVideos.length === 0 ? (
                    <p className="muted">No videos available for this course.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Title</th>
                            {user?.role === 'teacher' && <th>URL</th>}
                            <th>Duration</th>
                            <th>Uploaded</th>
                            {user?.role === 'teacher' && <th>Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {backendVideos.map((video: any) => (
                            <tr key={video.id}>
                              <td>
                                <button
                                  className="btn"
                                  style={{ textAlign: 'left', padding: 0, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
                                  onClick={() => setSelectedVideo(video)}
                                >
                                  {video.title}
                                </button>
                              </td>
                              {user?.role === 'teacher' && (
                                <td>
                                  <a
                                    href={video.video_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: '0.875rem', wordBreak: 'break-all' }}
                                  >
                                    {video.video_url.length > 50 ? video.video_url.substring(0, 50) + '...' : video.video_url}
                                  </a>
                                </td>
                              )}
                              <td>
                                {video.duration
                                  ? (() => {
                                    const totalSeconds = Math.floor(video.duration);
                                    const hours = Math.floor(totalSeconds / 3600);
                                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                                    const seconds = totalSeconds % 60;
                                    if (hours > 0) {
                                      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                                    }
                                    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                                  })()
                                  : 'N/A'}
                              </td>
                              <td>{new Date(video.upload_timestamp).toLocaleString()}</td>
                              {user?.role === 'teacher' && (
                                <td>
                                  <button
                                    className="btn btn-primary"
                                    style={{ marginRight: 8 }}
                                    onClick={() => setSelectedVideo(video)}
                                  >
                                    View
                                  </button>
                                  <button
                                    className="btn"
                                    onClick={async () => {
                                      if (confirm(`Delete "${video.title}"?`)) {
                                        try {
                                          const { deleteVideo } = await import('../../services/videos');
                                          await deleteVideo(video.id);
                                          push({ kind: 'success', message: 'Video deleted' });
                                          const { getVideosByCourseOffering } = await import('../../services/videos');
                                          const videosData = await getVideosByCourseOffering(courseId!);
                                          setBackendVideos(videosData.videos || []);
                                        } catch (e: any) {
                                          push({ kind: 'error', message: e?.message || 'Failed to delete video' });
                                        }
                                      }
                                    }}
                                  >
                                    Delete
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {/* Video Upload Modal */}
          {isBackend && courseId && (
            <Modal
              open={showVideoUpload}
              onClose={() => setShowVideoUpload(false)}
              title="Upload Video Lecture"
            >
              <VideoUpload
                courseOfferingId={courseId}
                onUploadSuccess={async (video) => {
                  push({ kind: 'success', message: `Video "${video.title}" uploaded successfully!` })
                  setShowVideoUpload(false)
                  // Refresh videos list
                  try {
                    const { getVideosByCourseOffering } = await import('../../services/videos');
                    const videosData = await getVideosByCourseOffering(courseId!);
                    setBackendVideos(videosData.videos || []);
                  } catch { }
                }}
                onClose={() => setShowVideoUpload(false)}
              />
            </Modal>
          )}
        </div>
      </div>
    </>
  )
}