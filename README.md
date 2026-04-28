
# TECHNICAL DOCUMENTATION: UNIFIED ACADEMIC PORTAL (LMS)

--------------------------------
1. SYSTEM OVERVIEW
--------------------------------
The Unified Academic Portal is a specialized Learning Management System (LMS) designed for higher education institutions. The system facilitates a complete academic lifecycle, from course enrollment and resource management to assignment evaluation and AI-driven student support. 

Key objectives include:
- Centralization of academic resources (Videos, PDFs, Code).
- Automation of administrative tasks (Grading, Progress Tracking).
- Enhancement of student engagement through AI and Gamification.
- Minimization of infrastructure overhead via the "Orchestration over Hosting" model.

--------------------------------
2. FUNCTIONAL MODULES
--------------------------------

### 2.1 Video Portal & Interactive Learning
- **Core Functionality**: Centralized hub for lecture videos hosted on YouTube or Google Drive.
- **Key Features**: 
    - Synchronized quiz overlays that trigger at specific video timestamps.
    - AI-generated video sections and transcripts for improved searchability.
    - Real-time synchronization between video playback and sidebar quiz content.
- **Specific Metrics**:
    - **Latency**: Time to load video metadata and quiz overlays (To be measured).
    - **Throughput**: Support for concurrent video streams (Limited by YouTube/Google Drive).
    - **Reliability**: % of quiz overlays successfully triggered at exact timestamp (To be measured).

### 2.2 Live Lecture Management
- **Core Functionality**: Orchestrates live virtual sessions using external providers (Google Meet, Zoom).
- **Key Features**: 
    - Scheduling and automated link distribution.
    - Role-based session access for students and faculty.
    - Integration with the Course Planner for automated calendar updates.
- **Specific Metrics**:
    - **Availability**: System uptime for scheduled session links (Benchmark: 99.9%).
    - **Usability**: Ease of session entry for students (Benchmark: SUS > 85).

### 2.3 Assignment & Evaluation System
- **Core Functionality**: Multi-modal assignment submission and grading engine.
- **Submission Types**:
    - **PDF/File**: Direct upload to orchestrated Google Drive folders.
    - **GitHub**: Linkage of student repositories with automated repository access for graders.
    - **Mixed**: Hybrid submissions containing both written content and files.
- **Evaluation**: Integrated grading dashboard with automated plagiarism detection (Tesseract-based OCR for images/PDFs).
- **Specific Metrics**:
    - **Throughput**: Concurrent file submissions handled (Benchmark: 50/sec - external limit).
    - **Reliability**: Successful file transfer rate to Google Drive (To be measured).

### 2.4 AI Assistant & Discussion
- **Core Functionality**: RAG (Retrieval-Augmented Generation) powered chatbot for course-specific queries.
- **Key Features**:
    - OCR-based document analysis for student-uploaded files.
    - Persistent chat history across sessions.
    - Discussion forum for peer-to-peer and instructor-student communication.
- **Specific Metrics**:
    - **Latency**: Time to first token (TTFT) for AI responses (Benchmark: 0.3s - 0.5s via Groq).
    - **Accuracy**: Relevance of RAG context retrieval (To be measured).

### 2.5 Success Center & Gamification
- **Core Functionality**: Analytics and engagement engine.
- **Key Features**:
    - XP (Experience Points) and Leveling system based on assignment performance.
    - Achievements and digital badges for academic milestones.
    - Personal success dashboard with progress visualizations.
- **Specific Metrics**:
    - **Latency**: Dashboard rendering time for complex analytics (Benchmark: < 500ms).
    - **Scalability**: XP calculation overhead for large student cohorts (To be measured).

--------------------------------
3. SYSTEM ARCHITECTURE (TEXTUAL DESCRIPTION)
--------------------------------

Architecture Description:
- **Layer 1: Presentation Layer**: A responsive Single Page Application (SPA) built with React. Utilizing Vite for optimized builds and Framer Motion for high-fidelity UI transitions.
- **Layer 2: Orchestration Layer (Backend)**: Express.js server acting as a coordinator. It handles business logic, security enforcement (RBAC), and manages communication with external service providers.
- **Layer 3: Data & Persistence Layer**: PostgreSQL database managed via Prisma ORM for relational data (users, course metadata, grades). External storage (Google Drive) handles large binary assets.
- **Data flow**:
    1. User interacts with React SPA.
    2. SPA makes authenticated API calls to the Express.js Backend.
    3. Backend validates roles and persists metadata in PostgreSQL.
    4. Backend orchestrates asset management with external APIs (Google, YouTube, GitHub, OpenRouter).
    5. Responses are returned to the SPA for state updates.
- **External systems**:
    - Google Workspace (Drive, Meet, OAuth).
    - YouTube Data API (Video hosting).
    - GitHub REST API (Code submissions).
    - OpenRouter API (AI services - Unified Gemini 1.5 Flash Free).
    - Judge0 (Code execution).

