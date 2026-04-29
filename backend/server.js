import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import { createServer } from 'http';
import { Server } from 'socket.io';
// eslint-disable-next-line no-unused-vars
import _path from 'path';
import jwt from 'jsonwebtoken';
import { pool } from './db/index.js';
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import assignmentRoutes from './routes/assignments.js';
import submissionRoutes from './routes/submissions.js';
import quizRoutes from './routes/quizzes.js';
import progressRoutes from './routes/progress.js';
import extendedRoutes from './routes/extended.js';
import { logger } from './utils/logger.js';
import usersRoutes from './routes/users.js';
import studentRoutes from './routes/student.js';
import discussionsRoutes from './routes/discussions.js';
import adminRoutes from './routes/admin.js';
import codeQuestionsRoutes from './routes/codeQuestions.js';
import chatbotRoutes from './routes/chatbot.js';
import monitoringRoutes from './routes/monitoring.js';
import videosRoutes from './routes/videos.js';
import liveLecturesRoutes from './routes/liveLectures.js';
import gamificationRoutes from './routes/gamification.js';
import messagesRoutes from './routes/messages.js';
import taRoutes from './routes/ta.js';
import vivaRoutes from './routes/viva.js';
import rubricsRoutes from './routes/rubrics.js';
import supportRoutes from './routes/support.js';
import quizPermissionsRoutes from './routes/quizPermissions.js';
import githubRoutes from './routes/github.js';
import contestsRoutes from './routes/contests.js';
import courseOfferingsRoutes from './routes/courseOfferings.js';
import aiEditorRoutes from './routes/aiEditorRoutes.js';
import plannerRoutes from './routes/planner.js';
import staffRoutes from './routes/staff.js';
import { createAnalysisTables } from './controllers/codeAnalysisController.js';
import { createAILogTables } from './controllers/aiAssistantController.js';
import { createPlannerTables } from './controllers/plannerController.js';
import swaggerSpec from './swagger.js';
import googleRoutes from './routes/google.js';
import quizBuilderRoutes from './routes/quizBuilderRoutes.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Socket authentication middleware
function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication token missing'));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = { id: payload.id, role: payload.role, email: payload.email };
    next();
    // eslint-disable-next-line no-unused-vars
  } catch (_err) {
    next(new Error('Invalid authentication token'));
  }
}

export async function startServer(port = 4000) {
  const app = express();

  // Ensure AI editor logging tables exist (no-op if already created)
  await createAnalysisTables();
  await createAILogTables();
  await createPlannerTables();

  // Configure server for large file uploads
  const server = createServer(
    {
      maxHeaderSize: 1024 * 1024, // 1MB headers
      keepAliveTimeout: 300000, // 5 minutes
      headersTimeout: 300000, // 5 minutes
      requestTimeout: 600000, // 10 minutes for large uploads
      // Allow unlimited body size
      allowHTTP1: true,
    },
    app
  );

  // Initialize Socket.IO with CORS and authentication
  const socketOrigins = [
    process.env.FRONTEND_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : null,
    'http://13.233.144.115:4000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:8083',
  ].filter(Boolean);

  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? socketOrigins : true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Improve connection stability
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    allowEIO3: true,
    transports: ['websocket', 'polling'],
  });

  // Apply authentication middleware to Socket.IO
  io.use(authenticateSocket);

  // CORS configuration - allow all origins in development
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : null,
    'http://13.233.144.115:4000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:8083',
  ].filter(Boolean);

  // In production, use specific origins; in development, allow all
  const corsOptions =
    process.env.NODE_ENV === 'production'
      ? {
          origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
              callback(null, true);
            } else {
              callback(new Error('Not allowed by CORS'));
            }
          },
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization'],
          credentials: true,
        }
      : {
          origin: true, // Allow all origins in development
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization'],
          credentials: true,
        };

  app.use(cors(corsOptions));

  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '500mb' }));

  // Configure Express to handle large file uploads
  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ extended: true, limit: '500mb' }));

  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use('/api/auth', authRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/assignments', assignmentRoutes);
  app.use('/api/submissions', submissionRoutes);
  app.use('/api/quizzes', quizRoutes);
  app.use('/api/progress', progressRoutes);
  app.use('/api', extendedRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/student', studentRoutes);
  app.use('/api/discussions', discussionsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/code-questions', codeQuestionsRoutes);
  app.use('/api/chatbot', chatbotRoutes);
  app.use('/api/monitoring', monitoringRoutes);
  app.use('/api/videos', videosRoutes);
  app.use('/api/live-lectures', liveLecturesRoutes);
  app.use('/api/gamification', gamificationRoutes);
  app.use('/api/contests', contestsRoutes);
  app.use('/api/messages', messagesRoutes);
  app.use('/api/ta', taRoutes);
  app.use('/api/viva', vivaRoutes);
  app.use('/api/rubrics', rubricsRoutes);
  app.use('/api/support', supportRoutes);
  app.use('/api/quiz-permissions', quizPermissionsRoutes);
  app.use('/api/github', githubRoutes);
  app.use('/api/auth', authRoutes); // Auth routes including google
  app.use('/api/sheets', googleRoutes);
  app.use('/api/course-offerings', courseOfferingsRoutes);
  app.use('/api/code-analysis', aiEditorRoutes);
  app.use('/api/ai-assistant', aiEditorRoutes);
  app.use('/api/planner', plannerRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/quiz-builder', quizBuilderRoutes);

  app.get('/health', (req, res) => res.json({ ok: true }));

  // API-only server - return 404 for unmatched routes
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Global error handler - catch any unhandled errors and return JSON
  app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    console.error('Unhandled error:', err);

    // Don't send response if headers already sent
    if (res.headersSent) {
      return next(err);
    }

    // Return JSON error response
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  });

  // Socket.IO connection handling
  io.on('connection', socket => {
    console.log('Client connected:', socket.id);


    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Make io available to routes if needed
  app.set('io', io);

  return new Promise((resolve, reject) => {
    try {
      server.listen(port, () => {
        logger.info(`Server started on ${process.env.FRONTEND_URL}:${port}`);
        console.log(`WebSocket server ready on port ${port}`);
        resolve(app);
      });

      server.on('error', err => {
        if (err.code === 'EADDRINUSE') {
          logger.error(`Port ${port} is already in use`);
          reject(new Error(`Port ${port} is already in use`));
        } else {
          logger.error('Server error:', err);
          reject(err);
        }
      });
    } catch (err) {
      logger.error('Failed to start server:', err);
      reject(err);
    }
  });
}
