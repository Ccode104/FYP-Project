// Import routing components from react-router-dom
import { Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Lazy load all individual page components for code splitting
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Forgot = lazy(() => import('./pages/Forgot'));
const Reset = lazy(() => import('./pages/Reset'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboardNew'));
const PlannerStudent = lazy(() => import('./features/planner/pages/PlannerStudent'));
const PlannerStaff = lazy(() => import('./features/planner/pages/PlannerStaff'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const TADashboard = lazy(() => import('./pages/teacher/TADashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const CourseDetails = lazy(() => import('./pages/student/CourseDetails'));
const CourseHub = lazy(() => import('./pages/student/CourseHub'));
const AssignmentsLanding = lazy(() => import('./pages/student/AssignmentsLanding'));
// AssignmentDetails removed

const SubmissionReview = lazy(() => import('./pages/student/SubmissionReview'));
const GitHubCodeEditor = lazy(() => import('./pages/student/GitHubCodeEditor'));
const ContestEditorPage = lazy(() => import('./pages/student/ContestEditorPage'));
const LiveLecturePage = lazy(() => import('./pages/student/LiveLecturePage'));
const LiveLecturesLanding = lazy(() => import('./pages/student/LiveLecturesLanding'));
const VideoPlayerPage = lazy(() => import('./pages/student/VideoPlayerPage'));
const SuccessCenter = lazy(() => import('./pages/student/SuccessCenter'));
const DiscussionForum = lazy(() => import('./pages/DiscussionForum'));

// Import the protected route wrapper for role-based access
const ProtectedRoute = lazy(() => import('./routes/ProtectedRoute'));

// Layout wrapper for consistent UI across pages
const Layout = lazy(() => import('./components/Layout'));

const QuizResultsPage = lazy(() => import('./pages/teacher/QuizResultsPage'));
const QuizManagement = lazy(() => import('./pages/teacher/QuizManagement'));
const QuizBuilder = lazy(() => import('./pages/teacher/QuizBuilder'));
const AssignmentGitHubSubmit = lazy(() => import('./pages/student/AssignmentGitHubSubmit'));
const AssignmentGrading = lazy(() => import('./pages/teacher/AssignmentGrading'));
const AssignmentManagement = lazy(() => import('./pages/teacher/AssignmentManagement'));
const AssignmentCreate = lazy(() => import('./pages/teacher/AssignmentCreate'));
const MixedSubmissionUpload = lazy(() => import('./components/student/MixedSubmissionUpload'));
const VideoManagement = lazy(() => import('./pages/teacher/VideoManagement'));
const VideoQuizEditor = lazy(() => import('./pages/teacher/VideoQuizEditor'));
const VideoLibrary = lazy(() => import('./pages/student/VideoLibrary'));
const ReviewQueue = lazy(() => import('./pages/teacher/ReviewQueue'));
const TAAssignmentDetails = lazy(() => import('./pages/teacher/TAAssignmentDetails'));
const TASubmissionsList = lazy(() => import('./pages/teacher/TASubmissionsList'));

// Progress / analytics pages
const StudentProgress = lazy(() => import('./pages/progress/StudentProgress'));
const CourseProgress = lazy(() => import('./pages/progress/CourseProgress'));
const ProgressLeaderboard = lazy(() => import('./pages/progress/ProgressLeaderboard'));
const Profile = lazy(() => import('./pages/Profile'));

// Global course context provider
const CourseProvider = lazy(() =>
  import('./context/CourseContext').then(module => ({ default: module.CourseProvider }))
);

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

            <Route
              path="/courses/:courseId/assignments/new"
              element={
                <ProtectedRoute roles={['teacher', 'ta']}>
                  <AssignmentCreate />
                </ProtectedRoute>
              }
            />


            {/* Discussion forum (accessible by student, teacher, TA) */}
            <Route
              path="/courses/:courseId/discussion"
              element={
                <ProtectedRoute roles={['student', 'teacher', 'ta']}>
                  <DiscussionForum />
                </ProtectedRoute>
              }
            />

            {/* Course details (accessible by student, teacher, TA) */}
            <Route
              path="/courses/:courseId/:tab?"
              element={
                <ProtectedRoute roles={['student', 'teacher', 'ta']}>
                  <CourseDetails />
                </ProtectedRoute>
              }
            />

            {/* Quiz management (teacher, faculty, or TA only) */}
            <Route
              path="/courses/:courseId/quiz-management"
              element={
                <ProtectedRoute roles={['student', 'teacher', 'ta']}>
                  <QuizManagement />
                </ProtectedRoute>
              }
            />
            
            {/* Quiz builder (teacher, faculty, or TA only) */}
            <Route
              path="/courses/:courseId/quizzes/:quizId/builder"
              element={
                <ProtectedRoute roles={['teacher', 'ta']}>
                  <QuizBuilder />
                </ProtectedRoute>
              }
            />

            {/* Assignment details page (accessible by student, teacher, TA) */}

            <Route
              path="/courses/:courseId/assignments/:assignmentId/github-submit"
              element={
                <ProtectedRoute roles={['student', 'teacher', 'ta']}>
                  <AssignmentGitHubSubmit />
                </ProtectedRoute>
              }
            />

            {/* Mixed submission page (accessible by student, teacher, TA) */}
            <Route
              path="/courses/:courseId/assignments/:assignmentId/mixed"
              element={
                <ProtectedRoute roles={['student', 'teacher', 'ta']}>
                  <MixedSubmissionUpload />
                </ProtectedRoute>
              }
            />

            {/* Assignment submissions list (teacher/ta view all submissions) */}
            <Route
              path="/courses/:courseId/assignments/:assignmentId/submissions"
              element={
                <ProtectedRoute roles={['teacher', 'ta']}>
                  <AssignmentManagement />
                </ProtectedRoute>
              }
            />

            {/* Assignment grading page for GitHub/mixed assignments */}
            <Route
              path="/courses/:courseId/assignments/:assignmentId/grading"
              element={
                <ProtectedRoute roles={['teacher', 'ta']}>
                  <AssignmentGrading />
                </ProtectedRoute>
              }
            />

            <Route
              path="/courses/:courseId/assignments/:assignmentId/details"
              element={
                <ProtectedRoute roles={['ta']}>
                  <TAAssignmentDetails />
                </ProtectedRoute>
              }
            />

            <Route
              path="/courses/:courseId/assignments/:assignmentId/evaluate"
              element={
                <ProtectedRoute roles={['ta']}>
                  <TASubmissionsList />
                </ProtectedRoute>
              }
            />

            {/* Submission review page for code submissions */}
            <Route
              path="/courses/:courseId/assignments/:assignmentId/submissions/:submissionId"
              element={
                <ProtectedRoute roles={['teacher', 'ta', 'admin']}>
                  <SubmissionReview />
                </ProtectedRoute>
              }
            />

            {/* Code editor page (accessible by student, teacher, TA) */}
            <Route
              path="/courses/:courseId/assignments/:assignmentId/editor"
              element={
                <ProtectedRoute roles={['student', 'teacher', 'ta']}>
                  <ContestEditorPage />
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
            <Route
              path="/courses/:courseId/videos"
              element={
                <ProtectedRoute roles={['teacher', 'ta']}>
                  <VideoManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/library"
              element={
                <ProtectedRoute roles={['student', 'teacher', 'ta']}>
                  <VideoLibrary />
                </ProtectedRoute>
              }
            />

            {/* Video management page for teachers */}
            <Route
              path="/courses/:courseId/videos"
              element={
                <ProtectedRoute roles={['teacher', 'ta']}>
                  <VideoManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/videos/:videoId/edit"
              element={
                <ProtectedRoute roles={['teacher', 'ta']}>
                  <VideoQuizEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/videos/*"
              element={
                <ProtectedRoute roles={['teacher', 'ta']}>
                  <VideoManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="/quizzes/:quizId/results"
              element={
                <ProtectedRoute roles={['teacher', 'ta', 'admin']}>
                  <QuizResultsPage />
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

            <Route
              path="/progress/leaderboard"
              element={
                <ProtectedRoute roles={['student']}>
                  <ProgressLeaderboard />
                </ProtectedRoute>
              }
            />

            {/* Course progress analytics (teacher / TA only) */}
            <Route
              path="/progress/course/:offeringId"
              element={
                <ProtectedRoute roles={['student', 'teacher', 'ta']}>
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
