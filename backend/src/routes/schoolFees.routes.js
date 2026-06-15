const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');

const getDb = (req) => req.app.get('db');

// ========================================
// RECORD SCHOOL FEE PAYMENT
// ========================================
router.post('/pay', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { student_id, amount, term, academic_year, payment_method, notes } = req.body;
    const collected_by = req.user.userId;
    const payment_date = new Date().toISOString().split('T')[0];
    
    if (!student_id || !amount || amount <= 0 || !term || !academic_year) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    
    try {
        const receiptNumber = `SCH-${payment_date.replace(/-/g, '')}-${student_id}-${Date.now()}`;
        
        // Check if payment already exists for this student, term, and year
        const existingResult = await pool.query(
            `SELECT id, amount_paid FROM school_fees 
             WHERE student_id = $1 AND term = $2 AND academic_year = $3`,
            [student_id, term, academic_year]
        );
        
        let result;
        if (existingResult.rows.length > 0) {
            // Update existing payment
            const newAmount = parseFloat(existingResult.rows[0].amount_paid) + parseFloat(amount);
            result = await pool.query(
                `UPDATE school_fees 
                 SET amount_paid = $1, payment_date = $2, payment_method = $3, receipt_number = $4, notes = $5, collected_by = $6
                 WHERE id = $7
                 RETURNING *`,
                [newAmount, payment_date, payment_method, receiptNumber, notes || null, collected_by, existingResult.rows[0].id]
            );
        } else {
            // Insert new payment
            result = await pool.query(
                `INSERT INTO school_fees 
                 (student_id, term, academic_year, amount_paid, payment_date, payment_method, receipt_number, collected_by, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING *`,
                [student_id, term, academic_year, amount, payment_date, payment_method, receiptNumber, collected_by, notes || null]
            );
        }
        
        res.json({ 
            message: 'School fee payment recorded successfully',
            payment: result.rows[0],
            receipt_number: receiptNumber
        });
    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(500).json({ message: 'Failed to record payment', error: error.message });
    }
});

// ========================================
// GET PAYMENT SUMMARY BY CLASS
// ========================================
router.get('/summary/:classLevelId/:term/:academicYear', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { classLevelId, term, academicYear } = req.params;
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
        
        // Get payments for these students
        const paymentsResult = await pool.query(
            `SELECT sf.*, s.full_name, s.admission_number
             FROM school_fees sf
             JOIN students s ON sf.student_id = s.id
             WHERE s.class_level_id = $1 AND sf.term = $2 AND sf.academic_year = $3
             ORDER BY s.full_name`,
            [classLevelId, term, academicYear]
        );
        
        // Create payment map
        const paymentMap = {};
        paymentsResult.rows.forEach(p => {
            paymentMap[p.student_id] = p;
        });
        
        // Combine data
        const students = studentsResult.rows.map(student => ({
            ...student,
            has_paid: !!paymentMap[student.id],
            amount_paid: paymentMap[student.id]?.amount_paid || 0,
            payment_date: paymentMap[student.id]?.payment_date || null,
            receipt_number: paymentMap[student.id]?.receipt_number || null,
            payment_method: paymentMap[student.id]?.payment_method || null
        }));
        
        const totalPaid = paymentsResult.rows.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);
        const totalStudents = studentsResult.rows.length;
        const paidCount = paymentsResult.rows.length;
        
        res.json({
            class_level_id: parseInt(classLevelId),
            term,
            academic_year: academicYear,
            total_students: totalStudents,
            paid_count: paidCount,
            not_paid_count: totalStudents - paidCount,
            total_collected: totalPaid,
            students: students
        });
    } catch (error) {
        console.error('Error fetching fee summary:', error);
        res.status(500).json({ message: 'Failed to fetch fee summary', error: error.message });
    }
});

// ========================================
// DELETE/UNDO A PAYMENT
// ========================================
router.delete('/payment/:paymentId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const paymentId = req.params.paymentId;
    
    try {
        await pool.query(`DELETE FROM school_fees WHERE id = $1`, [paymentId]);
        res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
        console.error('Error deleting payment:', error);
        res.status(500).json({ message: 'Failed to delete payment' });
    }
});

// ========================================
// GET STUDENT PAYMENT HISTORY
// ========================================
router.get('/student/:studentId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const studentId = req.params.studentId;
    const schoolId = req.user.schoolId;
    
    try {
        const studentResult = await pool.query(
            `SELECT s.id, s.full_name, s.admission_number, c.name as class_name
             FROM students s
             JOIN class_levels c ON s.class_level_id = c.id
             WHERE s.id = $1 AND s.school_id = $2`,
            [studentId, schoolId]
        );
        
        if (studentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        const paymentsResult = await pool.query(
            `SELECT * FROM school_fees
             WHERE student_id = $1
             ORDER BY academic_year DESC, 
                CASE term 
                    WHEN 'Term 1' THEN 1 
                    WHEN 'Term 2' THEN 2 
                    WHEN 'Term 3' THEN 3 
                END DESC`,
            [studentId]
        );
        
        res.json({
            student: studentResult.rows[0],
            payments: paymentsResult.rows
        });
    } catch (error) {
        console.error('Error fetching student payments:', error);
        res.status(500).json({ message: 'Failed to fetch student payments', error: error.message });
    }
});

module.exports = router;
