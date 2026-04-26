# 🎓 Unified Academic Portal - Comprehensive Technical Documentation

## 1. Project Overview

**Purpose:** A full-stack Learning Management System (LMS) with integrated AI capabilities, real-time collaboration, and comprehensive academic management features.

**Problem Solved:** This project addresses the need for a unified academic platform that consolidates course management, assignment handling, real-time lectures, AI-powered assistance, and student progress tracking into a single cohesive system.

**High-Level Functionality:**

- Role-based access control for students, faculty, TAs, and admins
- Course enrollment and management
- Assignment submission with file/code/GitHub support
- Real-time video lectures with WebRTC
- AI-powered chatbot with RAG
- Automated grading and plagiarism detection
- Gamification with XP, badges, leaderboards
- Proctoring with face detection
- Discussion forums and real-time chat

## 2. Features

### 2.1 Core LMS (7 features)

- Role-Based Access Control (student, faculty, TA, admin)
- Course management and enrollment
- TA assignment system
- Assignment creation and submission
- GitHub integration
- Cloud storage for files
- Secure authentication

### 2.2 Learning Content (5 features)

- PYQ repository
- Notes management
- Discussion forums
- Real-time chat
- Course resources sharing

### 2.3 Lectures & Teaching (4 features)

- Live WebRTC lectures
- Recorded lecture playback
- Interactive video quizzes
- Lecture management

### 2.4 Coding Platform (6 features)

- Monaco editor with 7+ languages
- Judge0 code execution
- Auto-grading
- Quiz system
- Timed assessments
- Plagiarism detection

### 2.5 AI-Powered (24 features)

- RAG-based chatbot
- Viva simulator
- AI grading
- Plagiarism detection (3-tier)
- Course material analysis

### 2.6 Novel Features (24 features)

- Course planner
- Success dashboard
- At-risk student detection
- Smart notifications

### 2.7 Gamification (5 features)

- XP system
- Achievement badges
- Streak tracking
- Leaderboards
- Quiz rewards

### 2.8 Proctoring (5 features)

- Face detection
- Exam monitoring
- Violation detection
- Real-time alerts
- Session control

### 2.9 DevOps/CI-CD (6 features)

- GitHub Actions
- Automated testing
- Security scanning
- Code quality checks

### 2.10 Backend Systems (6 features)

- 80+ REST endpoints
- GraphQL APIs
- Socket.IO real-time
- Swagger docs

### 2.11 Database (5 features)

- PostgreSQL with 50+ tables
- 3NF normalized
- Connection pooling

### 2.12 Mobile App (5 features)

- React Native
- iOS & Android
- Feature parity

### 2.13 Security (8 features)

- JWT authentication
- bcrypt hashing
- RBAC
- HTTPS ready

## 3. Tech Stack

**Backend:**

- Node.js + Express.js (ES modules)
- PostgreSQL with pg driver
- Socket.IO for WebSockets
- bcrypt, jsonwebtoken, multer
- Groq API + LangChain for AI

**Frontend:**

- React 19 + TypeScript
- Vite build tool
- React Router DOM
- Socket.IO client
- Monaco Editor
- Axios for HTTP

**Infrastructure:**

- Vercel (frontend)
- Railway/Render (backend)
- Cloudinary/AWS S3 (storage)
- Judge0 (code execution)

## 4. Project Architecture

**Structure:** Monolithic backend with microservices pattern, separate React SPA frontend.

**Components:**

- Express server with REST API + WebSocket
- PostgreSQL database (50+ tables)
- React frontend with lazy-loaded routes
- Socket.IO for real-time communication
- AI services via LangChain/Groq

**Design Patterns:** MVC, Repository, Singleton, Observer, Strategy, Middleware Chain

## 5. Folder Structure

```
FYP-Project/
├── backend/
│   ├── controllers/     # Business logic (35+ files)
│   ├── routes/          # API endpoints (19 files)
│   ├── middleware/      # Auth, upload
│   ├── db/              # Database layer
│   ├── prisma/          # Schemas/migrations
│   ├── scripts/         # Seed scripts
│   └── __tests__/       # Test suites
├── frontend/
│   ├── src/
│   │   ├── components/  # 70+ components
│   │   ├── pages/       # 30+ pages
│   │   ├── features/    # Feature modules
│   │   ├── context/     # React Context
│   │   └── App.tsx      # Main router
└── README.md
```

## 6. Component Breakdown

### Authentication System

- **Files:** authController.js, auth.js routes, AuthContext.tsx
- **Flow:** Login → JWT generation → Token storage → Protected routes
- **Security:** bcrypt hashing, 7-day JWT expiry, role mapping

### Course Management

- **Tables:** courses, course_offerings, enrollments, ta_assignments
- **Endpoints:** CRUD for courses, enrollment, TA assignment
- **Features:** Term-based offerings, capacity limits

### Assignment System

- **Tables:** assignments, assignment_submissions, submission_files, code_submissions
- **Types:** File upload, code, GitHub, mixed
- **Flow:** Submit → Store → Grade → Feedback

### Live Lectures

- **Tables:** live_lectures, whiteboard_states, live_lecture_students
- **Events:** join, webrtc-signal, chat, whiteboard, screen-share
- **Features:** WebRTC P2P, recording, whiteboard, attendance

### AI Chatbot

- **Files:** chatbotController.js, aiAssistantController.js
- **Tech:** LangChain, Groq LLM, RAG, vector search
- **Flow:** Question → Context retrieval → LLM → Response

