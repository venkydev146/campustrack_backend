import express from 'express';
import { staffLogin, studentLogin, logout, getMe } from '../controllers/auth.controller.js';
import authenticate from '../middleware/auth.js';
import { attachProfile } from '../middleware/role.js';

const router = express.Router();

router.post('/staff/login', staffLogin);
router.post('/student/login', studentLogin);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, attachProfile, getMe);

export default router;