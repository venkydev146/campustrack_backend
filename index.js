import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import routes from './backend/src/routes/auth.routes.js';
import timetableRoutes from './routes/timetable.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import marksRoutes from './routes/marks.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import studentsRoutes from './routes/students.routes.js';
import resourcesRoutes from './routes/resources.routes.js';
import staffRoutes from './routes/staff.routes.js';

// under other routes


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/staff', staffRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Campus Track API running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Campus Track API running on port ${PORT}`);
});