import express from 'express';
import { enterMarks, getSectionMarks, getStudentMarks } from '../controllers/marks.controller.js';
import authenticate from '../middleware/auth.js';
import { attachProfile, requireStaff } from '../middleware/role.js';

const router = express.Router();

router.use(authenticate, attachProfile);

router.post('/enter', requireStaff, enterMarks);
router.get('/section', requireStaff, getSectionMarks);
router.get('/student/:student_id', getStudentMarks);

export default router;