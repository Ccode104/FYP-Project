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
import proctoringRoutes from './routes/proctoring.js';
import proctoringAnalyticsRoutes from './routes/proctoringAnalytics.js';
import messagesRoutes from './routes/messages.js';
import taRoutes from './routes/ta.js';
import vivaRoutes from './routes/viva.js';
import rubricsRoutes from './routes/rubrics.js';
import supportRoutes from './routes/support.js';
import quizPermissionsRoutes from './routes/quizPermissions.js';
import githubRoutes from './routes/github.js';
import contestsRoutes from './routes/contests.js';
import courseOfferingsRoutes from './routes/courseOfferings.js';
import swaggerSpec from './swagger.js';

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

  // Configure server for large file uploads
  const server = createServer({
    maxHeaderSize: 1024 * 1024, // 1MB headers
    keepAliveTimeout: 300000, // 5 minutes
    headersTimeout: 300000, // 5 minutes
    requestTimeout: 600000, // 10 minutes for large uploads
    // Allow unlimited body size
    allowHTTP1: true,
  }, app);


  // Initialize Socket.IO with CORS and authentication
  const io = new Server(server, {
    cors: {
      origin: [process.env.FRONTEND_URL, 'http://13.233.144.115:4000', 'http://localhost:5173', 'http://localhost:5174','http://localhost:8083'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Improve connection stability
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    allowEIO3: true,
    transports: ['websocket', 'polling']
  });

  // Apply authentication middleware to Socket.IO
  io.use(authenticateSocket);

  // CORS configuration - allow all origins in development
  app.use(
    cors({
      origin: [process.env.FRONTEND_URL, 'http://13.233.144.115:4000', 'http://localhost:5173', 'http://localhost:5174','http://localhost:8083'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

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
  app.use('/api/proctoring-analytics', proctoringAnalyticsRoutes);
  app.use('/api/proctoring', proctoringRoutes);
  app.use('/api/messages', messagesRoutes);
  app.use('/api/ta', taRoutes);
  app.use('/api/viva', vivaRoutes);
  app.use('/api/rubrics', rubricsRoutes);
  app.use('/api/support', supportRoutes);
  app.use('/api/quiz-permissions', quizPermissionsRoutes);
  app.use('/api/github', githubRoutes);
  app.use('/api/contests', contestsRoutes);
  app.use('/api/course-offerings', courseOfferingsRoutes);

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
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  // Global error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Proctoring namespace events
    socket.on('join-proctoring-session', (data) => {
      const { sessionToken, userId, userType } = data;
      console.log(`User ${userId} (${userType}) joining proctoring session: ${sessionToken}`);

      // Join session-specific room
      socket.join(`proctoring-${sessionToken}`);

      // Join role-specific room for monitoring
      if (userType === 'teacher' || userType === 'admin') {
        socket.join(`proctoring-monitor-${sessionToken}`);
      }

      socket.emit('proctoring-joined', { sessionToken, status: 'connected' });
    });

    socket.on('proctoring-violation', (data) => {
      const { sessionToken, violation, studentId } = data;
      console.log('Violation reported:', { sessionToken, violation, studentId });

      // Broadcast to monitoring room (teachers/admins)
      socket.to(`proctoring-monitor-${sessionToken}`).emit('violation-alert', {
        sessionToken,
        violation,
        studentId,
        timestamp: new Date().toISOString()
      });

      // Store violation in database (will be implemented in controller)
      // This is just the real-time notification part
    });

    socket.on('proctoring-status-update', (data) => {
      const { sessionToken, status, studentId } = data;

      // Broadcast status updates to monitors
      socket.to(`proctoring-monitor-${sessionToken}`).emit('status-update', {
        sessionToken,
        status,
        studentId,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('proctoring-suspend', async (data) => {
      const { sessionToken, reason, suspendedBy } = data;

      try {
        console.log('DEBUG: WebSocket proctoring-suspend received:', { sessionToken, reason, suspendedBy });

        // Find session by token
        const sessionResult = await pool.query(
          'SELECT id, student_id FROM proctoring_sessions WHERE session_token = $1',
          [sessionToken]
        );

        if (sessionResult.rows.length === 0) {
          console.error('DEBUG: Session not found for token:', sessionToken);
          return;
        }

        const session = sessionResult.rows[0];
        console.log('DEBUG: Found session:', session);

        // Call suspendSession API
        const suspendResult = await pool.query(
          'UPDATE proctoring_sessions SET status = $1, ended_at = now(), updated_at = now() WHERE id = $2 RETURNING *',
          ['suspended', session.id]
        );

        console.log('DEBUG: Session suspended in DB:', suspendResult.rows[0]);

        // Update quiz attempt if exists
        await pool.query(
          'UPDATE quiz_attempts SET suspended_at = now(), suspension_reason = $1 WHERE proctoring_session_id = $2',
          [reason, session.id]
        );

        console.log('DEBUG: Quiz attempt updated');

        // Notify student of suspension
        socket.to(`proctoring-${sessionToken}`).emit('session-suspended', {
          reason,
          suspendedBy,
          timestamp: new Date().toISOString()
        });

        console.log('DEBUG: Suspension notification sent to student');
      } catch (error) {
        console.error('DEBUG: Error in proctoring-suspend:', error);
      }
    });

    socket.on('proctoring-resume', (data) => {
      const { sessionToken, resumedBy } = data;

      // Notify student of resume
      socket.to(`proctoring-${sessionToken}`).emit('session-resumed', {
        resumedBy,
        timestamp: new Date().toISOString()
      });
    });

    // Live lecture events
    socket.on('join-live-lecture', async (data) => {
      const { lectureId } = data;
      const userId = socket.user.id;
      const userType = socket.user.role;
      console.log(`User ${userId} (${userType}) joining live lecture: ${lectureId}`);

      // Join lecture-specific room
      socket.join(`lecture-${lectureId}`);

      // Join role-specific room for teachers
      if (userType === 'faculty' || userType === 'admin' || userType === 'ta') {
        socket.join(`lecture-teachers-${lectureId}`);
      }

      // Notify the joining user that they successfully joined
      socket.emit('lecture-joined', { lectureId, status: 'connected' });

      // Get user information to broadcast to other participants
      try {
        const userResult = await pool.query(
          'SELECT name, email FROM users WHERE id = $1',
          [userId]
        );

        if (userResult.rows.length > 0) {
          const userInfo = userResult.rows[0];

          // Notify all other participants in the lecture that someone joined
          socket.to(`lecture-${lectureId}`).emit('participant-joined', {
            lectureId,
            userId,
            userName: userInfo.name || userInfo.email || `User ${userId}`,
            role: userType === 'faculty' ? 'teacher' : (userType === 'ta' ? 'ta' : 'student'),
            isMuted: true, // Default state
            isVideoOff: true, // Default state
            isHandRaised: false,
            isScreenSharing: false,
            joinedAt: new Date().toISOString()
          });

          console.log(`Notified other participants about user ${userId} joining lecture ${lectureId}`);
        }
      } catch (error) {
        console.error('Error fetching user info for participant join notification:', error);
      }
    });

    socket.on('leave-live-lecture', (data) => {
      const { lectureId } = data;
      const userId = socket.user.id;
      console.log(`User ${userId} leaving live lecture: ${lectureId}`);

      // Notify other participants that this user is leaving
      socket.to(`lecture-${lectureId}`).emit('participant-left', {
        lectureId,
        userId,
        leftAt: new Date().toISOString()
      });

      socket.leave(`lecture-${lectureId}`);
      socket.leave(`lecture-teachers-${lectureId}`);

      socket.emit('lecture-left', { lectureId, status: 'disconnected' });
    });

    // WebRTC signaling for live lectures
    socket.on('webrtc-signal', (data) => {
      const { lectureId, signal, toUserId } = data;
      const fromUserId = socket.user.id;
      console.log(`WebRTC signal from ${fromUserId} to ${toUserId} in lecture ${lectureId}`);

      // Broadcast signal to all participants in the lecture room
      // The frontend will filter and only process signals intended for them
      socket.to(`lecture-${lectureId}`).emit('webrtc-signal', {
        lectureId,
        signal,
        fromUserId,
        toUserId
      });
    });

    socket.on('webrtc-offer', (data) => {
      const { lectureId, offer, fromUserId, toUserId } = data;
      console.log(`WebRTC offer from ${fromUserId} to ${toUserId} in lecture ${lectureId}`);

      // Send offer to specific user in the lecture room
      socket.to(`lecture-${lectureId}`).emit('webrtc-offer', {
        lectureId,
        offer,
        fromUserId,
        toUserId
      });
    });

    socket.on('webrtc-answer', (data) => {
      const { lectureId, answer, fromUserId, toUserId } = data;
      console.log(`WebRTC answer from ${fromUserId} to ${toUserId} in lecture ${lectureId}`);

      // Send answer to specific user in the lecture room
      socket.to(`lecture-${lectureId}`).emit('webrtc-answer', {
        lectureId,
        answer,
        fromUserId,
        toUserId
      });
    });

    socket.on('webrtc-ice-candidate', (data) => {
      const { lectureId, candidate, fromUserId, toUserId } = data;
      console.log(`WebRTC ICE candidate from ${fromUserId} to ${toUserId} in lecture ${lectureId}`);

      // Send ICE candidate to specific user in the lecture room
      socket.to(`lecture-${lectureId}`).emit('webrtc-ice-candidate', {
        lectureId,
        candidate,
        fromUserId,
        toUserId
      });
    });

    // Live lecture chat
    socket.on('lecture-chat-message', (data) => {
      const { lectureId, message } = data;
      const userId = socket.user.id;
      const userName = socket.user.email; // Use email as display name, or we could fetch name from DB
      console.log(`Chat message in lecture ${lectureId} from ${userId}: ${message}`);

      // Broadcast message to all participants in the lecture
      socket.to(`lecture-${lectureId}`).emit('lecture-chat-message', {
        lectureId,
        message,
        userId,
        userName,
        role: socket.user.role,
        timestamp: new Date().toISOString()
      });
    });

    // Teacher controls
    socket.on('lecture-mute-participant', (data) => {
      const { lectureId, participantId } = data;
      const mutedBy = socket.user.id;
      console.log(`Muting participant ${participantId} in lecture ${lectureId} by ${mutedBy}`);

      // Send mute command to specific participant
      socket.to(`lecture-${lectureId}`).emit('lecture-muted', {
        lectureId,
        participantId,
        mutedBy,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('lecture-unmute-participant', (data) => {
      const { lectureId, participantId } = data;
      const unmutedBy = socket.user.id;
      console.log(`Unmuting participant ${participantId} in lecture ${lectureId} by ${unmutedBy}`);

      // Send unmute command to specific participant
      socket.to(`lecture-${lectureId}`).emit('lecture-unmuted', {
        lectureId,
        participantId,
        unmutedBy,
        timestamp: new Date().toISOString()
      });
    });

    // Whiteboard events
    socket.on('whiteboard-draw', async (data) => {
      const { lectureId, drawingData } = data;
      const userId = socket.user.id;

      try {
        // Store drawing in database
        await pool.query(
          'INSERT INTO whiteboard_states (live_lecture_id, drawing_data, created_by) VALUES ($1, $2, $3)',
          [lectureId, JSON.stringify(drawingData), userId]
        );

        // Broadcast to others
        socket.to(`lecture-${lectureId}`).emit('whiteboard-draw', drawingData);
      } catch (error) {
        console.error('Error saving whiteboard drawing:', error);
      }
    });

    socket.on('whiteboard-clear', async (data) => {
      const { lectureId } = data;
      // eslint-disable-next-line no-unused-vars
      const _userId = socket.user.id;

      try {
        // Update lecture's whiteboard cleared timestamp
        await pool.query(
          'UPDATE live_lectures SET whiteboard_cleared_at = NOW() WHERE id = $1',
          [lectureId]
        );

        // Broadcast clear event
        socket.to(`lecture-${lectureId}`).emit('whiteboard-clear');
      } catch (error) {
        console.error('Error clearing whiteboard:', error);
      }
    });

    socket.on('request-whiteboard-state', async (data) => {
      const { lectureId } = data;

      try {
        // Get whiteboard cleared timestamp
        const clearedResult = await pool.query(
          'SELECT whiteboard_cleared_at FROM live_lectures WHERE id = $1',
          [lectureId]
        );

        const clearedAt = clearedResult.rows[0]?.whiteboard_cleared_at;

        // Get all drawings after the last clear
        let query = 'SELECT drawing_data FROM whiteboard_states WHERE live_lecture_id = $1';
        const params = [lectureId];

        if (clearedAt) {
          query += ' AND created_at > $2';
          params.push(clearedAt);
        }

        query += ' ORDER BY created_at ASC';

        const drawingsResult = await pool.query(query, params);
        const history = drawingsResult.rows.map(row => row.drawing_data);

        if (history.length > 0) {
          socket.emit('whiteboard-state', {
            lectureId,
            history
          });
        }
      } catch (error) {
        console.error('Error fetching whiteboard state:', error);
      }
    });

    // Hand raising and reactions
    socket.on('raise-hand', (data) => {
      const { lectureId, isRaised } = data;
      const userId = socket.user.id;
      const userName = socket.user.email; // Use email as display name
      socket.to(`lecture-${lectureId}`).emit('hand-raised-update', {
        userId,
        userName,
        isRaised,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('send-reaction', (data) => {
      const { lectureId, reaction } = data;
      const userId = socket.user.id;
      socket.to(`lecture-${lectureId}`).emit('reaction-received', {
        userId,
        reaction,
        timestamp: new Date().toISOString()
      });
    });

    // Screen share status
    socket.on('screen-share-status', (data) => {
      const { lectureId, isSharing } = data;
      const userId = socket.user.id;
      socket.to(`lecture-${lectureId}`).emit('screen-share-update', {
        userId,
        isSharing
      });
    });

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

      server.on('error', (err) => {
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
