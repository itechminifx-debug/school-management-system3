const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

const getDb = (req) => req.app.get('db');

// ========================================
// GET ALL STUDENTS WITH ADVANCE BALANCE BY CLASS
// ========================================
router.get('/advance/class/:classLevelId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const classLevelId = req.params.classLevelId;
    
    try {
        const result = await pool.query(
            `SELECT s.id, s.full_name, s.admission_number, COALESCE(s.advance_balance, 0) as advance_balance
             FROM students s
             WHERE s.class_level_id = $1
             ORDER BY s.full_name`,
            [classLevelId]
        );
        
        res.json({ students: result.rows });
    } catch (error) {
        console.error('Error fetching advance balances:', error);
        res.status(500).json({ message: 'Failed to fetch balances', error: error.message });
    }
});

// ========================================
// GET STUDENT ADVANCE BALANCE AND HISTORY
// ========================================
router.get('/advance/student/:studentId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const studentId = req.params.studentId;
    
    try {
        const studentResult = await pool.query(
            `SELECT id, full_name, admission_number, COALESCE(advance_balance, 0) as advance_balance
             FROM students
             WHERE id = $1`,
            [studentId]
        );
        
        if (studentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        const paymentsResult = await pool.query(
            `SELECT * FROM advance_payments
             WHERE student_id = $1
             ORDER BY created_at DESC`,
            [studentId]
        );
        
        const deductionsResult = await pool.query(
            `SELECT * FROM advance_deductions
             WHERE student_id = $1
             ORDER BY deduction_date DESC
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
// RECORD ADVANCE PAYMENT
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
        
        const result = await pool.query(
            `INSERT INTO advance_payments 
             (student_id, amount, payment_type, start_date, end_date, payment_date, payment_method, collected_by, receipt_number, notes)
             VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8, $9)
             RETURNING *`,
            [student_id, amount, payment_type, start_date, end_date, payment_method || 'cash', collected_by, receiptNumber, notes || null]
        );
        
        await pool.query(
            `UPDATE students SET advance_balance = COALESCE(advance_balance, 0) + $1 WHERE id = $2`,
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
// DEDUCT FROM ADVANCE BALANCE
// ========================================
router.post('/deduct', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { student_id, amount, deduction_date } = req.body;
    
    if (!student_id || !amount) {
        return res.status(400).json({ message: 'Student ID and amount are required' });
    }
    
    try {
        const balanceResult = await pool.query(
            `SELECT COALESCE(advance_balance, 0) as balance FROM students WHERE id = $1`,
            [student_id]
        );
        
        const currentBalance = parseFloat(balanceResult.rows[0]?.balance || 0);
        
        if (currentBalance < amount) {
            return res.status(400).json({ 
                message: 'Insufficient advance balance',
                current_balance: currentBalance
            });
        }
        
        const newBalance = currentBalance - amount;
        
        await pool.query(
            `INSERT INTO advance_deductions 
             (student_id, deduction_date, amount_deducted, remaining_balance)
             VALUES ($1, $2, $3, $4)`,
            [student_id, deduction_date || new Date().toISOString().split('T')[0], amount, newBalance]
        );
        
        await pool.query(
            `UPDATE students SET advance_balance = $1 WHERE id = $2`,
            [newBalance, student_id]
        );
        
        res.json({ 
            message: 'Deducted from advance balance',
            deducted: amount,
            remaining_balance: newBalance
        });
    } catch (error) {
        console.error('Error deducting from advance:', error);
        res.status(500).json({ message: 'Failed to deduct from advance', error: error.message });
    }
});

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
        const studentsResult = await pool.query(
            `SELECT s.id, s.full_name, s.admission_number
             FROM students s
             WHERE s.school_id = $1 AND s.class_level_id = $2
             ORDER BY s.full_name`,
            [schoolId, classLevelId]
        );
        
        const paymentsResult = await pool.query(
            `SELECT d.*, s.full_name, s.admission_number
             FROM daily_feeding_fees d
             JOIN students s ON d.student_id = s.id
             WHERE d.payment_date = $1 AND s.class_level_id = $2 AND s.school_id = $3
             ORDER BY s.full_name`,
            [date, classLevelId, schoolId]
        );
        
        const paymentMap = {};
        paymentsResult.rows.forEach(p => {
            paymentMap[p.student_id] = p;
        });
        
        const collection = studentsResult.rows.map(student => ({
            ...student,
            paid: !!paymentMap[student.id],
            payment_id: paymentMap[student.id]?.id || null,
            amount: paymentMap[student.id]?.amount || 0,
            receipt_number: paymentMap[student.id]?.receipt_number || null
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

// ========================================
// DELETE/UNDO A PAYMENT
// ========================================
router.delete('/payment/:paymentId', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    const paymentId = req.params.paymentId;
    
    try {
        await pool.query(`DELETE FROM daily_feeding_fees WHERE id = $1`, [paymentId]);
        res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
        console.error('Error deleting payment:', error);
        res.status(500).json({ message: 'Failed to delete payment' });
    }
});

// ========================================
// GET RECENT PAYMENTS
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
        res.status(500).json({ message: 'Failed to fetch recent payments' });
    }
});
// ========================================
// DELETE/UNDO AN ADVANCE PAYMENT
// ========================================
router.delete('/advance/:paymentId', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    const paymentId = req.params.paymentId;
    
    try {
        // Get the advance payment details first
        const paymentResult = await pool.query(
            `SELECT * FROM advance_payments WHERE id = $1`,
            [paymentId]
        );
        
        if (paymentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Advance payment not found' });
        }
        
        const payment = paymentResult.rows[0];
        
        // Subtract from student's balance
        await pool.query(
            `UPDATE students SET advance_balance = COALESCE(advance_balance, 0) - $1 WHERE id = $2`,
            [payment.amount, payment.student_id]
        );
        
        // Delete the advance payment
        await pool.query(`DELETE FROM advance_payments WHERE id = $1`, [paymentId]);
        
        // Delete associated deductions
        await pool.query(`DELETE FROM advance_deductions WHERE advance_payment_id = $1`, [paymentId]);
        
        res.json({ 
            message: 'Advance payment deleted successfully',
            deleted_amount: payment.amount
        });
    } catch (error) {
        console.error('Error deleting advance payment:', error);
        res.status(500).json({ message: 'Failed to delete advance payment', error: error.message });
    }
});

// ========================================
// DELETE/UNDO A DEDUCTION
// ========================================
router.delete('/deduction/:deductionId', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    const deductionId = req.params.deductionId;
    
    try {
        const deductionResult = await pool.query(
            `SELECT * FROM advance_deductions WHERE id = $1`,
            [deductionId]
        );
        
        if (deductionResult.rows.length === 0) {
            return res.status(404).json({ message: 'Deduction not found' });
        }
        
        const deduction = deductionResult.rows[0];
        
        // Add back to student's balance
        await pool.query(
            `UPDATE students SET advance_balance = COALESCE(advance_balance, 0) + $1 WHERE id = $2`,
            [deduction.amount_deducted, deduction.student_id]
        );
        
        // Delete the deduction
        await pool.query(`DELETE FROM advance_deductions WHERE id = $1`, [deductionId]);
        
        res.json({ 
            message: 'Deduction undone successfully',
            added_back: deduction.amount_deducted
        });
    } catch (error) {
        console.error('Error undoing deduction:', error);
        res.status(500).json({ message: 'Failed to undo deduction', error: error.message });
    }
});

// ========================================
// PRINT ADVANCE PAYMENT REPORT
// ========================================
router.get('/advance/print/:studentId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const studentId = req.params.studentId;
    const schoolId = req.user.schoolId;
    
    try {
        const studentResult = await pool.query(
            `SELECT s.id, s.full_name, s.admission_number, s.class_level_id, c.name as class_name, COALESCE(s.advance_balance, 0) as balance
             FROM students s
             JOIN class_levels c ON s.class_level_id = c.id
             WHERE s.id = $1 AND s.school_id = $2`,
            [studentId, schoolId]
        );
        
        const paymentsResult = await pool.query(
            `SELECT * FROM advance_payments
             WHERE student_id = $1
             ORDER BY created_at DESC`,
            [studentId]
        );
        
        const deductionsResult = await pool.query(
            `SELECT * FROM advance_deductions
             WHERE student_id = $1
             ORDER BY deduction_date DESC
             LIMIT 50`,
            [studentId]
        );
        
        const totalAdvance = paymentsResult.rows.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const totalDeducted = deductionsResult.rows.reduce((sum, d) => sum + parseFloat(d.amount_deducted), 0);
        
        res.json({
            student: studentResult.rows[0],
            balance: parseFloat(studentResult.rows[0].balance),
            total_advance: totalAdvance,
            total_deducted: totalDeducted,
            advance_payments: paymentsResult.rows,
            deductions: deductionsResult.rows
        });
    } catch (error) {
        console.error('Error generating advance report:', error);
        res.status(500).json({ message: 'Failed to generate report', error: error.message });
    }
});

module.exports = router;