### Textual Diagram Description:
The system follows a "Hub-and-Spoke" model where the **Express.js Backend** is the central hub.
- Arrows point outward from the Hub to **External APIs** (Google, YouTube, etc.) representing orchestration requests.
- A bi-directional arrow connects the Hub to the **PostgreSQL Database** for metadata storage.
- A bi-directional arrow connects the Hub to the **React Frontend** for client-server communication.
- The **User** interacts only with the Frontend, maintaining a clean separation of concerns.

--------------------------------
4. DATA FLOW
--------------------------------

The system processes data through four distinct phases:
1. **Ingestion**: Students upload files or link repositories; teachers create assignments and upload video links.
2. **Orchestration**: Files are streamed directly to Google Drive; video metadata is synced with YouTube; AI requests are routed to OpenRouter (Gemini/GPT).
3. **Persistence**: Transactional data (grades, enrollment, XP) is stored in the local PostgreSQL database. External IDs (Drive File IDs, YouTube IDs) are stored as references.
4. **Delivery**: Content is retrieved from external providers on-demand and served to the client via authenticated links.

--------------------------------
5. DESIGN DECISIONS AND TRADE-OFFS
--------------------------------

### 5.1 Design Decision: Orchestration vs. Native Hosting
- **Reasoning**: To eliminate server-side storage costs and leverage the global CDN capabilities of Google and YouTube.
- **Trade-off**: Increased dependency on external service availability and API rate limits.

### 5.2 Design Decision: Relational Database (PostgreSQL)
- **Reasoning**: Academic data (grades, enrollment) is highly relational and requires strict ACID compliance.
- **Trade-off**: Higher complexity in schema migrations compared to NoSQL alternatives.

### 5.3 Design Decision: Client-Side Rendering (React)
- **Reasoning**: To provide a premium, app-like experience with smooth transitions (Framer Motion).
- **Trade-off**: Initial bundle size and SEO complexity (mitigated by lazy loading).

--------------------------------
6. SYSTEM EVALUATION FRAMEWORK
--------------------------------

### 6.1 Core System Metrics

Metric Name: API Response Latency
Definition: The time taken from an HTTP request reaching the backend to the first byte of the response.
Measurement Method: Integration of middleware logging (e.g., Morgan or custom timers).
Tools Required: New Relic, Datadog, or custom Winston logs.
Benchmark (if available): 50–300 ms for standard REST endpoints.
Applicability: All internal API routes.

Metric Name: Throughput
Definition: The number of requests the system can handle per second.
Measurement Method: Load testing with simulated concurrent users.
Tools Required: Apache JMeter or k6.
Benchmark (if available): 100+ req/sec (Target for campus-level load).
Applicability: Backend server capacity.

Metric Name: Scalability
Definition: System behavior as user load increases.
Measurement Method: Vertical scaling (RAM/CPU) and horizontal scaling (Instance count).
Tools Required: Cloud monitoring (Render/Railway Dashboards).
Benchmark (if available): Linear performance up to 1000 concurrent users.
Applicability: System-wide.

Metric Name: Reliability
Definition: The probability that the system will perform its required function under stated conditions.
Measurement Method: Error rate tracking (HTTP 5xx).
Tools Required: Sentry or ELK Stack.
Benchmark (if available): < 0.1% error rate.
Applicability: Critical paths (Submissions, Quizzes).

Metric Name: Availability
Definition: The percentage of time the system is operational and accessible.
Measurement Method: Uptime monitoring.
Tools Required: UptimeRobot or Pingdom.
Benchmark (if available): 99.9% (excluding external service downtime).
Applicability: Global.

Metric Name: Usability
Definition: The ease of use and learnability of the system.
Measurement Method: System Usability Scale (SUS) surveys.
Tools Required: User feedback forms.
Benchmark (if available): SUS Score > 80.
Applicability: Frontend UI/UX.

Metric Name: Cost
Definition: Monthly expenditure for operating the system.
Measurement Method: Invoice tracking from cloud providers and APIs.
Tools Required: Financial spreadsheets.
Benchmark (if available): $0.00 (within free-tier limits).
Applicability: Infrastructure management.

### 6.2 Feature-Specific Metrics

Metric Name: API Response Latency (Internal)
Definition: Time from client request to backend response header.
Measurement Method: To be measured upon deployment.
Target Baseline: 50ms - 200ms (Warm); 30s - 60s (Cold Start).
Estimation Source: Extrapolated from representative cloud free-tier benchmarks for Node.js.
Applicability: Global API.

Metric Name: Database Query Throughput
Definition: Number of concurrent read/write operations per second.
Measurement Method: To be measured via load testing.
Target Baseline: ~15-20 req/sec (Single CPU instance).
Estimation Source: Extrapolated from representative shared PostgreSQL instance limits.
Applicability: PostgreSQL Database.

