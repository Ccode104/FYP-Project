// src/routes/auth.js
import express from 'express';
import { registerUser, loginUser, getUserDetails} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', registerUser);

// POST /api/auth/login
router.post('/login', loginUser);

router.get('/user/:id', requireAuth, getUserDetails);


export default router;
