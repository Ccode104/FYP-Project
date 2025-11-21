// Import routing components from react-router-dom
import { Navigate, Route, Routes } from 'react-router-dom'

// Import all individual page components
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Forgot from './pages/Forgot'
import Reset from './pages/Reset'
import StudentDashboard from './pages/student/StudentDashboard'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import CourseDetails from './pages/student/CourseDetails'
import CodeEditorPage from './pages/student/CodeEditorPage'

// Import the protected route wrapper for role-based access
import ProtectedRoute from './routes/ProtectedRoute'

// Layout wrapper for consistent UI across pages
import Layout from './components/Layout'

// Quiz-related pages
import QuizTake from './pages/student/QuizTake'
import QuizGrader from './pages/teacher/QuizGrader'

// Progress / analytics pages
import StudentProgress from './pages/progress/StudentProgress'
import CourseProgress from './pages/progress/CourseProgress'

// Global course context provider
import { CourseProvider } from './context/CourseContext'

function App() {
  return (
    // Provide course-related global state to the entire app
    <CourseProvider>

      {/* Layout adds Sidebar / Navbar / Shared UI around all pages */}
      <Layout>

        {/* React Router route definitions */}
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

          {/* TA dashboard (same component as admin dashboard here) */}
          <Route
            path="/dashboard/ta"
            element={
              <ProtectedRoute roles={["ta"]}>
                <AdminDashboard />
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
            path="/courses/:courseId"
            element={
              <ProtectedRoute roles={["student", "teacher", "ta"]}>
                <CourseDetails />
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

          {/* Catch-all fallback — any unknown route redirects to home */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
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
