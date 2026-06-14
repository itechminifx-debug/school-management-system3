const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

const getDb = (req) => req.app.get('db');

// Record daily feeding fee payment
router.post('/record', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { student_id, amount, payment_method, notes } = req.body;
    const collected_by = req.user.userId;
    const payment_date = new Date().toISOString().split('T')[0];
    
    if (!student_id || !amount || amount <= 0) {
        return res.status(400).json({ message: 'Valid amount is required' });
    }
    
    try {
        const receiptNumber = `FEE-${payment_date.replace(/-/g, '')}-${student_id}-${Date.now()}`;
        
        const result = await pool.query(
            `INSERT INTO daily_feeding_fees 
             (student_id, amount, payment_date, payment_method, collected_by, receipt_number, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [student_id, amount, payment_date, payment_method, collected_by, receiptNumber, notes]
        );
        
        // Update or create daily summary
        await pool.query(
            `INSERT INTO daily_collection_summary (collection_date, class_level_id, total_students, total_collected)
             SELECT $1, s.class_level_id, COUNT(DISTINCT d.student_id), COALESCE(SUM(d.amount), 0)
             FROM daily_feeding_fees d
             JOIN students s ON d.student_id = s.id
             WHERE d.payment_date = $1 AND s.class_level_id = COALESCE(
                 (SELECT class_level_id FROM students WHERE id = $2), 0
             )
             GROUP BY s.class_level_id
             ON CONFLICT (collection_date, class_level_id)
             DO UPDATE SET 
                total_students = EXCLUDED.total_students,
                total_collected = EXCLUDED.total_collected`,
            [payment_date, student_id]
        );
        
        res.json({ 
            message: 'Payment recorded successfully',
            payment: result.rows[0],
            receipt_number: receiptNumber
        });
    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(500).json({ message: 'Failed to record payment' });
    }
});

// Get daily collection by class
router.get('/daily/:date/:classLevelId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { date, classLevelId } = req.params;
    const schoolId = req.user.schoolId;
    
    try {
        // Get all students in the class
        const studentsResult = await pool.query(
            `SELECT s.id, s.full_name, s.admission_number
             FROM students s
             WHERE s.school_id = $1 AND s.class_level_id = $2
             ORDER BY s.full_name`,
            [schoolId, classLevelId]
        );
        
        // Get payments for the selected date
        const paymentsResult = await pool.query(
            `SELECT d.*, s.full_name, s.admission_number
             FROM daily_feeding_fees d
             JOIN students s ON d.student_id = s.id
             WHERE d.payment_date = $1 AND s.class_level_id = $2 AND s.school_id = $3
             ORDER BY s.full_name`,
            [date, classLevelId, schoolId]
        );
        
        // Create payment map
        const paymentMap = {};
        paymentsResult.rows.forEach(p => {
            paymentMap[p.student_id] = p;
        });
        
        // Combine data
        const collection = studentsResult.rows.map(student => ({
            ...student,
            paid: !!paymentMap[student.id],
            amount: paymentMap[student.id]?.amount || 0,
            receipt_number: paymentMap[student.id]?.receipt_number || null,
            payment_method: paymentMap[student.id]?.payment_method || null
        }));
        
        const totalCollected = paymentsResult.rows.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const totalPaid = paymentsResult.rows.length;
        
        res.json({
            date,
            class_level_id: parseInt(classLevelId),
            total_students: studentsResult.rows.length,
            total_paid: totalPaid,
            total_collected: totalCollected,
            collection: collection
        });
    } catch (error) {
        console.error('Error fetching daily collection:', error);
        res.status(500).json({ message: 'Failed to fetch collection data' });
    }
});

// Get collection summary for date range
router.get('/summary/:startDate/:endDate', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { startDate, endDate } = req.params;
    const schoolId = req.user.schoolId;
    
    try {
        const result = await pool.query(
            `SELECT d.payment_date, c.name as class_name, 
                    COUNT(DISTINCT d.student_id) as students_paid,
                    COALESCE(SUM(d.amount), 0) as total_collected
             FROM daily_feeding_fees d
             JOIN students s ON d.student_id = s.id
             JOIN class_levels c ON s.class_level_id = c.id
             WHERE d.payment_date BETWEEN $1 AND $2 AND s.school_id = $3
             GROUP BY d.payment_date, c.name, c.level_order
             ORDER BY d.payment_date DESC, c.level_order`,
            [startDate, endDate, schoolId]
        );
        
        res.json({ summary: result.rows });
    } catch (error) {
        console.error('Error fetching summary:', error);
        res.status(500).json({ message: 'Failed to fetch summary' });
    }
});

// Get today's collection for printing
router.get('/print/:date/:classLevelId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { date, classLevelId } = req.params;
    const schoolId = req.user.schoolId;
    
    try {
        const result = await pool.query(
            `SELECT s.full_name, s.admission_number, 
                    d.amount, d.receipt_number, d.payment_method, d.payment_date
             FROM students s
             LEFT JOIN daily_feeding_fees d ON s.id = d.student_id AND d.payment_date = $1
             WHERE s.class_level_id = $2 AND s.school_id = $3
             ORDER BY s.full_name`,
            [date, classLevelId, schoolId]
        );
        
        const summary = await pool.query(
            `SELECT COUNT(d.id) as paid_count, COALESCE(SUM(d.amount), 0) as total
             FROM daily_feeding_fees d
             JOIN students s ON d.student_id = s.id
             WHERE d.payment_date = $1 AND s.class_level_id = $2 AND s.school_id = $3`,
            [date, classLevelId, schoolId]
        );
        
        res.json({
            date,
            class_level_id: parseInt(classLevelId),
            students: result.rows,
            summary: summary.rows[0]
        });
    } catch (error) {
        console.error('Error fetching print data:', error);
        res.status(500).json({ message: 'Failed to fetch print data' });
    }
});

module.exports = router;
