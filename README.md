# Edu Portal React

A role-based React + TypeScript app scaffolded with Vite featuring:
- Login and Signup pages
- Three roles: student, teacher, admin
- Role-specific dashboards
- Student dashboard shows enrolled courses as cards
- Course details page with tabs: Assignments (Past), Assignments (Present), PYQ, and Notes
- File upload submission on Present Assignments (same page/flow for teacher and admin)

## Getting started

Prerequisites: Node.js 18+ and npm

Install and run:

1. Install dependencies
   npm install

2. Start the dev server
   npm run dev

Open http://localhost:5173

## Accounts and roles
This demo uses a mock auth flow. On the Login page, select a role and sign in. Your session is stored in localStorage.

## Project structure
- src/context/AuthContext.tsx: auth state and role helpers
- src/routes/ProtectedRoute.tsx: role-based route guard
- src/pages/Login.tsx, src/pages/Signup.tsx
- src/pages/student/StudentDashboard.tsx, src/pages/student/CourseDetails.tsx
- src/pages/teacher/TeacherDashboard.tsx
- src/pages/admin/AdminDashboard.tsx
- src/components/CourseCard.tsx
- src/data/mock.ts

## Notes
- All data is mocked in-memory. Replace with API calls as needed.
- The upload action is simulated; wire to a backend to handle real file storage.
