const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : { rejectUnauthorized: false }
});

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to database:', err.stack);
    } else {
        console.log('Connected to Neon PostgreSQL database');
        release();
    }
});

// ========================================
// MIDDLEWARE
// ========================================
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================================
// DISABLE CACHING FOR ALL API RESPONSES
// This ensures parents always see real-time data
// ========================================
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Make pool available to routes
app.set('db', pool);

// ========================================
// TEST ROUTE
// ========================================
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'School Management System API is running' });
});

// ========================================
// IMPORT ROUTES
// ========================================
const authRoutes = require('./routes/auth.routes');
const studentRoutes = require('./routes/student.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const gradeRoutes = require('./routes/grade.routes');
const classLevelRoutes = require('./routes/classLevel.routes');
const subjectRoutes = require('./routes/subject.routes');
const feeRoutes = require('./routes/fee.routes');
const schoolFeesRoutes = require('./routes/schoolFees.routes');
const schoolSettingsRoutes = require('./routes/schoolSettings.routes');
const parentRoutes = require('./routes/parent.routes');

// ========================================
// REGISTER ROUTES
// ========================================

// 1. Public routes (no auth needed)
app.use('/api/auth', authRoutes);

// 2. Parent routes (handles its own auth)
app.use('/api/parent', parentRoutes);

// 3. Protected routes (require auth)
const { authenticateToken } = require('./middleware/auth.middleware');

app.use('/api/students', authenticateToken, studentRoutes);
app.use('/api/attendance', authenticateToken, attendanceRoutes);
app.use('/api/grades', authenticateToken, gradeRoutes);
app.use('/api/class-levels', authenticateToken, classLevelRoutes);
app.use('/api/subjects', authenticateToken, subjectRoutes);
app.use('/api/fees', authenticateToken, feeRoutes);
app.use('/api/school-fees', authenticateToken, schoolFeesRoutes);
app.use('/api/school-settings', authenticateToken, schoolSettingsRoutes);

// ========================================
// ERROR HANDLING MIDDLEWARE
// ========================================
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ 
        message: 'Something went wrong!', 
        error: process.env.NODE_ENV === 'production' ? undefined : err.message 
    });
});

// ========================================
// START SERVER
// ========================================
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Cache disabled for all API responses - real-time data always`);
});
