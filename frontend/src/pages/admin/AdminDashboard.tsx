import { useEffect, useState, useMemo, useCallback } from 'react'
import { courses } from '../../data/mock'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import CourseCard from '../../components/CourseCard'
import './AdminDashboard.css'
import {
  listUsers, getUserOverview, updateUser, deleteUser,
  listDepartments, createDepartment, updateDepartment, deleteDepartment,
  getCoursesByDepartment, getCourseDetails,
  getAssignmentsByOffering, getAssignmentsByFaculty, getSubmissionsByAssignment,
  assignFacultyToCourse, getOverview, deleteCourse,
  listCourses, createCourse, updateCourse,
  listOfferings, createOffering, updateOffering, deleteOffering,
  listAssignments, createAssignment, updateAssignment, deleteAssignment,
  listQuizzes, createQuiz, updateQuiz, deleteQuiz,
  listEnrollments, createEnrollment, deleteEnrollment
} from '../../services/admin'
import { createCourse as createCourseFromCourses, createOffering as createOfferingFromCourses, listCourses as listCoursesFromCourses } from '../../services/courses'
import { register } from '../../services/auth'
import { useToast } from '../../components/ToastProvider'
import SupportTicketList from '../../components/SupportTicketList'
import Reports from '../../components/Reports'
import RecentActivities from '../../components/RecentActivities'
import Skeleton, { SkeletonCard } from '../../components/Skeleton'
import ConfirmationModal from '../../components/ConfirmationModal'
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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [tab, setTab] = useState<'overview' | 'users' | 'courses' | 'departments' | 'reports' | 'support'>('overview')

  // Tab configuration for better maintainability
  const tabConfigs = [
    { key: 'overview', label: 'Overview' },
    { key: 'users', label: 'Users' },
    { key: 'departments', label: 'Departments' },
    { key: 'courses', label: 'Courses' },
    { key: 'support', label: 'Support' },
    { key: 'reports', label: 'Reports' },
  ] as const

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
  const [userRoleFilter, setUserRoleFilter] = useState<string[]>([])
  const [userDeptMultiFilter, setUserDeptMultiFilter] = useState<string[]>([])
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [liveSearchEnabled, setLiveSearchEnabled] = useState(true)
  const [searchParameterHistory, setSearchParameterHistory] = useState<Array<{
    keyword: string
    searchType: 'all' | 'name' | 'email' | 'roll_number'
    deptFilter: string
    roleFilter: string[]
    deptMultiFilter: string[]
    timestamp: number
  }>>([])
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [recentlyViewedUsers, setRecentlyViewedUsers] = useState<User[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [showMultiSelect, setShowMultiSelect] = useState(false)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

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

  // Check if current user is super admin
  const checkSuperAdminStatus = async () => {
    if (!user?.id) return
    try {
      // We'll need to add a backend endpoint to check super admin status
      // For now, we'll check if the user email is admin@gmail.com (the known super admin)
      setIsSuperAdmin(user.email === 'admin@gmail.com')
    } catch (error) {
      console.error('Error checking super admin status:', error)
      setIsSuperAdmin(false)
    }
  }

  // Load search parameter history and recently viewed users from localStorage
  useEffect(() => {
    const savedParameterHistory = localStorage.getItem('adminSearchParameterHistory')
    const savedRecentUsers = localStorage.getItem('adminRecentUsers')
    const savedDeptParameterHistory = localStorage.getItem('adminDeptSearchParameterHistory')
    const savedCourseParameterHistory = localStorage.getItem('adminCourseSearchParameterHistory')
    if (savedParameterHistory) {
      setSearchParameterHistory(JSON.parse(savedParameterHistory))
    }
    if (savedRecentUsers) {
      setRecentlyViewedUsers(JSON.parse(savedRecentUsers))
    }
    if (savedDeptParameterHistory) {
      setDeptSearchParameterHistory(JSON.parse(savedDeptParameterHistory))
    }
    if (savedCourseParameterHistory) {
      setCourseSearchParameterHistory(JSON.parse(savedCourseParameterHistory))
    }
  }, [])

  useEffect(() => {
    if (isAdmin) {
      void loadUsers()
      void checkSuperAdminStatus()
    }
  }, [isAdmin, user])

  // Department search state (moved before useEffect)
  const [deptSearch, setDeptSearch] = useState('')
  const [deptSearchType, setDeptSearchType] = useState<'all' | 'code' | 'name'>('all')
  const [deptViewMode, setDeptViewMode] = useState<'cards' | 'table'>('cards')
  const [deptLiveSearchEnabled, setDeptLiveSearchEnabled] = useState(true)
  const [deptSearchParameterHistory, setDeptSearchParameterHistory] = useState<Array<{
    keyword: string
    searchType: 'all' | 'code' | 'name'
    timestamp: number
  }>>([])
  const [showDeptSearchSuggestions, setShowDeptSearchSuggestions] = useState(false)
  const [deptCurrentPage, setDeptCurrentPage] = useState(1)
  const [deptItemsPerPage] = useState(10)
  const [showDeptDetailsModal, setShowDeptDetailsModal] = useState(false)
  const [selectedDeptDetails, setSelectedDeptDetails] = useState<any>(null)
  const [deptDetailsCourses, setDeptDetailsCourses] = useState<any[]>([])

  // Load users on initial mount for default view
  useEffect(() => {
    if (isAdmin && tab === 'users' && usersList.length === 0) {
      void loadUsers()
    }
  }, [isAdmin, tab, usersList.length])

  // Debounced search effect
  useEffect(() => {
    if (!liveSearchEnabled || !userSearch.trim()) return

    const timeoutId = setTimeout(() => {
      performSearch()
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [userSearch, userSearchType, userDeptFilter, roleFilter, liveSearchEnabled])

  // Debounced department search effect
  useEffect(() => {
    if (!deptLiveSearchEnabled || !deptSearch.trim()) return

    const timeoutId = setTimeout(() => {
      // For departments, we just filter the existing data
      setDeptCurrentPage(1)
    }, 300) // 300ms debounce for departments

    return () => clearTimeout(timeoutId)
  }, [deptSearch, deptSearchType, deptLiveSearchEnabled])

  // Course search state (moved before useEffect)
  const [courseSearch, setCourseSearch] = useState('')
  const [courseSearchType, setCourseSearchType] = useState<'all' | 'code' | 'title'>('all')
  const [courseDeptFilter, setCourseDeptFilter] = useState('')
  const [courseViewMode, setCourseViewMode] = useState<'cards' | 'table'>('cards')
  const [courseLiveSearchEnabled, setCourseLiveSearchEnabled] = useState(true)
  const [courseSearchParameterHistory, setCourseSearchParameterHistory] = useState<Array<{
    keyword: string
    searchType: 'all' | 'code' | 'title'
    deptFilter: string
    timestamp: number
  }>>([])
  const [showCourseSearchSuggestions, setShowCourseSearchSuggestions] = useState(false)
  const [courseCurrentPage, setCourseCurrentPage] = useState(1)
  const [courseItemsPerPage] = useState(10)

  // Debounced course search effect
  useEffect(() => {
    if (!courseLiveSearchEnabled || !courseSearch.trim()) return

    const timeoutId = setTimeout(() => {
      // For courses, we just filter the existing data
      setCourseCurrentPage(1)
    }, 300) // 300ms debounce for courses

    return () => clearTimeout(timeoutId)
  }, [courseSearch, courseSearchType, courseDeptFilter, courseLiveSearchEnabled])
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

// Advanced user search with scoring and sorting (supports multi-select)
const filterUsers = (users: User[], search: string, searchType: 'all' | 'name' | 'email' | 'roll_number', roleFilter: string[], deptFilter: string[]): User[] => {
  const searchTerm = search.trim()

  // First filter by roles and departments (multi-select support)
  let filtered = users.filter(u => {
    const roleMatch = roleFilter.length === 0 || roleFilter.includes(u.role)
    const deptMatch = deptFilter.length === 0 || deptFilter.includes(u.department_id?.toString() || '')
    return roleMatch && deptMatch
  })

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
  usersList ? filterUsers(usersList, userSearch, userSearchType, userRoleFilter, userDeptMultiFilter) : [],
  [usersList, userSearch, userSearchType, userRoleFilter, userDeptMultiFilter]
)

// Pagination logic
const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Data Explorer state
  const [departments, setDepartments] = useState<any[]>([])
  const [selectedDept, setSelectedDept] = useState<any>(null)
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

// Department filtering and pagination
const filteredDepartments = useMemo(() =>
  departments ? advancedSearchAndSort(
    departments,
    deptSearch,
    (dept) => {
      if (deptSearchType === 'all') return [dept.code || '', dept.name || '']
      if (deptSearchType === 'code') return [dept.code || '']
      if (deptSearchType === 'name') return [dept.name || '']
      return [dept.code || '', dept.name || '']
    },
    (dept) => dept.code || dept.name || ''
  ) : [],
  [departments, deptSearch, deptSearchType]
)

const deptTotalPages = Math.ceil(filteredDepartments.length / deptItemsPerPage)
const paginatedDepartments = filteredDepartments.slice((deptCurrentPage - 1) * deptItemsPerPage, deptCurrentPage * deptItemsPerPage)

// Course filtering and pagination
const filteredCourses = useMemo(() =>
  adminCourses ? advancedSearchAndSort(
    adminCourses.filter(course => courseDeptFilter === '' || course.department_id == courseDeptFilter),
    courseSearch,
    (course) => {
      if (courseSearchType === 'all') return [course.code || '', course.title || '']
      if (courseSearchType === 'code') return [course.code || '']
      if (courseSearchType === 'title') return [course.title || '']
      return [course.code || '', course.title || '']
    },
    (course) => course.code || course.title || ''
  ) : [],
  [adminCourses, courseSearch, courseSearchType, courseDeptFilter]
)

const courseTotalPages = Math.ceil(filteredCourses.length / courseItemsPerPage)
const paginatedCourses = filteredCourses.slice((courseCurrentPage - 1) * courseItemsPerPage, courseCurrentPage * courseItemsPerPage)

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

  // Edit user modal
  const [showEditUser, setShowEditUser] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editUserData, setEditUserData] = useState({ name: '', role: 'student', department_id: '', roll_number: '', is_active: false })
  const [updatingUser, setUpdatingUser] = useState(false)

  // Delete confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState(false)

  // Delete course confirmation modal
  const [showDeleteCourseConfirm, setShowDeleteCourseConfirm] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<any>(null)
  const [deletingCourse, setDeletingCourse] = useState(false)

  // Delete department confirmation modal
  const [showDeleteDeptConfirm, setShowDeleteDeptConfirm] = useState(false)
  const [deptToDelete, setDeptToDelete] = useState<any>(null)
  const [deletingDept, setDeletingDept] = useState(false)

  // Delete offering confirmation modal
  const [showDeleteOfferingConfirm, setShowDeleteOfferingConfirm] = useState(false)
  const [offeringToDelete, setOfferingToDelete] = useState<any>(null)
  const [offeringToDeleteMessage, setOfferingToDeleteMessage] = useState('')
  const [deletingOffering, setDeletingOffering] = useState(false)

  // Delete enrollment confirmation modal
  const [showDeleteEnrollmentConfirm, setShowDeleteEnrollmentConfirm] = useState(false)
  const [enrollmentToDelete, setEnrollmentToDelete] = useState<any>(null)
  const [deletingEnrollment, setDeletingEnrollment] = useState(false)

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
  const [enrollmentFromManage, setEnrollmentFromManage] = useState(false)
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

  // Edit offering state
  const [editingOffering, setEditingOffering] = useState<any>(null)
  const [showEditOffering, setShowEditOffering] = useState(false)

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
      console.log('All enrollments:', r.enrollments)
      // Filter enrollments for this course's offerings
      const courseOfferings = adminCourses.find((c: any) => c.id === courseId)?.offerings || []
      console.log('Course offerings:', courseOfferings)
      const offeringIds = courseOfferings.map((o: any) => o.offering_id)
      console.log('Offering IDs:', offeringIds)
      const filteredEnrollments = r.enrollments.filter((e: any) => offeringIds.includes(e.course_offering_id))
      console.log('Filtered enrollments:', filteredEnrollments)
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

  // Debounced search function
  const performSearch = useCallback(async () => {
    if (!userSearch.trim()) {
      setHasSearched(false)
      return
    }

    try {
      setIsLoading(true)
      // Save search parameters to history
      const searchParams = {
        keyword: userSearch.trim(),
        searchType: userSearchType,
        deptFilter: userDeptFilter,
        roleFilter: userRoleFilter,
        deptMultiFilter: userDeptMultiFilter,
        timestamp: Date.now()
      }

      const newHistory = [searchParams, ...searchParameterHistory.filter(h =>
        !(h.keyword === searchParams.keyword &&
          h.searchType === searchParams.searchType &&
          h.deptFilter === searchParams.deptFilter &&
          JSON.stringify(h.roleFilter) === JSON.stringify(searchParams.roleFilter) &&
          JSON.stringify(h.deptMultiFilter) === JSON.stringify(searchParams.deptMultiFilter))
      )].slice(0, 10)

      setSearchParameterHistory(newHistory)
      localStorage.setItem('adminSearchParameterHistory', JSON.stringify(newHistory))

      // For now, just filter existing users (in a real app, this would call the backend)
      setHasSearched(true)
    } catch (err: any) {
      console.error('Search error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [userSearch, userSearchType, userDeptFilter, userRoleFilter, userDeptMultiFilter, searchParameterHistory])

  // Export users to CSV
  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Role', 'Department', 'Roll Number', 'Status', 'Created At']
    const csvData = [
      headers.join(','),
      ...filteredUsers.map(user => [
        user.id,
        `"${user.name || ''}"`,
        `"${user.email}"`,
        user.role,
        `"${departments.find(d => d.id.toString() === user.department_id?.toString())?.name || ''}"`,
        `"${user.roll_number || ''}"`,
        user.is_active ? 'Active' : 'Inactive',
        new Date().toISOString().split('T')[0] // Placeholder for created_at
      ].join(','))
    ].join('\n')
  
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  // Export departments to CSV
  const exportDepartmentsToCSV = () => {
    const headers = ['ID', 'Code', 'Name', 'Created At']
    const csvData = [
      headers.join(','),
      ...filteredDepartments.map(dept => [
        dept.id,
        `"${dept.code || ''}"`,
        `"${dept.name || ''}"`,
        new Date().toISOString().split('T')[0] // Placeholder for created_at
      ].join(','))
    ].join('\n')
  
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `departments_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  // Export courses to CSV
  const exportCoursesToCSV = () => {
    const headers = ['ID', 'Code', 'Title', 'Description', 'Credits', 'Department', 'Created At']
    const csvData = [
      headers.join(','),
      ...filteredCourses.map(course => [
        course.id,
        `"${course.code || ''}"`,
        `"${course.title || ''}"`,
        `"${course.description || ''}"`,
        course.credits || '',
        `"${departments.find(d => d.id.toString() === course.department_id?.toString())?.name || ''}"`,
        new Date().toISOString().split('T')[0] // Placeholder for created_at
      ].join(','))
    ].join('\n')
  
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `courses_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Add user to recently viewed
  const addToRecentlyViewed = (user: User) => {
    const newRecent = [user, ...recentlyViewedUsers.filter(u => u.id !== user.id)].slice(0, 5)
    setRecentlyViewedUsers(newRecent)
    localStorage.setItem('adminRecentUsers', JSON.stringify(newRecent))
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

  // Load course enrollments when manage enrollments modal opens
  useEffect(() => {
    if (showManageEnrollments && selectedCourse) {
      void loadCourseEnrollments(selectedCourse.id)
    }
  }, [showManageEnrollments, selectedCourse])

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
          <button className="btn btn-secondary" onClick={() => navigate('/profile')} style={{ fontWeight: '500', padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', transition: 'all 0.2s ease' }}>
            <span style={{ fontSize: '1.1em', marginRight: '6px' }}>👤</span> Profile
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs">
        {tabConfigs.map(({ key, label }) => (
          <button
            key={key}
            className={`tab ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <section className="card">
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Users</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '6px' }}>
                <button
                  className={`btn ${viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setViewMode('cards')}
                  style={{ borderRadius: '6px 0 0 6px', borderRight: 'none' }}
                >
                  <span style={{ fontSize: '1.1em' }}>☰</span> Cards
                </button>
                <button
                  className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setViewMode('table')}
                  style={{ borderRadius: '0 6px 6px 0' }}
                >
                  <span style={{ fontSize: '1.1em' }}>⊞</span> Table
                </button>
              </div>
              {isSuperAdmin && (
                <button className="btn btn-primary" onClick={() => setShowCreateUser(true)}>Create User</button>
              )}
            </div>
          </div>
          <div className="filters" style={{ marginBottom: '16px' }}>
            {/* Prominent Search Bar */}
            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type="text"
                  placeholder="🔍 Search users..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value)
                    setShowSearchSuggestions(e.target.value.length > 0)
                  }}
                  onFocus={() => setShowSearchSuggestions(userSearch.length > 0)}
                  onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 300)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    border: '2px solid var(--border)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)'
                  }}
                  aria-label="Search users by name, email, or roll number"
                />
                {userSearch && (
                  <button
                    onClick={() => setUserSearch('')}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '18px',
                      padding: '4px'
                    }}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}

                {/* Search Suggestions Dropdown */}
                {showSearchSuggestions && searchParameterHistory.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {searchParameterHistory
                      .filter(item => item.keyword.toLowerCase().includes(userSearch.toLowerCase()))
                      .slice(0, 5)
                      .map((item, index) => (
                        <button
                          key={index}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setUserSearch(item.keyword)
                            setUserSearchType(item.searchType)
                            setUserDeptFilter(item.deptFilter)
                            setUserRoleFilter(item.roleFilter)
                            setUserDeptMultiFilter(item.deptMultiFilter)
                            setShowSearchSuggestions(false)
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: 'none',
                            background: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderBottom: index < 4 ? '1px solid var(--border)' : 'none',
                            color: 'var(--text)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-secondary)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                            "{item.keyword}"
                          </div>
                          <div style={{
                            fontSize: '0.8em',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            gap: '4px',
                            flexWrap: 'wrap'
                          }}>
                            {item.searchType !== 'all' && <span>In: {item.searchType}</span>}
                            {item.deptFilter && <span>Dept: {departments.find(d => d.id.toString() === item.deptFilter)?.name || item.deptFilter}</span>}
                            {item.roleFilter.length > 0 && <span>Roles: {item.roleFilter.length}</span>}
                            {item.deptMultiFilter.length > 0 && <span>Depts: {item.deptMultiFilter.length}</span>}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Search Scope */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.9em', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '4px', display: 'block' }}>Search in:</label>
              <select
                className="input"
                value={userSearchType}
                onChange={(e) => setUserSearchType(e.target.value as 'all' | 'name' | 'email' | 'roll_number')}
                style={{ width: '100%' }}
                aria-label="Select which fields to search in"
              >
                <option value="all">All Fields</option>
                <option value="name">Name</option>
                <option value="email">Email</option>
                <option value="roll_number">Roll Number</option>
              </select>
            </div>

            {/* Filters */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.9em', color: 'var(--text-secondary)', fontWeight: '500' }}>Filter:</label>
                <button
                  onClick={() => setShowMultiSelect(!showMultiSelect)}
                  style={{
                    fontSize: '0.8em',
                    color: 'var(--primary)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {showMultiSelect ? 'Simple Mode' : 'Advanced Mode'}
                </button>
              </div>

              {showMultiSelect ? (
                // Multi-select mode
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Department Multi-Select */}
                  <div>
                    <label style={{ fontSize: '0.8em', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Departments ({userDeptMultiFilter.length} selected)
                    </label>
                    <div style={{
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '8px',
                      maxHeight: '120px',
                      overflowY: 'auto',
                      backgroundColor: 'var(--surface)'
                    }}>
                      {departments.map((dept: any) => (
                        <label key={dept.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.85em' }}>
                          <input
                            type="checkbox"
                            checked={userDeptMultiFilter.includes(dept.id.toString())}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setUserDeptMultiFilter([...userDeptMultiFilter, dept.id.toString()])
                              } else {
                                setUserDeptMultiFilter(userDeptMultiFilter.filter(id => id !== dept.id.toString()))
                              }
                            }}
                          />
                          {dept.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Role Multi-Select */}
                  <div>
                    <label style={{ fontSize: '0.8em', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Roles ({userRoleFilter.length} selected)
                    </label>
                    <div style={{
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '8px',
                      backgroundColor: 'var(--surface)'
                    }}>
                      {[
                        { value: 'student', label: 'Students' },
                        { value: 'faculty', label: 'Teachers' },
                        { value: 'ta', label: 'TAs' },
                        ...(isSuperAdmin ? [{ value: 'admin', label: 'Admins' }] : [])
                      ].map((role) => (
                        <label key={role.value} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '12px', fontSize: '0.85em' }}>
                          <input
                            type="checkbox"
                            checked={userRoleFilter.includes(role.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setUserRoleFilter([...userRoleFilter, role.value])
                              } else {
                                setUserRoleFilter(userRoleFilter.filter(r => r !== role.value))
                              }
                            }}
                          />
                          {role.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // Simple mode (backward compatible)
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    className="input"
                    value={userDeptFilter}
                    onChange={(e) => setUserDeptFilter(e.target.value)}
                    style={{ flex: 1 }}
                    aria-label="Filter by department"
                  >
                    <option value="">All Departments</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <select
                    className="input"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    style={{ flex: 1 }}
                    aria-label="Filter by user role"
                  >
                    <option value="">All Roles</option>
                    <option value="student">Students</option>
                    <option value="faculty">Teachers</option>
                    <option value="ta">TAs</option>
                    {isSuperAdmin && <option value="admin">Admins</option>}
                  </select>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                className="btn btn-primary"
                onClick={() => performSearch()}
                style={{ flex: 1 }}
                disabled={isLoading}
              >
                {isLoading ? '⟳ Searching...' : '🔍 Search'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setUserSearch('');
                  setUserSearchType('all');
                  setUserDeptFilter('');
                  setRoleFilter('');
                  setHasSearched(false);
                }}
                style={{ flex: 1, fontWeight: '500', padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', transition: 'all 0.2s ease' }}
                disabled={isLoading}
              >
                <span style={{ fontSize: '1.1em', marginRight: '6px' }}>🗑️</span> Clear All
              </button>
              <button
                className="btn btn-success"
                onClick={exportToCSV}
                style={{ flex: 1 }}
                disabled={filteredUsers.length === 0}
              >
                <span style={{ fontSize: '1.1em' }}>⤓</span> Export CSV
              </button>
            </div>

            {/* Live Search Toggle */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9em' }}>
                <input
                  type="checkbox"
                  checked={liveSearchEnabled}
                  onChange={(e) => setLiveSearchEnabled(e.target.checked)}
                />
                ⟳ Enable live search (searches as you type)
              </label>
            </div>

            {/* Applied Filters Display */}
            {(userSearch || userSearchType !== 'all' || userDeptFilter || roleFilter || userDeptMultiFilter.length > 0 || userRoleFilter.length > 0) && (
              <div style={{
                backgroundColor: 'var(--surface-secondary)',
                padding: '8px 12px',
                borderRadius: '6px',
                marginBottom: '12px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '500' }}>
                  Applied Filters:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {userSearch && (
                    <span style={{
                      backgroundColor: 'var(--primary)',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.8em'
                    }}>
                      Search: "{userSearch}"
                    </span>
                  )}
                  {userSearchType !== 'all' && (
                    <span style={{
                      backgroundColor: 'var(--secondary)',
                      color: 'var(--text)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.8em'
                    }}>
                      In: {userSearchType}
                    </span>
                  )}
                  {userDeptFilter && (
                    <span style={{
                      backgroundColor: 'var(--accent)',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.8em'
                    }}>
                      Dept: {departments.find((d: any) => d.id.toString() === userDeptFilter)?.name || userDeptFilter}
                    </span>
                  )}
                  {roleFilter && (
                    <span style={{
                      backgroundColor: 'var(--success)',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.8em'
                    }}>
                      Role: {roleFilter === 'faculty' ? 'Teacher' : roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}
                    </span>
                  )}
                  {userDeptMultiFilter.length > 0 && (
                    <span style={{
                      backgroundColor: 'var(--warning)',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.8em'
                    }}>
                      Depts: {userDeptMultiFilter.length}
                    </span>
                  )}
                  {userRoleFilter.length > 0 && (
                    <span style={{
                      backgroundColor: 'var(--info)',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.8em'
                    }}>
                      Roles: {userRoleFilter.length}
                    </span>
                  )}
                </div>
              </div>
            )}

          </div>
          {isLoading && (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: 16 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}
          {loadError && (
            <div style={{ marginBottom: 8, padding: 12, backgroundColor: '#fee', color: '#c00', borderRadius: 6, border: '1px solid #fcc' }}>
              <span style={{ fontSize: '1.1em', marginRight: '6px' }}>⚠️</span> Error: {loadError}
            </div>
          )}
          {!isLoading && usersList.length > 0 && (
            <>
              {/* Results Summary */}
              <div style={{
                marginBottom: '12px',
                padding: '8px 12px',
                backgroundColor: 'var(--surface-secondary)',
                borderRadius: '6px',
                fontSize: '0.9em',
                color: 'var(--text-secondary)'
              }}>
                <span style={{ fontSize: '1.1em' }}>📈</span> Showing {paginatedUsers.length} of {filteredUsers.length} users
                {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
              </div>

              {/* No Results State */}
              {filteredUsers.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--surface-secondary)',
                  borderRadius: '8px',
                  border: '2px dashed var(--border)'
                }}>
                  <div style={{ fontSize: '3em', marginBottom: '16px' }}>🔎</div>
                  <h3 style={{ margin: '0 0 8px 0', color: 'var(--text)' }}>No users found</h3>
                  <p style={{ margin: '0 0 16px 0' }}>Try adjusting your search terms or filters</p>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setUserSearch('');
                      setUserSearchType('all');
                      setUserDeptFilter('');
                      setRoleFilter('');
                      setUserDeptMultiFilter([]);
                      setUserRoleFilter([]);
                      setHasSearched(false);
                      setCurrentPage(1);
                    }}
                    style={{ fontWeight: '500', padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', transition: 'all 0.2s ease' }}
                  >
                    <span style={{ fontSize: '1.1em', marginRight: '6px' }}>🗑️</span> Clear all filters
                  </button>
                </div>
              ) : (
                <>
                  {viewMode === 'cards' ? (
                    /* Results Grid */
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: 16 }}>
                      {paginatedUsers.map((u) => (
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
                              addToRecentlyViewed(u)
                              const ov = await getUserOverview(u.id)
                              setSelectedOverview(ov)
                            }}>View Details</button>
                            <button className="btn btn-secondary" onClick={() => {
                              setEditingUser(u)
                              setEditUserData({
                                name: u.name || '',
                                role: u.role,
                                department_id: u.department_id?.toString() || '',
                                roll_number: u.roll_number || '',
                                is_active: u.is_active || false
                              })
                              setShowEditUser(true)
                            }}>Edit</button>
                            <button className="btn btn-danger" onClick={() => {
                              setUserToDelete(u)
                              setShowDeleteConfirm(true)
                            }}>Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Table View */
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        backgroundColor: 'var(--surface)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--surface-secondary)' }}>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: '600' }}>Name</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: '600' }}>Email</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: '600' }}>Role</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: '600' }}>Department</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: '600' }}>Status</th>
                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid var(--border)', fontWeight: '600' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedUsers.map((u) => (
                            <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '12px' }}>
                                <strong>{u.name || u.email}</strong>
                              </td>
                              <td style={{ padding: '12px' }}>{u.email}</td>
                              <td style={{ padding: '12px' }}>
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '12px',
                                  fontSize: '0.8em',
                                  backgroundColor: u.role === 'admin' ? '#e3f2fd' : u.role === 'faculty' ? '#f3e5f5' : u.role === 'ta' ? '#fff3e0' : '#e8f5e8',
                                  color: u.role === 'admin' ? '#1565c0' : u.role === 'faculty' ? '#7b1fa2' : u.role === 'ta' ? '#f57c00' : '#2e7d32'
                                }}>
                                  {u.role === 'faculty' ? 'Teacher' : u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                                </span>
                              </td>
                              <td style={{ padding: '12px' }}>
                                {departments.find(d => d.id.toString() === u.department_id?.toString())?.name || 'N/A'}
                              </td>
                              <td style={{ padding: '12px' }}>
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '12px',
                                  fontSize: '0.8em',
                                  backgroundColor: u.is_active ? '#e8f5e8' : '#ffebee',
                                  color: u.is_active ? '#2e7d32' : '#c62828'
                                }}>
                                  {u.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                  <button
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.8em', padding: '4px 8px' }}
                                    onClick={async () => {
                                      setSelectedUser(u)
                                      setSelectedOverview(null)
                                      setShowUserDetailsModal(true)
                                      addToRecentlyViewed(u)
                                      const ov = await getUserOverview(u.id)
                                      setSelectedOverview(ov)
                                    }}
                                  >
                                    View
                                  </button>
                                  <button
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.8em', padding: '4px 8px' }}
                                    onClick={() => {
                                      setEditingUser(u)
                                      setEditUserData({
                                        name: u.name || '',
                                        role: u.role,
                                        department_id: u.department_id?.toString() || '',
                                        roll_number: u.roll_number || '',
                                        is_active: u.is_active || false
                                      })
                                      setShowEditUser(true)
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="btn btn-danger"
                                    style={{ fontSize: '0.8em', padding: '4px 8px' }}
                                    onClick={() => {
                                      setUserToDelete(u)
                                      setShowDeleteConfirm(true)
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

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '20px',
                      padding: '12px',
                      backgroundColor: 'var(--surface-secondary)',
                      borderRadius: '8px'
                    }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        style={{ padding: '6px 12px' }}
                      >
                        ‹ Previous
                      </button>

                      <span style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                        Page {currentPage} of {totalPages}
                      </span>

                      <button
                        className="btn btn-secondary"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        style={{ padding: '6px 12px' }}
                      >
                        Next ›
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {!isLoading && usersList.length === 0 && !loadError && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--surface-secondary)',
              borderRadius: '8px',
              border: '2px dashed var(--border)'
            }}>
              <div style={{ fontSize: '3em', marginBottom: '16px' }}>👥</div>
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--text)' }}>No users yet</h3>
              <p style={{ margin: '0 0 16px 0' }}>Users will appear here once they register</p>
            </div>
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
                        onClick={() => {
                          setCourseToDelete(course)
                          setShowDeleteCourseConfirm(true)
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


      {tab === 'departments' && (
        <section className="card">
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Departments</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '6px' }}>
                <button
                  className={`btn ${deptViewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setDeptViewMode('cards')}
                  style={{ borderRadius: '6px 0 0 6px', borderRight: 'none' }}
                >
                  <span style={{ fontSize: '1.1em' }}>☰</span> Cards
                </button>
                <button
                  className={`btn ${deptViewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setDeptViewMode('table')}
                  style={{ borderRadius: '0 6px 6px 0' }}
                >
                  <span style={{ fontSize: '1.1em' }}>⊞</span> Table
                </button>
              </div>
              <button className="btn btn-primary" onClick={() => setShowCreateDept(true)}>Create Department</button>
            </div>
          </div>
          <div className="filters" style={{ marginBottom: '16px' }}>
            {/* Prominent Search Bar */}
            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type="text"
                  placeholder="🔍 Search departments..."
                  value={deptSearch}
                  onChange={(e) => {
                    setDeptSearch(e.target.value)
                    setShowDeptSearchSuggestions(e.target.value.length > 0)
                  }}
                  onFocus={() => setShowDeptSearchSuggestions(deptSearch.length > 0)}
                  onBlur={() => setTimeout(() => setShowDeptSearchSuggestions(false), 300)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    border: '2px solid var(--border)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)'
                  }}
                  aria-label="Search departments by code or name"
                />
                {deptSearch && (
                  <button
                    onClick={() => setDeptSearch('')}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '18px',
                      padding: '4px'
                    }}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}

                {/* Search Suggestions Dropdown */}
                {showDeptSearchSuggestions && deptSearchParameterHistory.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {deptSearchParameterHistory
                      .filter(item => item.keyword.toLowerCase().includes(deptSearch.toLowerCase()))
                      .slice(0, 5)
                      .map((item, index) => (
                        <button
                          key={index}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setDeptSearch(item.keyword)
                            setDeptSearchType(item.searchType)
                            setShowDeptSearchSuggestions(false)
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: 'none',
                            background: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderBottom: index < 4 ? '1px solid var(--border)' : 'none',
                            color: 'var(--text)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-secondary)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                            "{item.keyword}"
                          </div>
                          <div style={{
                            fontSize: '0.8em',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            gap: '4px',
                            flexWrap: 'wrap'
                          }}>
                            {item.searchType !== 'all' && <span>In: {item.searchType}</span>}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Search Scope */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.9em', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '4px', display: 'block' }}>Search in:</label>
              <select
                className="input"
                value={deptSearchType}
                onChange={(e) => setDeptSearchType(e.target.value as 'all' | 'code' | 'name')}
                style={{ width: '100%' }}
                aria-label="Select which fields to search in"
              >
                <option value="all">All Fields</option>
                <option value="code">Code</option>
                <option value="name">Name</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!deptSearch.trim()) return
                  const searchParams = {
                    keyword: deptSearch.trim(),
                    searchType: deptSearchType,
                    timestamp: Date.now()
                  }
                  const newHistory = [searchParams, ...deptSearchParameterHistory.filter(h =>
                    !(h.keyword === searchParams.keyword && h.searchType === searchParams.searchType)
                  )].slice(0, 10)
                  setDeptSearchParameterHistory(newHistory)
                  localStorage.setItem('adminDeptSearchParameterHistory', JSON.stringify(newHistory))
                }}
                style={{ flex: 1 }}
              >
                🔍 Search
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setDeptSearch('');
                  setDeptSearchType('all');
                  setDeptCurrentPage(1);
                }}
                style={{ flex: 1, fontWeight: '500', padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', transition: 'all 0.2s ease' }}
              >
                <span style={{ fontSize: '1.1em', marginRight: '6px' }}>🗑️</span> Clear All
              </button>
              <button
                className="btn btn-success"
                onClick={exportDepartmentsToCSV}
                style={{ flex: 1 }}
                disabled={filteredDepartments.length === 0}
              >
                <span style={{ fontSize: '1.1em' }}>⤓</span> Export CSV
              </button>
            </div>

            {/* Live Search Toggle */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9em' }}>
                <input
                  type="checkbox"
                  checked={deptLiveSearchEnabled}
                  onChange={(e) => setDeptLiveSearchEnabled(e.target.checked)}
                />
                ⟳ Enable live search (searches as you type)
              </label>
            </div>

            {/* Applied Filters Display */}
            {(deptSearch || deptSearchType !== 'all') && (
              <div style={{
                backgroundColor: 'var(--surface-secondary)',
                padding: '8px 12px',
                borderRadius: '6px',
                marginBottom: '12px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '500' }}>
                  Applied Filters:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {deptSearch && (
                    <span style={{
                      backgroundColor: 'var(--primary)',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.8em'
                    }}>
                      Search: "{deptSearch}"
                    </span>
                  )}
                  {deptSearchType !== 'all' && (
                    <span style={{
                      backgroundColor: 'var(--secondary)',
                      color: 'var(--text)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.8em'
                    }}>
                      In: {deptSearchType}
                    </span>
                  )}
                </div>
              </div>
            )}

          </div>
          {isLoading && (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}
          {loadError && (
            <div style={{ marginBottom: 8, padding: 12, backgroundColor: '#fee', color: '#c00', borderRadius: 6, border: '1px solid #fcc' }}>
              ⚠️ Error: {loadError}
            </div>
          )}
          {!isLoading && departments.length > 0 && (
            <>
              {/* Results Summary */}
              <div style={{
                marginBottom: '12px',
                padding: '8px 12px',
                backgroundColor: 'var(--surface-secondary)',
                borderRadius: '6px',
                fontSize: '0.9em',
                color: 'var(--text-secondary)'
              }}>
                <span style={{ fontSize: '1.1em' }}>📈</span> Showing {paginatedDepartments.length} of {filteredDepartments.length} departments
                {deptTotalPages > 1 && ` (Page ${deptCurrentPage} of ${deptTotalPages})`}
              </div>

              {/* No Results State */}
              {filteredDepartments.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--surface-secondary)',
                  borderRadius: '8px',
                  border: '2px dashed var(--border)'
                }}>
                  <div style={{ fontSize: '3em', marginBottom: '16px' }}>🔎</div>
                  <h3 style={{ margin: '0 0 8px 0', color: 'var(--text)' }}>No departments found</h3>
                  <p style={{ margin: '0 0 16px 0' }}>Try adjusting your search terms</p>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setDeptSearch('');
                      setDeptSearchType('all');
                      setDeptCurrentPage(1);
                    }}
                  >
                    🗑️ Clear all filters
                  </button>
                </div>
              ) : (
                <>
                  {deptViewMode === 'cards' ? (
                    /* Cards View */
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                      {paginatedDepartments.map((dept: any) => (
                        <div key={dept.id} className="card" style={{ padding: '16px' }}>
                          <div style={{ marginBottom: 12 }}>
                            <strong style={{ fontSize: '1.1em' }}>{dept.code}</strong>
                            <div className="muted" style={{ marginTop: '4px' }}>{dept.name}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                              className="btn btn-secondary"
                              onClick={async () => {
                                setSelectedDeptDetails(dept)
                                setShowDeptDetailsModal(true)
                                try {
                                  const r = await getCoursesByDepartment(dept.id)
                                  setDeptDetailsCourses(r.courses)
                                } catch (err) {
                                  console.error('Error loading courses:', err)
                                }
                              }}
                            >
                              View Details
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={async () => {
                                const newCode = prompt('Enter new code:', dept.code)
                                const newName = prompt('Enter new name:', dept.name)
                                if (newCode !== null && newName !== null && (newCode !== dept.code || newName !== dept.name)) {
                                  try {
                                    await updateDepartment(dept.id, { code: newCode, name: newName })
                                    push({ kind: 'success', message: 'Department updated successfully' })
                                    loadDepartments()
                                  } catch (e: any) {
                                    push({ kind: 'error', message: e?.message || 'Failed to update department' })
                                  }
                                }
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={() => {
                                setDeptToDelete(dept)
                                setShowDeleteDeptConfirm(true)
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Table View */
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        backgroundColor: 'var(--surface)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--surface-secondary)' }}>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: '600' }}>Code</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: '600' }}>Name</th>
                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid var(--border)', fontWeight: '600' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedDepartments.map((dept: any) => (
                            <tr key={dept.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '12px' }}>
                                <strong>{dept.code}</strong>
                              </td>
                              <td style={{ padding: '12px' }}>{dept.name}</td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                  <button
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.8em', padding: '4px 8px' }}
                                    onClick={async () => {
                                      setSelectedDeptDetails(dept)
                                      setShowDeptDetailsModal(true)
                                      try {
                                        const r = await getCoursesByDepartment(dept.id)
                                        setDeptDetailsCourses(r.courses)
                                      } catch (err) {
                                        console.error('Error loading courses:', err)
                                      }
                                    }}
                                  >
                                    View
                                  </button>
                                  <button
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.8em', padding: '4px 8px' }}
                                    onClick={() => {
                                      const newCode = prompt('Enter new code:', dept.code)
                                      const newName = prompt('Enter new name:', dept.name)
                                      if (newCode !== null || newName !== null) {
                                        // Update department logic would go here
                                        console.log('Update department:', dept.id, newCode, newName)
                                      }
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="btn btn-danger"
                                    style={{ fontSize: '0.8em', padding: '4px 8px' }}
                                    onClick={() => {
                                      setDeptToDelete(dept)
                                      setShowDeleteDeptConfirm(true)
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

                  {/* Pagination Controls */}
                  {deptTotalPages > 1 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '20px',
                      padding: '12px',
                      backgroundColor: 'var(--surface-secondary)',
                      borderRadius: '8px'
                    }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setDeptCurrentPage(Math.max(1, deptCurrentPage - 1))}
                        disabled={deptCurrentPage === 1}
                        style={{ padding: '6px 12px' }}
                      >
                        ‹ Previous
                      </button>

                      <span style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                        Page {deptCurrentPage} of {deptTotalPages}
                      </span>

                      <button
                        className="btn btn-secondary"
                        onClick={() => setDeptCurrentPage(Math.min(deptTotalPages, deptCurrentPage + 1))}
                        disabled={deptCurrentPage === deptTotalPages}
                        style={{ padding: '6px 12px' }}
                      >
                        Next ›
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {!isLoading && departments.length === 0 && !loadError && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--surface-secondary)',
              borderRadius: '8px',
              border: '2px dashed var(--border)'
            }}>
              <div style={{ fontSize: '3em', marginBottom: '16px' }}>🏢</div>
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--text)' }}>No departments yet</h3>
              <p style={{ margin: '0 0 16px 0' }}>Departments will appear here once they are created</p>
            </div>
          )}
        </section>
      )}

      {tab === 'support' && (
        <section className="card">
          <div className="section-header">
            <h3>Support Tickets</h3>
          </div>
          <SupportTicketList showAllTickets={true} />
        </section>
      )}

      {tab === 'reports' && <Reports />}

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
              <h3>Inactive Users</h3>
              <p className="stat-number">
                {loadingOverview ? 'Loading...' : (overviewStats?.inactiveUsers || 0)}
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
          <div className="overview-content">
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => setTab('users')}>Manage Users</button>
                <button className="btn btn-primary" onClick={() => setTab('courses')}>Create Course</button>
                <button className="btn btn-primary" onClick={() => setTab('departments')}>Add Department</button>
                <button className="btn btn-primary" onClick={() => setTab('reports')}>View Reports</button>
              </div>
            </div>
            <RecentActivities
              refreshTrigger={Date.now()}
              onNavigate={(tab: string, filter?: string) => {
                setTab(tab as any)
                if (filter && tab === 'users') {
                  setUserDeptFilter(filter)
                }
              }}
            />
          </div>
        </section>
      )}


      {showCreateCourse && selectedDept && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
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
                    if (showManageOfferings && selectedCourse) {
                      loadAdminCourses() // Refresh the course offerings
                    }
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border)', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="h4" style={{ marginTop: 0, marginBottom: 20, color: 'var(--text)' }}>Create New Enrollment</h3>
            <div className="form" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <select className="input" value={newEnrollment.course_offering_id} onChange={(e) => setNewEnrollment({ ...newEnrollment, course_offering_id: e.target.value })}>
                <option value="">Select Course Offering</option>
                {(enrollmentFromManage && selectedCourse ? selectedCourse.offerings : offerings).map((o: any) => (
                  <option key={o.offering_id || o.id} value={o.offering_id || o.id}>
                    {o.course_code || selectedCourse?.code} {o.term}{o.section ? '-' + o.section : ''} - {o.faculty_name || 'N/A'}
                  </option>
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
              <button className="btn btn-secondary" onClick={() => {
                setShowCreateEnrollment(false)
                setEnrollmentFromManage(false)
                setNewEnrollment({ course_offering_id: '', student_id: '' })
              }} disabled={creatingEnrollment}>Cancel</button>
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
                    setEnrollmentFromManage(false)
                    setNewEnrollment({ course_offering_id: '', student_id: '' })
                    push({ kind: 'success', message: 'Enrollment created successfully' })
                    loadEnrollments()
                    if (enrollmentFromManage && selectedCourse) {
                      loadCourseEnrollments(selectedCourse.id)
                    }
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
              <div>
                {selectedUser.department_id && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setTab('departments')
                      setShowUserDetailsModal(false)
                    }}
                    style={{
                      fontWeight: '600',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'var(--primary)',
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      fontSize: '14px',
                      letterSpacing: '0.5px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--primary-hover, #0056b3)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--primary)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span style={{ fontSize: '1.1em', marginRight: '8px' }}>🏢</span>
                    Go to Department
                  </button>
                )}
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setShowUserDetailsModal(false)}
                style={{
                  fontWeight: '500',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface-secondary)';
                  e.currentTarget.style.borderColor = 'var(--border-hover, #999)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showManageOfferings && selectedCourse && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: 800, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border)', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="h4" style={{ marginTop: 0, marginBottom: 20, color: 'var(--text)' }}>Manage Offerings for {selectedCourse.code} - {selectedCourse.title}</h3>
            <div style={{ marginBottom: 16 }}>
              <button className="btn btn-primary" onClick={() => {
                setNewOffering(prev => ({ ...prev, course_id: selectedCourse.id.toString() }))
                setShowCreateOffering(true)
              }}>Create New Offering</button>
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
                      <button
                        className="btn btn-secondary"
                        onClick={async () => {
                          const newTerm = prompt('Enter new term:', offering.term)
                          const newSection = prompt('Enter new section:', offering.section || '')
                          const newFacultyId = prompt('Enter new faculty ID:', offering.faculty_id?.toString() || '')
                          const newCapacity = prompt('Enter new max capacity:', offering.max_capacity?.toString() || '')
                          if (newTerm !== null || newSection !== null || newFacultyId !== null || newCapacity !== null) {
                            try {
                              await updateOffering(offering.offering_id, {
                                term: newTerm || undefined,
                                section: newSection || undefined,
                                faculty_id: newFacultyId ? Number(newFacultyId) : undefined,
                                max_capacity: newCapacity ? Number(newCapacity) : undefined,
                              })
                              push({ kind: 'success', message: 'Offering updated successfully' })
                              loadAdminCourses()
                            } catch (e: any) {
                              push({ kind: 'error', message: e?.message || 'Failed to update offering' })
                            }
                          }
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={async () => {
                          console.log('Delete button clicked for offering:', offering)
                          console.log('Students:', offering.students)
                          const hasEnrollments = offering.students && offering.students.length > 0
                          setOfferingToDelete(offering)
                          setOfferingToDeleteMessage(hasEnrollments
                            ? `Delete offering "${selectedCourse.code} ${offering.term}${offering.section ? '-' + offering.section : ''}"? This will permanently delete all enrollments, assignments, quizzes, and related data. This action cannot be undone.`
                            : `Delete offering "${selectedCourse.code} ${offering.term}${offering.section ? '-' + offering.section : ''}"? This action cannot be undone.`)
                          setShowDeleteOfferingConfirm(true)
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: 800, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border)', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="h4" style={{ marginTop: 0, marginBottom: 20, color: 'var(--text)' }}>Manage Enrollments for {selectedCourse.code} - {selectedCourse.title}</h3>
            <div style={{ marginBottom: 16 }}>
              <button className="btn btn-primary" onClick={() => {
                setEnrollmentFromManage(true)
                // Pre-fill with first offering for this course
                const courseOfferings = selectedCourse.offerings || []
                if (courseOfferings.length > 0) {
                  setNewEnrollment(prev => ({ ...prev, course_offering_id: courseOfferings[0].offering_id.toString() }))
                }
                setShowCreateEnrollment(true)
              }}>Add Enrollment</button>
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
                          onClick={() => {
                            setEnrollmentToDelete(enrollment)
                            setShowDeleteEnrollmentConfirm(true)
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

      {showEditUser && editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border)', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="h4" style={{ marginTop: 0, marginBottom: 20, color: 'var(--text)' }}>Edit User — {editingUser.name || editingUser.email}</h3>
            <div className="form" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input className="input" value={editUserData.name} onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })} placeholder="Full Name" />
              <select className="input" value={editUserData.role} onChange={(e) => setEditUserData({ ...editUserData, role: e.target.value as 'student'|'faculty'|'ta'|'admin' })}>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="ta">Teaching Assistant</option>
                <option value="admin">Admin</option>
              </select>
              <select className="input" value={editUserData.department_id} onChange={(e) => setEditUserData({ ...editUserData, department_id: e.target.value })}>
                <option value="">Select Department (Optional)</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <input className="input" value={editUserData.roll_number} onChange={(e) => setEditUserData({ ...editUserData, roll_number: e.target.value })} placeholder="Roll Number (Optional)" />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={editUserData.is_active}
                  onChange={(e) => setEditUserData({ ...editUserData, is_active: e.target.checked })}
                />
                Is Active (Approve/Reject Account)
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowEditUser(false)} disabled={updatingUser}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    setUpdatingUser(true)
                    await updateUser(editingUser.id, {
                      name: editUserData.name || undefined,
                      role: editUserData.role,
                      department_id: editUserData.department_id ? Number(editUserData.department_id) : null,
                      roll_number: editUserData.roll_number || undefined,
                      is_active: editUserData.is_active
                    })
                    setShowEditUser(false)
                    push({ kind: 'success', message: 'User updated successfully' })
                    loadUsers()
                  } catch (e: any) {
                    push({ kind: 'error', message: e?.message || 'Failed to update user' })
                  } finally {
                    setUpdatingUser(false)
                  }
                }}
                disabled={updatingUser}
              >
                {updatingUser ? 'Updating…' : 'Update User'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setUserToDelete(null)
        }}
        onConfirm={async () => {
          if (!userToDelete) return

          try {
            setDeletingUser(true)
            await deleteUser(userToDelete.id)
            push({ kind: 'success', message: 'User deleted successfully' })
            loadUsers()
            setShowDeleteConfirm(false)
            setUserToDelete(null)
          } catch (e: any) {
            push({ kind: 'error', message: e?.message || 'Failed to delete user' })
          } finally {
            setDeletingUser(false)
          }
        }}
        title="Delete User"
        message={`Are you sure you want to delete "${userToDelete?.name || userToDelete?.email}"? This action cannot be undone and will permanently remove the user and all associated data.`}
        confirmText="Delete User"
        confirmVariant="danger"
        requireTyping={true}
        typeText={userToDelete?.name || userToDelete?.email || ''}
        loading={deletingUser}
      />

      <ConfirmationModal
        isOpen={showDeleteCourseConfirm}
        onClose={() => {
          setShowDeleteCourseConfirm(false)
          setCourseToDelete(null)
        }}
        onConfirm={async () => {
          if (!courseToDelete) return

          try {
            setDeletingCourse(true)
            await deleteCourse(courseToDelete.id)
            push({ kind: 'success', message: 'Course deleted successfully' })
            loadAdminCourses()
            setShowDeleteCourseConfirm(false)
            setCourseToDelete(null)
          } catch (e: any) {
            push({ kind: 'error', message: e?.message || 'Failed to delete course' })
          } finally {
            setDeletingCourse(false)
          }
        }}
        title="Delete Course"
        message={`Are you sure you want to delete "${courseToDelete?.code} - ${courseToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Course"
        confirmVariant="danger"
        requireTyping={true}
        typeText={courseToDelete?.code || courseToDelete?.title || ''}
        loading={deletingCourse}
      />

      <ConfirmationModal
        isOpen={showDeleteDeptConfirm}
        onClose={() => {
          setShowDeleteDeptConfirm(false)
          setDeptToDelete(null)
        }}
        onConfirm={async () => {
          if (!deptToDelete) return

          try {
            setDeletingDept(true)
            await deleteDepartment(deptToDelete.id)
            push({ kind: 'success', message: 'Department deleted successfully' })
            loadDepartments()
            setShowDeleteDeptConfirm(false)
            setDeptToDelete(null)
          } catch (e: any) {
            push({ kind: 'error', message: e?.message || 'Failed to delete department' })
          } finally {
            setDeletingDept(false)
          }
        }}
        title="Delete Department"
        message={`Are you sure you want to delete "${deptToDelete?.code} - ${deptToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Department"
        confirmVariant="danger"
        requireTyping={true}
        typeText={deptToDelete?.code || deptToDelete?.name || ''}
        loading={deletingDept}
      />

      <ConfirmationModal
        isOpen={showDeleteOfferingConfirm}
        onClose={() => {
          setShowDeleteOfferingConfirm(false)
          setOfferingToDelete(null)
          setOfferingToDeleteMessage('')
        }}
        onConfirm={async () => {
          if (!offeringToDelete) return

          try {
            setDeletingOffering(true)
            await deleteOffering(offeringToDelete.offering_id)
            push({ kind: 'success', message: 'Offering deleted successfully' })
            loadAdminCourses()
            setShowManageOfferings(false)
            setShowDeleteOfferingConfirm(false)
            setOfferingToDelete(null)
            setOfferingToDeleteMessage('')
          } catch (e: any) {
            push({ kind: 'error', message: e?.message || 'Failed to delete offering' })
          } finally {
            setDeletingOffering(false)
          }
        }}
        title="Delete Offering"
        message={offeringToDeleteMessage}
        confirmText="Delete Offering"
        confirmVariant="danger"
        requireTyping={true}
        typeText={offeringToDelete?.course_code || offeringToDelete?.term || ''}
        loading={deletingOffering}
      />

      <ConfirmationModal
        isOpen={showDeleteEnrollmentConfirm}
        onClose={() => {
          setShowDeleteEnrollmentConfirm(false)
          setEnrollmentToDelete(null)
        }}
        onConfirm={async () => {
          if (!enrollmentToDelete) return

          try {
            setDeletingEnrollment(true)
            await deleteEnrollment(enrollmentToDelete.id)
            push({ kind: 'success', message: 'Enrollment removed successfully' })
            loadCourseEnrollments(selectedCourse.id)
            setShowDeleteEnrollmentConfirm(false)
            setEnrollmentToDelete(null)
          } catch (e: any) {
            push({ kind: 'error', message: e?.message || 'Failed to remove enrollment' })
          } finally {
            setDeletingEnrollment(false)
          }
        }}
        title="Remove Enrollment"
        message={`Are you sure you want to remove enrollment for ${enrollmentToDelete?.student_name || enrollmentToDelete?.student_email} from ${selectedCourse?.code}?`}
        confirmText="Remove Enrollment"
        confirmVariant="danger"
        requireTyping={true}
        typeText={enrollmentToDelete?.student_name || enrollmentToDelete?.student_email || ''}
        loading={deletingEnrollment}
      />

      {/* Error handling for invalid tab states */}
      {!tabConfigs.some(config => config.key === tab) && (
        <section className="card">
          <div className="section-header">
            <h3>Error</h3>
          </div>
          <p className="muted">Invalid tab selected. Please refresh the page.</p>
        </section>
      )}

      {showDeptDetailsModal && selectedDeptDetails && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: 600, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border)', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="h4" style={{ marginTop: 0, marginBottom: 20, color: 'var(--text)' }}>Department Details: {selectedDeptDetails.code} - {selectedDeptDetails.name}</h3>
            <div>
              <h4>Courses in this Department</h4>
              {deptDetailsCourses.length > 0 ? (
                <ul className="list">
                  {deptDetailsCourses.map((course: any) => (
                    <li key={course.id}>{course.code} - {course.title}</li>
                  ))}
                </ul>
              ) : (
                <p>No courses yet.</p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
              <div>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setTab('users')
                    setUserDeptFilter(selectedDeptDetails.id.toString())
                    setShowDeptDetailsModal(false)
                  }}
                  style={{
                    fontWeight: '600',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    fontSize: '14px',
                    letterSpacing: '0.5px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--primary-hover, #0056b3)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--primary)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span style={{ fontSize: '1.1em', marginRight: '8px' }}>👥</span>
                  View Users in Department
                </button>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeptDetailsModal(false)}
                style={{
                  fontWeight: '500',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface-secondary)';
                  e.currentTarget.style.borderColor = 'var(--border-hover, #999)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
           
