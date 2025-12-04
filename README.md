# Edu Portal - Comprehensive Documentation

## Project Overview

Edu Portal is a comprehensive educational platform designed to facilitate online learning and teaching. It provides a role-based system supporting students, teachers, teaching assistants (TAs), and administrators. The platform offers a wide range of features including course management, assignments, quizzes, interactive videos, code challenges, proctoring, gamification, and AI-powered chatbot assistance.

## Hackathon Submission Checklist

This project meets all requirements for Hackathon submission:

- [x] **Complete Source Code**: Full open-source codebase available
- [x] **Detailed README**: Comprehensive documentation with setup instructions
- [x] **Architecture Documentation**: Detailed system architecture and design
- [x] **Sample Data/Test Cases**: Included seed data and test scripts
- [x] **License Information**: MIT License included

### Key Features

- **Role-Based Access Control**: Separate interfaces and permissions for students, teachers, TAs, and admins
- **Course Management**: Create and manage course offerings with enrollment capabilities
- **Assignment System**: Support for file uploads and code-based assignments with automated grading and plagiarism detection
- **Quiz System**: Create and manage quizzes with proctoring capabilities
- **Interactive Videos**: Video content with embedded questions and progress tracking
- **Code Challenges**: Programming questions with test case validation and code execution
- **Discussion Forums**: Course-specific discussion threads for student-teacher interaction
- **Resource Management**: Upload and organize study materials (notes, PYQs, presentations)
- **Proctoring System**: Real-time monitoring of quiz attempts with violation detection
- **Gamification**: Achievement system with badges, leaderboards, and progress tracking
- **AI Chatbot**: Integrated chatbot using Groq AI for student assistance
- **Messaging System**: Direct messaging between users
- **Analytics Dashboard**: Comprehensive analytics for administrators and teachers

## Tech Stack

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens) with bcrypt password hashing
- **File Storage**: AWS S3 / Cloudinary integration
- **AI Integration**: Groq SDK for chatbot functionality
- **Real-time Communication**: Socket.IO
- **API Documentation**: Swagger/OpenAPI
- **OCR Processing**: Tesseract.js
- **PDF Processing**: pdf-parse, mammoth (for Word documents)
- **Code Execution**: Judge0 API integration
- **Monitoring**: Custom logging system

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: CSS Modules with custom design system
- **Code Editor**: Monaco Editor (VS Code-like)
- **Video Player**: HTML5 Video with custom controls
- **Charts**: Custom chart components
- **State Management**: React Context API
- **Routing**: React Router DOM v7
- **HTTP Client**: Axios
- **Real-time Updates**: Socket.IO Client
- **Face Detection**: face-api.js (for proctoring)

### Development Tools
- **Version Control**: Git
- **Package Management**: npm
- **Linting**: ESLint
- **Type Checking**: TypeScript
- **Testing**: Not implemented (marked for future development)

## System Architecture

### Backend Architecture

The backend follows a modular architecture with clear separation of concerns:

```
backend/
├── controllers/     # Business logic handlers
├── routes/         # API route definitions with Swagger docs
├── middleware/     # Authentication, validation, file upload
├── prisma/         # Database schema and migrations
├── utils/          # Helper functions (gamification, logging, pagination)
├── agents/         # AI chatbot agents
└── index.js        # Main application entry point
```

**Key Components:**
- **Controllers**: Handle HTTP requests and responses, implement business logic
- **Routes**: Define API endpoints with comprehensive Swagger documentation
- **Middleware**: Authentication (JWT), role-based access control, file uploads
- **Database Layer**: Prisma ORM for type-safe database operations
- **Utils**: Reusable utilities for gamification, logging, and pagination

### Frontend Architecture

The frontend uses a component-based architecture with React:

```
frontend/src/
├── components/     # Reusable UI components
├── pages/         # Page-level components (role-specific)
├── services/      # API service functions
├── context/       # React Context for state management
├── hooks/         # Custom React hooks
├── data/          # Mock data and type definitions
├── routes/        # Route protection and navigation
└── assets/        # Static assets (images, icons)
```

