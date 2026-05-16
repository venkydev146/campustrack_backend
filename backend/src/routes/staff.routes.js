import express from 'express';
import { getAssignments, getSections } from '../controllers/staff.controller.js';
import authenticate from '../middleware/auth.js';
import { attachProfile, requireStaff } from '../middleware/role.js';

const router = express.Router();

router.use(authenticate, attachProfile, requireStaff);

router.get('/assignments', getAssignments);
router.get('/sections', getSections);

export default router;