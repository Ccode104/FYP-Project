import { Navigate, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import StudentDashboard from './pages/student/StudentDashboard'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import CourseDetails from './pages/student/CourseDetails'
import ProtectedRoute from './routes/ProtectedRoute'
// import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import QuizTake from './pages/student/QuizTake'
import QuizGrader from './pages/teacher/QuizGrader'
import StudentProgress from './pages/progress/StudentProgress'
import CourseProgress from './pages/progress/CourseProgress'

function App() {
  // const { user } = useAuth()

  return (
    <Layout>
      <Routes>
        {/* Landing page - redirects to dashboard if logged in */}
        <Route path="/" element={<Landing />} />
        
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        <Route
          path="/dashboard/student"
          element={
            <ProtectedRoute roles={["student"]}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/teacher"
          element={
            <ProtectedRoute roles={["teacher"]}>
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/ta"
          element={
            <ProtectedRoute roles={["ta"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/courses/:courseId"
          element={
            <ProtectedRoute roles={["student", "teacher", "ta"]}>
              <CourseDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/quizzes/:quizId"
          element={
            <ProtectedRoute roles={["student"]}>
              <QuizTake />
            </ProtectedRoute>
          }
        />

        <Route
          path="/quizzes/:quizId/grading"
          element={
            <ProtectedRoute roles={["teacher", "ta"]}>
              <QuizGrader />
            </ProtectedRoute>
          }
        />

        <Route
          path="/progress"
          element={
            <ProtectedRoute roles={["student"]}>
              <StudentProgress />
            </ProtectedRoute>
          }
        />

        <Route
          path="/progress/course/:offeringId"
          element={
            <ProtectedRoute roles={["teacher", "ta"]}>
              <CourseProgress />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