**Key Components:**
- **Components**: Modular, reusable UI elements (CodeEditor, Chatbot, QuizCreator, etc.)
- **Pages**: Role-specific page components organized by user type
- **Services**: API integration layer with Axios
- **Context**: Global state management (Auth, Theme, Course contexts)
- **Routes**: Protected routes with role-based access control

### Database Schema

The system uses PostgreSQL with the following core entities:

#### Core Entities
- **users**: User accounts with role-based access (student, faculty, ta, admin)
- **departments**: Academic departments
- **courses**: Course catalog
- **course_offerings**: Specific course instances with faculty assignment
- **enrollments**: Student-course relationships
- **ta_assignments**: Teaching assistant assignments

#### Learning Content
- **assignments**: Course assignments with file/code submissions
- **assignment_submissions**: Student submissions with grading
- **code_submissions**: Programming assignment submissions
- **quizzes**: Quiz definitions with proctoring options
- **quiz_questions**: Individual quiz questions
- **quiz_attempts**: Student quiz attempts with scoring
- **videos**: Video content with interactive questions
- **resources**: File resources (notes, PYQs, presentations)

#### Communication & Collaboration
- **discussion_messages**: Course discussion forums
- **chat_sessions**: AI chatbot conversation sessions
- **chat_messages**: Chatbot message history
- **notifications**: System notifications
- **messages**: Direct messaging between users

#### Gamification & Analytics
- **achievements**: Gamification badges and rewards
- **user_achievements**: User-earned achievements
- **progress_tracking**: Learning progress analytics
- **proctoring_sessions**: Quiz monitoring sessions
- **violation_logs**: Proctoring violation records

#### Academic Integrity
- **plagiarism_checks**: Plagiarism detection check records
- **plagiarism_matches**: Detailed similarity matches between submissions

## Sample Data and Test Cases

The project includes comprehensive sample data and test cases to demonstrate functionality and facilitate development/testing.

### Database Seed Data

Several SQL seed files are provided in the `backend/` directory:

- `comprehensive-seed-data.sql`: Full dataset with users, courses, assignments, quizzes, etc.
- `minimal-seed-data.sql`: Basic setup with essential data
- `simple-seed-data.sql`: Minimal data for quick testing
- `comprehensive-test-seed.sql`: Test-specific data
- `simple-test-seed.sql`: Simple test data

To populate the database with sample data:

1. Ensure PostgreSQL is running and database is created
2. Run the appropriate seed script:
   ```bash
   cd backend
   psql -U your_username -d edu_portal -f comprehensive-seed-data.sql
   ```

### Test Scripts

JavaScript test scripts are available for API testing:

- `test-database.js`: Database connectivity and basic operations
- `test-new-apis.js`: Test new API endpoints
- `test-quiz-results.js`: Quiz functionality testing
- `test-video-lecture-functionality.js`: Video lecture features

Run tests with:
```bash
cd backend
node test-database.js
```

### Sample Users

After seeding, you can log in with these sample accounts:

- **Admin**: admin@example.com / admin123
- **Faculty**: faculty@example.com / faculty123
- **Student**: student@example.com / student123
- **TA**: ta@example.com / ta123

## API Endpoints

The API is fully documented with Swagger and organized by functionality:

### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /google` - Google OAuth login
- `GET /user/:id` - Get user details

### Courses (`/api/courses`)
- `GET /` - List all courses
- `POST /` - Create new course (faculty/admin)
- `GET /:offeringId/resources` - Get course resources
- `GET /:offeringId/pyqs` - Get previous year questions
- `GET /:offeringId/notes` - Get course notes
- `GET /:offeringId/assignments` - Get course assignments
- `POST /:courseId/offerings` - Create course offering
- `POST /offerings/:offeringId/enroll` - Enroll users
- `DELETE /offerings/:offeringId/enroll` - Unenroll from course

