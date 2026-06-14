const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

const getDb = (req) => req.app.get('db');

// ========================================
// GET SCHOOL FEE SUMMARY BY CLASS
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
        
        // Get fee categories for the term
        const categoriesResult = await pool.query(
            `SELECT id, name, amount FROM school_fee_categories
             WHERE term = $1 AND academic_year = $2 AND is_active = true`,
            [term, academicYear]
        );
        
        // Get payment summary for each student
        const feeSummary = [];
        for (const student of studentsResult.rows) {
            let totalAmount = 0;
            let totalPaid = 0;
            
            for (const category of categoriesResult.rows) {
                const feeResult = await pool.query(
                    `SELECT total_amount, amount_paid 
                     FROM student_school_fees
                     WHERE student_id = $1 AND fee_category_id = $2`,
                    [student.id, category.id]
                );
                
                if (feeResult.rows.length > 0) {
                    totalAmount += parseFloat(feeResult.rows[0].total_amount);
                    totalPaid += parseFloat(feeResult.rows[0].amount_paid);
                }
            }
            
            const balance = totalAmount - totalPaid;
            let status = 'unpaid';
            if (balance <= 0) status = 'paid';
            else if (totalPaid > 0) status = 'partial';
            
            feeSummary.push({
                ...student,
                total_amount: totalAmount,
                amount_paid: totalPaid,
                balance: balance,
                status: status
            });
        }
        
        // Calculate totals
        const totalExpected = feeSummary.reduce((sum, s) => sum + s.total_amount, 0);
        const totalCollected = feeSummary.reduce((sum, s) => sum + s.amount_paid, 0);
        const totalOutstanding = totalExpected - totalCollected;
        const paidCount = feeSummary.filter(s => s.status === 'paid').length;
        const partialCount = feeSummary.filter(s => s.status === 'partial').length;
        const unpaidCount = feeSummary.filter(s => s.status === 'unpaid').length;
        
        res.json({
            class_level_id: parseInt(classLevelId),
            term,
            academic_year: academicYear,
            fee_categories: categoriesResult.rows,
            students: feeSummary,
            totals: {
                total_expected: totalExpected,
                total_collected: totalCollected,
                total_outstanding: totalOutstanding,
                paid_count: paidCount,
                partial_count: partialCount,
                unpaid_count: unpaidCount,
                total_students: studentsResult.rows.length
            }
        });
    } catch (error) {
        console.error('Error fetching fee summary:', error);
        res.status(500).json({ message: 'Failed to fetch fee summary', error: error.message });
    }
});

// ========================================
// RECORD SCHOOL FEE PAYMENT
// ========================================
router.post('/payment', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { student_id, amount, fee_category_ids, payment_method, notes } = req.body;
    const collected_by = req.user.userId;
    const payment_date = new Date().toISOString().split('T')[0];
    
    if (!student_id || !amount || amount <= 0) {
        return res.status(400).json({ message: 'Valid amount is required' });
    }
    
    try {
        const receiptNumber = `SCH-${payment_date.replace(/-/g, '')}-${student_id}-${Date.now()}`;
        
        // Get outstanding fees for this student
        let categoriesToUpdate = fee_category_ids;
        if (!categoriesToUpdate || categoriesToUpdate.length === 0) {
            const categoriesResult = await pool.query(
                `SELECT sf.id, sf.total_amount, sf.amount_paid
                 FROM student_school_fees sf
                 JOIN school_fee_categories fc ON sf.fee_category_id = fc.id
                 WHERE sf.student_id = $1 AND sf.balance > 0
                 ORDER BY fc.term, fc.id`,
                [student_id]
            );
            categoriesToUpdate = categoriesResult.rows.map(c => c.id);
        }
        
        let remainingAmount = amount;
        let paymentRecords = [];
        
        for (const feeId of categoriesToUpdate) {
            if (remainingAmount <= 0) break;
            
            const feeResult = await pool.query(
                `SELECT * FROM student_school_fees WHERE id = $1 AND student_id = $2`,
                [feeId, student_id]
            );
            
            if (feeResult.rows.length === 0) continue;
            
            const fee = feeResult.rows[0];
            const currentPaid = parseFloat(fee.amount_paid);
            const totalAmount = parseFloat(fee.total_amount);
            const currentBalance = totalAmount - currentPaid;
            
            let paymentAmount = Math.min(remainingAmount, currentBalance);
            
            if (paymentAmount > 0) {
                const newPaid = currentPaid + paymentAmount;
                let status = 'partial';
                if (newPaid >= totalAmount) status = 'paid';
                
                await pool.query(
                    `UPDATE student_school_fees 
                     SET amount_paid = $1, status = $2
                     WHERE id = $3`,
                    [newPaid, status, feeId]
                );
                
                const paymentResult = await pool.query(
                    `INSERT INTO school_fee_payments 
                     (student_fee_id, amount_paid, payment_date, payment_method, receipt_number, collected_by, notes)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     RETURNING *`,
                    [feeId, paymentAmount, payment_date, payment_method || 'cash', receiptNumber, collected_by, notes || null]
                );
                
                paymentRecords.push(paymentResult.rows[0]);
                remainingAmount -= paymentAmount;
            }
        }
        
        res.json({ 
            message: 'School fee payment recorded successfully',
            payments: paymentRecords,
            receipt_number: receiptNumber,
            remaining: remainingAmount
        });
    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(500).json({ message: 'Failed to record payment', error: error.message });
    }
});

