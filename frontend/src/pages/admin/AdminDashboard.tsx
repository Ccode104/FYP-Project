import { useEffect, useMemo, useState } from 'react'
import { courses } from '../../data/mock'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import CourseCard from '../../components/CourseCard'
import './AdminDashboard.css'
import { listUsers, getUserOverview, getCoursesByDepartment, getCourseDetails, getAssignmentsByOffering, getAssignmentsByFaculty, getSubmissionsByAssignment } from '../../services/admin'

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const isAdmin = user?.role === 'admin'
  const [tab, setTab] = useState<'explorer'>('explorer')

  // Users state
  const [roleFilter, setRoleFilter] = useState<'student'|'faculty'|'ta'|'admin'|''>('student')
  const [usersList, setUsersList] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [selectedOverview, setSelectedOverview] = useState<any>(null)
  const [loadError, setLoadError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  
  const loadUsers = async () => {
    try {
      setIsLoading(true)
      setLoadError('')
      console.log('Loading users with role filter:', roleFilter)
      const r = await listUsers(roleFilter || undefined)
      console.log('Loaded users:', r)
      console.log('Users array:', r.users)
      console.log('Users count:', r.users?.length)
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
      console.log('Effect triggered - loading users')
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
    console.log('Selected faculty:', faculty)
    console.log('Faculty ID:', faculty.faculty_id)
    setSelectedFaculty(faculty)
    setSelectedOffering(null)
    setSelectedAssignment(null)
    try {
      const r = await getAssignmentsByFaculty(faculty.faculty_id)
      console.log('Faculty assignments response:', r)
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
      <div className="container container-wide dashboard-page admin-theme">
        <header className="topbar">
          <h2>Welcome, {user?.name} (TA)</h2>
          <div className="actions">
            <button className="btn btn-ghost" onClick={() => navigate('/')}>Home</button>
            <button className="btn btn-ghost" onClick={logout}>Logout</button>
          </div>
        </header>
        <h3 className="section-title">Courses</h3>
        <div className="grid grid-cards">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} onClick={() => navigate(`/courses/${c.id}`)} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container container-wide dashboard-page admin-theme">
      <header className="topbar">
        <h2>Admin Dashboard</h2>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => navigate('/')}>Home</button>
          <button className="btn btn-ghost" onClick={logout}>Logout</button>
        </div>
      </header>

      {false && tab === 'users' && (
        <section className="card">
          <h3>Users</h3>
          <div className="grid" style={{ gridTemplateColumns: '260px 1fr', gap: 16 }}>
            <div>
              <div className="form" style={{ marginBottom: 12 }}>
                <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 8 }}>
                  <button className={`btn ${roleFilter==='student'?'btn-primary':''}`} onClick={()=> setRoleFilter('student')}>Students</button>
                  <button className={`btn ${roleFilter==='faculty'?'btn-primary':''}`} onClick={()=> setRoleFilter('faculty')}>Teachers</button>
                  <button className={`btn ${roleFilter==='ta'?'btn-primary':''}`} onClick={()=> setRoleFilter('ta')}>TAs</button>
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
                {usersList.map((u)=> (
                  <li key={u.id}>
                    <button className="btn" onClick={async ()=> {
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
                        {selectedOverview.student.enrollments.map((e:any)=> (
                          <li key={e.offering_id}>{e.course_code} — {e.course_title} [{e.term}{e.section?'-'+e.section:''}] · Faculty: {e.faculty_name}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {selectedOverview.faculty && (
                    <>
                      <h5>Offerings</h5>
                      <ul className="list">
                        {selectedOverview.faculty.offerings.map((o:any)=> (
                          <li key={o.offering_id}>
                            {o.course_code} — {o.course_title} [{o.term}{o.section?'-'+o.section:''}]
                            {o.students?.length? (
                              <ul className="list" style={{ marginTop: 6 }}>
                                {o.students.map((s:any)=> (
                                  <li key={s.id}>{s.name || s.email} <span className="muted">({s.email})</span></li>
                                ))}
                              </ul>
                            ): <div className="muted">No enrolled students yet.</div>}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {selectedOverview.ta && (
                    <>
                      <h5>TA Assignments</h5>
                      <ul className="list">
                        {selectedOverview.ta.assignments.map((a:any)=> (
                          <li key={a.offering_id}>{a.course_code} — {a.course_title} [{a.term}{a.section?'-'+a.section:''}]</li>
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
        <section style={{ padding: '24px' }}>
          {/* Breadcrumb Navigation */}
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px 24px',
            borderRadius: '12px',
            marginBottom: '24px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', marginBottom: '8px', fontWeight: '500' }}>
              Navigation Path
            </div>
            <div style={{ fontSize: '18px', color: '#fff', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {!selectedDept && <span>🏛️ Select a department to begin</span>}
              {selectedDept && (
                <>
                  <span>🏛️ {selectedDept.name}</span>
                  {!selectedCourse && <span style={{ opacity: 0.7 }}> → 📚 Select a course</span>}
                </>
              )}
              {selectedCourse && (
                <>
                  <span> → 📚 {selectedCourse.code}</span>
                  {!selectedOffering && !selectedFaculty && <span style={{ opacity: 0.7 }}> → 🎓 Select offering or professor</span>}
                </>
              )}
              {selectedOffering && (
                <>
                  <span> → 🎓 {selectedOffering.term}-{selectedOffering.section}</span>
                  {!selectedAssignment && <span style={{ opacity: 0.7 }}> → 📝 Select assignment</span>}
                </>
              )}
              {selectedFaculty && (
                <>
                  <span> → 👨‍🏫 {selectedFaculty.faculty_name}</span>
                  {!selectedAssignment && <span style={{ opacity: 0.7 }}> → 📝 Select assignment</span>}
                </>
              )}
              {selectedAssignment && <span> → 📝 {selectedAssignment.title}</span>}
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '280px 1fr', gap: '24px' }}>
            {/* Sidebar */}
            <div style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              height: 'fit-content',
              position: 'sticky',
              top: '20px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🏛️ Departments
              </h3>
              <div style={{ maxHeight: '600px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {departments.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => selectDepartment(d)}
                    style={{
                      padding: '12px 16px',
                      border: selectedDept?.id === d.id ? '2px solid #667eea' : '2px solid #e5e7eb',
                      borderRadius: '8px',
                      background: selectedDept?.id === d.id ? 'linear-gradient(135deg, #667eea15, #764ba215)' : '#fff',
                      color: selectedDept?.id === d.id ? '#667eea' : '#374151',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '14px',
                      fontWeight: selectedDept?.id === d.id ? '600' : '500',
                      textAlign: 'left',
                      width: '100%'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedDept?.id !== d.id) {
                        e.currentTarget.style.borderColor = '#cbd5e1'
                        e.currentTarget.style.background = '#f9fafb'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedDept?.id !== d.id) {
                        e.currentTarget.style.borderColor = '#e5e7eb'
                        e.currentTarget.style.background = '#fff'
                      }
                    }}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>
            {/* Main Content */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', minHeight: '500px' }}>
              {!selectedDept && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏛️</div>
                  <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>Welcome to Admin Data Explorer</h3>
                  <p>Select a department from the sidebar to get started</p>
                </div>
              )}
              {selectedDept && !selectedCourse && (
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#111', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📚 Courses in {selectedDept.name}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {deptCourses.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => selectCourse(c)}
                        style={{
                          padding: '20px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: '#fff'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#667eea'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb'
                          e.currentTarget.style.boxShadow = 'none'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}
                      >
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#667eea', marginBottom: '8px' }}>{c.code}</div>
                        <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>{c.title}</div>
                        {c.credits && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>{c.credits} credits</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedCourse && !selectedOffering && !selectedFaculty && courseDetails && (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#111' }}>{selectedCourse.code} — {selectedCourse.title}</h3>
                    <p style={{ color: '#6b7280', margin: 0 }}>{selectedCourse.description}</p>
                  </div>
                  <h4 style={{ marginBottom: '16px', color: '#111', display: 'flex', alignItems: 'center', gap: '8px' }}>🎓 Course Offerings</h4>
                  {courseDetails.offerings.length === 0 ? (
                    <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>No offerings available</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {courseDetails.offerings.map((o: any) => (
                        <div key={o.offering_id} style={{
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          padding: '20px',
                          background: '#fafafa'
                        }}>
                          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => selectOffering(o)}
                              style={{
                                padding: '10px 20px',
                                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                              📝 {o.term} - Section {o.section}
                            </button>
                            {o.faculty_name && (
                              <button
                                onClick={() => selectFaculty(o)}
                                style={{
                                  padding: '10px 20px',
                                  background: '#fff',
                                  color: '#667eea',
                                  border: '2px solid #667eea',
                                  borderRadius: '8px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#667eea'
                                  e.currentTarget.style.color = '#fff'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#fff'
                                  e.currentTarget.style.color = '#667eea'
                                }}
                              >
                                👨‍🏫 {o.faculty_name}
                              </button>
                            )}
                          </div>
                          <div style={{ paddingLeft: '12px', borderLeft: '3px solid #667eea20' }}>
                            <div style={{ fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                              🎓 Enrolled Students ({o.students.length})
                            </div>
                            {o.students.length === 0 ? (
                              <span style={{ color: '#9ca3af', fontSize: '14px' }}>No students enrolled</span>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {o.students.slice(0, 5).map((s: any) => (
                                  <span key={s.id} style={{
                                    padding: '6px 12px',
                                    background: '#fff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    color: '#374151'
                                  }}>
                                    {s.name}
                                  </span>
                                ))}
                                {o.students.length > 5 && (
                                  <span style={{ color: '#9ca3af', fontSize: '13px', padding: '6px' }}>+{o.students.length - 5} more</span>
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
                  <h4 style={{ marginTop: 0 }}>All Assignments by {selectedFaculty.faculty_name}</h4>
                  <p className="muted">Course: {selectedCourse.code}</p>
                  {facultyAssignments.length === 0 ? (
                    <p className="muted">No assignments published</p>
                  ) : (
                    <ul className="list">
                      {facultyAssignments.map((a) => (
                        <li key={a.id}>
                          <button className="btn" onClick={() => selectAssignment(a)} style={{ width: '100%', textAlign: 'left' }}>
                            <strong>{a.title}</strong> — {a.course_code} ({a.term}-{a.section}) — Due: {new Date(a.due_date).toLocaleDateString()} ({a.total_marks} marks)
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {selectedOffering && !selectedAssignment && (
                <div>
                  <h4 style={{ marginTop: 0 }}>Assignments for {selectedCourse.code} ({selectedOffering.term}-{selectedOffering.section})</h4>
                  <p className="muted">Professor: {selectedOffering.faculty_name}</p>
                  {offeringAssignments.length === 0 ? (
                    <p className="muted">No assignments published</p>
                  ) : (
                    <ul className="list">
                      {offeringAssignments.map((a) => (
                        <li key={a.id}>
                          <button className="btn" onClick={() => selectAssignment(a)} style={{ width: '100%', textAlign: 'left' }}>
                            <strong>{a.title}</strong> — Due: {new Date(a.due_date).toLocaleDateString()} ({a.total_marks} marks)
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {selectedAssignment && (
                <div>
                  <h4 style={{ marginTop: 0 }}>{selectedAssignment.title}</h4>
                  <p>{selectedAssignment.description}</p>
                  <div className="muted" style={{ marginBottom: 12 }}>Due: {new Date(selectedAssignment.due_date).toLocaleString()} | Total Marks: {selectedAssignment.total_marks}</div>
                  <h5>Submissions ({assignmentSubmissions.length})</h5>
                  {assignmentSubmissions.length === 0 ? (
                    <p className="muted">No submissions yet</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Student</th>
                          <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Submitted</th>
                          <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Marks</th>
                          <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Graded By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignmentSubmissions.map((s) => (
                          <tr key={s.id}>
                            <td style={{ padding: 8 }}>{s.student_name} ({s.roll_number})</td>
                            <td style={{ padding: 8 }}>{new Date(s.submitted_at).toLocaleString()}</td>
                            <td style={{ padding: 8 }}>{s.marks_obtained ?? 'Not graded'} / {selectedAssignment.total_marks}</td>
                            <td style={{ padding: 8 }}>{s.grader_name || 'N/A'}</td>
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
    </div>
  )
}