### Assignments (`/api/assignments`)
- `GET /:id` - Get assignment details
- `POST /` - Create assignment
- `POST /:id/publish` - Publish assignment
- `GET /:id/submissions` - List assignment submissions
- `POST /submissions/:id/grade` - Grade submission
- `GET /:id/plagiarism-checks` - Get plagiarism check history
- `POST /:id/run-plagiarism-check` - Run plagiarism check
- `GET /:id/plagiarism-matches/:checkId` - Get detailed plagiarism matches

### Quizzes (`/api/quizzes`)
- `POST /` - Create quiz
- `GET /:quizId` - Get quiz (student view)
- `GET /:quizId/grading` - Get quiz with answers (grading)
- `POST /attempts` - Submit quiz attempt
- `GET /:quizId/attempts` - List quiz attempts
- `PATCH /attempts/:attemptId/grade` - Grade quiz attempt
- `POST /attempts/:attemptId/suspend` - Suspend quiz attempt
- `POST /attempts/:attemptId/resume` - Resume suspended attempt

### Chatbot (`/api/chatbot`)
- `POST /chat` - Send message to AI chatbot
- `POST /document/upload` - Upload document for chat context
- `GET /documents` - List user documents
- `POST /chats` - Save chat session
- `GET /chats` - Load user chat sessions
- `GET /chats/:sessionId` - Load specific chat session
- `DELETE /chats/:sessionId` - Delete chat session

### Additional Endpoints
- **Users**: User management and profiles
- **Resources**: File upload and management
- **Progress**: Learning analytics and tracking
- **Proctoring**: Real-time monitoring and violation detection
- **Gamification**: Achievements and leaderboards
- **Videos**: Video content management
- **Messages**: Direct messaging system
- **Monitoring**: System health and analytics

## Plagiarism Detection System

The Edu Portal includes a comprehensive plagiarism detection system that supports multiple assignment types:

### Supported Assignment Types
- **Code Assignments**: Uses Stanford Moss (Measure of Software Similarity) for detecting code plagiarism
- **File Assignments**: Supports text documents including:
  - Plain text files (.txt)
  - PDF documents (.pdf)
  - Microsoft Word documents (.docx)
  - Other text-based formats

### Features
- **Real-time Checking**: Automatic plagiarism detection on each submission
- **Manual Triggers**: Faculty can manually run checks anytime
- **Similarity Scoring**: Percentage-based similarity scores for file assignments
- **Detailed Reports**: Moss provides HTML reports with highlighted matching sections
- **Database Storage**: All check results and matches are stored for audit trails

### Technical Implementation
- **Code Detection**: Integrates with Stanford Moss via Perl script execution
- **Text Analysis**: Uses string-similarity library for document comparison
- **File Processing**: Extracts text from PDFs and Word documents using pdf-parse and mammoth
- **API Integration**: RESTful endpoints for check management and result retrieval

### Setup Requirements
- **Perl Installation**: Required for Moss code checking (Strawberry Perl recommended for Windows)
- **Moss Account**: Register at http://theory.stanford.edu/~aiken/moss/ for production use
- **Node Dependencies**: string-similarity, pdf-parse, mammoth (already included)

### Usage
Faculty can access plagiarism controls in the assignment details panel for supported assignment types. The system automatically runs checks on new submissions and provides historical check data with direct links to detailed reports.

## Frontend Structure

### Component Categories

#### Core UI Components
- **Layout**: Main application layout with navigation
- **Modal**: Reusable modal dialogs
- **ToastProvider**: Notification system
- **ThemeToggle**: Dark/light theme switching
- **LoadingScreen**: Loading states

#### Educational Components
- **CourseCard**: Course display cards
- **CodeEditor**: Monaco-based code editor with proctoring
- **QuizCreator**: Quiz creation interface
- **AssignmentProgress**: Progress tracking for assignments
- **InteractiveVideoPlayer**: Video player with embedded questions
- **Chatbot**: AI assistant interface
- **Leaderboard**: Gamification leaderboards