Metric Name: GitHub Repo Access Latency
Definition: Time taken to verify and link a student repository.
Measurement Method: Backend API call logging to GitHub.
Tools Required: Custom middleware timers.
Benchmark (if available): < 1.5 seconds.
Applicability: Assignment System.

--------------------------------
7. METRICS AND BENCHMARKS
--------------------------------

Metric: OpenRouter API Quotas
Source: OpenRouter Official Documentation
Original Context: Varies by model; typically high RPM for paid tiers.
Adaptation to This System (Estimation): System utilizes Gemini 1.5 Flash Free to ensure high availability and zero cost.

Metric: AI Inference Throughput
Source: Provider Benchmarks (Google via OpenRouter)
Original Context: Gemini 1.5 Flash supports extremely high token throughput.
Adaptation to This System (Estimation): AI Assistant response times are optimized for speed using Flash models on the free tier.

Metric: GitHub API Rate Limits
Source: GitHub REST API Documentation
Original Context: 5,000 requests per hour for authenticated users.
Adaptation to This System (Fact): System capacity is strictly bound by GitHub's standard rate limiting (5k/hr).

Metric: System Scalability (User Count)
Source: NCES / College Enrollment Data
Original Context: Mid-sized technical colleges average 2,500 - 4,000 students.
Adaptation to This System (Target): Architecture is designed to support a peak concurrent load of ~500 users based on standard educational workload patterns.

Metric: Security Compliance
Source: OWASP ASVS Level 1
Original Context: Foundational security verification for black-box testing.
Adaptation to This System (Target): Authentication mechanisms are modeled after ASVS Level 1 best practices.

Metric: Judge0 Latency
Source: Judge0 Public Instance Benchmarks
Original Context: Typical response times in the 200ms to 500ms range for shared instances.
Adaptation to This System (Estimation): Total round-trip time for code execution is estimated at 1-3 seconds including network overhead.

--------------------------------
8. AI MODULE ANALYSIS (IF APPLICABLE)
--------------------------------
Include:
- **Failure cases**: Inability to parse low-resolution images in OCR; OpenRouter API downtime.
- **Hallucination risk**: AI may provide incorrect code explanations or course facts if the RAG context is insufficient.
- **Fallback mechanisms**: System defaults to manual search or instructor contact if AI fails.
- **Evaluation strategy**: Continuous monitoring of AI response relevance using a feedback loop (Thumb up/down).

--------------------------------
9. EXTERNAL DEPENDENCY ANALYSIS
--------------------------------

Dependency: Google Drive API
Risk: API key compromise or quota exhaustion.
Rate Limits: 20,000 requests per 100 seconds.
Failure Scenario: Students cannot upload assignments.
Mitigation: Implementation of retry logic and monitoring of quota usage.

Dependency: OpenRouter API
Risk: Model degradation or rate limiting.
Rate Limits: Provider dependent (Free/Paid).
Failure Scenario: AI Assistant becomes unresponsive.
Mitigation: Rate limiting on the frontend to prevent abuse; caching frequent queries.

Dependency: YouTube API
Risk: Video access restricted by YouTube policies.
Rate Limits: 10,000 quota units per day.
Failure Scenario: Lecture videos fail to load or metadata sync fails.
Mitigation: Use of YouTube's standard embed player as a fallback.

--------------------------------
10. SECURITY CONSIDERATIONS
--------------------------------
Include:
- **Authentication risks**: Token theft (mitigated by short-lived JWTs and Secure HttpOnly cookies).
- **Authorization risks**: Privilege escalation (mitigated by strict RBAC middleware on all API routes).
- **Data leakage**: Unauthorized access to Google Drive files (mitigated by programmatic permission granting to specific teacher emails).
- **API misuse**: Automated scraping of course content (mitigated by rate limiting and CAPTCHA on sensitive routes).
- **Mitigation**: Regular dependency audits and environment variable encryption.

--------------------------------
11. COMPLEXITY ANALYSIS
--------------------------------
Include:
- **Time complexity**: O(1) for metadata retrieval; O(n) for course-wide statistics where n is the number of enrollments.
- **Space complexity**: O(n) for metadata storage in PostgreSQL; O(m) for external storage where m is the total size of uploaded assets.
- **System scaling complexity**: Horizontal scaling of the Express.js server is O(1) as the backend is stateless (JWT-based).

--------------------------------
12. LIMITATIONS AND CONSTRAINTS
--------------------------------
- **Storage Constraints**: Limited by Google Drive free tier (15GB shared across the account).
- **Rate Constraints**: High-frequency AI usage may hit OpenRouter's rate limits.
- **Browser Constraints**: Performance may degrade on low-spec client devices due to heavy Framer Motion animations.
- **Network Constraints**: Direct dependency on external provider uptime.