### Proctoring

- **Tables:** proctoring_sessions, proctoring_violations
- **Events:** join-session, violation-alert, suspend/resume
- **Features:** Face detection, violation tracking, real-time alerts

## 7. API Documentation

**Authentication:**

- POST /api/auth/register - Register user
- POST /api/auth/login - Login
- POST /api/auth/logout - Logout

**Courses:**

- GET /api/courses - List courses
- POST /api/courses/:id/enroll - Enroll

**Assignments:**

- GET/POST /api/assignments - CRUD
- POST /api/assignments/:id/submit - Submit

**Submissions:**

- GET /api/submissions - List
- PUT /api/submissions/:id/grade - Grade

**Quizzes:**

- GET/POST /api/quizzes - CRUD
- POST /api/quizzes/:id/attempt - Start

**WebSocket Events:**

- join-live-lecture, webrtc-signal, lecture-chat-message
- whiteboard-draw, raise-hand, proctoring-violation

## 8. Database Design

**50+ Tables including:**

- users, departments, courses, course_offerings
- enrollments, ta_assignments, assignments
- assignment_submissions, submission_files, code_submissions
- quizzes, quiz_questions, quiz_attempts
- live_lectures, whiteboard_states
- proctoring_sessions, proctoring_violations
- user_xp, achievements (gamification)

**Key Relationships:**

- courses → course_offerings → enrollments
- assignments → assignment_submissions → submission_files
- quizzes → quiz_questions → quiz_attempts

## 9. Data Flow

**User Login:**

1. POST /api/auth/login with credentials
2. Validate → bcrypt compare → Check is_active
3. Generate JWT → Return {user, token}
4. Store in localStorage → Redirect

**Assignment Submission:**

1. POST with file/code
2. Validate → Upload to Cloudinary
3. INSERT submissions → INSERT files
4. Execute code (if applicable) → Auto-grade
5. Socket.IO notify teacher

**Live Lecture:**

1. Create lecture → Join WebRTC room
2. Exchange SDP offers via Socket
3. ICE candidates for NAT traversal
4. P2P video established
5. Chat/messages via Socket

## 10. Setup & Installation

**Prerequisites:** Node.js 18+, PostgreSQL 12+, npm

**Steps:**

1. Clone repository
2. cd backend && npm install
3. cd frontend && npm install
4. Create .env with DATABASE_URL, JWT_SECRET
5. Set up PostgreSQL database
6. Run: node scripts/seed-all-features.js
7. Terminal 1: cd backend && npm run dev
8. Terminal 2: cd frontend && npm run dev
9. Access: http://localhost:5173

**Test:** npm test (285+ tests, 80%+ coverage)

## 11. Configuration

**Environment Variables:**

- PORT, NODE_ENV, FRONTEND_URL
- DATABASE_URL (PostgreSQL)
- JWT_SECRET
- CLOUDINARY credentials
- GROQ_API_KEY
- Google OAuth credentials

**CORS:** All origins in dev, whitelist in prod
**Body Limits:** 500mb uploads
**Socket:** Ping timeout 60s, transports: WebSocket + Polling

## 12. Testing

**Framework:** Jest (backend), Vitest (frontend)
**Coverage:** 285+ tests, 80%+ overall

**Run Tests:**

- npm test (all)
- npm run test --workspace=backend
- npm run test --workspace=frontend
- npm run test:watch (watch mode)

**Coverage by Category:** All 13 categories covered

## 13. Deployment

**Frontend:** Vercel/Netlify
**Backend:** Railway/Render/AWS
**Database:** Managed PostgreSQL (AWS RDS, Supabase)

**Production Checklist:**

- NODE_ENV=production
- Strong JWT_SECRET
- Database SSL enabled
- CORS whitelist configured
- Rate limiting enabled
- Monitoring setup (Sentry, LogRocket)
- Automated backups

## 14. Error Handling

**Levels:**

- 400: Validation errors
- 401: Authentication errors
- 403: Authorization errors
- 404: Not found
- 500: Server errors

**Logging:** Winston logger with file + console transports
**Middleware:** Centralized error handler with stack traces

## 15. Performance

**Optimizations:**

- Database connection pooling
- Indexed frequent queries
- Code splitting with React.lazy
- Room-based WebSocket broadcasting
- CDN for media (Cloudinary)

**Bottlenecks:**

- Large file uploads (no chunking)
- N+1 queries possible
- WebSocket memory scaling
- AI API dependencies
- WebRTC peer limits

## 16. Security

**Implemented:**

- JWT authentication with 7-day expiry
- bcrypt password hashing (10 rounds)
- RBAC with role hierarchy
- Parameterized SQL queries
- CORS configuration
- Error message sanitization

**Recommended:**

- Add Helmet.js
- Rate limiting
- CSRF protection
- httpOnly cookies for JWT
- 2FA for admin
- IP whitelisting

## 17. Limitations

1. No Redis adapter for Socket.IO scaling
2. No chunked file uploads
3. No message persistence for WebSocket
4. Dependent on external AI APIs
5. Limited test coverage for E2E
6. No APM/monitoring
7. WebRTC doesn't scale beyond small groups

## 18. Future Improvements

**High Priority:** Redis, rate limiting, chunked uploads, Helmet.js
**Medium Priority:** Pagination, caching, monitoring, optimized queries
**Low Priority:** Multi-language, offline mode, themes, i18n

---

_Documentation generated from codebase analysis, April 2026_
