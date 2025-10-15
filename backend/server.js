import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import assignmentRoutes from './routes/assignments.js';
import submissionRoutes from './routes/submissions.js';
import quizRoutes from './routes/quizzes.js';
import extendedRoutes from './routes/extended.js';
import { logger } from './utils/logger.js';
import usersRoutes from './routes/users.js';
import studentRoutes from './routes/student.js';
import swaggerSpec from './swagger.js';

export async function startServer(port = 4000) {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true }));

  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use('/api/auth', authRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/assignments', assignmentRoutes);
  app.use('/api/submissions', submissionRoutes);
  app.use('/api/quizzes', quizRoutes);
  app.use('/api', extendedRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/student', studentRoutes);


  app.get('/health', (req, res) => res.json({ ok: true }));

  app.listen(port, () => {
    logger.info(`Server started on http://localhost:${port}`);
  });

  return app;
}
