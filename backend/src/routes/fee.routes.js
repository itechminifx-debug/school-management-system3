const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

const getDb = (req) => req.app.get('db');

// ========================================
// RECORD DAILY FEEDING FEE PAYMENT
// ========================================
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
            [student_id, amount, payment_date, payment_method, collected_by, receiptNumber, notes || null]
        );
        
        // Update or create daily summary for that class
        await pool.query(
            `INSERT INTO daily_collection_summary (collection_date, class_level_id, total_students, total_collected)
             SELECT $1, s.class_level_id, COUNT(DISTINCT d.student_id), COALESCE(SUM(d.amount), 0)
             FROM daily_feeding_fees d
             JOIN students s ON d.student_id = s.id
             WHERE d.payment_date = $1
             GROUP BY s.class_level_id
             ON CONFLICT (collection_date, class_level_id)
             DO UPDATE SET 
                total_students = EXCLUDED.total_students,
                total_collected = EXCLUDED.total_collected`,
            [payment_date]
        );
        
        res.json({ 
            message: 'Payment recorded successfully',
            payment: result.rows[0],
            receipt_number: receiptNumber
        });
    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(500).json({ message: 'Failed to record payment', error: error.message });
    }
});

// ========================================
// GET DAILY COLLECTION BY CLASS
// ========================================
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
            payment_id: paymentMap[student.id]?.id || null,
            amount: paymentMap[student.id]?.amount || 0,
            receipt_number: paymentMap[student.id]?.receipt_number || null,
            payment_method: paymentMap[student.id]?.payment_method || null,
            payment_time: paymentMap[student.id]?.created_at ? new Date(paymentMap[student.id].created_at).toLocaleTimeString() : null
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
        res.status(500).json({ message: 'Failed to fetch collection data', error: error.message });
    }
});

// ========================================
// DELETE/UNDO A PAYMENT
// ========================================
router.delete('/payment/:paymentId', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    const paymentId = req.params.paymentId;
    
    try {
        // Get the payment details first
        const paymentResult = await pool.query(
            `SELECT d.*, s.class_level_id, s.school_id
             FROM daily_feeding_fees d
             JOIN students s ON d.student_id = s.id
             WHERE d.id = $1`,
            [paymentId]
        );
        
        if (paymentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        
        const payment = paymentResult.rows[0];
        const paymentDate = payment.payment_date.toISOString().split('T')[0];
        const schoolId = req.user.schoolId;
        
        // Verify school ownership
        if (payment.school_id !== schoolId) {
            return res.status(403).json({ message: 'Unauthorized to delete this payment' });
        }
        
        // Delete the payment
        await pool.query(
            `DELETE FROM daily_feeding_fees WHERE id = $1`,
            [paymentId]
        );
        
        // Update daily summary for that class
        await pool.query(
            `INSERT INTO daily_collection_summary (collection_date, class_level_id, total_students, total_collected)
             SELECT $1, s.class_level_id, COUNT(DISTINCT d.student_id), COALESCE(SUM(d.amount), 0)
             FROM daily_feeding_fees d
             JOIN students s ON d.student_id = s.id
             WHERE d.payment_date = $1 AND s.class_level_id = $2
             GROUP BY s.class_level_id
             ON CONFLICT (collection_date, class_level_id)
             DO UPDATE SET 
                total_students = EXCLUDED.total_students,
                total_collected = EXCLUDED.total_collected`,
            [paymentDate, payment.class_level_id]
        );
        
        res.json({ 
            message: 'Payment deleted successfully (undone)',
            deleted_payment: {
                id: payment.id,
                student_id: payment.student_id,
                amount: payment.amount,
                date: paymentDate
            }
        });
    } catch (error) {
        console.error('Error deleting payment:', error);
        res.status(500).json({ message: 'Failed to delete payment', error: error.message });
    }
});

// ========================================
// GET RECENT PAYMENTS (FOR UNDO LIST)
// ========================================
router.get('/recent', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const schoolId = req.user.schoolId;
    const limit = req.query.limit || 20;
    
    try {
        const result = await pool.query(
            `SELECT d.*, s.full_name, s.admission_number, c.name as class_name
             FROM daily_feeding_fees d
             JOIN students s ON d.student_id = s.id
             JOIN class_levels c ON s.class_level_id = c.id
             WHERE s.school_id = $1
             ORDER BY d.created_at DESC
             LIMIT $2`,
            [schoolId, limit]
        );
        
        res.json({ recent_payments: result.rows });
    } catch (error) {
        console.error('Error fetching recent payments:', error);
        res.status(500).json({ message: 'Failed to fetch recent payments', error: error.message });
    }
});

