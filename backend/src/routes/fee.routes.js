const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

const getDb = (req) => req.app.get('db');

// Get all fee categories
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

// Get fees for a specific student
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
            return res.status(404).json({ message: 'Student not found' });
        }
        
        const result = await pool.query(
            `SELECT sf.*, fc.name as fee_name, fc.description,
                    s.full_name as student_name, s.admission_number
             FROM student_fees sf
             JOIN fee_categories fc ON sf.fee_category_id = fc.id
             JOIN students s ON sf.student_id = s.id
             WHERE sf.student_id = $1
             ORDER BY sf.created_at DESC`,
            [studentId]
        );
        
        // Get payment history
        for (let fee of result.rows) {
            const payments = await pool.query(
                `SELECT * FROM fee_payments 
                 WHERE student_fee_id = $1 
                 ORDER BY payment_date DESC`,
                [fee.id]
            );
            fee.payments = payments.rows;
        }
        
        res.json({ fees: result.rows });
    } catch (error) {
        console.error('Error fetching student fees:', error);
        res.status(500).json({ message: 'Failed to fetch student fees' });
    }
});

// Get all students with fee summary by class
router.get('/summary/:classLevelId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const schoolId = req.user.schoolId;
    const classLevelId = req.params.classLevelId;
    
    try {
        const result = await pool.query(
            `SELECT s.id, s.full_name, s.admission_number,
                    COALESCE(SUM(sf.amount), 0) as total_fees,
                    COALESCE(SUM(sf.amount_paid), 0) as total_paid,
                    COALESCE(SUM(sf.amount - sf.amount_paid), 0) as total_balance
             FROM students s
             LEFT JOIN student_fees sf ON s.id = sf.student_id
             WHERE s.school_id = $1 AND s.class_level_id = $2
             GROUP BY s.id, s.full_name, s.admission_number
             ORDER BY s.full_name`,
            [schoolId, classLevelId]
        );
        
        res.json({ summary: result.rows });
    } catch (error) {
        console.error('Error fetching fee summary:', error);
        res.status(500).json({ message: 'Failed to fetch fee summary' });
    }
});

// Record a fee payment
router.post('/payment', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { student_fee_id, amount_paid, payment_method, transaction_id, remarks } = req.body;
    const received_by = req.user.userId;
    
    try {
        // Get current fee record
        const feeResult = await pool.query(
            'SELECT * FROM student_fees WHERE id = $1',
            [student_fee_id]
        );
        
        if (feeResult.rows.length === 0) {
            return res.status(404).json({ message: 'Fee record not found' });
        }
        
        const currentFee = feeResult.rows[0];
        const newAmountPaid = parseFloat(currentFee.amount_paid) + parseFloat(amount_paid);
        let status = 'pending';
        
        if (newAmountPaid >= parseFloat(currentFee.amount)) {
            status = 'paid';
        } else if (newAmountPaid > 0) {
            status = 'partial';
        }
        
        // Update student_fees
        await pool.query(
            `UPDATE student_fees 
             SET amount_paid = $1, status = $2
             WHERE id = $3`,
            [newAmountPaid, status, student_fee_id]
        );
        
        // Record payment
        const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        const paymentResult = await pool.query(
            `INSERT INTO fee_payments 
             (student_fee_id, amount_paid, payment_method, transaction_id, received_by, receipt_number, remarks)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [student_fee_id, amount_paid, payment_method, transaction_id, received_by, receiptNumber, remarks]
        );
        
        res.json({ 
            message: 'Payment recorded successfully',
            payment: paymentResult.rows[0],
            receipt_number: receiptNumber
        });
    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(500).json({ message: 'Failed to record payment' });
    }
});

// Get fee dashboard statistics
router.get('/dashboard', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const schoolId = req.user.schoolId;
    
    try {
        // Total fees collected
        const totalCollected = await pool.query(
            `SELECT COALESCE(SUM(amount_paid), 0) as total 
             FROM student_fees sf
             JOIN students s ON sf.student_id = s.id
             WHERE s.school_id = $1`,
            [schoolId]
        );
        
        // Total outstanding balance
        const totalOutstanding = await pool.query(
            `SELECT COALESCE(SUM(amount - amount_paid), 0) as total 
             FROM student_fees sf
             JOIN students s ON sf.student_id = s.id
             WHERE s.school_id = $1`,
            [schoolId]
        );
        
        // Payment status breakdown
        const statusBreakdown = await pool.query(
            `SELECT sf.status, COUNT(*) as count
             FROM student_fees sf
             JOIN students s ON sf.student_id = s.id
             WHERE s.school_id = $1
             GROUP BY sf.status`,
            [schoolId]
        );
        
        res.json({
            total_collected: totalCollected.rows[0].total,
            total_outstanding: totalOutstanding.rows[0].total,
            status_breakdown: statusBreakdown.rows
        });
    } catch (error) {
        console.error('Error fetching fee dashboard:', error);
        res.status(500).json({ message: 'Failed to fetch dashboard data' });
    }
});

module.exports = router;
