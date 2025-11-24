import { useEffect, useState, useMemo } from 'react'
import { courses } from '../../data/mock'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import CourseCard from '../../components/CourseCard'
import './AdminDashboard.css'
import { listUsers, getUserOverview, updateUser, deleteUser, listDepartments, createDepartment, updateDepartment, deleteDepartment, getCoursesByDepartment, getCourseDetails, getAssignmentsByOffering, getAssignmentsByFaculty, getSubmissionsByAssignment, assignFacultyToCourse, getOverview, deleteCourse, listCourses, createCourse, updateCourse, listOfferings, createOffering, updateOffering, deleteOffering, listAssignments, createAssignment, updateAssignment, deleteAssignment, listQuizzes, createQuiz, updateQuiz, deleteQuiz, listEnrollments, createEnrollment, deleteEnrollment } from '../../services/admin'
import { createCourse as createCourseFromCourses, createOffering as createOfferingFromCourses, listCourses as listCoursesFromCourses } from '../../services/courses'
import { register } from '../../services/auth'
import { useToast } from '../../components/ToastProvider'
interface User {
  id: number;
  name?: string;
  email: string;
  role: 'student' | 'faculty' | 'ta' | 'admin';
  department_id?: number;
  roll_number?: string;
  is_active?: boolean;
}

export default function AdminDashboard() {
  const { user, logout} = useAuth()
  const navigate = useNavigate()
  const { push } = useToast()

  const isAdmin = user?.role === 'admin'
  const [tab, setTab] = useState<'overview' | 'users' | 'courses' | 'departments' | 'assignments' | 'quizzes' | 'materials' | 'reports'>('overview')

  // Users state
  const [roleFilter, setRoleFilter] = useState<'student' | 'faculty' | 'ta' | 'admin' | ''>('')
  const [usersList, setUsersList] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedOverview, setSelectedOverview] = useState<any>(null)
  const [loadError, setLoadError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userSearchType, setUserSearchType] = useState<'all' | 'name' | 'email' | 'roll_number'>('all')
  const [userDeptFilter, setUserDeptFilter] = useState('')
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      setLoadError('')
      const r = await listUsers()
      setUsersList(r.users || [])
    } catch (err: any) {
      console.error('Error loading users:', err)
      setLoadError(err?.message || 'Failed to load users')
      setUsersList([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      void loadUsers()
    }
  }, [isAdmin])
// Advanced search scoring function
const calculateSearchScore = (text: string, searchTerm: string): number => {
  if (!text || !searchTerm) return 0

  const textLower = text.toLowerCase()
  const searchLower = searchTerm.toLowerCase()

  // Exact match (highest priority)
  if (textLower === searchLower) return 100

  // Starts with (very high priority)
  if (textLower.startsWith(searchLower)) return 80

  // Word boundary match (word starts with search term)
  const words = textLower.split(/\s+/)
  if (words.some(word => word.startsWith(searchLower))) return 60

  // Contains match (medium priority)
  if (textLower.includes(searchLower)) return 40

  // Partial word match (low priority - any word contains the search term)
  if (words.some(word => word.includes(searchLower))) return 20

  return 0
}

// Advanced search and sort function for any array of items
const advancedSearchAndSort = <T,>(
  items: T[],
  searchTerm: string,
  getSearchFields: (item: T) => string[],
  getSortKey: (item: T) => string
): T[] => {
  const term = searchTerm.trim()

  if (!term) {
    return items.sort((a, b) => getSortKey(a).localeCompare(getSortKey(b)))
  }

  const scoredItems = items.map(item => {
    let totalScore = 0
    const fields = getSearchFields(item)

    fields.forEach(field => {
      const score = calculateSearchScore(field, term)
      totalScore += score
    })

    return { item, score: totalScore }
  })

  return scoredItems
    .filter(item => item.score > 0)
    .sort((a, b) => {
      // Sort by score descending, then by sort key ascending
      if (a.score !== b.score) return b.score - a.score
      return getSortKey(a.item).localeCompare(getSortKey(b.item))
    })
    .map(item => item.item)
}

