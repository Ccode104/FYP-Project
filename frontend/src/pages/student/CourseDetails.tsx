import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState, useRef } from 'react'
import { courses } from '../../data/mock'
import { useAuth } from '../../context/AuthContext'
import { useCourse } from '../../context/CourseContext'
import { getUserCourses } from '../../data/userCourses'
import { addCustomAssignment } from '../../data/courseOverlays'
import './CourseDetails.css'
import './CourseDetails.overrides.css'
import './CodeSubmissionView.css'
import { useToast } from '../../components/ToastProvider'
import { apiFetch } from '../../services/api'
import QuizCreator from '../../components/QuizCreator'
import VideoUpload from '../../components/VideoUpload'
import InteractiveVideoPlayer from '../../components/InteractiveVideoPlayer'
import VideoQuestionManager from '../../components/VideoQuestionManager'
import VideoQuizResults from '../../components/VideoQuizResults'
import Modal from '../../components/Modal'
import TeacherCodeSubmissionViewer from '../../components/course/TeacherCodeSubmissionViewer'
import BackendSubmissions from '../../components/course/BackendSubmissions'
import TAGrading from '../../components/course/TAGrading'
import StudentProgressEmbed from '../../components/course/StudentProgressEmbed'
import CourseProgressEmbed from '../../components/course/CourseProgressEmbed'
// import MenuTiny from '../../components/course/MenuTiny'
import PyqList from '../../components/course/PyqList'
import NotesList from '../../components/course/NotesList'
import DiscussionForum from '../../components/course/DiscussionForum'
import PresentAssignmentsSection from '../../components/course/PresentAssignmentsSection'
import TeacherAssignments from '../../components/course/TeacherAssignments'
import { listDiscussionMessages, postDiscussionMessage, type DiscussionMessage } from '../../services/discussion'
import CourseSidebar, { type TabItem } from '../../components/course/CourseSidebar'
import LiveLectureViewer from '../../components/LiveLectureViewer'
import LiveLectureBroadcaster from '../../components/LiveLectureBroadcaster'
import { getLiveLecturesByCourse } from '../../services/liveLectures'

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
  const { user } = useAuth()
  const navigate = useNavigate()
  const { setCourseTitle } = useCourse()
  const [tab, setTab] = useState<'assignment' | 'present' | 'past' | 'pyq' | 'notes' | 'quizzes' | 'quizzes_submitted' | 'manage' | 'submissions' | 'grading' | 'progress' | 'discussion' | 'pdfchat' | 'videos' | 'live-lectures'>('present')
  const [backendVideos, setBackendVideos] = useState<any[]>([])
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null)
  const [videoQuestions, setVideoQuestions] = useState<any[]>([])
  const [liveLectures, setLiveLectures] = useState<any[]>([])
  const [showLiveLectureBroadcaster, setShowLiveLectureBroadcaster] = useState(false)
  const [selectedQuizResult, setSelectedQuizResult] = useState<any | null>(null)
  const [showQuizResultModal, setShowQuizResultModal] = useState(false)
  const [quizResultDetails, setQuizResultDetails] = useState<any | null>(null)
  // const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0)
  const videoRefForFaculty = useRef<HTMLVideoElement>(null)
  const [assignmentCreationType, setAssignmentCreationType] = useState<'selection' | 'code' | 'quiz' | 'pdf' | 'resources'>('selection')
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
  const [discussionMessages, setDiscussionMessages] = useState<DiscussionMessage[]>([])
  const [discussionLoading, setDiscussionLoading] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [offeringDetails, setOfferingDetails] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Auto-close sidebar when switching tabs
  const handleTabChange = (tabId: string) => {
    setTab(tabId as any)
    setSidebarOpen(false)
  }
  const [readMessageIds, setReadMessageIds] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem(`readMessages:${courseId}`)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

  const [viewedAssignments, setViewedAssignments] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`viewedAssignments:${courseId}`)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

  const [viewedQuizzes, setViewedQuizzes] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`viewedQuizzes:${courseId}`)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

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
      const filtered = backendAssignments.filter((a: any) => {
        if (!a.due_at) return true
        const dueDate = new Date(a.due_at)
        const now = new Date()
        const isPast = dueDate < now
        return !isPast
      })
      return filtered
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
    if (user?.role !== 'student') {
      return allPresentAssignments
    }

    if (!isBackend) {
      return allPresentAssignments
    }

    // IMPORTANT: Only filter if submissions have been loaded (not null)
    // If mySubmissions is null, we haven't loaded them yet, so show all assignments with isSubmitted: false
    if (mySubmissions === null) {
      const assignmentsWithStatus = allPresentAssignments.map((a: any) => ({
        ...a,
        isSubmitted: false
      }))
      const quizzesWithStatus = (backendQuizzes || [])
        .map((q: any) => ({
          id: `quiz_${q.id}`,
          title: q.title,
          assignment_type: 'quiz',
          due_at: q.end_at || q.due_at,
          release_at: q.start_at,
          is_quiz: true,
          quiz_id: q.id,
          quiz_data: q,
          isSubmitted: false
        }))
      return [...assignmentsWithStatus, ...quizzesWithStatus]
    }

    // Get set of submitted assignment IDs
    const submittedAssignmentIds = new Set(
      mySubmissions.map((s: any) => {
        const id = s.assignment_id || s.id // Handle both submission formats
        return String(id)
      })
    )

    // Get set of attempted quiz IDs
    const attemptedQuizIds = new Set(
      (myQuizAttempts || []).map((a: any) => String(a.quiz_id))
    )

    // Add submission status to assignments instead of filtering them out
    const sourceAssignments = (isBackend && Array.isArray(backendAssignments) && user?.role === 'student')
      ? backendAssignments
      : allPresentAssignments
    const assignmentsWithStatus = sourceAssignments.map((a: any) => {
      const assignmentId = String(a.id)
      const isSubmitted = submittedAssignmentIds.has(assignmentId)
      return {
        ...a,
        isSubmitted
      }
    })

    // Add quizzes with attempt status
    const quizzesWithStatus = (backendQuizzes || [])
      .map((q: any) => {
        const quizAttempts = myQuizAttempts.filter((a: any) => a.quiz_id === q.id)
        const hasViolatedAttempt = quizAttempts.some((a: any) => a.violated)
        return {
          id: `quiz_${q.id}`,
          title: q.title,
          assignment_type: 'quiz',
          due_at: q.end_at || q.due_at,
          release_at: q.start_at,
          is_quiz: true,
          quiz_id: q.id,
          quiz_data: q,
          is_proctored: q.is_proctored,
          time_limit: q.time_limit,
          isSubmitted: attemptedQuizIds.has(String(q.id)),
          isViolated: hasViolatedAttempt
        }
      })

    const result = [...assignmentsWithStatus, ...quizzesWithStatus]
    return result
  }, [allPresentAssignments, mySubmissions, myQuizAttempts, backendQuizzes, user?.role, isBackend, backendAssignments])

  // Filter assignments and quizzes separately
  const assignmentsOnly = useMemo(() =>
    presentAssignments.filter((a: any) => !a.is_quiz),
    [presentAssignments]
  )

  const quizzesOnly = useMemo(() =>
    presentAssignments.filter((a: any) => a.is_quiz),
    [presentAssignments]
  )

  // Sidebar tabs configuration
  const sidebarTabs = useMemo((): TabItem[] => {
    // Count ALL unsubmitted assignments (not just unviewed)
    const unsubmittedAssignments = assignmentsOnly.filter((a: any) => !a.isSubmitted)
    const assignmentCount = unsubmittedAssignments.length > 0 ? unsubmittedAssignments.length : undefined

    // Count ALL unattempted quizzes (not just unviewed)
    const unattemptedQuizzes = quizzesOnly.filter((a: any) => !a.isSubmitted)
    const quizCount = unattemptedQuizzes.length > 0 ? unattemptedQuizzes.length : undefined

    // Count unread discussion messages
    const unreadCount = discussionMessages.filter(msg => !readMessageIds.has(msg.id)).length
    const discussionCount = unreadCount > 0 ? unreadCount : undefined

    const studentTabs: TabItem[] = [
      { id: 'present', label: 'Assignments', icon: '📋', tooltip: 'View assignments and results', badge: assignmentCount },
      { id: 'quizzes', label: 'Quizzes', icon: '❓', tooltip: 'Available quizzes and results', badge: quizCount },
      { id: 'notes', label: 'Notes', icon: '📝', tooltip: 'Course notes and materials' },
      { id: 'pyq', label: 'Previous Papers', icon: '📚', tooltip: 'Previous year questions' },
      { id: 'progress', label: 'Progress', icon: '📊', tooltip: 'Track your progress' },
      { id: 'videos', label: 'Videos', icon: '🎥', tooltip: 'Course video lectures' },
      { id: 'live-lectures', label: 'Live Lectures', icon: '📺', tooltip: 'Live video lectures' },
      { id: 'discussion', label: 'Discussion', icon: '💬', tooltip: 'Discussion forum', badge: discussionCount },
    ]

    const teacherTabs: TabItem[] = [
      { id: 'present', label: 'Assignments', icon: '📋', tooltip: 'View all assignments' },
      { id: 'quizzes', label: 'Quizzes', icon: '❓', tooltip: 'Manage quizzes' },
      { id: 'manage', label: 'Create Assignment and Quiz', icon: '➕', tooltip: 'Create new assignments and quizzes' },
      { id: 'resources', label: 'Upload Resources', icon: '📚', tooltip: 'Upload course resources' },
      { id: 'submissions', label: 'Submissions', icon: '📥', tooltip: 'View student submissions' },
      //{ id: 'progress', label: 'Progress', icon: '📊', tooltip: 'Student progress overview' },
      { id: 'videos', label: 'Videos', icon: '🎥', tooltip: 'Manage video lectures' },
      { id: 'live-lectures', label: 'Live Lectures', icon: '📺', tooltip: 'Manage live lectures' },
      { id: 'discussion', label: 'Discussion', icon: '💬', tooltip: 'Discussion forum', badge: discussionCount },
    ]

    const taTabs: TabItem[] = [
      { id: 'present', label: 'Assignments', icon: '📋', tooltip: 'View assignments' },
      { id: 'quizzes', label: 'Quizzes', icon: '❓', tooltip: 'View quizzes' },
      { id: 'grading', label: 'Grading', icon: '✏️', tooltip: 'Grade submissions' },
      { id: 'progress', label: 'Progress', icon: '📊', tooltip: 'Student progress' },
      { id: 'discussion', label: 'Discussion', icon: '💬', tooltip: 'Discussion forum', badge: discussionCount },
    ]

    if (user?.role === 'teacher') return teacherTabs
    if (user?.role === 'ta') return taTabs
    return studentTabs
  }, [user?.role, assignmentsOnly, quizzesOnly, discussionMessages, readMessageIds, viewedAssignments, viewedQuizzes])

  const [file, setFile] = useState<File | null>(null)
  // Code submission states
  const [showCodeEditor, setShowCodeEditor] = useState(false)
  const [viewingCodeSubmission, setViewingCodeSubmission] = useState<any>(null)

  // --- Added states for code-question management & editors ---
  const [codeQuestions, setCodeQuestions] = useState<CodeQuestion[]>(() => loadLocalCodeQuestions(courseId ?? ''))
  const [newCodeQ, setNewCodeQ] = useState<CodeQuestion>({
    id: Date.now().toString(), title: '', description: '', constraints: '', sample_input: '', sample_output: '', test_input: '', expected_output: ''
  })
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Record<string, boolean>>({})
  // Set course title in navbar and clear it on unmount
  useEffect(() => {
    const title = isBackend && offeringDetails
      ? `${offeringDetails.course_code || ''} - ${offeringDetails.title || `Offering #${courseId}`}`
      : course?.title || 'Course'
    setCourseTitle(title)

    return () => {
      setCourseTitle(null)
    }
  }, [isBackend, offeringDetails, course, courseId, setCourseTitle])

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

        // Create the question
        const created = await apiFetch('/api/code-questions', {
          method: 'POST',
          body: requestBody
        })

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

  // Student: start attempting a code assignment (navigate to dedicated editor page)
  const startCodeAttempt = async (assignment: any) => {
    if (!assignment || !courseId) return
    // Navigate to the dedicated code editor page
    navigate(`/courses/${courseId}/assignments/${assignment.id}/editor`)
  }


  // Load backend data once per offering id
  useEffect(() => {
    let cancelled = false
    if (!isBackend || !courseId) return
      ; (async () => {
        // Load offering details first
        try {
          const offering = await apiFetch<any>(`/api/student/courses/${courseId}`)
          if (!cancelled) setOfferingDetails(offering)
        } catch (err) {
          console.error('Failed to load offering details:', err)
        }
        try {
          const data = await apiFetch<any[]>(`/api/courses/${courseId}/assignments`)
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
            const submissions = await apiFetch<any[]>(`/api/student/courses/${courseId}/submissions`)
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

  // Mark all current discussion messages as read when viewing the discussion tab
  useEffect(() => {
    if (tab === 'discussion' && discussionMessages.length > 0 && courseId) {
      const newReadIds = new Set(readMessageIds)
      let hasChanges = false

      discussionMessages.forEach(msg => {
        if (!newReadIds.has(msg.id)) {
          newReadIds.add(msg.id)
          hasChanges = true
        }
      })

      if (hasChanges) {
        setReadMessageIds(newReadIds)
        try {
          localStorage.setItem(`readMessages:${courseId}`, JSON.stringify(Array.from(newReadIds)))
        } catch (e) {
          console.error('Failed to save read messages:', e)
        }
      }
    }
  }, [tab, discussionMessages, courseId, readMessageIds])

  // Mark assignments as viewed when viewing the present tab
  useEffect(() => {
    if (tab === 'present' && assignmentsOnly.length > 0 && courseId) {
      const newViewedIds = new Set(viewedAssignments)
      let hasChanges = false

      assignmentsOnly.forEach(assignment => {
        const assignmentId = String(assignment.id)
        if (!newViewedIds.has(assignmentId)) {
          newViewedIds.add(assignmentId)
          hasChanges = true
        }
      })

      if (hasChanges) {
        setViewedAssignments(newViewedIds)
        try {
          localStorage.setItem(`viewedAssignments:${courseId}`, JSON.stringify(Array.from(newViewedIds)))
        } catch (e) {
          console.error('Failed to save viewed assignments:', e)
        }
      }
    }
  }, [tab, assignmentsOnly, courseId, viewedAssignments])

  // Mark quizzes as viewed when viewing the quizzes tab
  useEffect(() => {
    if (tab === 'quizzes' && quizzesOnly.length > 0 && courseId) {
      const newViewedIds = new Set(viewedQuizzes)
      let hasChanges = false

      quizzesOnly.forEach(quiz => {
        const quizId = String(quiz.id)
        if (!newViewedIds.has(quizId)) {
          newViewedIds.add(quizId)
          hasChanges = true
        }
      })

      if (hasChanges) {
        setViewedQuizzes(newViewedIds)
        try {
          localStorage.setItem(`viewedQuizzes:${courseId}`, JSON.stringify(Array.from(newViewedIds)))
        } catch (e) {
          console.error('Failed to save viewed quizzes:', e)
        }
      }
    }
  }, [tab, quizzesOnly, courseId, viewedQuizzes])

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

  // Load live lectures when the Live Lectures tab is activated (backend mode)
  useEffect(() => {
    if (tab !== 'live-lectures' || !isBackend || !courseId) return
    let cancelled = false
      ; (async () => {
        try {
          const lecturesData = await getLiveLecturesByCourse(courseId)
          if (!cancelled) setLiveLectures(lecturesData.lectures || [])
        } catch (err) {
          console.error('Failed to load live lectures for course offering:', err)
          if (!cancelled) setLiveLectures([])
        }
      })()
    return () => { cancelled = true }
  }, [tab, isBackend, courseId])

  // Redirect teachers to the new 'Assignment' tab if they are on hidden tabs
  useEffect(() => {
    if (user?.role === 'teacher') {
      const hiddenForTeacher = new Set(['present', 'past', 'progress', 'pdfchat'])
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
      {/* Sidebar Navigation */}
      <CourseSidebar
        tabs={sidebarTabs}
        activeTab={tab}
        onTabChange={handleTabChange}
        userRole={user?.role}
        onSidebarToggle={(isOpen) => setSidebarOpen(isOpen)}
      />

      <div className={`course-details-page course-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
        <div className="container">
          {/* Old tabs hidden - keeping for reference but no longer displayed */}
          <nav className="tabs-modern" style={{ display: 'none' }}>
            <div className="tabs-container">
              {user?.role === 'student' ? (
                <>
                  <button className={`tab-button ${tab === 'present' ? 'active' : ''}`} onClick={() => handleTabChange('present')} aria-pressed={tab === 'present'}>
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
                  {isBackend && (
                    <button className={`tab-button ${tab === 'videos' ? 'active' : ''}`} onClick={() => setTab('videos')} aria-pressed={tab === 'videos'}>
                      <span className="tab-icon">🎥</span>
                      Videos
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
            <div>
              {/* Current Assignments */}
              <PresentAssignmentsSection
                userRole={user?.role}
                presentAssignments={assignmentsOnly as any[]}
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
                onAttemptQuiz={(quizId: any) => { location.assign(`/quizzes/${quizId}`) }}
                onStartCodeAttempt={(assignment: any) => { void startCodeAttempt(assignment) }}
              />

              {/* Past Assignments */}
              {isBackend && (
                <section className="assignments-section" style={{ marginTop: '40px' }}>
                  <div className="section-header">
                    <h2 className="section-title">Past Assignments</h2>
                    <span className="assignment-count">
                      {backendAssignments.filter((a: any) => {
                        if (!a.due_at) return false
                        return new Date(a.due_at) < new Date()
                      }).length} completed
                    </span>
                  </div>
                  <ul className="list">
                    {backendAssignments.filter((a: any) => {
                      if (!a.due_at) return false
                      return new Date(a.due_at) < new Date()
                    }).map((a: any) => (
                      <li key={a.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        borderRadius: '6px',
                        background: 'var(--bg-secondary)',
                        marginBottom: '8px'
                      }}>
                        <div>
                          <strong>{a.title}</strong>
                          <div className="muted" style={{ fontSize: '13px', marginTop: '4px' }}>
                            Due: {new Date(a.due_at).toLocaleString()}
                          </div>
                        </div>
                        <button
                          className="btn"
                          onClick={() => navigate(`/courses/${courseId}/assignments/${a.id}`)}
                        >
                          View Details
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Assignment Results */}
              {isBackend && mySubmissions && mySubmissions.length > 0 && (
                <section className="assignments-section" style={{ marginTop: '40px' }}>
                  <div className="section-header">
                    <h2 className="section-title">Assignment Results</h2>
                    <span className="assignment-count">{mySubmissions.length} submissions</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Assignment</th>
                          <th>Score</th>
                          <th>Status</th>
                          <th>Submitted At</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mySubmissions.map((submission: any) => (
                          <tr key={submission.id}>
                            <td>
                              <strong>{submission.assignment_title || 'Unknown Assignment'}</strong>
                            </td>
                            <td>
                              <span style={{
                                fontWeight: 'bold',
                                color: submission.final_score >= 80 ? '#28a745' : submission.final_score >= 60 ? '#ffc107' : '#dc3545'
                              }}>
                                {submission.final_score !== null ? `${submission.final_score}%` : 'N/A'}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                background: '#28a745',
                                color: 'white'
                              }}>
                                ✓ GRADED
                              </span>
                            </td>
                            <td>
                              {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'N/A'}
                            </td>
                            <td>
                              <button
                                className="btn btn-primary"
                                onClick={() => navigate(`/courses/${courseId}/assignments/${submission.assignment_id}`)}
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}

          {tab === 'quizzes' && (
            <div>
              {user?.role === 'teacher' ? (
                /* Teacher Quiz Management */
                <section className="assignments-section">
                  <div className="section-header">
                    <h2 className="section-title">Quiz Management</h2>
                    <span className="assignment-count">{backendQuizzes.length} quizzes</span>
                  </div>

                  {backendQuizzes.length === 0 ? (
                    <p className="muted">No quizzes created for this course yet.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Start Time</th>
                            <th>End Time</th>
                            <th>Max Score</th>
                            <th>Proctored</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {backendQuizzes.map((quiz: any) => (
                            <tr key={quiz.id}>
                              <td>
                                <strong>{quiz.title}</strong>
                                {quiz.description && (
                                  <div className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                                    {quiz.description.length > 60 ? quiz.description.substring(0, 60) + '...' : quiz.description}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  background: new Date(quiz.start_at) > new Date() ? '#ffc107' : new Date(quiz.end_at) < new Date() ? '#6c757d' : '#28a745',
                                  color: 'white'
                                }}>
                                  {new Date(quiz.start_at) > new Date() ? 'SCHEDULED' : new Date(quiz.end_at) < new Date() ? 'ENDED' : 'ACTIVE'}
                                </span>
                              </td>
                              <td>{quiz.start_at ? new Date(quiz.start_at).toLocaleString() : 'N/A'}</td>
                              <td>{quiz.end_at ? new Date(quiz.end_at).toLocaleString() : 'N/A'}</td>
                              <td>{quiz.max_score || 'N/A'}</td>
                              <td>
                                {quiz.is_proctored ? (
                                  <span style={{ color: '#dc2626', fontWeight: 'bold' }}>🔒 Yes</span>
                                ) : (
                                  <span style={{ color: '#28a745' }}>No</span>
                                )}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => {
                                      // Navigate to quiz details/results page
                                      navigate(`/quizzes/${quiz.id}/results`);
                                    }}
                                  >
                                    View Results
                                  </button>
                                  <button
                                    className="btn btn-sm"
                                    onClick={() => {
                                      // TODO: Implement edit quiz functionality
                                      push({ kind: 'info', message: 'Edit functionality coming soon' });
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="btn btn-sm btn-danger"
                                    onClick={async () => {
                                      if (confirm(`Delete quiz "${quiz.title}"? This action cannot be undone.`)) {
                                        try {
                                          await apiFetch(`/api/quizzes/${quiz.id}`, { method: 'DELETE' });
                                          push({ kind: 'success', message: 'Quiz deleted successfully' });
                                          // Refresh quizzes list
                                          const quizzesMod = await import('../../services/quizzes');
                                          const quizzes = await quizzesMod.listCourseQuizzes(Number(courseId));
                                          setBackendQuizzes(quizzes);
                                        } catch (err: any) {
                                          push({ kind: 'error', message: err?.message || 'Failed to delete quiz' });
                                        }
                                      }
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              ) : (
                /* Student Quiz Interface */
                <>
                  {/* Available Quizzes */}
                  <section className="assignments-section">
                    <div className="section-header">
                      <h2 className="section-title">Available Quizzes</h2>
                      <span className="assignment-count">{quizzesOnly.length} quizzes</span>
                    </div>
                {quizzesOnly.length === 0 ? (
                  <p className="muted">No quizzes available at the moment.</p>
                ) : (
                  <ul className="list">
                    {quizzesOnly.map((quiz: any) => (
                      <li key={quiz.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '6px', background: 'var(--bg-secondary)', marginBottom: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <strong>{quiz.title}</strong>
                            {quiz.is_proctored && (
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                background: '#dc2626',
                                color: 'white'
                              }}>
                                🔒 PROCTORED
                              </span>
                            )}
                          </div>
                          {quiz.due_at && (
                            <div className="muted" style={{ fontSize: '13px', marginTop: '4px' }}>
                              Due: {new Date(quiz.due_at).toLocaleString()}
                            </div>
                          )}
                          {quiz.is_proctored && quiz.time_limit && (
                            <div className="muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                              Time limit: {quiz.time_limit} minutes
                            </div>
                          )}
                          {quiz.isSubmitted && (
                            <span style={{
                              display: 'inline-block',
                              marginTop: '4px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              background: 'var(--secondary)',
                              color: 'white'
                            }}>
                              ✓ Submitted
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {quiz.isViolated && (
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              background: '#ef4444',
                              color: 'white'
                            }}>
                              🚫 SUSPENDED
                            </span>
                          )}
                          {!quiz.isSubmitted && !quiz.isViolated && (
                            <button
                              className="btn btn-primary"
                              onClick={() => location.assign(`/quizzes/${quiz.quiz_id}`)}
                            >
                              Start Quiz
                            </button>
                          )}
                          {quiz.isSubmitted && (
                            <button
                              className="btn"
                              onClick={() => {
                                // Find the attempt and show results
                                const attempt = myQuizAttempts.find((a: any) => a.quiz_id === quiz.quiz_id);
                                if (attempt) {
                                  setSelectedQuizResult(attempt);
                                  setShowQuizResultModal(true);
                                }
                              }}
                            >
                              View Results
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Quiz Results */}
              {isBackend && myQuizAttempts.length > 0 && (
                <section className="assignments-section" style={{ marginTop: '40px' }}>
                  <div className="section-header">
                    <h2 className="section-title">Quiz Results</h2>
                    <span className="assignment-count">{myQuizAttempts.length} attempts</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Quiz Title</th>
                          <th>Score</th>
                          <th>Status</th>
                          <th>Submitted At</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myQuizAttempts.map((attempt: any) => (
                          <tr key={attempt.id}>
                            <td>
                              <strong>{attempt.quiz_title}</strong>
                            </td>
                            <td>
                              <span style={{
                                fontWeight: 'bold',
                                color: attempt.score >= 80 ? '#28a745' : attempt.score >= 60 ? '#ffc107' : '#dc3545'
                              }}>
                                {attempt.score !== null ? `${attempt.score}%` : 'N/A'}
                              </span>
                            </td>
                            <td>
                              {attempt.violated ? (
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  background: '#dc3545',
                                  color: 'white'
                                }}>
                                  🚫 VIOLATED
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  background: '#28a745',
                                  color: 'white'
                                }}>
                                  ✓ COMPLETED
                                </span>
                              )}
                            </td>
                            <td>
                              {attempt.finished_at ? new Date(attempt.finished_at).toLocaleString() : 'N/A'}
                            </td>
                            <td>
                              <button
                                className="btn btn-primary"
                                onClick={async () => {
                                  try {
                                    setSelectedQuizResult(attempt);
                                    setShowQuizResultModal(true);
                                    // Get detailed quiz results
                                    const result = await apiFetch(`/api/quizzes/${attempt.quiz_id}/results`);
                                    setQuizResultDetails(result);
                                  } catch (error: any) {
                                    console.error('Failed to load quiz results:', error);
                                    push({ kind: 'error', message: 'Failed to load detailed quiz results' });
                                  }
                                }}
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
                </>
              )}
            </div>
          )}



          {user?.role === 'teacher' && tab === 'manage' && (
            <section className="card">
              {assignmentCreationType === 'selection' && (
                <>
                  <h3>Create Assignment</h3>
                  <p className="muted" style={{ marginBottom: 16 }}>Choose the type of assignment you want to create:</p>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, maxWidth: 800 }}>
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
                    <button
                      className="btn btn-primary"
                      style={{ padding: 24, fontSize: 16, height: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                      onClick={() => setAssignmentCreationType('ppt')}
                    >
                      <span style={{ fontSize: 32 }}>📊</span>
                      <span>PPT Submission</span>
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{ padding: 24, fontSize: 16, height: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                      onClick={() => setAssignmentCreationType('mixed')}
                    >
                      <span style={{ fontSize: 32 }}>🔗</span>
                      <span>Mixed Submission</span>
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
                  <div className="form" style={{ maxWidth: 800 }}>
                    <div className="card" style={{ marginBottom: 16, padding: 16 }}>
                      <h4 style={{ marginTop: 0 }}>Assignment Details</h4>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Title *</div>
                        <input
                          className="input"
                          style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                          value={newAssnTitle}
                          onChange={(e) => setNewAssnTitle(e.target.value)}
                          placeholder="e.g., Research Paper - Topic Analysis"
                        />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Description</div>
                        <textarea
                          className="input"
                          style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 72 }}
                          value={newAssnDesc}
                          onChange={(e) => setNewAssnDesc(e.target.value)}
                          placeholder="Optional assignment instructions..."
                          rows={3}
                        />
                      </div>
                      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Release Time</div>
                          <input
                            className="input"
                            style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                            value={newAssnRelease}
                            onChange={(e) => setNewAssnRelease(e.target.value)}
                          />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Due Time</div>
                          <input
                            className="input"
                            style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                            value={newAssnDue}
                            onChange={(e) => setNewAssnDue(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Max Score</div>
                          <input
                            className="input"
                            style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                            type="number"
                            value={newAssnMax}
                            onChange={(e) => setNewAssnMax(e.target.value)}
                            placeholder="100"
                          />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Allow Multiple Submissions</div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={newAssnMulti}
                              onChange={(e) => setNewAssnMulti(e.target.checked)}
                            />
                            <span>{newAssnMulti ? 'Yes' : 'No'}</span>
                          </label>
                        </div>
                      </div>
                      <div style={{ marginBottom: 16, padding: '12px', background: '#f0f8ff', borderRadius: '4px' }}>
                        <strong>Submission Instructions:</strong> Students will upload their PDF files to Google Drive and submit the shareable link.
                      </div>
                      <button className="btn btn-primary" onClick={() => { setNewAssnType('pdf'); addAssn(); }}>
                        Create PDF Assignment
                      </button>
                    </div>
                  </div>
                </>
              )}

              {assignmentCreationType === 'ppt' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                    <button className="btn" onClick={() => setAssignmentCreationType('selection')} style={{ marginRight: 8 }}>← Back</button>
                    <h3 style={{ margin: 0 }}>Create PPT Submission Assignment</h3>
                  </div>
                  <div className="form" style={{ maxWidth: 800 }}>
                    <div className="card" style={{ marginBottom: 16, padding: 16 }}>
                      <h4 style={{ marginTop: 0 }}>Assignment Details</h4>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Title *</div>
                        <input
                          className="input"
                          style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                          value={newAssnTitle}
                          onChange={(e) => setNewAssnTitle(e.target.value)}
                          placeholder="e.g., Presentation - Project Overview"
                        />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Description</div>
                        <textarea
                          className="input"
                          style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 72 }}
                          value={newAssnDesc}
                          onChange={(e) => setNewAssnDesc(e.target.value)}
                          placeholder="Optional assignment instructions..."
                          rows={3}
                        />
                      </div>
                      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Release Time</div>
                          <input
                            className="input"
                            style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                            value={newAssnRelease}
                            onChange={(e) => setNewAssnRelease(e.target.value)}
                          />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Due Time</div>
                          <input
                            className="input"
                            style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                            value={newAssnDue}
                            onChange={(e) => setNewAssnDue(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Max Score</div>
                          <input
                            className="input"
                            style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                            type="number"
                            value={newAssnMax}
                            onChange={(e) => setNewAssnMax(e.target.value)}
                            placeholder="100"
                          />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Allow Multiple Submissions</div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={newAssnMulti}
                              onChange={(e) => setNewAssnMulti(e.target.checked)}
                            />
                            <span>{newAssnMulti ? 'Yes' : 'No'}</span>
                          </label>
                        </div>
                      </div>
                      <div style={{ marginBottom: 16, padding: '12px', background: '#f0f8ff', borderRadius: '4px' }}>
                        <strong>Submission Instructions:</strong> Students will upload their PPT files to Google Drive and submit the shareable link.
                      </div>
                      <button className="btn btn-primary" onClick={() => { setNewAssnType('ppt'); addAssn(); }}>
                        Create PPT Assignment
                      </button>
                    </div>
                  </div>
                </>
              )}

              {assignmentCreationType === 'mixed' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                    <button className="btn" onClick={() => setAssignmentCreationType('selection')} style={{ marginRight: 8 }}>← Back</button>
                    <h3 style={{ margin: 0 }}>Create Mixed Submission Assignment</h3>
                  </div>
                  <div className="form" style={{ maxWidth: 800 }}>
                    <div className="card" style={{ marginBottom: 16, padding: 16 }}>
                      <h4 style={{ marginTop: 0 }}>Assignment Details</h4>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Title *</div>
                        <input
                          className="input"
                          style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                          value={newAssnTitle}
                          onChange={(e) => setNewAssnTitle(e.target.value)}
                          placeholder="e.g., Full Stack Project - E-commerce Website"
                        />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Description</div>
                        <textarea
                          className="input"
                          style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 72 }}
                          value={newAssnDesc}
                          onChange={(e) => setNewAssnDesc(e.target.value)}
                          placeholder="Optional assignment instructions..."
                          rows={3}
                        />
                      </div>
                      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Release Time</div>
                          <input
                            className="input"
                            style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                            value={newAssnRelease}
                            onChange={(e) => setNewAssnRelease(e.target.value)}
                          />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Due Time</div>
                          <input
                            className="input"
                            style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                            value={newAssnDue}
                            onChange={(e) => setNewAssnDue(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Max Score</div>
                          <input
                            className="input"
                            style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                            type="number"
                            value={newAssnMax}
                            onChange={(e) => setNewAssnMax(e.target.value)}
                            placeholder="100"
                          />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Allow Multiple Submissions</div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={newAssnMulti}
                              onChange={(e) => setNewAssnMulti(e.target.checked)}
                            />
                            <span>{newAssnMulti ? 'Yes' : 'No'}</span>
                          </label>
                        </div>
                      </div>
                      <div style={{ marginBottom: 16, padding: '12px', background: '#f0f8ff', borderRadius: '4px' }}>
                        <strong>Submission Instructions:</strong> Students will create a GitHub repository with their project files and submit the repository URL.
                      </div>
                      <button className="btn btn-primary" onClick={() => { setNewAssnType('mixed'); addAssn(); }}>
                        Create Mixed Assignment
                      </button>
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
                  <div className="form" style={{ maxWidth: 1200 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
                      <div>
                        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
                          <h4 style={{ marginTop: 0 }}>Assignment Details</h4>
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Title *</div>
                            <input
                              className="input"
                              style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                              value={newAssnTitle}
                              onChange={(e) => setNewAssnTitle(e.target.value)}
                              placeholder="e.g., Data Structures Lab - Week 5"
                            />
                          </div>
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Description</div>
                            <textarea
                              className="input"
                              style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 72 }}
                              value={newAssnDesc}
                              onChange={(e) => setNewAssnDesc(e.target.value)}
                              placeholder="Optional assignment instructions..."
                              rows={3}
                            />
                          </div>
                          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Release Time</div>
                              <input
                                className="input"
                                style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                                value={newAssnRelease}
                                onChange={(e) => setNewAssnRelease(e.target.value)}
                              />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Due Time</div>
                              <input
                                className="input"
                                style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                                value={newAssnDue}
                                onChange={(e) => setNewAssnDue(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Max Score</div>
                              <input
                                className="input"
                                style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                                type="number"
                                value={newAssnMax}
                                onChange={(e) => setNewAssnMax(e.target.value)}
                                placeholder="100"
                              />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Allow Multiple Submissions</div>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={newAssnMulti}
                                  onChange={(e) => setNewAssnMulti(e.target.checked)}
                                />
                                <span>{newAssnMulti ? 'Yes' : 'No'}</span>
                              </label>
                            </div>
                          </div>
                          <button className="btn btn-primary" onClick={createCodeAssignment}>
                            Create Code Assignment
                          </button>
                        </div>
                      </div>
                      <aside>
                        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
                          <h4 style={{ marginTop: 0 }}>Add Question</h4>
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Title *</div>
                            <input
                              className="input"
                              style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                              value={newCodeQ.title}
                              onChange={(e) => setNewCodeQ(q => ({ ...q, title: e.target.value }))}
                              placeholder="e.g., Two Sum Problem"
                            />
                          </div>
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Description *</div>
                            <textarea
                              className="input"
                              style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 60 }}
                              rows={3}
                              value={newCodeQ.description}
                              onChange={(e) => setNewCodeQ(q => ({ ...q, description: e.target.value }))}
                              placeholder="Problem statement..."
                            />
                          </div>
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Constraints</div>
                            <input
                              className="input"
                              style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                              value={newCodeQ.constraints}
                              onChange={(e) => setNewCodeQ(q => ({ ...q, constraints: e.target.value }))}
                              placeholder="e.g., 1 <= n <= 10^5"
                            />
                          </div>
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Sample Input</div>
                            <textarea
                              className="input"
                              style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 50 }}
                              rows={2}
                              value={newCodeQ.sample_input}
                              onChange={(e) => setNewCodeQ(q => ({ ...q, sample_input: e.target.value }))}
                              placeholder="Example input..."
                            />
                          </div>
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Sample Output</div>
                            <textarea
                              className="input"
                              style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 50 }}
                              rows={2}
                              value={newCodeQ.sample_output}
                              onChange={(e) => setNewCodeQ(q => ({ ...q, sample_output: e.target.value }))}
                              placeholder="Expected output..."
                            />
                          </div>
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Test Input (Hidden)</div>
                            <textarea
                              className="input"
                              style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 50 }}
                              rows={2}
                              value={newCodeQ.test_input}
                              onChange={(e) => setNewCodeQ(q => ({ ...q, test_input: e.target.value }))}
                              placeholder="Hidden test input..."
                            />
                          </div>
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Expected Output (Hidden)</div>
                            <textarea
                              className="input"
                              style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 50 }}
                              rows={2}
                              value={newCodeQ.expected_output}
                              onChange={(e) => setNewCodeQ(q => ({ ...q, expected_output: e.target.value }))}
                              placeholder="Expected output for hidden test..."
                            />
                          </div>
                          <button className="btn btn-primary" onClick={saveCodeQuestion}>
                            Save Question
                          </button>
                        </div>
                        <div className="card" style={{ padding: 16 }}>
                          <h4 style={{ marginTop: 0 }}>Questions ({codeQuestions.length})</h4>
                          {codeQuestions.length === 0 ? (
                            <p className="muted" style={{ textAlign: 'center', padding: 16 }}>No questions yet</p>
                          ) : (
                            <ul className="list" style={{ maxHeight: 300, overflow: 'auto' }}>
                              {codeQuestions.map(q => {
                                const qId = String(q.id)
                                return (
                                  <li key={qId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
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
                <TAGrading courseId={courseId} />
              ) : (
                <p className="muted">Grading view available in backend mode only.</p>
              )}
            </section>
          )}


          {tab === 'discussion' && isBackend && (
            <section className="assignments-section">
              <div className="section-header">
                <h3 className="section-title">Discussion</h3>
                <span className="assignment-count">{discussionThreads.threads?.length || 0} Threads</span>
              </div>
              <div className="discussion-wrap">
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
              </div>
            </section>
          )}

          {tab === 'pyq' && (
            <PyqList isBackend={isBackend} items={backendPYQ as any[]} />
          )}

          {tab === 'notes' && (
            <NotesList isBackend={isBackend} items={backendNotes as any[]} />
          )}

          {tab === 'progress' && isBackend && (
            <section className="assignments-section">
              <div className="section-header">
                <h2 className="section-title">{user?.role === 'student' ? 'Your Progress' : 'Course Progress'}</h2>
                <span className="assignment-count">{backendAssignments.length} assignments</span>
              </div>
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

          {user?.role === 'teacher' && tab === 'resources' && (
            <section className="card">
              <h3>Upload Course Resources</h3>
              <div className="form" style={{ maxWidth: 800 }}>
                <div className="card" style={{ marginBottom: 16, padding: 16 }}>
                  <h4 style={{ marginTop: 0 }}>Upload Resource</h4>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Resource Type *</div>
                    <select
                      className="input"
                      style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                      value={newAssnType}
                      onChange={(e) => setNewAssnType(e.target.value as 'file' | 'code' | 'link')}
                    >
                      <option value="pyq">Previous Year Questions (PYQ)</option>
                      <option value="lecture_note">Lecture Notes</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>File *</div>
                    <input
                      type="file"
                      className="input"
                      style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <small className="muted" style={{ display: 'block', marginTop: 4 }}>
                      Supported formats: PDF, DOC, DOCX, TXT
                    </small>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={async () => {
                      if (!file || !courseId) {
                        push({ kind: 'error', message: 'Please select a file' });
                        return;
                      }

                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('type', newAssnType === 'pyq' ? 'pyq' : 'lecture_note');

                      try {
                        const response = await fetch(`/api/courses/${courseId}/resources`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                          },
                          body: formData
                        });

                        if (!response.ok) {
                          throw new Error('Upload failed');
                        }

                        const result = await response.json();
                        push({ kind: 'success', message: 'Resource uploaded successfully' });

                        // Refresh the resource lists
                        try {
                          const pyq = await apiFetch<any[]>(`/api/courses/${courseId}/pyqs`);
                          setBackendPYQ(pyq);
                        } catch { }
                        try {
                          const notes = await apiFetch<any[]>(`/api/courses/${courseId}/notes`);
                          setBackendNotes(notes);
                        } catch { }

                        // Reset form
                        setFile(null);
                        setNewAssnType('file');
                      } catch (error: any) {
                        push({ kind: 'error', message: error?.message || 'Upload failed' });
                      }
                    }}
                  >
                    Upload Resource
                  </button>
                </div>
              </div>
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

          {tab === 'videos' && isBackend && (
            <section className="assignments-section">
              <div className="section-header">
                <h2 className="section-title">Video Lectures</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="assignment-count">{backendVideos.length} videos</span>
                  {user?.role === 'teacher' && (
                    <button className="btn btn-primary" onClick={() => setShowVideoUpload(true)}>
                      📹 Upload Video
                    </button>
                  )}
                </div>
              </div>

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
                                  onClick={() => navigate(`/videos/${video.id}`)}
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

          {tab === 'live-lectures' && isBackend && (
            <section className="assignments-section">
              <div className="section-header">
                <h2 className="section-title">Live Lectures</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="assignment-count">{liveLectures.length} lectures</span>
                  {user?.role === 'teacher' && (
                    <button className="btn btn-primary" onClick={() => setShowLiveLectureBroadcaster(true)}>
                      📺 Start Live Lecture
                    </button>
                  )}
                </div>
              </div>

              {liveLectures.length === 0 ? (
                <p className="muted">No live lectures scheduled for this course.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Scheduled</th>
                        <th>Started</th>
                        <th>Participants</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveLectures.map((lecture: any) => (
                        <tr key={lecture.id}>
                          <td>
                            <div>
                              <strong>{lecture.title}</strong>
                              {lecture.description && (
                                <div className="muted" style={{ fontSize: '0.875rem', marginTop: '4px' }}>
                                  {lecture.description.length > 100 ? lecture.description.substring(0, 100) + '...' : lecture.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                              fontWeight: 'bold',
                              background: lecture.status === 'live' ? '#28a745' : lecture.status === 'scheduled' ? '#ffc107' : '#6c757d',
                              color: 'white'
                            }}>
                              {lecture.status.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            {lecture.scheduled_at ? new Date(lecture.scheduled_at).toLocaleString() : 'N/A'}
                          </td>
                          <td>
                            {lecture.started_at ? new Date(lecture.started_at).toLocaleString() : 'Not started'}
                          </td>
                          <td>{lecture.participant_count || 0}</td>
                          <td>
                            {lecture.status === 'live' && (
                              <button
                                className="btn btn-primary"
                                onClick={() => {
                                  // Navigate to dedicated live lecture page
                                  navigate(`/courses/${courseId}/live-lectures/${lecture.id}`);
                                }}
                              >
                                Join
                              </button>
                            )}
                            {user?.role === 'teacher' && lecture.status === 'scheduled' && (
                              <button
                                className="btn btn-success"
                                onClick={async () => {
                                  try {
                                    const { startLiveLecture } = await import('../../services/liveLectures');
                                    await startLiveLecture(lecture.id);
                                    // Refresh lectures
                                    const lecturesData = await getLiveLecturesByCourse(courseId!);
                                    setLiveLectures(lecturesData.lectures || []);
                                    push({ kind: 'success', message: 'Live lecture started' });
                                  } catch (err: any) {
                                    push({ kind: 'error', message: err?.message || 'Failed to start lecture' });
                                  }
                                }}
                              >
                                Start
                              </button>
                            )}
                            {user?.role === 'teacher' && lecture.status === 'live' && (
                              <button
                                className="btn btn-danger"
                                onClick={async () => {
                                  try {
                                    const { endLiveLecture } = await import('../../services/liveLectures');
                                    await endLiveLecture(lecture.id);
                                    // Refresh lectures
                                    const lecturesData = await getLiveLecturesByCourse(courseId!);
                                    setLiveLectures(lecturesData.lectures || []);
                                    push({ kind: 'success', message: 'Live lecture ended' });
                                  } catch (err: any) {
                                    push({ kind: 'error', message: err?.message || 'Failed to end lecture' });
                                  }
                                }}
                              >
                                End
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}


          {/* Live Lecture Broadcaster Modal */}
          {showLiveLectureBroadcaster && (
            <Modal
              open={showLiveLectureBroadcaster}
              onClose={() => setShowLiveLectureBroadcaster(false)}
              title="Create Live Lecture"
            >
              <LiveLectureBroadcaster
                courseOfferingId={courseId || ''}
                onLectureCreated={async () => {
                  // Refresh lectures list
                  try {
                    const lecturesData = await getLiveLecturesByCourse(courseId!);
                    setLiveLectures(lecturesData.lectures || []);
                    setShowLiveLectureBroadcaster(false);
                    push({ kind: 'success', message: 'Live lecture created successfully' });
                  } catch (err: any) {
                    push({ kind: 'error', message: err?.message || 'Failed to refresh lectures' });
                  }
                }}
                onClose={() => setShowLiveLectureBroadcaster(false)}
              />
            </Modal>
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

          {/* Quiz Results Modal */}
          {showQuizResultModal && selectedQuizResult && (
            <Modal
              open={showQuizResultModal}
              onClose={() => {
                setShowQuizResultModal(false);
                setSelectedQuizResult(null);
                setQuizResultDetails(null);
              }}
              title={`Quiz Results: ${selectedQuizResult.quiz_title}`}
            >
              <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Quiz Summary */}
                <div style={{ marginBottom: '20px', padding: '15px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>Quiz Summary</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div><strong>Score:</strong> <span style={{
                      color: selectedQuizResult.score >= 80 ? '#28a745' : selectedQuizResult.score >= 60 ? '#ffc107' : '#dc3545',
                      fontWeight: 'bold'
                    }}>{selectedQuizResult.score}%</span></div>
                    <div><strong>Status:</strong> {selectedQuizResult.violated ? '🚫 Violated' : '✅ Completed'}</div>
                    <div><strong>Submitted:</strong> {selectedQuizResult.finished_at ? new Date(selectedQuizResult.finished_at).toLocaleString() : 'N/A'}</div>
                    <div><strong>Max Score:</strong> 100%</div>
                  </div>
                </div>

                {/* Detailed Results */}
                {quizResultDetails ? (
                  <div>
                    <h4>Question Details</h4>
                    {quizResultDetails.questions && quizResultDetails.questions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {quizResultDetails.questions.map((question: any, index: number) => {
                          const studentAnswer = selectedQuizResult.answers?.[question.id];
                          const isCorrect = studentAnswer === question.correct_answer;

                          return (
                            <div key={question.id} style={{
                              padding: '15px',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              background: isCorrect ? '#f8fff8' : '#fff8f8'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                <h5 style={{ margin: 0, flex: 1 }}>Question {index + 1}</h5>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  background: isCorrect ? '#28a745' : '#dc3545',
                                  color: 'white'
                                }}>
                                  {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                </span>
                              </div>

                              <p style={{ margin: '10px 0', fontWeight: '500' }}>{question.question_text}</p>

                              {question.metadata?.choices && (
                                <div style={{ marginTop: '10px' }}>
                                  <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '5px' }}>Options:</div>
                                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                    {question.metadata.choices.map((choice: string, choiceIndex: number) => (
                                      <li key={choiceIndex} style={{
                                        color: choice === question.correct_answer ? '#28a745' : choice === studentAnswer ? '#dc3545' : 'inherit',
                                        fontWeight: choice === studentAnswer ? 'bold' : 'normal'
                                      }}>
                                        {choice}
                                        {choice === question.correct_answer && ' ✓ (Correct Answer)'}
                                        {choice === studentAnswer && choice !== question.correct_answer && ' ✗ (Your Answer)'}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {question.explanation && (
                                <div style={{ marginTop: '10px', padding: '10px', background: '#f0f8ff', borderRadius: '4px' }}>
                                  <strong>Explanation:</strong> {question.explanation}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="muted">Detailed question results not available.</p>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p>Loading detailed results...</p>
                  </div>
                )}
              </div>
            </Modal>
          )}

        </div>
      </div>
    </>
  )
}