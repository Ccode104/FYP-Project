import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import StudentDashboard from './pages/student/StudentDashboard'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import CourseDetails from './pages/student/CourseDetails'
import ProtectedRoute from './routes/ProtectedRoute'
import { useAuth, getDashboardPathForRole } from './context/AuthContext'
import Layout from './components/Layout'

function App() {
  const { user } = useAuth()

  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to={getDashboardPathForRole(user.role)} replace /> : <Navigate to="/login" replace />}
        />
        {/* 
        Can be added in future
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        */
        }
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
          path="/courses/:courseId"
          element={
            <ProtectedRoute roles={["student", "teacher", "ta"]}>
              <CourseDetails />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