#### Course-Specific Components
- **NotesList**: Display course notes
- **PyqList**: Previous year questions
- **DiscussionForum**: Course discussion threads
- **VideoQuestionManager**: Manage video-embedded questions

### Page Structure

#### Public Pages
- **Landing**: Marketing/homepage
- **Login**: User authentication
- **Signup**: User registration
- **Forgot/Reset**: Password recovery

#### Student Pages
- **StudentDashboard**: Enrolled courses overview
- **CourseDetails**: Course content and assignments
- **QuizTake**: Quiz attempt interface
- **StudentProfile**: Student profile management

#### Teacher Pages
- **TeacherDashboard**: Course management overview
- **QuizGrader**: Quiz grading interface
- **ProctoringDashboard**: Proctoring monitoring
- **SuspendedQuizzes**: Manage suspended quiz attempts
- **FacultyProfile**: Teacher profile

#### Admin Pages
- **AdminDashboard**: System administration
- **AdminProfile**: Admin profile

### State Management

The application uses React Context for global state:

- **AuthContext**: User authentication and role management
- **ThemeContext**: Dark/light theme state
- **CourseContext**: Current course and enrollment data

## Setup and Installation

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn package manager
- Git

### Backend Setup

1. **Clone and navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create `.env` file with required variables:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/edu_portal
   JWT_SECRET=your_jwt_secret_key
   GROQ_API_KEY=your_groq_api_key
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret
   AWS_ACCESS_KEY_ID=your_aws_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret
   ```

4. **Database Setup:**
   ```bash
   # Run database migrations
   npm run migrate
   ```

5. **Start Development Server:**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create `.env` file:
   ```
   VITE_API_BASE_URL=http://localhost:3000/api
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   ```

### Production Deployment

1. **Build Frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start Backend:**
   ```bash
   cd backend
   npm start
   ```

3. **Serve Frontend:**
   Serve the `dist` folder using a web server (nginx, Apache, etc.)

## Development Guidelines

### Code Style and Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with React and TypeScript rules
- **Prettier**: Code formatting (configure in your IDE)
- **Naming Conventions**: camelCase for variables/functions, PascalCase for components
- **File Organization**: Group related files in directories
- **Component Structure**: Use functional components with hooks

### API Development

- **RESTful Design**: Follow REST principles
- **Swagger Documentation**: Document all endpoints with OpenAPI spec
- **Error Handling**: Consistent error response format
- **Authentication**: JWT tokens for protected routes
- **Validation**: Input validation using middleware
- **Pagination**: Implement pagination for list endpoints

### Database Design

- **Prisma ORM**: Type-safe database operations
- **Migrations**: Version-controlled schema changes
- **Relationships**: Proper foreign key constraints
- **Indexing**: Optimize query performance
- **Data Integrity**: Use transactions for complex operations

### Security Considerations

- **Authentication**: JWT with secure secret keys
- **Authorization**: Role-based access control
- **Input Validation**: Sanitize all user inputs
- **File Upload**: Secure file handling with type validation
- **CORS**: Proper CORS configuration
- **Rate Limiting**: Implement rate limiting for API endpoints

### Testing Strategy

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test API endpoints and database operations
- **E2E Tests**: End-to-end user workflow testing
- **Test Coverage**: Aim for 80%+ code coverage

### Performance Optimization

- **Database Queries**: Optimize with proper indexing
- **API Responses**: Implement caching where appropriate
- **Frontend Bundling**: Code splitting and lazy loading
- **Image Optimization**: Compress and optimize images
- **CDN**: Use CDN for static assets

### Deployment Pipeline

- **Version Control**: Git with feature branches
- **CI/CD**: Automated testing and deployment
- **Environment Management**: Separate dev/staging/production
- **Monitoring**: Application performance monitoring
- **Backup**: Regular database backups

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the API documentation at `/api-docs` when the server is running

---

This documentation provides a comprehensive overview of the Edu Portal system. For detailed API specifications, refer to the Swagger documentation available at `/api-docs` when the backend server is running.