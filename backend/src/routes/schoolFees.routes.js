const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

const getDb = (req) => req.app.get('db');

// ========================================
// GET/SET CLASS FEE AMOUNTS
// ========================================
router.get('/fee-settings/:classLevelId/:term/:academicYear', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { classLevelId, term, academicYear } = req.params;
    
    try {
        const result = await pool.query(
            `SELECT * FROM class_fee_settings 
             WHERE class_level_id = $1 AND term = $2 AND academic_year = $3`,
            [classLevelId, term, academicYear]
        );
        
        res.json({ setting: result.rows[0] || null });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch fee setting', error: error.message });
    }
});

router.put('/fee-settings', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    const { class_level_id, term, academic_year, fee_amount } = req.body;
    
    try {
        const result = await pool.query(
            `INSERT INTO class_fee_settings (class_level_id, term, academic_year, fee_amount)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (class_level_id, term, academic_year)
             DO UPDATE SET fee_amount = $4, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [class_level_id, term, academic_year, fee_amount]
        );
        
        // Update all existing unpaid fees for this class
        await pool.query(
            `UPDATE school_fees 
             SET expected_amount = $1
             WHERE student_id IN (SELECT id FROM students WHERE class_level_id = $2)
               AND term = $3 AND academic_year = $4`,
            [fee_amount, class_level_id, term, academic_year]
        );
        
        res.json({ message: 'Fee setting updated successfully', setting: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update fee setting', error: error.message });
    }
});

// ========================================
// RECORD SCHOOL FEE PAYMENT
// ========================================
router.post('/pay', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { student_id, amount, term, academic_year, payment_method, notes } = req.body;
    const collected_by = req.user.userId;
    const payment_date = new Date().toISOString().split('T')[0];
    
    console.log('===== RECORDING PAYMENT =====');
    console.log('Student ID:', student_id);
    console.log('Amount:', amount);
    console.log('Term:', term);
    console.log('Year:', academic_year);
    
    if (!student_id || !amount || amount <= 0 || !term || !academic_year) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    
    try {
        const receiptNumber = `SCH-${payment_date.replace(/-/g, '')}-${student_id}-${Date.now()}`;
        
        // Check if payment already exists for this student, term, and year
        const existingResult = await pool.query(
            `SELECT id, amount_paid, total_amount FROM school_fees 
             WHERE student_id = $1 AND term = $2 AND academic_year = $3`,
            [student_id, term, academic_year]
        );
        
        let result;
        if (existingResult.rows.length > 0) {
            // Update existing payment
            const currentPaid = parseFloat(existingResult.rows[0].amount_paid);
            const newAmount = currentPaid + parseFloat(amount);
            const totalAmount = parseFloat(existingResult.rows[0].total_amount);
            const balance = totalAmount - newAmount;
            let status = 'partial';
            if (balance <= 0) status = 'paid';
            
            result = await pool.query(
                `UPDATE school_fees 
                 SET amount_paid = $1, 
                     balance = $2,
                     status = $3,
                     payment_date = $4, 
                     payment_method = $5, 
                     receipt_number = $6, 
                     notes = $7, 
                     collected_by = $8
                 WHERE id = $9
                 RETURNING *`,
                [newAmount, balance, status, payment_date, payment_method, receiptNumber, notes || null, collected_by, existingResult.rows[0].id]
            );
            console.log('✅ Updated existing payment:', result.rows[0]);
        } else {
            // Insert new payment
            const totalAmount = 500.00; // Default tuition fee
            const balance = totalAmount - parseFloat(amount);
            let status = 'partial';
            if (balance <= 0) status = 'paid';
            
            result = await pool.query(
                `INSERT INTO school_fees 
                 (student_id, term, academic_year, total_amount, amount_paid, balance, status, payment_date, payment_method, receipt_number, collected_by, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                 RETURNING *`,
                [student_id, term, academic_year, totalAmount, amount, balance, status, payment_date, payment_method, receiptNumber, collected_by, notes || null]
            );
            console.log('✅ Inserted new payment:', result.rows[0]);
        }
        
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
// GET PAYMENT SUMMARY BY CLASS WITH ARREARS
// ========================================
router.get('/summary/:classLevelId/:term/:academicYear', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { classLevelId, term, academicYear } = req.params;
    const schoolId = req.user.schoolId;
    
    try {
        const studentsResult = await pool.query(
            `SELECT s.id, s.full_name, s.admission_number
             FROM students s
             WHERE s.school_id = $1 AND s.class_level_id = $2
             ORDER BY s.full_name`,
            [schoolId, classLevelId]
        );
        
        // Get fee setting for this class
        const feeSetting = await pool.query(
            `SELECT fee_amount FROM class_fee_settings 
             WHERE class_level_id = $1 AND term = $2 AND academic_year = $3`,
            [classLevelId, term, academicYear]
        );
        const defaultExpected = feeSetting.rows[0]?.fee_amount || 500.00;
        
        const paymentsResult = await pool.query(
            `SELECT sf.*, s.full_name, s.admission_number
             FROM school_fees sf
             JOIN students s ON sf.student_id = s.id
             WHERE s.class_level_id = $1 AND sf.term = $2 AND sf.academic_year = $3
             ORDER BY s.full_name`,
            [classLevelId, term, academicYear]
        );
        
        const paymentMap = {};
        paymentsResult.rows.forEach(p => {
            paymentMap[p.student_id] = p;
        });
        
        const students = studentsResult.rows.map(student => {
            const payment = paymentMap[student.id];
            const expectedAmount = payment?.expected_amount || defaultExpected;
            const amountPaid = payment?.amount_paid || 0;
            const arrears = expectedAmount - amountPaid;
            let status = 'unpaid';
            if (arrears <= 0) status = 'paid';
            else if (amountPaid > 0) status = 'partial';
            
            return {
                ...student,
                expected_amount: expectedAmount,
                amount_paid: amountPaid,
                arrears: arrears > 0 ? arrears : 0,
                status: status,
                payment_date: payment?.payment_date || null,
                receipt_number: payment?.receipt_number || null,
                payment_method: payment?.payment_method || null,
                payment_id: payment?.id || null
            };
        });
        
        const totalExpected = students.reduce((sum, s) => sum + s.expected_amount, 0);
        const totalPaid = students.reduce((sum, s) => sum + s.amount_paid, 0);
        const totalArrears = students.reduce((sum, s) => sum + s.arrears, 0);
        
        res.json({
            class_level_id: parseInt(classLevelId),
            term, academic_year: academicYear,
            total_students: studentsResult.rows.length,
            paid_count: students.filter(s => s.status === 'paid').length,
            partial_count: students.filter(s => s.status === 'partial').length,
            unpaid_count: students.filter(s => s.status === 'unpaid').length,
            total_expected: totalExpected, total_collected: totalPaid, total_arrears: totalArrears,
            default_expected: defaultExpected,
            students: students
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch summary', error: error.message });
    }
});

// ========================================
// DELETE/UNDO PAYMENT
// ========================================
router.delete('/payment/:paymentId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const paymentId = req.params.paymentId;
    try {
        await pool.query(`DELETE FROM school_fees WHERE id = $1`, [paymentId]);
        res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete payment' });
    }
});

// ========================================
// GET STUDENT HISTORY
// ========================================
router.get('/student/:studentId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const studentId = req.params.studentId;
    const schoolId = req.user.schoolId;
    
    try {
        const studentResult = await pool.query(
            `SELECT s.id, s.full_name, s.admission_number, c.name as class_name
             FROM students s JOIN class_levels c ON s.class_level_id = c.id
             WHERE s.id = $1 AND s.school_id = $2`,
            [studentId, schoolId]
        );
        if (studentResult.rows.length === 0) return res.status(404).json({ message: 'Student not found' });
        
        const paymentsResult = await pool.query(
            `SELECT * FROM school_fees WHERE student_id = $1 ORDER BY academic_year DESC, term DESC`,
            [studentId]
        );
        
        res.json({ student: studentResult.rows[0], payments: paymentsResult.rows });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch history', error: error.message });
    }
});

// ========================================
// GET RECEIPT DATA
// ========================================
router.get('/receipt/:receiptNumber', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { receiptNumber } = req.params;
    
    try {
        const result = await pool.query(
            `SELECT sf.*, s.full_name, s.admission_number, c.name as class_name
             FROM school_fees sf
             JOIN students s ON sf.student_id = s.id
             JOIN class_levels c ON s.class_level_id = c.id
             WHERE sf.receipt_number = $1`,
            [receiptNumber]
        );
        
        if (result.rows.length === 0) return res.status(404).json({ message: 'Receipt not found' });
        
        res.json({ receipt: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch receipt', error: error.message });
    }
});

module.exports = router;
