// Import routing components from react-router-dom
import { Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'

// Lazy load all individual page components for code splitting
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const Forgot = lazy(() => import('./pages/Forgot'))
const Reset = lazy(() => import('./pages/Reset'))
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'))
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'))
const TADashboard = lazy(() => import('./pages/teacher/TADashboard'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const CourseDetails = lazy(() => import('./pages/student/CourseDetails'))
const AssignmentDetails = lazy(() => import('./pages/student/AssignmentDetails'))
const CodeEditorPage = lazy(() => import('./pages/student/CodeEditorPage'))
const ContestEditorPage = lazy(() => import('./pages/student/ContestEditorPage'))
const LiveLecturePage = lazy(() => import('./pages/student/LiveLecturePage'))
const VideoPlayerPage = lazy(() => import('./components/VideoPlayerPage'))

// Import the protected route wrapper for role-based access
const ProtectedRoute = lazy(() => import('./routes/ProtectedRoute'))

// Layout wrapper for consistent UI across pages
const Layout = lazy(() => import('./components/Layout'))

// Quiz-related pages
const QuizTake = lazy(() => import('./pages/student/QuizTake'))
const QuizGrader = lazy(() => import('./pages/teacher/QuizGrader'))
const SuspendedQuizzes = lazy(() => import('./pages/teacher/SuspendedQuizzes'))
const ProctoringDashboard = lazy(() => import('./pages/teacher/ProctoringDashboard'))

// Progress / analytics pages
const StudentProgress = lazy(() => import('./pages/progress/StudentProgress'))
const CourseProgress = lazy(() => import('./pages/progress/CourseProgress'))
const Profile = lazy(() => import('./pages/Profile'))

// Global course context provider
const CourseProvider = lazy(() => import('./context/CourseContext').then(module => ({ default: module.CourseProvider })))

function App() {
  return (
    // Provide course-related global state to the entire app
    <CourseProvider>

      {/* Layout adds Sidebar / Navbar / Shared UI around all pages */}
      <Layout>

        {/* React Router route definitions */}
        <Suspense fallback={<div className="loading-spinner">Loading...</div>}>
          <Routes>

          {/* Landing page (public) */}
          <Route path="/" element={<Landing />} />

          {/* Authentication routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/reset" element={<Reset />} />

          {/* Student dashboard (restricted to student role) */}
          <Route
            path="/dashboard/student"
            element={
              <ProtectedRoute roles={["student"]}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          {/* Teacher dashboard (restricted to teacher role) */}
          <Route
            path="/dashboard/teacher"
            element={
              <ProtectedRoute roles={["teacher"]}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />

          {/* TA dashboard */}
          <Route
            path="/dashboard/ta"
            element={
              <ProtectedRoute roles={["ta"]}>
                <TADashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin dashboard (restricted to admin role) */}
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Course details (accessible by student, teacher, TA) */}
          <Route
            path="/courses/:courseId/:tab?"
            element={
              <ProtectedRoute roles={["student", "teacher", "ta"]}>
                <CourseDetails />
              </ProtectedRoute>
            }
          />

          {/* Assignment details page (accessible by student, teacher, TA) */}
          <Route
            path="/courses/:courseId/assignments/:assignmentId"
            element={
              <ProtectedRoute roles={["student", "teacher", "ta"]}>
                <AssignmentDetails />
              </ProtectedRoute>
            }
          />

          {/* Code editor page (accessible by student, teacher, TA) */}
          <Route
            path="/courses/:courseId/assignments/:assignmentId/editor"
            element={
              <ProtectedRoute roles={["student", "teacher", "ta"]}>
                <CodeEditorPage />
              </ProtectedRoute>
            }
          />

          {/* Contest editor page (accessible by student, teacher, TA) */}
          <Route
            path="/courses/:courseId/contests/:contestId/editor"
            element={
              <ProtectedRoute roles={["student", "teacher", "ta"]}>
                <ContestEditorPage />
              </ProtectedRoute>
            }
          />

          {/* Live lecture page (accessible by student, teacher, TA) */}
          <Route
            path="/courses/:courseId/live-lectures/:lectureId"
            element={
              <ProtectedRoute roles={["student", "teacher", "ta"]}>
                <LiveLecturePage />
              </ProtectedRoute>
            }
          />

          {/* Video player page (accessible by student, teacher, TA) */}
          <Route
            path="/videos/:videoId"
            element={
              <ProtectedRoute roles={["student", "teacher", "ta"]}>
                <VideoPlayerPage />
              </ProtectedRoute>
            }
          />

          {/* Student taking a quiz */}
          <Route
            path="/quizzes/:quizId"
            element={
              <ProtectedRoute roles={["student"]}>
                <QuizTake />
              </ProtectedRoute>
            }
          />

          {/* Quiz grading (teacher or TA only) */}
          <Route
            path="/quizzes/:quizId/grading"
            element={
              <ProtectedRoute roles={["teacher", "ta"]}>
                <QuizGrader />
              </ProtectedRoute>
            }
          />

          {/* Suspended quizzes management (teacher or TA only) */}
          <Route
            path="/teacher/suspended-quizzes"
            element={
              <ProtectedRoute roles={["teacher", "ta"]}>
                <SuspendedQuizzes />
              </ProtectedRoute>
            }
          />

          {/* Proctoring analytics dashboard (teacher or TA only) */}
          <Route
            path="/teacher/proctoring-dashboard"
            element={
              <ProtectedRoute roles={["teacher", "ta"]}>
                <ProctoringDashboard />
              </ProtectedRoute>
            }
          />

          {/* Student progress page */}
          <Route
            path="/progress"
            element={
              <ProtectedRoute roles={["student"]}>
                <StudentProgress />
              </ProtectedRoute>
            }
          />

          {/* Course progress analytics (teacher / TA only) */}
          <Route
            path="/progress/course/:offeringId"
            element={
              <ProtectedRoute roles={["teacher", "ta"]}>
                <CourseProgress />
              </ProtectedRoute>
            }
          />

          {/* User profile (all authenticated users) */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute roles={["student", "teacher", "ta", "admin"]}>
                <Profile />
              </ProtectedRoute>
            }
          />

        </Routes>
        </Suspense>
      </Layout>
    </CourseProvider>
  )
}

export default App

/* ================================================================
    DETAILED EXPLANATION OF THE FILE
   ================================================================

1. IMPORTS
-------------------------
- We import routing tools (Route, Routes, Navigate).
- We import all page components such as Login, Signup, Dashboard, etc.
- We import ProtectedRoute to restrict access based on user roles.
- Layout is used to wrap all pages with a shared UI layout (navbar/sidebar).
- CourseProvider sets up global state for courses.

2. APP STRUCTURE
-------------------------
<App /> returns:

   <CourseProvider>
       <Layout>
           <Routes>
               ...all routes here...
           </Routes>
       </Layout>
   </CourseProvider>

Meaning:
- The entire app has course context available.
- Every page is wrapped with the same layout design.
- Routes decide which component should load depending on the URL.

3. ROLE-BASED PROTECTION
-------------------------
ProtectedRoute checks:
- Is the user logged in?
- Does the user role match allowed roles?

Example:
<ProtectedRoute roles={["teacher"]}>...</ProtectedRoute>
Only users with role "teacher" can view that page.

4. DYNAMIC ROUTES
-------------------------
Routes like:
- /courses/:courseId
- /quizzes/:quizId
- /progress/course/:offeringId

These use URL parameters.
Example: /courses/123 → courseId = 123.

5. FALLBACK ROUTE
-------------------------
<Route path="*" element={<Navigate to="/" />} />
Any invalid / unknown URL redirects to "/".

6. WHAT THIS FILE ACHIEVES
-------------------------
✔ Defines every route for the LMS  
✔ Protects routes using role-based access  
✔ Makes course data globally available  
✔ Wraps UI with consistent layout  
✔ Handles all dashboards, quizzes, progress pages  
✔ Ensures unauthorized users cannot access restricted pages  

================================================================ */
