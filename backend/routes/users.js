// src/routes/users.js
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getUserByEmail, getUserProfile, updateUserProfile } from '../controllers/usersController.js';

const router = express.Router();

// GET /api/users/by-email?email=someone@domain
router.get('/by-email', requireAuth, getUserByEmail);

// GET /api/users/email/:email  (URL-encoded email in path)
router.get('/email/:email', requireAuth, getUserByEmail);

// GET /api/users/profile - Get full profile for authenticated user
router.get('/profile', requireAuth, getUserProfile);

// PUT /api/users/profile - Update profile for authenticated user
router.put('/profile', requireAuth, updateUserProfile);

export default router;
