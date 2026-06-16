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

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make pool available to routes
app.set('db', pool);

// Test route
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'School Management System API is running' });
});

/// Import routes
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

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/class-levels', classLevelRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/school-fees', schoolFeesRoutes);
app.use('/api/school-settings', schoolSettingsRoutes);
app.use('/api/parent', parentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});
