import express from 'express';
import { importStudents } from '../controllers/students.controller.js';
import authenticate from '../middleware/auth.js';
import { attachProfile, requireHOD } from '../middleware/role.js';
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

router.use(authenticate, attachProfile, requireHOD);

router.post('/import', upload.single('file'), importStudents);

export default router;