// Advanced user search with scoring and sorting
const filterUsers = (users: User[], search: string, searchType: 'all' | 'name' | 'email' | 'roll_number', role: string, dept: string): User[] => {
  const searchTerm = search.trim()

  // First filter by role and department
  let filtered = users.filter(u =>
    (role === '' || u.role === role) &&
    (dept === '' || u.department_id?.toString() === dept)
  )

  // If no search term, return filtered results sorted by name
  if (!searchTerm) {
    return filtered.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
  }

  // Calculate scores for each user
  const scoredUsers = filtered.map(user => {
    let totalScore = 0
    const fieldsToSearch = searchType === 'all'
      ? ['name', 'email', 'roll_number']
      : [searchType]

    fieldsToSearch.forEach(field => {
      let fieldValue = ''
      if (field === 'name') fieldValue = user.name || ''
      else if (field === 'email') fieldValue = user.email
      else if (field === 'roll_number') fieldValue = user.roll_number || ''

      const score = calculateSearchScore(fieldValue, searchTerm)
      totalScore += score
    })

    return { user, score: totalScore }
  })

  // Filter out users with no matches and sort by score (descending), then by name
  return scoredUsers
    .filter(item => item.score > 0)
    .sort((a, b) => {
      // Sort by score descending
      if (a.score !== b.score) return b.score - a.score
      // If scores are equal, sort alphabetically by name
      return (a.user.name || a.user.email).localeCompare(b.user.name || b.user.email)
    })
    .map(item => item.user)
}
const filteredUsers = useMemo(() =>
  usersList ? filterUsers(usersList, userSearch, userSearchType, roleFilter, userDeptFilter) : [],
  [usersList, userSearch, userSearchType, roleFilter, userDeptFilter]
)

  // Data Explorer state
  const [departments, setDepartments] = useState<any[]>([])
  const [selectedDept, setSelectedDept] = useState<any>(null)
  const [deptSearch, setDeptSearch] = useState('')
  const [deptSearchType, setDeptSearchType] = useState<'all' | 'code' | 'name'>('all')
  const [deptCourses, setDeptCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<any>(null)
  const [courseDetails, setCourseDetails] = useState<any>(null)
  const [selectedOffering, setSelectedOffering] = useState<any>(null)
  const [offeringAssignments, setOfferingAssignments] = useState<any[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null)
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<any[]>([])
  const [selectedFaculty, setSelectedFaculty] = useState<any>(null)
  const [facultyAssignments, setFacultyAssignments] = useState<any[]>([])

  // Admin Courses state
  const [adminCourses, setAdminCourses] = useState<any[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [courseSearch, setCourseSearch] = useState('')
  const [courseSearchType, setCourseSearchType] = useState<'all' | 'code' | 'title'>('all')
  const [courseDeptFilter, setCourseDeptFilter] = useState('')

  const [showCreateCourse, setShowCreateCourse] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCredits, setNewCredits] = useState<number | ''>('')
  const [deptFaculty, setDeptFaculty] = useState<any[]>([])
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<number[]>([])
  const [savingCourse, setSavingCourse] = useState(false)

  const [showOfferCourse, setShowOfferCourse] = useState(false)
  const [offerForCourse, setOfferForCourse] = useState<any>(null)

  // Create user modal
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'student', department_id: '', roll_number: '' })
  const [creatingUser, setCreatingUser] = useState(false)

  // Create department modal
  const [showCreateDept, setShowCreateDept] = useState(false)
  const [newDept, setNewDept] = useState({ code: '', name: '' })
  const [creatingDept, setCreatingDept] = useState(false)
  const [offerTerm, setOfferTerm] = useState('W25')
  const [offerSection, setOfferSection] = useState('A')
  const [offerFacultyId, setOfferFacultyId] = useState<number | ''>('')
  const [offerCapacity, setOfferCapacity] = useState<number | ''>('')
  const [offerStart, setOfferStart] = useState('')
  const [offerEnd, setOfferEnd] = useState('')
  const [savingOffering, setSavingOffering] = useState(false)

  // Offerings management state
  const [offerings, setOfferings] = useState<any[]>([])
  const [loadingOfferings, setLoadingOfferings] = useState(false)
  const [offeringSearch, setOfferingSearch] = useState('')
  const [offeringSearchType, setOfferingSearchType] = useState<'all' | 'course' | 'faculty' | 'term'>('all')
  const [offeringCourseFilter, setOfferingCourseFilter] = useState('')
  const [offeringFacultyFilter, setOfferingFacultyFilter] = useState('')
  const [showCreateOffering, setShowCreateOffering] = useState(false)
  const [newOffering, setNewOffering] = useState({
    course_id: '',
    term: 'W25',
    section: 'A',
    faculty_id: '',
    max_capacity: '',
    start_date: '',
    end_date: ''
  })
  const [creatingOffering, setCreatingOffering] = useState(false)

  // Enrollments management state
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loadingEnrollments, setLoadingEnrollments] = useState(false)
  const [enrollmentSearch, setEnrollmentSearch] = useState('')
  const [enrollmentSearchType, setEnrollmentSearchType] = useState<'all' | 'student' | 'course' | 'offering'>('all')
  const [enrollmentOfferingFilter, setEnrollmentOfferingFilter] = useState('')
  const [enrollmentStudentFilter, setEnrollmentStudentFilter] = useState('')
  const [showCreateEnrollment, setShowCreateEnrollment] = useState(false)
  const [newEnrollment, setNewEnrollment] = useState({
    course_offering_id: '',
    student_id: ''
  })
  const [creatingEnrollment, setCreatingEnrollment] = useState(false)

  // Assignments management state
  const [assignments, setAssignments] = useState<any[]>([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [assignmentSearch, setAssignmentSearch] = useState('')
  const [assignmentSearchType, setAssignmentSearchType] = useState<'all' | 'title' | 'course' | 'faculty'>('all')
  const [assignmentOfferingFilter, setAssignmentOfferingFilter] = useState('')
  const [assignmentFacultyFilter, setAssignmentFacultyFilter] = useState('')
  const [showCreateAssignment, setShowCreateAssignment] = useState(false)
  const [newAssignment, setNewAssignment] = useState({
    course_offering_id: '',
    title: '',
    description: '',
    assignment_type: 'homework',
    release_at: '',
    due_at: '',
    max_score: '100',
    allow_multiple_submissions: false
  })
  const [creatingAssignment, setCreatingAssignment] = useState(false)

  // Quizzes management state
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [loadingQuizzes, setLoadingQuizzes] = useState(false)
  const [quizSearch, setQuizSearch] = useState('')
  const [quizSearchType, setQuizSearchType] = useState<'all' | 'title' | 'course'>('all')
  const [quizOfferingFilter, setQuizOfferingFilter] = useState('')
  const [showCreateQuiz, setShowCreateQuiz] = useState(false)
  const [newQuiz, setNewQuiz] = useState({
    course_offering_id: '',
    title: '',
    start_at: '',
    end_at: '',
    max_score: '100',
    is_proctored: false,
    time_limit: '',
    allow_suspension_resume: true,
    proctoring_config_id: ''
  })
  const [creatingQuiz, setCreatingQuiz] = useState(false)

  // Course management modals
  const [showManageOfferings, setShowManageOfferings] = useState(false)
  const [showManageEnrollments, setShowManageEnrollments] = useState(false)
  const [courseEnrollments, setCourseEnrollments] = useState<any[]>([])
  const [loadingCourseEnrollments, setLoadingCourseEnrollments] = useState(false)
  const [courseEnrollmentSearch, setCourseEnrollmentSearch] = useState('')
  const [courseEnrollmentSearchType, setCourseEnrollmentSearchType] = useState<'all' | 'student' | 'offering'>('all')

  // Overview state
  const [overviewStats, setOverviewStats] = useState<any>(null)
  const [loadingOverview, setLoadingOverview] = useState(false)

  const loadDepartments = async () => {
    try {
      const { listDepartments } = await import('../../services/admin')
      const r = await listDepartments()
      setDepartments(r.departments)
    } catch (err) {
      console.error('Error loading departments:', err)
    }
  }

  const loadAdminCourses = async () => {
    try {
      setLoadingCourses(true)
      const r = await listCourses()
      const coursesWithDetails = await Promise.all((r.courses || []).map(async (c: any) => {
        const details = await getCourseDetails(c.id)
        return { ...c, offerings: details.offerings || [] }
      }))
      setAdminCourses(coursesWithDetails)
    } catch (err) {
      console.error('Error loading admin courses:', err)
    } finally {
      setLoadingCourses(false)
    }
  }

  const loadOfferings = async () => {
    try {
      setLoadingOfferings(true)
      const r = await listOfferings()
      setOfferings(r.offerings)
    } catch (err) {
      console.error('Error loading offerings:', err)
    } finally {
      setLoadingOfferings(false)
    }
  }

  const loadEnrollments = async () => {
    try {
      setLoadingEnrollments(true)
      const r = await listEnrollments()
      setEnrollments(r.enrollments)
    } catch (err) {
      console.error('Error loading enrollments:', err)
    } finally {
      setLoadingEnrollments(false)
    }
  }

  const loadAssignments = async () => {
    try {
      setLoadingAssignments(true)
      const r = await listAssignments()
      setAssignments(r.assignments)
    } catch (err) {
      console.error('Error loading assignments:', err)
    } finally {
      setLoadingAssignments(false)
    }
  }

  const loadQuizzes = async () => {
    try {
      setLoadingQuizzes(true)
      const r = await listQuizzes()
      setQuizzes(r.quizzes)
    } catch (err) {
      console.error('Error loading quizzes:', err)
    } finally {
      setLoadingQuizzes(false)
    }
  }

  const loadOverview = async () => {
    try {
      setLoadingOverview(true)
      const stats = await getOverview()
      setOverviewStats(stats)
    } catch (err) {
      console.error('Error loading overview:', err)
    } finally {
      setLoadingOverview(false)
    }
  }

  const loadCourseEnrollments = async (courseId: number) => {
    try {
      setLoadingCourseEnrollments(true)
      // We'll need to add a backend endpoint for this
      const r = await listEnrollments()
      // Filter enrollments for this course's offerings
      const courseOfferings = adminCourses.find((c: any) => c.id === courseId)?.offerings || []
      const offeringIds = courseOfferings.map((o: any) => o.offering_id)
      const filteredEnrollments = r.enrollments.filter((e: any) => offeringIds.includes(e.course_offering_id))
      setCourseEnrollments(filteredEnrollments)
    } catch (err) {
      console.error('Error loading course enrollments:', err)
    } finally {
      setLoadingCourseEnrollments(false)
    }
  }

  const selectDepartment = async (dept: any) => {
    setSelectedDept(dept)
    setSelectedCourse(null)
    setSelectedOffering(null)
    setSelectedAssignment(null)
    try {
      const r = await getCoursesByDepartment(dept.id)
      setDeptCourses(r.courses)
    } catch (err) {
      console.error('Error loading courses:', err)
    }
    try {
      const fac = await listUsers('faculty')
      setDeptFaculty((fac.users || []).filter((u: any) => u.department_id === dept.id))
    } catch {}
  }

  const selectCourse = async (course: any) => {
    setSelectedCourse(course)
    setSelectedOffering(null)
    setSelectedAssignment(null)
    try {
      const r = await getCourseDetails(course.id)
      setCourseDetails(r)
    } catch (err) {
      console.error('Error loading course details:', err)
    }
  }

  const selectOffering = async (offering: any) => {
    setSelectedOffering(offering)
    setSelectedAssignment(null)
    setSelectedFaculty(null)
    try {
      const r = await getAssignmentsByOffering(offering.offering_id)
      setOfferingAssignments(r.assignments)
    } catch (err) {
      console.error('Error loading assignments:', err)
    }
  }

  const selectFaculty = async (faculty: any) => {
    setSelectedFaculty(faculty)
    setSelectedOffering(null)
    setSelectedAssignment(null)
    try {
      const r = await getAssignmentsByFaculty(faculty.faculty_id)
      setFacultyAssignments(r.assignments)
    } catch (err) {
      console.error('Error loading faculty assignments:', err)
    }
  }

  const selectAssignment = async (assignment: any) => {
    setSelectedAssignment(assignment)
    try {
      const r = await getSubmissionsByAssignment(assignment.id)
      setAssignmentSubmissions(r.submissions)
    } catch (err) {
      console.error('Error loading submissions:', err)
    }
  }

  useEffect(() => {
    if (isAdmin && (tab === 'courses' || tab === 'departments')) {
      void loadDepartments()
    }
  }, [isAdmin, tab])

  useEffect(() => {
    if (isAdmin && tab === 'courses') {
      void loadAdminCourses()
    }
  }, [isAdmin, tab])


  useEffect(() => {
    if (isAdmin && tab === 'overview') {
      void loadOverview()
    }
  }, [isAdmin, tab])

  useEffect(() => {
    if (isAdmin && tab === 'assignments') {
      void loadAssignments()
    }
  }, [isAdmin, tab])

  useEffect(() => {
    if (isAdmin && tab === 'quizzes') {
      void loadQuizzes()
    }
  }, [isAdmin, tab])

  if (!isAdmin) {
    // TA view as before
    return (
      <div className="container container-wide dashboard-page student-theme">
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1 className="dashboard-title h2 text-primary">Welcome back, {user?.name}!</h1>
            <p className="dashboard-subtitle text-lg text-secondary leading-relaxed">Manage your courses and track your progress</p>
          </div>
        </div>
        <div className="courses-section">
          <div className="section-header">
            <h3 className="section-title h3">Courses</h3>
            <span className="courses-count text-sm font-medium text-secondary">{courses.length} courses available</span>
          </div>
          <div className="grid grid-cards">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} onClick={() => navigate(`/courses/${c.id}`)} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container container-wide dashboard-page admin-theme">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1 className="dashboard-title h2 text-primary">Welcome back, {user?.name}!</h1>
          <p className="dashboard-subtitle text-lg text-secondary leading-relaxed">Manage users, courses, and explore system data</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/profile')}>
            👤 Profile
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs">
        <button className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
        <button className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>Users</button>
        <button className={`tab ${tab === 'departments' ? 'active' : ''}`} onClick={() => setTab('departments')}>Departments</button>
        <button className={`tab ${tab === 'courses' ? 'active' : ''}`} onClick={() => setTab('courses')}>Courses</button>
        <button className={`tab ${tab === 'assignments' ? 'active' : ''}`} onClick={() => setTab('assignments')}>Assignments</button>
        <button className={`tab ${tab === 'quizzes' ? 'active' : ''}`} onClick={() => setTab('quizzes')}>Quizzes</button>
        <button className={`tab ${tab === 'materials' ? 'active' : ''}`} onClick={() => setTab('materials')}>Materials</button>
        <button className={`tab ${tab === 'reports' ? 'active' : ''}`} onClick(() => setTab('reports')}>Reports</button>
      </div>

      {tab === 'users' && (
        <section className="card">
          <div className="section-header">
            <h3>Users</h3>
            <button className="btn btn-primary" onClick={() => setShowCreateUser(true)}>Create User</button>
          </div>
          <div className="filters" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <input
                className="input"
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ flex: 1 }}
              />
              <select
                className="input"
                value={userSearchType}
                onChange={(e) => setUserSearchType(e.target.value as 'all' | 'name' | 'email' | 'roll_number')}
                style={{ width: '150px' }}
              >
                <option value="all">All Fields</option>
                <option value="name">Name</option>
                <option value="email">Email</option>
                <option value="roll_number">Roll Number</option>
              </select>
            </div>
            <select
              className="input"
              value={userDeptFilter}
              onChange={(e) => setUserDeptFilter(e.target.value)}
              style={{ width: '100%', marginBottom: '12px' }}
            >
              <option value="">All Departments</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={() => setHasSearched(true)} style={{ width: '100%' }}>Search</button>
          </div>
          <div className="form" style={{ marginBottom: 12 }}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <button className={`btn ${roleFilter === 'student' ? 'btn-primary' : ''}`} onClick={() => setRoleFilter('student')}>Students</button>
              <button className={`btn ${roleFilter === 'faculty' ? 'btn-primary' : ''}`} onClick={() => setRoleFilter('faculty')}>Teachers</button>
              <button className={`btn ${roleFilter === 'ta' ? 'btn-primary' : ''}`} onClick={() => setRoleFilter('ta')}>TAs</button>
            </div>
          </div>
          {isLoading && (
            <div style={{ marginBottom: 8, fontSize: '0.9em', color: '#666' }}>Loading...</div>
          )}
          {loadError && (
            <div style={{ marginBottom: 8, padding: 8, backgroundColor: '#fee', color: '#c00', borderRadius: 4 }}>
              Error: {loadError}
            </div>
          )}
          {roleFilter !== '' && hasSearched ? (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: 16 }}>
              {filteredUsers.map((u) => (
                <div key={u.id} className="card user-card">
                  <div style={{ marginBottom: 12 }}>
                    <strong>{u.name || u.email}</strong>
                    <div className="muted">{u.email} ({u.role})</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button className="btn btn-secondary" onClick={async () => {
                      setSelectedUser(u)
                      setSelectedOverview(null)
                      setShowUserDetailsModal(true)
                      const ov = await getUserOverview(u.id)
                      setSelectedOverview(ov)
                    }}>View Details</button>
                    <button className="btn btn-secondary" onClick={async () => {
                      // Edit logic
                      const newName = prompt('Enter new name:', u.name || '')
                      const newRole = prompt('Enter new role (student/faculty/ta/admin):', u.role)
                      const newDept = prompt('Enter department ID (or leave empty):', u.department_id?.toString() || '')
                      const newActive = confirm(`Is active? Currently: ${u.is_active}`)
                      if (newName !== null || newRole !== null || newDept !== null) {
                        try {
                          await updateUser(u.id, {
                            name: newName || undefined,
                            role: newRole as 'student'|'faculty'|'ta'|'admin' || undefined,
                            department_id: newDept ? Number(newDept) : null,
                            is_active: newActive
                          })
                          push({ kind: 'success', message: 'User updated' })
                          loadUsers()
                        } catch (e: any) {
                          push({ kind: 'error', message: e?.message || 'Failed to update' })
                        }
                      }
                    }}>Edit</button>
                    <button className="btn btn-danger" onClick={async () => {
                      if (confirm(`Delete user ${u.name || u.email}?`)) {
                        try {
                          await deleteUser(u.id)
                          push({ kind: 'success', message: 'User deleted' })
                          loadUsers()
                        } catch (e: any) {
                          push({ kind: 'error', message: e?.message || 'Failed to delete' })
                        }
                      }
                    }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>Please select user type and click search to view users.</p>
          )}
          
        </section>
        
      ) }

      {tab === 'courses' && (
        <section className="card">
          <div className="section-header">
            <h3>Courses</h3>
            <button className="btn btn-primary" onClick={() => setTab('departments')}>Create Course</button>
          </div>
          <div className="filters" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <input
                className="input"
                type="text"
                placeholder="Search courses..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                style={{ flex: 1 }}
              />
              <select
                className="input"
                value={courseSearchType}
                onChange={(e) => setCourseSearchType(e.target.value as 'all' | 'code' | 'title')}
                style={{ width: '150px' }}
              >
                <option value="all">All Fields</option>
                <option value="code">Code</option>
                <option value="title">Title</option>
              </select>
            </div>
            <select
              className="input"
              value={courseDeptFilter}
              onChange={(e) => setCourseDeptFilter(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">All Departments</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          {loadingCourses ? (
            <p>Loading courses...</p>
          ) : (
            <div className="courses-list">
              <div>
                {(() => {
                const filteredCourses = advancedSearchAndSort(
                  adminCourses.filter(course => courseDeptFilter === '' || course.department_id == courseDeptFilter),
                  courseSearch,
                  (course) => {
                    if (courseSearchType === 'all') return [course.code || '', course.title || '']
                    if (courseSearchType === 'code') return [course.code || '']
                    if (courseSearchType === 'title') return [course.title || '']
                    return [course.code || '', course.title || '']
                  },
                  (course) => course.code || course.title || ''
                )
                return filteredCourses.map((course) => (
                  <div key={course.id} className="card course-admin-card">
                    <div className="course-header">
                      <h4 className="course-title">{course.code} - {course.title}</h4>
                      <p className="course-description">{course.description}</p>
                      <p className="course-credits">Credits: {course.credits || 'N/A'}</p>
                    </div>
                    <div className="course-offerings">
                      <h5>Offerings:</h5>
                      {course.offerings && course.offerings.length > 0 ? (
                        course.offerings.map((offering: any) => (
                          <div key={offering.offering_id} className="offering-item">
                            <p><strong>Term:</strong> {offering.term} {offering.section ? `Section ${offering.section}` : ''}</p>
                            <p><strong>Faculty:</strong> {offering.faculty_name || 'N/A'}</p>
                            <p><strong>Enrolled Students:</strong> {offering.students?.length || 0}</p>
                            <p><strong>Duration:</strong> {offering.start_date ? new Date(offering.start_date).toLocaleDateString() : 'N/A'} to {offering.end_date ? new Date(offering.end_date).toLocaleDateString() : 'N/A'}</p>
                            <p><strong>Capacity:</strong> {offering.max_capacity || 'Unlimited'}</p>
                          </div>
                        ))
                      ) : (
                        <p>No offerings yet.</p>
                      )}
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setSelectedCourse(course)
                          setShowManageOfferings(true)
                        }}
                      >
                        Manage Offerings
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setSelectedCourse(course)
                          setShowManageEnrollments(true)
                        }}
                      >
                        Manage Enrollments
                      </button>
                      <button
                        className={`btn ${course.offerings && course.offerings.length > 0 ? 'btn-disabled' : 'btn-danger'}`}
                        disabled={course.offerings && course.offerings.length > 0}
                        onClick={async () => {
                          if (confirm(`Delete course "${course.code} - ${course.title}"? This action cannot be undone.`)) {
                            try {
                              await deleteCourse(course.id)
                              push({ kind: 'success', message: 'Course deleted successfully' })
                              loadAdminCourses()
                            } catch (e: any) {
                              push({ kind: 'error', message: e?.message || 'Failed to delete course' })
                            }
                          }
                        }}
                      >
                        Delete Course
                      </button>
                    </div>
                  </div>
                ))
              })()}
            </div>
            </div>
          )}
        </section>
      )}


      {tab === 'assignments' && (
        <section className="card">
          <div className="section-header">
            <h3>Assignments</h3>
            <button className="btn btn-primary" onClick={() => setShowCreateAssignment(true)}>Create Assignment</button>
          </div>
          <div className="filters" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <input
                className="input"
                type="text"
                placeholder="Search assignments..."
                value={assignmentSearch}
                onChange={(e) => setAssignmentSearch(e.target.value)}
                style={{ flex: 1 }}
              />
              <select
                className="input"
                value={assignmentSearchType}
                onChange={(e) => setAssignmentSearchType(e.target.value as 'all' | 'title' | 'course' | 'faculty')}
                style={{ width: '150px' }}
              >
                <option value="all">All Fields</option>
                <option value="title">Title</option>
                <option value="course">Course</option>
                <option value="faculty">Faculty</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select
                className="input"
                value={assignmentOfferingFilter}
                onChange={(e) => setAssignmentOfferingFilter(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">All Offerings</option>
                {offerings.map((o: any) => (
                  <option key={o.id} value={o.id}>{o.course_code} {o.term}{o.section ? '-' + o.section : ''}</option>
                ))}
              </select>
              <select
                className="input"
                value={assignmentFacultyFilter}
                onChange={(e) => setAssignmentFacultyFilter(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">All Faculty</option>
                {usersList.filter((u: any) => u.role === 'faculty').map((f: any) => (
                  <option key={f.id} value={f.id}>{f.name || f.email}</option>
                ))}
              </select>
            </div>
          </div>
          {loadingAssignments ? (
            <p>Loading assignments...</p>
          ) : (
            <div className="assignments-list">
              {assignments.length > 0 ? (
                assignments
                  .filter((a: any) => {
                    if (assignmentOfferingFilter && a.course_offering_id !== Number(assignmentOfferingFilter)) return false;
                    if (assignmentFacultyFilter) {
                      const offering = offerings.find((o: any) => o.id === a.course_offering_id);
                      if (!offering || offering.faculty_id !== Number(assignmentFacultyFilter)) return false;
                    }
                    return true;
                  })
                  .map((assignment: any) => (
                    <div key={assignment.id} className="card assignment-admin-card" style={{ marginBottom: 12 }}>
                      <div className="assignment-header">
                        <h4 className="assignment-title">{assignment.title}</h4>
                        <p className="assignment-description">{assignment.description}</p>
                        <p className="assignment-details">Type: {assignment.assignment_type}</p>
                        <p className="assignment-details">Max Score: {assignment.max_score}</p>
                        <p className="assignment-details">Due: {assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : 'No due date'}</p>
                      </div>
                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="btn btn-secondary">Edit</button>
                        <button className="btn btn-secondary">View Submissions</button>
                        <button
                          className="btn btn-danger"
                          onClick={async () => {
                            if (confirm(`Delete assignment "${assignment.title}"? This action cannot be undone.`)) {
                              try {
                                await deleteAssignment(assignment.id);
                                push({ kind: 'success', message: 'Assignment deleted successfully' });
                                loadAssignments();
                              } catch (e: any) {
                                push({ kind: 'error', message: e?.message || 'Failed to delete assignment' });
                              }
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="muted">No assignments found.</p>
              )}
            </div>
          )}
        </section>
      )}

      {tab === 'quizzes' && (
        <section className="card">
          <div className="section-header">
            <h3>Quizzes</h3>
            <button className="btn btn-primary" onClick={() => setShowCreateQuiz(true)}>Create Quiz</button>
          </div>
          <div className="filters" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <input
                className="input"
                type="text"
                placeholder="Search quizzes..."
                value={quizSearch}
                onChange={(e) => setQuizSearch(e.target.value)}
                style={{ flex: 1 }}
              />
              <select
                className="input"
                value={quizSearchType}
                onChange={(e) => setQuizSearchType(e.target.value as 'all' | 'title' | 'course')}
                style={{ width: '150px' }}
              >
                <option value="all">All Fields</option>
                <option value="title">Title</option>
                <option value="course">Course</option>
              </select>
            </div>
            <select
              className="input"
              value={quizOfferingFilter}
              onChange={(e) => setQuizOfferingFilter(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">All Offerings</option>
              {offerings.map((o: any) => (
                <option key={o.id} value={o.id}>{o.course_code} {o.term}{o.section ? '-' + o.section : ''}</option>
              ))}
            </select>
          </div>
          {loadingQuizzes ? (
            <p>Loading quizzes...</p>
          ) : (
            <div className="quizzes-list">
              {quizzes.length > 0 ? (
                quizzes
                  .filter((q: any) => {
                    if (quizOfferingFilter && q.course_offering_id !== Number(quizOfferingFilter)) return false;
                    return true;
                  })
                  .map((quiz: any) => (
                    <div key={quiz.id} className="card quiz-admin-card" style={{ marginBottom: 12 }}>
                      <div className="quiz-header">
                        <h4 className="quiz-title">{quiz.title || `Quiz ${quiz.id}`}</h4>
                        <p className="quiz-details">Max Score: {quiz.max_score}</p>
                        <p className="quiz-details">Proctored: {quiz.is_proctored ? 'Yes' : 'No'}</p>
                        <p className="quiz-details">Time Limit: {quiz.time_limit ? `${quiz.time_limit} minutes` : 'No limit'}</p>
                        <p className="quiz-details">Start: {quiz.start_at ? new Date(quiz.start_at).toLocaleString() : 'Not set'}</p>
                        <p className="quiz-details">End: {quiz.end_at ? new Date(quiz.end_at).toLocaleString() : 'Not set'}</p>
                      </div>
                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="btn btn-secondary">Edit</button>
                        <button className="btn btn-secondary">View Attempts</button>
                        <button
                          className="btn btn-danger"
                          onClick={async () => {
                            if (confirm(`Delete quiz "${quiz.title || `Quiz ${quiz.id}`}"? This action cannot be undone.`)) {
                              try {
                                await deleteQuiz(quiz.id);
                                push({ kind: 'success', message: 'Quiz deleted successfully' });
                                loadQuizzes();
                              } catch (e: any) {
                                push({ kind: 'error', message: e?.message || 'Failed to delete quiz' });
                              }
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="muted">No quizzes found.</p>
              )}
            </div>
          )}
        </section>
      )}


      {tab === 'departments' && (
        <section className="card">
          <div className="section-header">
            <h3>Departments</h3>
            <button className="btn btn-primary" onClick={() => setShowCreateDept(true)}>Create Department</button>
          </div>
          <div className="filters" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <input
                className="input"
                type="text"
                placeholder="Search departments..."
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                style={{ flex: 1 }}
              />
              <select
                className="input"
                value={deptSearchType}
                onChange={(e) => setDeptSearchType(e.target.value as 'all' | 'code' | 'name')}
                style={{ width: '150px' }}
              >
                <option value="all">All Fields</option>
                <option value="code">Code</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
          <div className="departments-list">
            {advancedSearchAndSort(
              departments,
              deptSearch,
              (dept) => {
                if (deptSearchType === 'all') return [dept.code || '', dept.name || '']
                if (deptSearchType === 'code') return [dept.code || '']
                if (deptSearchType === 'name') return [dept.name || '']
                return [dept.code || '', dept.name || '']
              },
              (dept) => dept.code || dept.name || ''
            ).map((d: any) => (
              <div key={d.id} className="department-item">
                <strong>{d.code}</strong> — {d.name}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'materials' && (
        <section className="card">
          <div className="section-header">
            <h3>Study Materials</h3>
            <button className="btn btn-primary" onClick={() => alert('Upload functionality coming soon!')}>Upload Material</button>
          </div>
          <p className="muted">Materials management coming soon...</p>
        </section>
      )}

      {tab === 'overview' && (
        <section className="overview-section">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Users</h3>
              <p className="stat-number">
                {loadingOverview ? 'Loading...' : (overviewStats?.totalUsers || 0)}
              </p>
            </div>
            <div className="stat-card">
              <h3>Active Courses</h3>
              <p className="stat-number">
                {loadingOverview ? 'Loading...' : (overviewStats?.activeCourses || 0)}
              </p>
            </div>
            <div className="stat-card">
              <h3>Assignments</h3>
              <p className="stat-number">
                {loadingOverview ? 'Loading...' : (overviewStats?.totalAssignments || 0)}
              </p>
            </div>
            <div className="stat-card">
              <h3>Submissions</h3>
              <p className="stat-number">
                {loadingOverview ? 'Loading...' : (overviewStats?.totalSubmissions || 0)}
              </p>
            </div>
          </div>
          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <div className="actions-grid">
              <button className="btn btn-primary" onClick={() => setTab('users')}>Manage Users</button>
              <button className="btn btn-primary" onClick={() => setTab('courses')}>Create Course</button>
              <button className="btn btn-primary" onClick={() => setTab('departments')}>Add Department</button>
              <button className="btn btn-primary" onClick={() => setTab('materials')}>Upload Material</button>
            </div>
          </div>
        </section>
      )}

      {tab === 'reports' && (
        <section className="card">
          <h3>Reports & Analytics</h3>
          <div className="reports-grid">
            <div className="report-card">
              <h4>User Activity</h4>
              <p>View user login patterns and activity metrics</p>
              <button className="btn btn-secondary">Generate Report</button>
            </div>
            <div className="report-card">
              <h4>Course Performance</h4>
              <p>Analyze course enrollment and completion rates</p>
              <button className="btn btn-secondary">Generate Report</button>
            </div>
            <div className="report-card">
              <h4>Assignment Statistics</h4>
              <p>Review submission rates and grading analytics</p>
              <button className="btn btn-secondary">Generate Report</button>
            </div>
            <div className="report-card">
              <h4>System Usage</h4>
              <p>Monitor overall platform usage and performance</p>
              <button className="btn btn-secondary">Generate Report</button>
            </div>
          </div>
        </section>
      )}

      {showCreateCourse && selectedDept && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border)', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="h4" style={{ marginTop: 0, marginBottom: 20, color: 'var(--text)' }}>Create New Course in {selectedDept.name}</h3>
            <div className="form" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input className="input" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Course Code (e.g., CS101)" />
              <input className="input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Course Title (e.g., Introduction to Computer Science)" />
              <input className="input" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (Brief course description)" />
              <input className="input" type="number" value={newCredits} onChange={(e) => setNewCredits(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Credits (e.g., 3)" />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Assign Faculty</div>
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                  {deptFaculty.length === 0 ? (
                    <div className="muted">No faculty in this department</div>
                  ) : (
                    <ul className="list">
                      {deptFaculty.map((f) => (
                        <li key={f.id}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                              type="checkbox"
                              checked={selectedFacultyIds.includes(f.id)}
                              onChange={(e) => {
                                const checked = e.target.checked
                                setSelectedFacultyIds((prev) => checked ? [...prev, f.id] : prev.filter((x) => x !== f.id))
                              }}
                            />
                            <span>{f.name || f.email}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateCourse(false)} disabled={savingCourse}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (!newCode || !newTitle) return
                  try {
                    setSavingCourse(true)
                    const c = await createCourse({ code: newCode, title: newTitle, description: newDesc || undefined, department_id: selectedDept.id, credits: newCredits === '' ? undefined : Number(newCredits) })
                    if (selectedFacultyIds.length) {
                      await assignFacultyToCourse(c.id, selectedFacultyIds)
                    }
                    const r = await getCoursesByDepartment(selectedDept.id)
                    setDeptCourses(r.courses)
                    setShowCreateCourse(false)
                    push({ kind: 'success', message: `Course ${c.code || ''} created successfully` })
                    setTimeout(() => window.location.reload(), 800)
                  } catch (e: any) {
                    push({ kind: 'error', message: e?.message || 'Failed to create course' })
                  } finally {
                    setSavingCourse(false)
                  }
                }}
                disabled={savingCourse || !newCode || !newTitle}
              >
                {savingCourse ? 'Saving…' : 'Create Course'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showOfferCourse && offerForCourse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border)', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="h4" style={{ marginTop: 0, marginBottom: 20, color: 'var(--text)' }}>Create Offering — {offerForCourse.code}</h3>
            <div className="form" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input className="input" value={offerTerm} onChange={(e) => setOfferTerm(e.target.value)} placeholder="Term (e.g., W25 or Fall 2024)" />
              <input className="input" value={offerSection} onChange={(e) => setOfferSection(e.target.value)} placeholder="Section (e.g., A)" />
              <select className="input" value={offerFacultyId} onChange={(e) => setOfferFacultyId(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">Faculty (Select faculty member)</option>
                {deptFaculty.map((f) => (
                  <option key={f.id} value={f.id}>{f.name || f.email}</option>
                ))}
              </select>
              <input className="input" type="number" value={offerCapacity} onChange={(e) => setOfferCapacity(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Max Capacity (e.g., 50) - Optional" />
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input className="input" type="date" value={offerStart} onChange={(e) => setOfferStart(e.target.value)} placeholder="Start Date" />
                <input className="input" type="date" value={offerEnd} onChange={(e) => setOfferEnd(e.target.value)} placeholder="End Date" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => { setShowOfferCourse(false); setOfferForCourse(null); }} disabled={savingOffering}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (!offerForCourse?.id || !offerTerm || !offerFacultyId) return
                  try {
                    setSavingOffering(true)
                    const payload = {
                      course_id: Number(offerForCourse.id),
                      term: offerTerm,
                      section: offerSection || undefined,
                      faculty_id: Number(offerFacultyId),
                      max_capacity: offerCapacity === '' ? undefined : Number(offerCapacity),
                      start_date: offerStart || undefined,
                      end_date: offerEnd || undefined,
                    }
                    const res = await createOffering(payload)
                    setShowOfferCourse(false)
                    setOfferForCourse(null)
                    push({ kind: 'success', message: `Offering #${res.id} created` })
                    setTimeout(() => window.location.reload(), 800)
                  } catch (e: any) {
                    push({ kind: 'error', message: e?.message || 'Failed to create offering' })
                  } finally {
                    setSavingOffering(false)
                  }
                }}
                disabled={savingOffering || !offerTerm || !offerFacultyId}
              >
                {savingOffering ? 'Saving…' : 'Offer Course'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border)', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="h4" style={{ marginTop: 0, marginBottom: 20, color: 'var(--text)' }}>Create New User</h3>
            <div className="form" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input className="input" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Full Name" />
              <input className="input" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="Email Address" />
              <input className="input" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Password" />
              <select className="input" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="ta">Teaching Assistant</option>
                <option value="admin">Admin</option>
              </select>
              <select className="input" value={newUser.department_id} onChange={(e) => setNewUser({ ...newUser, department_id: e.target.value })}>
                <option value="">Select Department (Optional)</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <input className="input" value={newUser.roll_number} onChange={(e) => setNewUser({ ...newUser, roll_number: e.target.value })} placeholder="Roll Number (Optional)" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateUser(false)} disabled={creatingUser}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (!newUser.name || !newUser.email || !newUser.password) return
                  try {
                    setCreatingUser(true)
                    await register(newUser.name, newUser.email, newUser.password, newUser.role as any, newUser.department_id ? Number(newUser.department_id) : undefined, newUser.roll_number || undefined)
                    setShowCreateUser(false)
                    setNewUser({ name: '', email: '', password: '', role: 'student', department_id: '', roll_number: '' })
                    push({ kind: 'success', message: 'User created successfully' })
                    loadUsers()
                  } catch (e: any) {
                    push({ kind: 'error', message: e?.message || 'Failed to create user' })
                  } finally {
                    setCreatingUser(false)
                  }
                }}
                disabled={creatingUser || !newUser.name || !newUser.email || !newUser.password}
              >
                {creatingUser ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateDept && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border)', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="h4" style={{ marginTop: 0, marginBottom: 20, color: 'var(--text)' }}>Create New Department</h3>
            <div className="form" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input className="input" value={newDept.code} onChange={(e) => setNewDept({ ...newDept, code: e.target.value.toUpperCase() })} placeholder="Department Code (e.g., CSE)" />
              <input className="input" value={newDept.name} onChange={(e) => setNewDept({ ...newDept, name: e.target.value })} placeholder="Department Name (e.g., Computer Science and Engineering)" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateDept(false)} disabled={creatingDept}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (!newDept.code || !newDept.name) return
                  try {
                    setCreatingDept(true)
                    await createDepartment(newDept.code, newDept.name)
                    setShowCreateDept(false)
                    setNewDept({ code: '', name: '' })
                    push({ kind: 'success', message: 'Department created successfully' })
                    loadDepartments()
                  } catch (e: any) {
                    push({ kind: 'error', message: e?.message || 'Failed to create department' })
                  } finally {
                    setCreatingDept(false)
                  }
                }}
                disabled={creatingDept || !newDept.code || !newDept.name}
              >
                {creatingDept ? 'Creating…' : 'Create Department'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateOffering && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border)', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="h4" style={{ marginTop: 0, marginBottom: 20, color: 'var(--text)' }}>Create New Course Offering</h3>
            <div className="form" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <select className="input" value={newOffering.course_id} onChange={(e) => setNewOffering({ ...newOffering, course_id: e.target.value })}>
                <option value="">Select Course</option>
                {adminCourses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                ))}
              </select>
              <input className="input" value={newOffering.term} onChange={(e) => setNewOffering({ ...newOffering, term: e.target.value })} placeholder="Term (e.g., W25)" />
              <input className="input" value={newOffering.section} onChange={(e) => setNewOffering({ ...newOffering, section: e.target.value })} placeholder="Section (e.g., A)" />
              <select className="input" value={newOffering.faculty_id} onChange={(e) => setNewOffering({ ...newOffering, faculty_id: e.target.value })}>
                <option value="">Select Faculty</option>
                {usersList.filter((u: any) => u.role === 'faculty').map((f: any) => (
                  <option key={f.id} value={f.id}>{f.name || f.email}</option>
                ))}
              </select>
              <input className="input" type="number" value={newOffering.max_capacity} onChange={(e) => setNewOffering({ ...newOffering, max_capacity: e.target.value })} placeholder="Max Capacity (Optional)" />
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input className="input" type="date" value={newOffering.start_date} onChange={(e) => setNewOffering({ ...newOffering, start_date: e.target.value })} placeholder="Start Date" />
                <input className="input" type="date" value={newOffering.end_date} onChange={(e) => setNewOffering({ ...newOffering, end_date: e.target.value })} placeholder="End Date" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateOffering(false)} disabled={creatingOffering}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (!newOffering.course_id || !newOffering.term || !newOffering.faculty_id) return
                  try {
                    setCreatingOffering(true)
                    await createOffering({
                      course_id: Number(newOffering.course_id),
                      term: newOffering.term,
                      section: newOffering.section || undefined,
                      faculty_id: Number(newOffering.faculty_id),
                      max_capacity: newOffering.max_capacity ? Number(newOffering.max_capacity) : undefined,
                      start_date: newOffering.start_date || undefined,
                      end_date: newOffering.end_date || undefined,
                    })
                    setShowCreateOffering(false)
                    setNewOffering({ course_id: '', term: 'W25', section: 'A', faculty_id: '', max_capacity: '', start_date: '', end_date: '' })
                    push({ kind: 'success', message: 'Offering created successfully' })
                    loadOfferings()
                  } catch (e: any) {
                    push({ kind: 'error', message: e?.message || 'Failed to create offering' })
                  } finally {
                    setCreatingOffering(false)
                  }
                }}
                disabled={creatingOffering || !newOffering.course_id || !newOffering.term || !newOffering.faculty_id}
              >
                {creatingOffering ? 'Creating…' : 'Create Offering'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateEnrollment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border)', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="h4" style={{ marginTop: 0, marginBottom: 20, color: 'var(--text)' }}>Create New Enrollment</h3>
            <div className="form" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <select className="input" value={newEnrollment.course_offering_id} onChange={(e) => setNewEnrollment({ ...newEnrollment, course_offering_id: e.target.value })}>
                <option value="">Select Course Offering</option>
                {offerings.map((o: any) => (
                  <option key={o.id} value={o.id}>{o.course_code} {o.term}{o.section ? '-' + o.section : ''} - {o.faculty_name || 'N/A'}</option>
                ))}
              </select>
              <select className="input" value={newEnrollment.student_id} onChange={(e) => setNewEnrollment({ ...newEnrollment, student_id: e.target.value })}>
                <option value="">Select Student</option>
                {usersList.filter((u: any) => u.role === 'student').map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name || s.email} ({s.roll_number || 'No Roll Number'})</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateEnrollment(false)} disabled={creatingEnrollment}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (!newEnrollment.course_offering_id || !newEnrollment.student_id) return
                  try {
                    setCreatingEnrollment(true)
                    await createEnrollment({
                      course_offering_id: Number(newEnrollment.course_offering_id),
                      student_id: Number(newEnrollment.student_id),
                    })
                    setShowCreateEnrollment(false)
                    setNewEnrollment({ course_offering_id: '', student_id: '' })
                    push({ kind: 'success', message: 'Enrollment created successfully' })
                    loadEnrollments()
                  } catch (e: any) {
                    push({ kind: 'error', message: e?.message || 'Failed to create enrollment' })
                  } finally {
                    setCreatingEnrollment(false)
                  }
                }}
                disabled={creatingEnrollment || !newEnrollment.course_offering_id || !newEnrollment.student_id}
              >
                {creatingEnrollment ? 'Creating…' : 'Create Enrollment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateAssignment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border)', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="h4" style={{ marginTop: 0, marginBottom: 20, color: 'var(--text)' }}>Create New Assignment</h3>
            <div className="form" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <select className="input" value={newAssignment.course_offering_id} onChange={(e) => setNewAssignment({ ...newAssignment, course_offering_id: e.target.value })}>
                <option value="">Select Course Offering</option>
                {offerings.map((o: any) => (
                  <option key={o.id} value={o.id}>{o.course_code} {o.term}{o.section ? '-' + o.section : ''} - {o.faculty_name || 'N/A'}</option>
                ))}
              </select>
              <input className="input" value={newAssignment.title} onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })} placeholder="Assignment Title" />
              <textarea className="input" value={newAssignment.description} onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })} placeholder="Assignment Description" rows={3} />
              <select className="input" value={newAssignment.assignment_type} onChange={(e) => setNewAssignment({ ...newAssignment, assignment_type: e.target.value })}>
                <option value="homework">Homework</option>
                <option value="project">Project</option>
                <option value="exam">Exam</option>
                <option value="quiz">Quiz</option>
                <option value="other">Other</option>
              </select>
              <input className="input" type="number" value={newAssignment.max_score} onChange={(e) => setNewAssignment({ ...newAssignment, max_score: e.target.value })} placeholder="Max Score" />
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input className="input" type="datetime-local" value={newAssignment.release_at} onChange={(e) => setNewAssignment({ ...newAssignment, release_at: e.target.value })} placeholder="Release Date" />
                <input className="input" type="datetime-local" value={newAssignment.due_at} onChange={(e) => setNewAssignment({ ...newAssignment, due_at: e.target.value })} placeholder="Due Date" />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={newAssignment.allow_multiple_submissions}
                  onChange={(e) => setNewAssignment({ ...newAssignment, allow_multiple_submissions: e.target.checked })}
                />
                Allow Multiple Submissions
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateAssignment(false)} disabled={creatingAssignment}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (!newAssignment.course_offering_id || !newAssignment.title || !newAssignment.max_score) return
                  try {
                    setCreatingAssignment(true)
                    await createAssignment({
                      course_offering_id: Number(newAssignment.course_offering_id),
                      title: newAssignment.title,
                      description: newAssignment.description || undefined,
                      assignment_type: newAssignment.assignment_type,
                      release_at: newAssignment.release_at || undefined,
                      due_at: newAssignment.due_at || undefined,
                      max_score: Number(newAssignment.max_score),
                      allow_multiple_submissions: newAssignment.allow_multiple_submissions,
                    })
                    setShowCreateAssignment(false)
                    setNewAssignment({
                      course_offering_id: '',
                      title: '',
                      description: '',
                      assignment_type: 'homework',
                      release_at: '',
                      due_at: '',
                      max_score: '100',
                      allow_multiple_submissions: false
                    })
                    push({ kind: 'success', message: 'Assignment created successfully' })
                    loadAssignments()
                  } catch (e: any) {
                    push({ kind: 'error', message: e?.message || 'Failed to create assignment' })
                  } finally {
                    setCreatingAssignment(false)
                  }
                }}
                disabled={creatingAssignment || !newAssignment.course_offering_id || !newAssignment.title || !newAssignment.max_score}
              >
                {creatingAssignment ? 'Creating…' : 'Create Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateQuiz && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border)', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="h4" style={{ marginTop: 0, marginBottom: 20, color: 'var(--text)' }}>Create New Quiz</h3>
            <div className="form" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <select className="input" value={newQuiz.course_offering_id} onChange={(e) => setNewQuiz({ ...newQuiz, course_offering_id: e.target.value })}>
                <option value="">Select Course Offering</option>
                {offerings.map((o: any) => (
                  <option key={o.id} value={o.id}>{o.course_code} {o.term}{o.section ? '-' + o.section : ''} - {o.faculty_name || 'N/A'}</option>
                ))}
              </select>
              <input className="input" value={newQuiz.title} onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })} placeholder="Quiz Title (Optional)" />
              <input className="input" type="number" value={newQuiz.max_score} onChange={(e) => setNewQuiz({ ...newQuiz, max_score: e.target.value })} placeholder="Max Score" />
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input className="input" type="datetime-local" value={newQuiz.start_at} onChange={(e) => setNewQuiz({ ...newQuiz, start_at: e.target.value })} placeholder="Start Date" />
                <input className="input" type="datetime-local" value={newQuiz.end_at} onChange={(e) => setNewQuiz({ ...newQuiz, end_at: e.target.value })} placeholder="End Date" />
              </div>
              <input className="input" type="number" value={newQuiz.time_limit} onChange={(e) => setNewQuiz({ ...newQuiz, time_limit: e.target.value })} placeholder="Time Limit (minutes, optional)" />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={newQuiz.is_proctored}
                  onChange={(e) => setNewQuiz({ ...newQuiz, is_proctored: e.target.checked })}
                />
                Is Proctored
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={newQuiz.allow_suspension_resume}
                  onChange={(e) => setNewQuiz({ ...newQuiz, allow_suspension_resume: e.target.checked })}
                />
                Allow Suspension & Resume
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateQuiz(false)} disabled={creatingQuiz}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (!newQuiz.course_offering_id || !newQuiz.max_score) return
                  try {
                    setCreatingQuiz(true)
                    await createQuiz({
                      course_offering_id: Number(newQuiz.course_offering_id),
                      title: newQuiz.title || undefined,
                      start_at: newQuiz.start_at || undefined,
                      end_at: newQuiz.end_at || undefined,
                      max_score: Number(newQuiz.max_score),
                      is_proctored: newQuiz.is_proctored,
                      time_limit: newQuiz.time_limit ? Number(newQuiz.time_limit) : undefined,
                      allow_suspension_resume: newQuiz.allow_suspension_resume,
                      proctoring_config_id: newQuiz.proctoring_config_id ? Number(newQuiz.proctoring_config_id) : undefined,
                    })
                    setShowCreateQuiz(false)
                    setNewQuiz({
                      course_offering_id: '',
                      title: '',
                      start_at: '',
                      end_at: '',
                      max_score: '100',
                      is_proctored: false,
                      time_limit: '',
                      allow_suspension_resume: true,
                      proctoring_config_id: ''
                    })
                    push({ kind: 'success', message: 'Quiz created successfully' })
                    loadQuizzes()
                  } catch (e: any) {
                    push({ kind: 'error', message: e?.message || 'Failed to create quiz' })
                  } finally {
                    setCreatingQuiz(false)
                  }
                }}
                disabled={creatingQuiz || !newQuiz.course_offering_id || !newQuiz.max_score}
              >
                {creatingQuiz ? 'Creating…' : 'Create Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUserDetailsModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: 600, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border)', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="h4" style={{ marginTop: 0, marginBottom: 20, color: 'var(--text)' }}>User Details</h3>
            {!selectedOverview ? (
              <p>Loading…</p>
            ) : (
              <div>
                <h4 style={{ marginTop: 0 }}>{selectedUser.name || selectedUser.email}</h4>
                <div className="muted" style={{ marginBottom: 8 }}>{selectedUser.email} — {selectedUser.role}</div>
                {selectedOverview.student && (
                  <>
                    <h5>Enrolled Courses</h5>
                    <ul className="list">
                      {selectedOverview.student.enrollments.map((e: any) => (
                        <li key={e.offering_id}>{e.course_code} — {e.course_title} [{e.term}{e.section ? '-' + e.section : ''}] · Faculty: {e.faculty_name}</li>
                      ))}
                    </ul>
                  </>
                )}
                {selectedOverview.faculty && (
                  <>
                    <h5>Offerings</h5>
                    <ul className="list">
                      {selectedOverview.faculty.offerings.map((o: any) => (
                        <li key={o.offering_id}>
                          {o.course_code} — {o.course_title} [{o.term}{o.section ? '-' + o.section : ''}]
                          {o.students?.length ? (
                            <ul className="list" style={{ marginTop: 6 }}>
                              {o.students.map((s: any) => (
                                <li key={s.id}>{s.name || s.email} <span className="muted">({s.email})</span></li>
                              ))}
                            </ul>
                          ) : <div className="muted">No enrolled students yet.</div>}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {selectedOverview.ta && (
                  <>
                    <h5>TA Assignments</h5>
                    <ul className="list">
                      {selectedOverview.ta.assignments.map((a: any) => (
                        <li key={a.offering_id}>{a.course_code} — {a.course_title} [{a.term}{a.section ? '-' + a.section : ''}]</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowUserDetailsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showManageOfferings && selectedCourse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: 800, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border)', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="h4" style={{ marginTop: 0, marginBottom: 20, color: 'var(--text)' }}>Manage Offerings for {selectedCourse.code} - {selectedCourse.title}</h3>
            <div style={{ marginBottom: 16 }}>
              <button className="btn btn-primary" onClick={() => setShowCreateOffering(true)}>Create New Offering</button>
            </div>
            <div className="offerings-list">
              {selectedCourse.offerings && selectedCourse.offerings.length > 0 ? (
                selectedCourse.offerings.map((offering: any) => (
                  <div key={offering.offering_id} className="card offering-admin-card" style={{ marginBottom: 12 }}>
                    <div className="offering-header">
                      <h4 className="offering-title">{selectedCourse.code} - {selectedCourse.title}</h4>
                      <p className="offering-details">Term: {offering.term} {offering.section ? `Section ${offering.section}` : ''}</p>
                      <p className="offering-details">Faculty: {offering.faculty_name || 'N/A'}</p>
                      <p className="offering-details">Capacity: {offering.max_capacity || 'Unlimited'}</p>
                      <p className="offering-details">Enrolled: {offering.students?.length || 0}</p>
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button className="btn btn-secondary">Edit</button>
                      <button
                        className={`btn ${offering.students && offering.students.length > 0 ? 'btn-disabled' : 'btn-danger'}`}
                        disabled={offering.students && offering.students.length > 0}
                        onClick={async () => {
                          if (confirm(`Delete offering "${selectedCourse.code} ${offering.term}${offering.section ? '-' + offering.section : ''}"? This action cannot be undone.`)) {
                            try {
                              await deleteOffering(offering.offering_id)
                              push({ kind: 'success', message: 'Offering deleted successfully' })
                              loadAdminCourses()
                              setShowManageOfferings(false)
                            } catch (e: any) {
                              push({ kind: 'error', message: e?.message || 'Failed to delete offering' })
                            }
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted">No offerings yet.</p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowManageOfferings(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showManageEnrollments && selectedCourse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: 800, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border)', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="h4" style={{ marginTop: 0, marginBottom: 20, color: 'var(--text)' }}>Manage Enrollments for {selectedCourse.code} - {selectedCourse.title}</h3>
            <div style={{ marginBottom: 16 }}>
              <button className="btn btn-primary" onClick={() => setShowCreateEnrollment(true)}>Add Enrollment</button>
            </div>
            {loadingCourseEnrollments ? (
              <p>Loading enrollments...</p>
            ) : (
              <div className="enrollments-list">
                {courseEnrollments.length > 0 ? (
                  courseEnrollments.map((enrollment: any) => (
                    <div key={enrollment.id} className="card enrollment-admin-card" style={{ marginBottom: 12 }}>
                      <div className="enrollment-header">
                        <h4 className="enrollment-title">{enrollment.student_name || enrollment.student_email}</h4>
                        <p className="enrollment-details">Roll Number: {enrollment.roll_number || 'N/A'}</p>
                        <p className="enrollment-details">Term: {enrollment.term} {enrollment.section ? `Section ${enrollment.section}` : ''}</p>
                        <p className="enrollment-details">Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}</p>
                      </div>
                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-danger"
                          onClick={async () => {
                            if (confirm(`Remove enrollment for ${enrollment.student_name || enrollment.student_email} from ${selectedCourse.code}?`)) {
                              try {
                                await deleteEnrollment(enrollment.id)
                                push({ kind: 'success', message: 'Enrollment removed successfully' })
                                loadCourseEnrollments(selectedCourse.id)
                              } catch (e: any) {
                                push({ kind: 'error', message: e?.message || 'Failed to remove enrollment' })
                              }
                            }
                          }}
                        >
                          Remove Enrollment
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">No enrollments yet.</p>
                )}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowManageEnrollments(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
           
