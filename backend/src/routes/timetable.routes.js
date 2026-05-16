import express from 'express';
import { getTodayTimetable, getWeekTimetable,getTimetableEntry } from '../controllers/timetable.controller.js';
import authenticate from '../middleware/auth.js';
import { attachProfile, requireStaff } from '../middleware/role.js';


const router = express.Router();

router.use(authenticate, attachProfile, requireStaff);

router.get('/today', getTodayTimetable);
router.get('/week', getWeekTimetable);
router.get('/entry/:id', getTimetableEntry);

export default router;