// ========================================
// GET COLLECTION SUMMARY FOR DATE RANGE
// ========================================
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
        
        // Calculate grand totals
        const grandTotal = result.rows.reduce((sum, row) => sum + parseFloat(row.total_collected), 0);
        
        res.json({ 
            summary: result.rows,
            grand_total: grandTotal,
            start_date: startDate,
            end_date: endDate
        });
    } catch (error) {
        console.error('Error fetching summary:', error);
        res.status(500).json({ message: 'Failed to fetch summary', error: error.message });
    }
});

// ========================================
// GET PRINTABLE COLLECTION REPORT
// ========================================
router.get('/print/:date/:classLevelId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { date, classLevelId } = req.params;
    const schoolId = req.user.schoolId;
    
    try {
        const result = await pool.query(
            `SELECT s.full_name, s.admission_number, 
                    d.amount, d.receipt_number, d.payment_method, d.payment_date,
                    d.created_at as payment_time
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
        
        const classInfo = await pool.query(
            `SELECT name FROM class_levels WHERE id = $1`,
            [classLevelId]
        );
        
        res.json({
            date,
            class_name: classInfo.rows[0]?.name || 'Unknown',
            class_level_id: parseInt(classLevelId),
            students: result.rows,
            summary: {
                paid_count: parseInt(summary.rows[0].paid_count),
                total_collected: parseFloat(summary.rows[0].total)
            }
        });
    } catch (error) {
        console.error('Error fetching print data:', error);
        res.status(500).json({ message: 'Failed to fetch print data', error: error.message });
    }
});

// ========================================
// GET DAILY COLLECTION DASHBOARD STATS
// ========================================
router.get('/dashboard', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const schoolId = req.user.schoolId;
    const today = new Date().toISOString().split('T')[0];
    
    try {
        // Today's collection
        const todayResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total
             FROM daily_feeding_fees d
             JOIN students s ON d.student_id = s.id
             WHERE d.payment_date = $1 AND s.school_id = $2`,
            [today, schoolId]
        );
        
        // This week's collection (last 7 days)
        const weekResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total
             FROM daily_feeding_fees d
             JOIN students s ON d.student_id = s.id
             WHERE d.payment_date >= CURRENT_DATE - INTERVAL '7 days'
             AND s.school_id = $1`,
            [schoolId]
        );
        
        // This month's collection
        const monthResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total
             FROM daily_feeding_fees d
             JOIN students s ON d.student_id = s.id
             WHERE EXTRACT(MONTH FROM d.payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
             AND EXTRACT(YEAR FROM d.payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
             AND s.school_id = $1`,
            [schoolId]
        );
        
        // Total students who paid today by class
        const classBreakdown = await pool.query(
            `SELECT c.name as class_name, COUNT(DISTINCT d.student_id) as students_paid,
                    COALESCE(SUM(d.amount), 0) as total
             FROM daily_feeding_fees d
             JOIN students s ON d.student_id = s.id
             JOIN class_levels c ON s.class_level_id = c.id
             WHERE d.payment_date = $1 AND s.school_id = $2
             GROUP BY c.name, c.level_order
             ORDER BY c.level_order`,
            [today, schoolId]
        );
        
        res.json({
            today_total: parseFloat(todayResult.rows[0].total),
            week_total: parseFloat(weekResult.rows[0].total),
            month_total: parseFloat(monthResult.rows[0].total),
            class_breakdown: classBreakdown.rows
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
    }
});

// ========================================
// GET ALL FEE CATEGORIES (for future use)
// ========================================
router.get('/categories', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    try {
        const result = await pool.query(
            'SELECT * FROM fee_categories WHERE is_active = true ORDER BY id'
        );
        res.json({ categories: result.rows });
    } catch (error) {
        console.error('Error fetching fee categories:', error);
        res.status(500).json({ message: 'Failed to fetch fee categories' });
    }
});
// ========================================
// RECORD ADVANCE PAYMENT (Weekly/Monthly/Termly)
// ========================================
router.post('/advance', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { student_id, amount, payment_type, start_date, end_date, payment_method, notes } = req.body;
    const collected_by = req.user.userId;
    
    if (!student_id || !amount || !payment_type || !start_date || !end_date) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    
    try {
        const receiptNumber = `ADV-${Date.now()}-${student_id}`;
        
        // Record advance payment
        const result = await pool.query(
            `INSERT INTO advance_payments 
             (student_id, amount, payment_type, start_date, end_date, payment_date, payment_method, collected_by, receipt_number, notes)
             VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8, $9)
             RETURNING *`,
            [student_id, amount, payment_type, start_date, end_date, payment_method, collected_by, receiptNumber, notes]
        );
        
        // Update student's advance balance
        await pool.query(
            `UPDATE students SET advance_balance = advance_balance + $1 WHERE id = $2`,
            [amount, student_id]
        );
        
        res.json({ 
            message: 'Advance payment recorded successfully',
            payment: result.rows[0],
            receipt_number: receiptNumber
        });
    } catch (error) {
        console.error('Error recording advance payment:', error);
        res.status(500).json({ message: 'Failed to record advance payment', error: error.message });
    }
});

