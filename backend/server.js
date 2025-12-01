import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
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
import swaggerSpec from './swagger.js';

export async function startServer(port = 4000) {
  const app = express();
  const server = createServer(app);

  // In-memory store for whiteboard state (per lecture)
  const whiteboardState = {};

  // Initialize Socket.IO with CORS
  const io = new Server(server, {
    cors: {
      origin: [process.env.FRONTEND_URL, "http://13.233.144.115:4000", "http://localhost:5173", "http://localhost:5174","http://localhost:8083"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // CORS configuration - allow all origins in development
  app.use(
    cors({
      origin: [process.env.FRONTEND_URL, "http://13.233.144.115:4000", "http://localhost:5173", "http://localhost:5174","http://localhost:8083"],
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );

  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true }));

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
  
  app.get('/health', (req, res) => res.json({ ok: true }));
  
  // Serve static files from the React app build directory
  app.use(express.static(path.join(process.cwd(), 'dist')));

  // Catch all handler: send back React's index.html file for any non-API routes
  app.get('*', (req, res) => {
    // Only serve index.html for non-API routes
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    } else {
      // For unmatched API routes, return 404
      res.status(404).json({ error: 'API endpoint not found' });
    }
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
  app.use((err, req, res, next) => {
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

    socket.on('proctoring-suspend', (data) => {
      const { sessionToken, reason, suspendedBy } = data;

      // Notify student of suspension
      socket.to(`proctoring-${sessionToken}`).emit('session-suspended', {
        reason,
        suspendedBy,
        timestamp: new Date().toISOString()
      });
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
    socket.on('join-live-lecture', (data) => {
      const { lectureId, userId, userType } = data;
      console.log(`User ${userId} (${userType}) joining live lecture: ${lectureId}`);

      // Join lecture-specific room
      socket.join(`lecture-${lectureId}`);

      // Join role-specific room for teachers
      if (userType === 'faculty' || userType === 'admin' || userType === 'ta') {
        socket.join(`lecture-teachers-${lectureId}`);
      }

      socket.emit('lecture-joined', { lectureId, status: 'connected' });
    });

    socket.on('leave-live-lecture', (data) => {
      const { lectureId, userId } = data;
      console.log(`User ${userId} leaving live lecture: ${lectureId}`);

      socket.leave(`lecture-${lectureId}`);
      socket.leave(`lecture-teachers-${lectureId}`);

      socket.emit('lecture-left', { lectureId, status: 'disconnected' });
    });

    // WebRTC signaling for live lectures
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
      const { lectureId, message, userId, userName } = data;
      console.log(`Chat message in lecture ${lectureId} from ${userId}: ${message}`);

      // Broadcast message to all participants in the lecture
      socket.to(`lecture-${lectureId}`).emit('lecture-chat-message', {
        lectureId,
        message,
        userId,
        userName,
        timestamp: new Date().toISOString()
      });
    });

    // Teacher controls
    socket.on('lecture-mute-participant', (data) => {
      const { lectureId, participantId, mutedBy } = data;
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
      const { lectureId, participantId, unmutedBy } = data;
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
    socket.on('whiteboard-draw', (data) => {
      const { lectureId, drawingData } = data;
      
      // Initialize state for this lecture if not exists
      if (!whiteboardState[lectureId]) {
        whiteboardState[lectureId] = [];
      }
      
      // Add to history
      whiteboardState[lectureId].push(drawingData);
      
      // Broadcast to others
      socket.to(`lecture-${lectureId}`).emit('whiteboard-draw', drawingData);
    });

    socket.on('whiteboard-clear', (data) => {
      const { lectureId } = data;
      
      // Clear history
      whiteboardState[lectureId] = [];
      
      // Broadcast clear event
      socket.to(`lecture-${lectureId}`).emit('whiteboard-clear');
    });

    socket.on('request-whiteboard-state', (data) => {
      const { lectureId } = data;
      if (whiteboardState[lectureId] && whiteboardState[lectureId].length > 0) {
        socket.emit('whiteboard-state', {
          lectureId,
          history: whiteboardState[lectureId]
        });
      }
    });

    // Hand raising and reactions
    socket.on('raise-hand', (data) => {
      const { lectureId, userId, userName, isRaised } = data;
      socket.to(`lecture-${lectureId}`).emit('hand-raised-update', {
        userId,
        userName,
        isRaised,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('send-reaction', (data) => {
      const { lectureId, userId, reaction } = data;
      socket.to(`lecture-${lectureId}`).emit('reaction-received', {
        userId,
        reaction,
        timestamp: new Date().toISOString()
      });
    });

    // Screen share status
    socket.on('screen-share-status', (data) => {
      const { lectureId, userId, isSharing } = data;
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