// ========================================
// GET STUDENT SCHOOL FEE DETAILS
// ========================================
router.get('/student/:studentId/:term/:academicYear', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { studentId, term, academicYear } = req.params;
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
        
        const feesResult = await pool.query(
            `SELECT sf.*, fc.name as fee_name, fc.description, fc.term, fc.academic_year
             FROM student_school_fees sf
             JOIN school_fee_categories fc ON sf.fee_category_id = fc.id
             WHERE sf.student_id = $1 AND fc.term = $2 AND fc.academic_year = $3
             ORDER BY fc.id`,
            [studentId, term, academicYear]
        );
        
        const paymentsResult = await pool.query(
            `SELECT sfp.*, fc.name as fee_name
             FROM school_fee_payments sfp
             JOIN student_school_fees sf ON sfp.student_fee_id = sf.id
             JOIN school_fee_categories fc ON sf.fee_category_id = fc.id
             WHERE sf.student_id = $1
             ORDER BY sfp.payment_date DESC
             LIMIT 50`,
            [studentId]
        );
        
        const totalAmount = feesResult.rows.reduce((sum, f) => sum + parseFloat(f.total_amount), 0);
        const totalPaid = feesResult.rows.reduce((sum, f) => sum + parseFloat(f.amount_paid), 0);
        const balance = totalAmount - totalPaid;
        
        res.json({
            student: studentResult.rows[0],
            term,
            academic_year: academicYear,
            total_amount: totalAmount,
            amount_paid: totalPaid,
            balance: balance,
            fees: feesResult.rows,
            payment_history: paymentsResult.rows
        });
    } catch (error) {
        console.error('Error fetching student fees:', error);
        res.status(500).json({ message: 'Failed to fetch student fees', error: error.message });
    }
});

// ========================================
// GET ALL STUDENTS WITH ARREARS (Owing)
// ========================================
router.get('/arrears/:term/:academicYear', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { term, academicYear } = req.params;
    const schoolId = req.user.schoolId;
    
    try {
        const result = await pool.query(
            `SELECT s.id, s.full_name, s.admission_number, c.name as class_name,
                    COALESCE(SUM(sf.total_amount), 0) as total_fees,
                    COALESCE(SUM(sf.amount_paid), 0) as amount_paid,
                    COALESCE(SUM(sf.total_amount - sf.amount_paid), 0) as balance
             FROM students s
             JOIN class_levels c ON s.class_level_id = c.id
             LEFT JOIN student_school_fees sf ON s.id = sf.student_id
             LEFT JOIN school_fee_categories fc ON sf.fee_category_id = fc.id
             WHERE s.school_id = $1 AND fc.term = $2 AND fc.academic_year = $3
             GROUP BY s.id, s.full_name, s.admission_number, c.name
             HAVING COALESCE(SUM(sf.total_amount - sf.amount_paid), 0) > 0
             ORDER BY c.name, s.full_name`,
            [schoolId, term, academicYear]
        );
        
        const totalOwing = result.rows.reduce((sum, s) => sum + parseFloat(s.balance), 0);
        
        res.json({
            term,
            academic_year,
            total_students_owing: result.rows.length,
            total_owing_amount: totalOwing,
            students: result.rows
        });
    } catch (error) {
        console.error('Error fetching arrears:', error);
        res.status(500).json({ message: 'Failed to fetch arrears', error: error.message });
    }
});

// ========================================
// GET SCHOOL FEE DASHBOARD STATS
// ========================================
router.get('/dashboard/:academicYear', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const { academicYear } = req.params;
    const schoolId = req.user.schoolId;
    
    try {
        const term1Result = await pool.query(
            `SELECT COALESCE(SUM(sf.amount_paid), 0) as collected,
                    COALESCE(SUM(sf.total_amount), 0) as expected
             FROM student_school_fees sf
             JOIN school_fee_categories fc ON sf.fee_category_id = fc.id
             JOIN students s ON sf.student_id = s.id
             WHERE fc.academic_year = $1 AND fc.term = 'Term 1' AND s.school_id = $2`,
            [academicYear, schoolId]
        );
        
        const term2Result = await pool.query(
            `SELECT COALESCE(SUM(sf.amount_paid), 0) as collected,
                    COALESCE(SUM(sf.total_amount), 0) as expected
             FROM student_school_fees sf
             JOIN school_fee_categories fc ON sf.fee_category_id = fc.id
             JOIN students s ON sf.student_id = s.id
             WHERE fc.academic_year = $1 AND fc.term = 'Term 2' AND s.school_id = $2`,
            [academicYear, schoolId]
        );
        
        const term3Result = await pool.query(
            `SELECT COALESCE(SUM(sf.amount_paid), 0) as collected,
                    COALESCE(SUM(sf.total_amount), 0) as expected
             FROM student_school_fees sf
             JOIN school_fee_categories fc ON sf.fee_category_id = fc.id
             JOIN students s ON sf.student_id = s.id
             WHERE fc.academic_year = $1 AND fc.term = 'Term 3' AND s.school_id = $2`,
            [academicYear, schoolId]
        );
        
        res.json({
            academic_year: academicYear,
            term1: {
                collected: parseFloat(term1Result.rows[0].collected),
                expected: parseFloat(term1Result.rows[0].expected)
            },
            term2: {
                collected: parseFloat(term2Result.rows[0].collected),
                expected: parseFloat(term2Result.rows[0].expected)
            },
            term3: {
                collected: parseFloat(term3Result.rows[0].collected),
                expected: parseFloat(term3Result.rows[0].expected)
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
    }
});

module.exports = router;
