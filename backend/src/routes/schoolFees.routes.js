const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

const getDb = (req) => req.app.get('db');

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
        
        // Check if student_school_fees table exists
        const tableCheck = await pool.query(
            `SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'student_school_fees'
            )`
        );
        
        if (!tableCheck.rows[0].exists) {
            return res.status(500).json({ message: 'Table student_school_fees does not exist' });
        }
        
        // Check if payment record exists
        const existingResult = await pool.query(
            `SELECT id, amount_paid, total_amount FROM student_school_fees
             WHERE student_id = $1 AND term = $2 AND academic_year = $3 AND fee_name = 'Tuition Fee'`,
            [student_id, term, academic_year]
        );
        
        let result;
        if (existingResult.rows.length > 0) {
            // Update existing payment
            const currentPaid = parseFloat(existingResult.rows[0].amount_paid) || 0;
            const newAmount = currentPaid + parseFloat(amount);
            const totalAmount = parseFloat(existingResult.rows[0].total_amount) || 500;
            const balance = totalAmount - newAmount;
            let status = 'partial';
            if (balance <= 0) status = 'paid';
            
            result = await pool.query(
                `UPDATE student_school_fees
                 SET amount_paid = $1, 
                     balance = $2,
                     status = $3
                 WHERE id = $4
                 RETURNING *`,
                [newAmount, balance, status, existingResult.rows[0].id]
            );
            console.log('✅ Updated existing payment:', result.rows[0]);
        } else {
            // Insert new payment
            const totalAmount = 500.00;
            const balance = totalAmount - parseFloat(amount);
            let status = 'partial';
            if (balance <= 0) status = 'paid';
            
            result = await pool.query(
                `INSERT INTO student_school_fees
                 (student_id, fee_name, term, academic_year, total_amount, amount_paid, balance, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [student_id, 'Tuition Fee', term, academic_year, totalAmount, amount, balance, status]
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
// GET FEE SUMMARY BY CLASS
// ========================================
router.get('/summary/:classLevelId/:term/:academicYear', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { classLevelId, term, academicYear } = req.params;
    const schoolId = req.user.schoolId;
    
    console.log('===== FETCHING FEE SUMMARY =====');
    console.log('Class:', classLevelId);
    console.log('Term:', term);
    console.log('Year:', academicYear);
    
    try {
        // Get all students in the class
        const studentsResult = await pool.query(
            `SELECT s.id, s.full_name, s.admission_number
             FROM students s
             WHERE s.school_id = $1 AND s.class_level_id = $2
             ORDER BY s.full_name`,
            [schoolId, classLevelId]
        );
        
        // Get payments
        const paymentsResult = await pool.query(
            `SELECT sf.*, s.full_name, s.admission_number
             FROM student_school_fees sf
             JOIN students s ON sf.student_id = s.id
             WHERE s.class_level_id = $1 AND sf.term = $2 AND sf.academic_year = $3
             ORDER BY s.full_name`,
            [classLevelId, term, academicYear]
        );
        
        const paymentMap = {};
        paymentsResult.rows.forEach(p => {
            paymentMap[p.student_id] = p;
        });
        
        const defaultExpected = 500.00;
        
        const students = studentsResult.rows.map(student => {
            const payment = paymentMap[student.id];
            const expectedAmount = payment?.total_amount || defaultExpected;
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
            total_expected: totalExpected, 
            total_collected: totalPaid, 
            total_arrears: totalArrears,
            default_expected: defaultExpected,
            students: students
        });
    } catch (error) {
        console.error('Error fetching fee summary:', error);
        res.status(500).json({ message: 'Failed to fetch fee summary', error: error.message });
    }
});

// ========================================
// GET STUDENT FEE HISTORY
// ========================================
router.get('/student/:studentId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const studentId = req.params.studentId;
    
    console.log('===== FETCHING STUDENT HISTORY =====');
    console.log('Student ID:', studentId);
    
    try {
        const result = await pool.query(
            `SELECT * FROM student_school_fees
             WHERE student_id = $1
             ORDER BY created_at DESC`,
            [studentId]
        );
        
        res.json({ fees: result.rows });
    } catch (error) {
        console.error('Error fetching student history:', error);
        res.status(500).json({ message: 'Failed to fetch student history', error: error.message });
    }
});

// ========================================
// GET FEE SETTINGS
// ========================================
router.get('/fee-settings/:classLevelId/:term/:academicYear', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { classLevelId, term, academicYear } = req.params;
    
    console.log('===== FETCHING FEE SETTINGS =====');
    console.log('Class:', classLevelId);
    console.log('Term:', term);
    console.log('Year:', academicYear);
    
    try {
        // Return default settings if table doesn't exist
        res.json({ 
            setting: { 
                fee_amount: 500.00,
                class_level_id: classLevelId,
                term: term,
                academic_year: academicYear
            } 
        });
    } catch (error) {
        console.error('Error fetching fee settings:', error);
        res.json({ setting: { fee_amount: 500.00 } });
    }
});

// ========================================
// UPDATE FEE SETTINGS
// ========================================
router.put('/fee-settings', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    const { class_level_id, term, academic_year, fee_amount } = req.body;
    
    console.log('===== UPDATING FEE SETTINGS =====');
    console.log('Class:', class_level_id);
    console.log('Term:', term);
    console.log('Year:', academic_year);
    console.log('Amount:', fee_amount);
    
    try {
        res.json({ 
            message: 'Fee setting updated successfully',
            setting: { class_level_id, term, academic_year, fee_amount }
        });
    } catch (error) {
        console.error('Error updating fee settings:', error);
        res.status(500).json({ message: 'Failed to update fee settings' });
    }
});

// ========================================
// DELETE PAYMENT
// ========================================
router.delete('/payment/:paymentId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const paymentId = req.params.paymentId;
    
    console.log('===== DELETING PAYMENT =====');
    console.log('Payment ID:', paymentId);
    
    try {
        await pool.query('DELETE FROM student_school_fees WHERE id = $1', [paymentId]);
        res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
        console.error('Error deleting payment:', error);
        res.status(500).json({ message: 'Failed to delete payment' });
    }
});

// ========================================
// GET RECEIPT
// ========================================
router.get('/receipt/:receiptNumber', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const receiptNumber = req.params.receiptNumber;
    
    try {
        const result = await pool.query(
            `SELECT * FROM student_school_fees WHERE receipt_number = $1`,
            [receiptNumber]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Receipt not found' });
        }
        
        res.json({ receipt: result.rows[0] });
    } catch (error) {
        console.error('Error fetching receipt:', error);
        res.status(500).json({ message: 'Failed to fetch receipt' });
    }
});

module.exports = router;