// ========================================
// DEDUCT FROM ADVANCE BALANCE (When student eats)
// ========================================
router.post('/deduct', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { student_id, amount, deduction_date, daily_fee_id } = req.body;
    
    if (!student_id || !amount) {
        return res.status(400).json({ message: 'Student ID and amount are required' });
    }
    
    try {
        // Get current advance balance
        const balanceResult = await pool.query(
            `SELECT advance_balance FROM students WHERE id = $1`,
            [student_id]
        );
        
        const currentBalance = parseFloat(balanceResult.rows[0]?.advance_balance || 0);
        
        if (currentBalance < amount) {
            return res.status(400).json({ 
                message: 'Insufficient advance balance',
                current_balance: currentBalance,
                requested: amount
            });
        }
        
        // Find oldest advance payment to deduct from
        const advanceResult = await pool.query(
            `SELECT id, amount FROM advance_payments 
             WHERE student_id = $1 AND start_date <= $2 AND end_date >= $2
             ORDER BY created_at ASC
             LIMIT 1`,
            [student_id, deduction_date || new Date().toISOString().split('T')[0]]
        );
        
        let advancePaymentId = null;
        if (advanceResult.rows.length > 0) {
            advancePaymentId = advanceResult.rows[0].id;
        }
        
        // Record deduction
        const newBalance = currentBalance - amount;
        const deductionResult = await pool.query(
            `INSERT INTO advance_deductions 
             (advance_payment_id, student_id, deduction_date, amount_deducted, daily_fee_id, remaining_balance)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [advancePaymentId, student_id, deduction_date || new Date().toISOString().split('T')[0], amount, daily_fee_id, newBalance]
        );
        
        // Update student's advance balance
        await pool.query(
            `UPDATE students SET advance_balance = advance_balance - $1 WHERE id = $2`,
            [amount, student_id]
        );
        
        res.json({ 
            message: 'Deducted from advance balance',
            deducted: amount,
            remaining_balance: newBalance,
            deduction: deductionResult.rows[0]
        });
    } catch (error) {
        console.error('Error deducting from advance:', error);
        res.status(500).json({ message: 'Failed to deduct from advance', error: error.message });
    }
});

// ========================================
// GET STUDENT ADVANCE BALANCE AND HISTORY
// ========================================
router.get('/advance/student/:studentId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const studentId = req.params.studentId;
    const schoolId = req.user.schoolId;
    
    try {
        // Get student info and balance
        const studentResult = await pool.query(
            `SELECT id, full_name, admission_number, advance_balance
             FROM students
             WHERE id = $1 AND school_id = $2`,
            [studentId, schoolId]
        );
        
        if (studentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        // Get advance payment history
        const paymentsResult = await pool.query(
            `SELECT * FROM advance_payments
             WHERE student_id = $1
             ORDER BY created_at DESC`,
            [studentId]
        );
        
        // Get deduction history
        const deductionsResult = await pool.query(
            `SELECT ad.*, df.amount as daily_amount, df.payment_date
             FROM advance_deductions ad
             LEFT JOIN daily_feeding_fees df ON ad.daily_fee_id = df.id
             WHERE ad.student_id = $1
             ORDER BY ad.deduction_date DESC
             LIMIT 50`,
            [studentId]
        );
        
        res.json({
            student: studentResult.rows[0],
            balance: parseFloat(studentResult.rows[0].advance_balance),
            advance_payments: paymentsResult.rows,
            deductions: deductionsResult.rows
        });
    } catch (error) {
        console.error('Error fetching advance data:', error);
        res.status(500).json({ message: 'Failed to fetch advance data', error: error.message });
    }
});

// ========================================
// GET ALL STUDENTS WITH ADVANCE BALANCE BY CLASS
// ========================================
router.get('/advance/class/:classLevelId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const classLevelId = req.params.classLevelId;
    const schoolId = req.user.schoolId;
    
    try {
        const result = await pool.query(
            `SELECT s.id, s.full_name, s.admission_number, s.advance_balance
             FROM students s
             WHERE s.school_id = $1 AND s.class_level_id = $2
             ORDER BY s.full_name`,
            [schoolId, classLevelId]
        );
        
        res.json({ students: result.rows });
    } catch (error) {
        console.error('Error fetching advance balances:', error);
        res.status(500).json({ message: 'Failed to fetch balances', error: error.message });
    }
});

module.exports = router;
