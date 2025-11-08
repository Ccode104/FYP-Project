# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository overview
- Monorepo with two apps:
  - backend/: Node.js (ESM) + Express API with PostgreSQL (pg), JWT auth, Swagger docs, optional S3 file handling
  - frontend/: React + TypeScript built with Vite

Common commands

Backend (Express API)
- Install deps
```powershell
cd backend; npm install
```
- Start (development, nodemon)
```powershell
cd backend; npm run start
```
Notes: The "dev" script in backend/package.json points to src/index.js, which does not exist. Prefer npm run start.

- Start without nodemon
```powershell
cd backend; node index.js
```
- Health check and docs
```powershell
# Health
curl http://localhost:4000/health
# Swagger UI
Start-Process http://localhost:4000/api-docs
```
- Apply database schema (requires psql and DATABASE_URL)
```powershell
# Ensure backend/.env has DATABASE_URL set or export it for the session
# Then run:
cd backend; psql "$env:DATABASE_URL" -f prisma/schema.sql
```
- Environment variables (set in backend/.env)
  - DATABASE_URL
  - JWT_SECRET
  - PORT (default 4000)
  - S3_BUCKET, S3_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (only if using S3 features)

Frontend (Vite React TS)
- Install deps
```powershell
cd frontend; npm install
```
- Dev server
```powershell
cd frontend; npm run dev
```
- Type-check and build
```powershell
cd frontend; npm run build
```
- Preview production build
```powershell
cd frontend; npm run preview
```
- Lint (ESLint v9 flat config present)
```powershell
cd frontend; npm run lint
# Lint a single file
echo 'example:'; cd frontend; npx eslint src/pages/Login.tsx
```
- Configure API base URL (dev)
```powershell
# Create frontend/.env (used by Vite) with your API origin
Set-Content -Path frontend/.env -Value "VITE_API_URL=http://localhost:4000"
```

Cross-app local development
- Run backend on http://localhost:4000 (npm run start)
- Run frontend on http://localhost:5173 (npm run dev)
- The frontend uses import.meta.env.VITE_API_URL (default http://localhost:4000) and sends Authorization: Bearer <token> based on localStorage entries set by the login flow.

High-level architecture and data flow

Backend
- Entry and app wiring
  - index.js loads environment (dotenv) and calls startServer(port)
  - server.js creates the Express app, applies CORS and body parsers, mounts routers, exposes /health and Swagger UI at /api-docs
- Routing modules (mounted in server.js)
  - /api/auth → routes/auth.js → authController.js (register, login, user details)
  - /api/courses → routes/courses.js → coursesController.js + resourcesController.js
  - /api/assignments → routes/assignments.js → assignmentsController.js
  - /api/student → routes/student.js → studentController.js
  - /api/users → routes/users.js → usersController.js
  - /api (misc) → routes/extended.js → authExtendedController.js, filesController.js, taController.js, graderWebhookController.js, adminController.js
- AuthN/AuthZ
  - JWTs signed with JWT_SECRET; requireAuth parses Authorization headers and attaches req.user
  - requireRole(...roles) guards role-limited endpoints
- Persistence
  - db/index.js exports a pg Pool based on DATABASE_URL (SSL required)
  - prisma/schema.sql defines the full schema: departments, users (enum role: student/faculty/ta/admin), courses, course_offerings, enrollments, TA assignments, resources, assignments, assignment_submissions (+ files, grades, code_submissions), quizzes (+ questions, attempts), notifications
- Notable controllers
  - authController: registerUser, loginUser, getUserDetails
  - coursesController: create/list courses, create offerings, enroll/unenroll, faculty offerings, offering overview
  - assignmentsController: create/publish/delete assignments; list submissions with joined files
  - studentController: student-centric views (enrolled courses, course details, assignments, submissions, grades, quizzes, enroll)
  - authExtendedController: refresh/logout/password reset via settings table
  - filesController: S3 pre-signed upload/download endpoints
- File handling
  - middleware/upload.ts offers multer and s3.upload helpers; extended routes prefer pre-signed URLs via filesController
- API documentation
  - swagger.js scans ./routes/*.js for JSDoc annotations; served at /api-docs

Frontend
- Composition and routing
  - src/main.tsx mounts BrowserRouter and AuthProvider
  - src/App.tsx defines routes for login/signup and role dashboards; ProtectedRoute enforces auth and role allow-lists
- Auth/session
  - src/context/AuthContext.tsx handles login/logout and stores token in localStorage as "auth:token" and user as "auth:user"
  - Backend roles are mapped for UI: faculty → teacher; admin → ta
- API layer
  - src/services/api.ts reads VITE_API_URL and attaches Bearer token if present; exposes apiFetch/json and apiForm
- UI structure
  - pages/{student,teacher,admin} implement role dashboards; student/CourseDetails.tsx uses tabbed views for assignments/PYQ/notes
  - components: CourseCard, Layout, Modal, ToastProvider, etc.
- Tooling
  - Vite with @vitejs/plugin-react, TypeScript project references; ESLint v9 flat config in eslint.config.js

Additional notes for Warp
- The backend migrate script references prisma/migrations/20251014_additional.sql which is not in the repo. Use prisma/schema.sql with psql as shown above.
- The backend dev script (npm run dev) points to src/index.js which does not exist; use npm run start.

Suggestions to improve existing WARP.md (frontend/WARP.md)
- Remove the note claiming “An ESLint config file is not present”; eslint.config.js exists and is configured for TS + React + Vite.
- Add mention of VITE_API_URL and how the app talks to the backend; include a quick step to create frontend/.env.
- Consider noting that login persists auth:token and auth:user in localStorage and that API requests attach Authorization headers.
