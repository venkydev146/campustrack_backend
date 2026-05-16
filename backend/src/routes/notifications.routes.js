import express from 'express';
import {
  sendNotification, getStudentNotifications,
  markAsRead, getUnreadCount
} from '../controllers/notifications.controller.js';
import authenticate from '../middleware/auth.js';
import { attachProfile, requireStaff, requireStudent, requireIncharge } from '../middleware/role.js';

const router = express.Router();

router.use(authenticate, attachProfile);

router.post('/send', requireStaff, requireIncharge, sendNotification);
router.get('/student', requireStudent, getStudentNotifications);
router.put('/:id/read', requireStudent, markAsRead);
router.get('/unread/count', requireStudent, getUnreadCount);

export default router;