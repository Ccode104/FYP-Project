import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['simple-peer', 'buffer', 'events', 'util', 'stream-browserify', 'readable-stream'],
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      events: 'events',
      stream: 'stream-browserify',
      util: 'util',
      'readable-stream': 'readable-stream',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion'],
          'vendor-utils': ['buffer', 'events', 'util', 'stream-browserify', 'readable-stream', 'simple-peer', 'axios'],
          'vendor-editor': ['@monaco-editor/react'],
          'vendor-face-api': ['face-api.js'],
          'vendor-socket': ['socket.io-client'],

          // Feature chunks
          'services': [
            './src/services/api',
            './src/services/auth',
            './src/services/admin',
            './src/services/assignments',
            './src/services/chat',
            './src/services/courses',
            './src/services/discussion',
            './src/services/liveLectures',
            './src/services/password',
            './src/services/proctoringApi',
            './src/services/progress',
            './src/services/quizPermissions',
            './src/services/quizzes',
            './src/services/rubrics',
            './src/services/student',
            './src/services/support',
            './src/services/ta',
            './src/services/users',
            './src/services/videos'
          ],

          // Page chunks
          'pages-student': [
            './src/pages/student/StudentDashboard',
            './src/pages/student/CourseDetails',
            './src/pages/student/AssignmentDetails',
            './src/pages/student/CodeEditorPage',
            './src/pages/student/LiveLecturePage',
            './src/pages/student/QuizTake'
          ],

          'pages-teacher': [
            './src/pages/teacher/TeacherDashboard',
            './src/pages/teacher/TADashboard',
            './src/pages/teacher/QuizGrader',
            './src/pages/teacher/SuspendedQuizzes',
            './src/pages/teacher/ProctoringDashboard'
          ],

          'pages-admin': [
            './src/pages/admin/AdminDashboard'
          ],

          'pages-auth': [
            './src/pages/Landing',
            './src/pages/Login',
            './src/pages/Signup',
            './src/pages/Forgot',
            './src/pages/Reset'
          ],

          'pages-progress': [
            './src/pages/progress/StudentProgress',
            './src/pages/progress/CourseProgress',
            './src/pages/Profile'
          ],

          // Component chunks
          'components-core': [
            './src/components/Layout',
            './src/components/CourseCard',
            './src/components/Modal',
            './src/components/ErrorBoundary'
          ],

          'components-course': [
            './src/components/course/BackendSubmissions',
            './src/components/course/CourseProgressEmbed',
            './src/components/course/GradedAssignmentView',
            './src/components/course/StudentProgressEmbed',
            './src/components/course/TeacherAssignments',
            './src/components/course/TeacherCodeSubmissionViewer',
            './src/components/course/TAGrading'
          ],

          'components-media': [
            './src/components/InteractiveVideoPlayer',
            './src/components/VideoQuestionManager',
            './src/components/VideoQuizResults',
            './src/components/VideoUpload',
            './src/components/LiveLectureBroadcaster',
            './src/components/LiveLectureViewer'
          ],

          'components-admin': [
            './src/components/Reports',
            './src/components/SupportTicketList',
            './src/components/RecentActivities'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000 // Increase warning limit to 1000kb
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
