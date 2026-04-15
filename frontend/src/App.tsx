// Import routing components from react-router-dom
import { Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';

// Lazy load all individual page components for code splitting
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Forgot = lazy(() => import('./pages/Forgot'));
const Reset = lazy(() => import('./pages/Reset'));
const GitHubAuthSuccess = lazy(() => import('./pages/GitHubAuthSuccess'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboardNew'));
const PlannerStudent = lazy(() => import('./features/planner/pages/PlannerStudent'));
const PlannerStaff = lazy(() => import('./features/planner/pages/PlannerStaff'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const TADashboard = lazy(() => import('./pages/teacher/TADashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const CourseDetails = lazy(() => import('./pages/student/CourseDetails'));
const CourseHub = lazy(() => import('./pages/student/CourseHub'));
const AssignmentsLanding = lazy(() => import('./pages/student/AssignmentsLanding'));
const AssignmentManagement = lazy(() => import('./pages/teacher/AssignmentManagement'));
// AssignmentDetails removed

const SubmissionReview = lazy(() => import('./pages/student/SubmissionReview'));
const CodeEditorPage = lazy(() => import('./pages/student/CodeEditorPage'));
const ContestEditorPage = lazy(() => import('./pages/student/ContestEditorPage'));
const LiveLecturePage = lazy(() => import('./pages/student/LiveLecturePage'));
const LiveLecturesLanding = lazy(() => import('./pages/student/LiveLecturesLanding'));
const StudentVideoLibrary = lazy(() => import('./pages/student/StudentVideoLibrary'));
const VideoPlayerPage = lazy(() => import('./pages/student/VideoPlayerPage'));
const SuccessCenter = lazy(() => import('./pages/student/SuccessCenter'));
const DiscussionForum = lazy(() => import('./pages/DiscussionForum'));

// Import the protected route wrapper for role-based access
const ProtectedRoute = lazy(() => import('./routes/ProtectedRoute'));

// Layout wrapper for consistent UI across pages
const Layout = lazy(() => import('./components/Layout'));

// Quiz-related pages
const QuizTake = lazy(() => import('./pages/student/QuizTake'));
const QuizGrader = lazy(() => import('./pages/teacher/QuizGrader'));
const QuizManagement = lazy(() => import('./pages/teacher/QuizManagement'));
const AssignmentGitHubSubmit = lazy(() => import('./pages/student/AssignmentGitHubSubmit'));
const AssignmentGrading = lazy(() => import('./pages/teacher/AssignmentGrading'));
const VideoManagement = lazy(() => import('./pages/teacher/VideoManagement'));
const SuspendedQuizzes = lazy(() => import('./pages/teacher/SuspendedQuizzes'));
const ProctoringDashboard = lazy(() => import('./pages/teacher/ProctoringDashboard'));
const ReviewQueue = lazy(() => import('./pages/teacher/ReviewQueue'));

// Progress / analytics pages
const StudentProgress = lazy(() => import('./pages/progress/StudentProgress'));
const CourseProgress = lazy(() => import('./pages/progress/CourseProgress'));
const Profile = lazy(() => import('./pages/Profile'));

// Global course context provider
const CourseProvider = lazy(() =>
  import('./context/CourseContext').then(module => ({ default: module.CourseProvider }))
);

function App() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('google_connected') === 'true') {
      const returnUrl = sessionStorage.getItem('google_oauth_return_url');
      sessionStorage.removeItem('google_oauth_return_url');
      if (returnUrl) {
        navigate(returnUrl, { replace: true });
      } else {
        navigate(window.location.pathname + window.location.hash, { replace: true });
      }
    }
  }, [searchParams, navigate]);

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
            <Route path="/auth/github/success" element={<GitHubAuthSuccess />} />

            {/* Student dashboard (restricted to student role) */}
            <Route
              path="/dashboard/student"
              element={
                <ProtectedRoute roles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            {/* Student planner */}
            <Route
              path="/planner"
              element={
                <ProtectedRoute roles={['student']}>
                  <PlannerStudent />
                </ProtectedRoute>
              }
            />

            {/* Student success center */}
            <Route
              path="/success-center"
              element={
                <ProtectedRoute roles={['student']}>
                  <SuccessCenter />
                </ProtectedRoute>
              }
            />

            {/* Staff planners */}
            <Route
              path="/planner/teacher"
              element={
                <ProtectedRoute roles={['teacher']}>
                  <PlannerStaff />
                </ProtectedRoute>
              }
            />
            <Route
              path="/planner/ta"
              element={
                <ProtectedRoute roles={['ta']}>
                  <PlannerStaff />
                </ProtectedRoute>
              }
            />
            <Route
              path="/planner/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <PlannerStaff />
                </ProtectedRoute>
              }
            />

            {/* Teacher dashboard (restricted to teacher role) */}
            <Route
              path="/dashboard/teacher"
              element={
                <ProtectedRoute roles={['teacher']}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />

            {/* TA dashboard */}
            <Route
              path="/dashboard/ta"
              element={
                <ProtectedRoute roles={['ta']}>
                  <TADashboard />
                </ProtectedRoute>
              }
            />

            {/* Admin dashboard (restricted to admin role) */}
            <Route
              path="/dashboard/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Course details (accessible by student, teacher, TA) */}
            <Route
              path="/courses/:courseId/hub"
              element={
                <ProtectedRoute roles={['student', 'teacher', 'ta']}>
                  <CourseHub />
                </ProtectedRoute>
              }
            />

            {/* Live lectures landing route for course hub navigation */}
            <Route
              path="/courses/:courseId/live-lectures"
              element={
                <ProtectedRoute roles={['student', 'teacher', 'ta']}>
                  <LiveLecturesLanding />
                </ProtectedRoute>
              }
            />

            {/* Assignments landing route for course hub navigation */}
            <Route
              path="/courses/:courseId/assignments"
              element={
                <ProtectedRoute roles={['student', 'teacher', 'ta']}>
                  <AssignmentsLanding />
                </ProtectedRoute>
              }
            />

            {/* Assignment management for teachers (more specific route) */}
            <Route
              path="/courses/:courseId/assignments/:assignmentId/submissions/:submissionId"
              element={
                <ProtectedRoute roles={['teacher', 'ta']}>
                  <SubmissionReview />
                </ProtectedRoute>
              }
            />

            {/* Assignment management for teachers */}
            <Route
              path="/courses/:courseId/assignments/:assignmentId"
              element={
                <ProtectedRoute roles={['teacher', 'ta']}>
                  <AssignmentManagement />
                </ProtectedRoute>
              }
            />

            {/* Code editor for students and teachers */}
            <Route
              path="/courses/:courseId/assignments/:assignmentId"
              element={
                <ProtectedRoute roles={['student', 'teacher', 'ta']}>
                  <CodeEditorPage />
                </ProtectedRoute>
              }
            />

            {/* Code editor page (accessible by student, teacher, TA) */}
            <Route
              path="/courses/:courseId/assignments/:assignmentId/editor"
              element={
                <ProtectedRoute roles={['student', 'teacher', 'ta']}>
                  <CodeEditorPage />
                </ProtectedRoute>
              }
            />

            {/* Assignment management for teachers - show submissions list */}
            <Route
              path="/courses/:courseId/assignments/:assignmentId/submissions"
              element={
                <ProtectedRoute roles={['teacher', 'ta']}>
                  <AssignmentManagement />
                </ProtectedRoute>
              }
            />

            {/* Submission review for teachers */}
            <Route
              path="/courses/:courseId/assignments/:assignmentId/submissions/:submissionId"
              element={
                <ProtectedRoute roles={['teacher', 'ta']}>
                  <SubmissionReview />
                </ProtectedRoute>
              }
            />

            {/* Assignment management for teachers */}
            <Route
              path="/courses/:courseId/assignments/:assignmentId"
              element={
                <ProtectedRoute roles={['teacher', 'ta']}>
                  <AssignmentManagement />
                </ProtectedRoute>
              }
            />

            {/* Code editor page (accessible by student, teacher, TA) */}
            <Route
              path="/courses/:courseId/assignments/:assignmentId/editor"
              element={
                <ProtectedRoute roles={['student', 'teacher', 'ta']}>
                  <CodeEditorPage />
                </ProtectedRoute>
              }
            />

            {/* Contest editor page (accessible by student, teacher, TA) */}
            <Route
              path="/courses/:courseId/contests/:contestId/editor"
              element={
                <ProtectedRoute roles={['student', 'teacher', 'ta']}>
                  <ContestEditorPage />
                </ProtectedRoute>
              }
            />

            {/* Live lecture page - Shared student/teacher/TA view */}
            <Route
              path="/courses/:courseId/live-lectures/:lectureId"
              element={
                <ProtectedRoute roles={['student', 'teacher', 'ta']}>
                  <LiveLecturePage />
                </ProtectedRoute>
              }
            />

            {/* Video player page (accessible by student, teacher, TA) */}
            <Route
              path="/videos/:videoId"
              element={
                <ProtectedRoute roles={['student', 'teacher', 'ta']}>
                  <VideoPlayerPage />
                </ProtectedRoute>
              }
            />

            {/* Video library for students */}
            <Route
              path="/courses/:courseId/videos"
              element={
                <ProtectedRoute roles={['student', 'teacher', 'ta']}>
                  <StudentVideoLibrary />
                </ProtectedRoute>
              }
            />

            {/* Video management page for teachers */}
            <Route
              path="/courses/:courseId/videos/manage"
              element={
                <ProtectedRoute roles={['teacher', 'ta']}>
                  <VideoManagement />
                </ProtectedRoute>
              }
            />

            {/* Student taking a quiz */}
            <Route
              path="/quizzes/:quizId"
              element={
                <ProtectedRoute roles={['student']}>
                  <QuizTake />
                </ProtectedRoute>
              }
            />

            {/* Quiz grading (teacher or TA only) */}
            <Route
              path="/quizzes/:quizId/grading"
              element={
                <ProtectedRoute roles={['teacher', 'ta']}>
                  <QuizGrader />
                </ProtectedRoute>
              }
            />

            {/* Suspended quizzes management (teacher or TA only) */}
            <Route
              path="/teacher/suspended-quizzes"
              element={
                <ProtectedRoute roles={['teacher', 'ta']}>
                  <SuspendedQuizzes />
                </ProtectedRoute>
              }
            />

            {/* Proctoring analytics dashboard (teacher or TA only) */}
            <Route
              path="/teacher/proctoring-dashboard"
              element={
                <ProtectedRoute roles={['teacher', 'ta']}>
                  <ProctoringDashboard />
                </ProtectedRoute>
              }
            />

            {/* Staff review queue */}
            <Route
              path="/staff/review-queue"
              element={
                <ProtectedRoute roles={['teacher', 'ta']}>
                  <ReviewQueue />
                </ProtectedRoute>
              }
            />

            {/* Student progress page */}
            <Route
              path="/progress"
              element={
                <ProtectedRoute roles={['student']}>
                  <StudentProgress />
                </ProtectedRoute>
              }
            />

            {/* Course progress analytics (teacher / TA only) */}
            <Route
              path="/progress/course/:offeringId"
              element={
                <ProtectedRoute roles={['teacher', 'ta']}>
                  <CourseProgress />
                </ProtectedRoute>
              }
            />

            {/* User profile (all authenticated users) */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute roles={['student', 'teacher', 'ta', 'admin']}>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </Layout>
    </CourseProvider>
  );
}

export default App;
