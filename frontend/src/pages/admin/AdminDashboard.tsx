import { useEffect, useState } from 'react'
import { courses } from '../../data/mock'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import CourseCard from '../../components/CourseCard'
import './AdminDashboard.css'
import { listUsers, getUserOverview, getCoursesByDepartment, getCourseDetails, getAssignmentsByOffering, getAssignmentsByFaculty, getSubmissionsByAssignment, assignFacultyToCourse } from '../../services/admin'
import { createCourse, createOffering } from '../../services/courses'
import { useToast } from '../../components/ToastProvider'

export default function AdminDashboard() {
  const { user, logout} = useAuth()
  const navigate = useNavigate()
  const { push } = useToast()

  const isAdmin = user?.role === 'admin'
  const [tab, setTab] = useState<'explorer' | 'users' | 'courses'>('explorer')

  // Users state
  const [roleFilter, setRoleFilter] = useState<'student' | 'faculty' | 'ta' | 'admin' | ''>('student')
  const [usersList, setUsersList] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [selectedOverview, setSelectedOverview] = useState<any>(null)
  const [loadError, setLoadError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      setLoadError('')
      const r = await listUsers(roleFilter || undefined)
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
  }, [isAdmin, roleFilter])

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
  const [offerTerm, setOfferTerm] = useState('W25')
  const [offerSection, setOfferSection] = useState('A')
  const [offerFacultyId, setOfferFacultyId] = useState<number | ''>('')
  const [offerCapacity, setOfferCapacity] = useState<number | ''>('')
  const [offerStart, setOfferStart] = useState('')
  const [offerEnd, setOfferEnd] = useState('')
  const [savingOffering, setSavingOffering] = useState(false)

  const loadDepartments = async () => {
    try {
      const { listDepartments } = await import('../../services/admin')
      const r = await listDepartments()
      setDepartments(r.departments)
    } catch (err) {
      console.error('Error loading departments:', err)
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
    if (isAdmin && tab === 'explorer') {
      void loadDepartments()
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
          <div className="dashboard-actions">
            <button className="btn btn-primary" onClick={() => navigate('/')}>Home</button>
            <button className="btn btn-primary" onClick={logout}>Logout</button>
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
    <div className="container container-wide dashboard-page student-theme">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1 className="dashboard-title h2 text-primary">Welcome, Admin!</h1>
          <p className="dashboard-subtitle text-lg text-secondary leading-relaxed">Manage users, courses, and explore data</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-primary" onClick={() => navigate('/')}>Home</button>
          <button className="btn btn-primary" onClick={logout}>Logout</button>
        </div>
      </div>

      {false && tab === 'users' && (
        <section className="card">
          <h3>Users</h3>
          <div className="grid" style={{ gridTemplateColumns: '260px 1fr', gap: 16 }}>
            <div>
              <div className="form" style={{ marginBottom: 12 }}>
                <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 8 }}>
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
              {!isLoading && !loadError && (
                <div style={{ marginBottom: 8, fontSize: '0.9em', color: '#666' }}>
                  Showing {usersList.length} {roleFilter}(s)
                </div>
              )}
              <ul className="list" style={{ maxHeight: 500, overflowY: 'auto' }}>
                {usersList.map((u) => (
                  <li key={u.id}>
                    <button className="btn" onClick={async () => {
                      setSelectedUser(u)
                      setSelectedOverview(null)
                      const ov = await getUserOverview(u.id)
                      setSelectedOverview(ov)
                    }} style={{ width: '100%', textAlign: 'left' }}>
                      <strong>{u.name || u.email}</strong>
                      <span className="muted"> — {u.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              {!selectedUser ? (
                <p className="muted">Select a user to view details</p>
              ) : !selectedOverview ? (
                <p className="muted">Loading…</p>
              ) : (
                <div className="card">
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
            </div>
          </div>
        </section>
      )}

      {false && tab === 'courses' && (
        <section className="card">
          <h3>Courses (read-only)</h3>
          <div className="grid grid-cards">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} onClick={() => navigate(`/courses/${c.id}`)} />
            ))}
          </div>
        </section>
      )}

      {tab === 'explorer' && (
        <section className="courses-section">
          {/* Breadcrumb Navigation */}
          <div className="breadcrumb-navigation">
            <div className="breadcrumb-label">
              Navigation Path
            </div>
            <div className="breadcrumb-path">
              {!selectedDept && <span className="breadcrumb-next">Select a department to begin</span>}
              {selectedDept && (
                <>
                  <span 
                    className="breadcrumb-item" 
                    onClick={() => {
                      setSelectedCourse(null)
                      setCourseDetails(null)
                      setSelectedOffering(null)
                      setSelectedAssignment(null)
                      setSelectedFaculty(null)
                      setOfferingAssignments([])
                      setFacultyAssignments([])
                      setAssignmentSubmissions([])
                    }}
                  >
                    {selectedDept.name}
                  </span>
                  {!selectedCourse && <span className="breadcrumb-next">/ Select a course</span>}
                </>
              )}
              {selectedCourse && (
                <>
                  <span className="breadcrumb-separator">/</span>
                  <span 
                    className="breadcrumb-item"
                    onClick={() => {
                      setSelectedOffering(null)
                      setSelectedAssignment(null)
                      setSelectedFaculty(null)
                      setOfferingAssignments([])
                      setFacultyAssignments([])
                      setAssignmentSubmissions([])
                    }}
                  >
                    {selectedCourse.code}
                  </span>
                  {!selectedOffering && !selectedFaculty && <span className="breadcrumb-next">/ Select offering or professor</span>}
                </>
              )}
              {selectedOffering && (
                <>
                  <span className="breadcrumb-separator">/</span>
                  <span 
                    className="breadcrumb-item"
                    onClick={() => {
                      setSelectedAssignment(null)
                      setAssignmentSubmissions([])
                    }}
                  >
                    {selectedOffering.term}-{selectedOffering.section}
                  </span>
                  {!selectedAssignment && <span className="breadcrumb-next">/ Select assignment</span>}
                </>
              )}
              {selectedFaculty && (
                <>
                  <span className="breadcrumb-separator">/</span>
                  <span 
                    className="breadcrumb-item"
                    onClick={() => {
                      setSelectedAssignment(null)
                      setAssignmentSubmissions([])
                    }}
                  >
                    {selectedFaculty.faculty_name}
                  </span>
                  {!selectedAssignment && <span className="breadcrumb-next">/ Select assignment</span>}
                </>
              )}
              {selectedAssignment && (
                <>
                  <span className="breadcrumb-separator">/</span>
                  <span className="breadcrumb-current">{selectedAssignment.title}</span>
                </>
              )}
            </div>
          </div>

          <div className="explorer-layout">
            {/* Sidebar */}
            <div className="departments-sidebar">
              <h3 className="sidebar-title">
                🏛️ Departments
              </h3>
              <div className="departments-list">
                {departments.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => selectDepartment(d)}
                    className={`department-item ${selectedDept?.id === d.id ? 'active' : ''}`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>
            {/* Main Content */}
            <div className="explorer-content">
              {!selectedDept && (
                <div className="empty-explorer-state">
                  <div className="empty-state-icon">🏛️</div>
                  <h3 className="empty-state-title">Welcome to Admin Data Explorer</h3>
                  <p className="empty-state-description">Select a department from the sidebar to get started</p>
                </div>
              )}
              {selectedDept && !selectedCourse && (
                <div className="department-view">
                  <div className="department-header">
                    <h3 className="department-title">
                      📚 Courses in {selectedDept.name}
                    </h3>
                    <button 
                      className="btn btn-primary create-course-btn"
                      onClick={() => setShowCreateCourse(true)}
                    >
                      Create New Course
                    </button>
                  </div>
                  <div className="courses-grid">
                    {deptCourses.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => selectCourse(c)}
                        className="course-card hover-effect"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#667eea' }}>{c.code}</div>
                          <div style={{ position: 'relative' }}>
                            <button
                              aria-label="Course actions"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOfferForCourse(c)
                                setShowOfferCourse(true)
                              }}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
                            >
                              ⋮
                            </button>
                          </div>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>{c.title}</div>
                          {c.credits && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>{c.credits} credits</div>}
                        </div>
                        <div className="course-code">{c.code}</div>
                        <div className="course-title">{c.title}</div>
                        {c.credits && <div className="course-credits">{c.credits} credits</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedCourse && !selectedOffering && !selectedFaculty && courseDetails && (
                <div>
                  <div className="course-header">
                    <h3 className="content-title">{selectedCourse.code} — {selectedCourse.title}</h3>
                    <p className="course-description">{selectedCourse.description}</p>
                  </div>
                  <h4 className="section-subtitle">🎓 Course Offerings</h4>
                  {courseDetails.offerings.length === 0 ? (
                    <p className="empty-message">No offerings available</p>
                  ) : (
                    <div className="offerings-list">
                      {courseDetails.offerings.map((o: any) => (
                        <div key={o.offering_id} className="offering-card">
                          <div className="offering-actions">
                            <button
                              onClick={() => selectOffering(o)}
                              className="btn btn-primary"
                            >
                              📝 {o.term} - Section {o.section}
                            </button>
                            {o.faculty_name && (
                              <button
                                onClick={() => selectFaculty(o)}
                                className="btn btn-secondary"
                              >
                                👨‍🏫 {o.faculty_name}
                              </button>
                            )}
                          </div>
                          <div className="students-section">
                            <div className="students-header">
                              🎓 Enrolled Students ({o.students.length})
                            </div>
                            {o.students.length === 0 ? (
                              <span className="empty-text">No students enrolled</span>
                            ) : (
                              <div className="students-tags">
                                {o.students.slice(0, 5).map((s: any) => (
                                  <span key={s.id} className="student-tag">
                                    {s.name}
                                  </span>
                                ))}
                                {o.students.length > 5 && (
                                  <span className="more-students">+{o.students.length - 5} more</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {selectedFaculty && !selectedAssignment && (
                <div>
                  <h4 className="content-title">All Assignments by {selectedFaculty.faculty_name}</h4>
                  <p className="content-subtitle">Course: {selectedCourse.code}</p>
                  {facultyAssignments.length === 0 ? (
                    <p className="empty-message">No assignments published</p>
                  ) : (
                    <div className="assignments-list">
                      {facultyAssignments.map((a) => (
                        <button key={a.id} className="assignment-item" onClick={() => selectAssignment(a)}>
                          <strong>{a.title}</strong> — {a.course_code} ({a.term}-{a.section}) — Due: {new Date(a.due_date).toLocaleDateString()} ({a.total_marks} marks)
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {selectedOffering && !selectedAssignment && (
                <div>
                  <h4 className="content-title">Assignments for {selectedCourse.code} ({selectedOffering.term}-{selectedOffering.section})</h4>
                  <p className="content-subtitle">Professor: {selectedOffering.faculty_name}</p>
                  {offeringAssignments.length === 0 ? (
                    <p className="empty-message">No assignments published</p>
                  ) : (
                    <div className="assignments-list">
                      {offeringAssignments.map((a) => (
                        <button key={a.id} className="assignment-item" onClick={() => selectAssignment(a)}>
                          <strong>{a.title}</strong> — Due: {new Date(a.due_date).toLocaleDateString()} ({a.total_marks} marks)
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {selectedAssignment && (
                <div>
                  <h4 className="content-title">{selectedAssignment.title}</h4>
                  <p className="assignment-description">{selectedAssignment.description}</p>
                  <div className="assignment-meta">Due: {new Date(selectedAssignment.due_date).toLocaleString()} | Total Marks: {selectedAssignment.total_marks}</div>
                  <h5 className="section-subtitle">Submissions ({assignmentSubmissions.length})</h5>
                  {assignmentSubmissions.length === 0 ? (
                    <p className="empty-message">No submissions yet</p>
                  ) : (
                    <table className="submissions-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Submitted</th>
                          <th>Marks</th>
                          <th>Graded By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignmentSubmissions.map((s) => (
                          <tr key={s.id}>
                            <td>{s.student_name} ({s.roll_number})</td>
                            <td>{new Date(s.submitted_at).toLocaleString()}</td>
                            <td>{s.marks_obtained ?? 'Not graded'} / {selectedAssignment.total_marks}</td>
                            <td>{s.grader_name || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      {showCreateCourse && selectedDept && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ width: 520, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0 }}>Add Course to {selectedDept.name}</h3>
            <div className="form" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="field"><span className="label"></span><input className="input" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Course Code (e.g., CS101)" /></label>
              <label className="field"><span className="label"></span><input className="input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Course Title" /></label>
              <label className="field"><span className="label"></span><input className="input" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description" /></label>
              <label className="field"><span className="label"></span><input className="input" value={newCredits} onChange={(e) => setNewCredits(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Credits" /></label>
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={() => setShowCreateCourse(false)} disabled={savingCourse}>Cancel</button>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ width: 520, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0 }}>Offer Course — {offerForCourse.code}</h3>
            <div className="form" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="field"><span className="label"></span><input className="input" value={offerTerm} onChange={(e) => setOfferTerm(e.target.value)} placeholder="Term (e.g., W25)" /></label>
              <label className="field"><span className="label"></span><input className="input" value={offerSection} onChange={(e) => setOfferSection(e.target.value)} placeholder="Section (e.g., A)" /></label>
              <label className="field">
                <span className="label"></span>
                <select className="input" value={offerFacultyId} onChange={(e) => setOfferFacultyId(e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">Select Faculty</option>
                  {deptFaculty.map((f) => (
                    <option key={f.id} value={f.id}>{f.name || f.email}</option>
                  ))}
                </select>
              </label>
              <label className="field"><span className="label"></span><input className="input" type="number" value={offerCapacity} onChange={(e) => setOfferCapacity(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Max Capacity (optional)" /></label>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <label className="field"><span className="label"></span><input className="input" type="date" value={offerStart} onChange={(e) => setOfferStart(e.target.value)} placeholder="Start date" /></label>
                <label className="field"><span className="label"></span><input className="input" type="date" value={offerEnd} onChange={(e) => setOfferEnd(e.target.value)} placeholder="End date" /></label>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={() => { setShowOfferCourse(false); setOfferForCourse(null); }} disabled={savingOffering}>Cancel</button>
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
    </div>
  )
}
