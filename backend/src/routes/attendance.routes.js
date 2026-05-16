import express from 'express';
import {
  checkSession, startSession, submitSession,
  getSession, getStudentAttendance,
  getStudentsBySection, getDailyAttendance,
  getMonthlyAttendance
} from '../controllers/attendance.controller.js';
import authenticate from '../middleware/auth.js';
import { attachProfile, requireStaff } from '../middleware/role.js';

const router = express.Router();

router.use(authenticate, attachProfile);

router.get('/session/check', requireStaff, checkSession);
router.post('/session/start', requireStaff, startSession);
router.post('/session/:id/submit', requireStaff, submitSession);
router.get('/session/:id', requireStaff, getSession);
router.get('/student/:student_id', getStudentAttendance);
router.get('/students/by-section', requireStaff, getStudentsBySection);
router.get('/daily/:student_id', getDailyAttendance);
router.get('/monthly/:student_id', getMonthlyAttendance);

export default router;