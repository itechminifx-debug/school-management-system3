const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

const getDb = (req) => req.app.get('db');

// MARK ATTENDANCE for a student on a specific date
router.post('/', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const schoolId = req.user.schoolId;
    const { student_id, date, status } = req.body;

    if (!student_id || !date || !status) {
        return res.status(400).json({ 
            message: 'Missing required fields: student_id, date, status' 
        });
    }

    const validStatuses = ['present', 'absent', 'late', 'excused'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
            message: 'Invalid status. Allowed: present, absent, late, excused' 
        });
    }

    try {
        // Verify student belongs to this school
        const studentCheck = await pool.query(
            'SELECT id FROM students WHERE id = $1 AND school_id = $2',
            [student_id, schoolId]
        );

        if (studentCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found in your school' });
        }

        // Upsert attendance (insert or update if exists)
        const result = await pool.query(
            `INSERT INTO attendance (student_id, date, status) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (student_id, date) 
             DO UPDATE SET status = $3 
             RETURNING id, student_id, date, status`,
            [student_id, date, status]
        );

        res.json({ 
            message: 'Attendance recorded successfully',
            attendance: result.rows[0]
        });
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({ message: 'Failed to record attendance', error: error.message });
    }
});

// GET ATTENDANCE for a specific student
router.get('/student/:studentId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const schoolId = req.user.schoolId;
    const studentId = req.params.studentId;

    try {
        // Verify student belongs to this school
        const studentCheck = await pool.query(
            'SELECT id FROM students WHERE id = $1 AND school_id = $2',
            [studentId, schoolId]
        );

        if (studentCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found in your school' });
        }

        const result = await pool.query(
            `SELECT id, student_id, date, status 
             FROM attendance 
             WHERE student_id = $1 
             ORDER BY date DESC`,
            [studentId]
        );

        res.json({ attendance: result.rows });
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ message: 'Failed to fetch attendance', error: error.message });
    }
});

// GET ATTENDANCE for a specific date (all students in the school)
router.get('/date/:date', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const schoolId = req.user.schoolId;
    const date = req.params.date;

    try {
        const result = await pool.query(
            `SELECT a.id, a.student_id, a.date, a.status, 
                    s.full_name, s.admission_number, s.class
             FROM attendance a
             JOIN students s ON a.student_id = s.id
             WHERE a.date = $1 AND s.school_id = $2
             ORDER BY s.class, s.full_name`,
            [date, schoolId]
        );

        res.json({ date, attendance: result.rows });
    } catch (error) {
        console.error('Error fetching daily attendance:', error);
        res.status(500).json({ message: 'Failed to fetch attendance', error: error.message });
    }
});

// GET ATTENDANCE SUMMARY for a student (counts by status)
router.get('/summary/:studentId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const schoolId = req.user.schoolId;
    const studentId = req.params.studentId;

    try {
        const studentCheck = await pool.query(
            'SELECT id FROM students WHERE id = $1 AND school_id = $2',
            [studentId, schoolId]
        );

        if (studentCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const result = await pool.query(
            `SELECT status, COUNT(*) as count
             FROM attendance 
             WHERE student_id = $1 
             GROUP BY status`,
            [studentId]
        );

        const summary = {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0
        };

        result.rows.forEach(row => {
            summary[row.status] = parseInt(row.count);
        });

        res.json({ summary });
    } catch (error) {
        console.error('Error fetching summary:', error);
        res.status(500).json({ message: 'Failed to fetch summary', error: error.message });
    }
});

module.exports = router;