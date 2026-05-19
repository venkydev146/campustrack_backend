

import express from 'express';
import { uploadResource, getSectionResources, deleteResource,getStudentResources } from '../controllers/resources.controller.js';
import authenticate from '../middleware/auth.js';
import { attachProfile, requireStaff } from '../middleware/role.js';

const router = express.Router();

router.use(authenticate, attachProfile);

router.post('/upload', requireStaff, uploadResource);
router.get('/section', getSectionResources);
router.delete('/:id', requireStaff, deleteResource);
router.get('/student', getStudentResources);

export default router;