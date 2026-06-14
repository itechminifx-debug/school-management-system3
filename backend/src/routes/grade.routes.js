const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

const getDb = (req) => req.app.get('db');

// Helper function to calculate grade letter
function getGradeLetter(score) {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
}

// ADD OR UPDATE GRADE for a student
router.post('/', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const schoolId = req.user.schoolId;
    const { student_id, subject, score, term, academic_year } = req.body;

    if (!student_id || !subject || !score || !term || !academic_year) {
        return res.status(400).json({ 
            message: 'Missing required fields: student_id, subject, score, term, academic_year' 
        });
    }

    if (score < 0 || score > 100) {
        return res.status(400).json({ message: 'Score must be between 0 and 100' });
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

        const gradeLetter = getGradeLetter(score);

        // Check if grade exists
        const existingGrade = await pool.query(
            'SELECT id FROM grades WHERE student_id = $1 AND subject = $2 AND term = $3 AND academic_year = $4',
            [student_id, subject, term, academic_year]
        );

        let result;
        if (existingGrade.rows.length > 0) {
            // Update existing grade
            result = await pool.query(
                `UPDATE grades 
                 SET score = $1, grade_letter = $2
                 WHERE student_id = $3 AND subject = $4 AND term = $5 AND academic_year = $6
                 RETURNING id, student_id, subject, score, term, academic_year, grade_letter`,
                [score, gradeLetter, student_id, subject, term, academic_year]
            );
        } else {
            // Insert new grade
            result = await pool.query(
                `INSERT INTO grades (student_id, subject, score, term, academic_year, grade_letter) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING id, student_id, subject, score, term, academic_year, grade_letter`,
                [student_id, subject, score, term, academic_year, gradeLetter]
            );
        }

        res.json({ 
            message: 'Grade recorded successfully',
            grade: result.rows[0]
        });
    } catch (error) {
        console.error('Error recording grade:', error);
        res.status(500).json({ message: 'Failed to record grade', error: error.message });
    }
});

// GET GRADES for a specific student
router.get('/student/:studentId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const schoolId = req.user.schoolId;
    const studentId = req.params.studentId;

    try {
        const studentCheck = await pool.query(
            'SELECT id, full_name, class FROM students WHERE id = $1 AND school_id = $2',
            [studentId, schoolId]
        );

        if (studentCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const result = await pool.query(
            `SELECT id, subject, score, term, academic_year, grade_letter, created_at 
             FROM grades 
             WHERE student_id = $1 
             ORDER BY academic_year DESC, term DESC, subject`,
            [studentId]
        );

        res.json({ 
            student: studentCheck.rows[0],
            grades: result.rows 
        });
    } catch (error) {
        console.error('Error fetching grades:', error);
        res.status(500).json({ message: 'Failed to fetch grades', error: error.message });
    }
});

// GET REPORT CARD for a student (by term)
router.get('/report/:studentId/:term/:academic_year', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const schoolId = req.user.schoolId;
    const studentId = req.params.studentId;
    const { term, academic_year } = req.params;

    try {
        const studentCheck = await pool.query(
            'SELECT id, full_name, class, admission_number FROM students WHERE id = $1 AND school_id = $2',
            [studentId, schoolId]
        );

        if (studentCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const grades = await pool.query(
            `SELECT subject, score, grade_letter 
             FROM grades 
             WHERE student_id = $1 AND term = $2 AND academic_year = $3 
             ORDER BY subject`,
            [studentId, term, academic_year]
        );

        // Calculate average and total
        let totalScore = 0;
        grades.rows.forEach(g => { totalScore += parseFloat(g.score); });
        const average = grades.rows.length > 0 ? (totalScore / grades.rows.length).toFixed(2) : 0;

        let performance = 'Needs Improvement';
        if (average >= 80) performance = 'Excellent';
        else if (average >= 70) performance = 'Very Good';
        else if (average >= 60) performance = 'Good';
        else if (average >= 50) performance = 'Average';

        res.json({
            student: studentCheck.rows[0],
            term,
            academic_year,
            grades: grades.rows,
            summary: {
                total_subjects: grades.rows.length,
                total_score: totalScore,
                average_score: average,
                performance: performance
            }
        });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ message: 'Failed to generate report', error: error.message });
    }
});

// DELETE a grade (admin only)
router.delete('/:gradeId', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    const gradeId = req.params.gradeId;

    try {
        const result = await pool.query(
            'DELETE FROM grades WHERE id = $1 RETURNING id',
            [gradeId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Grade not found' });
        }

        res.json({ message: 'Grade deleted successfully' });
    } catch (error) {
        console.error('Error deleting grade:', error);
        res.status(500).json({ message: 'Failed to delete grade', error: error.message });
    }
});

module.exports = router;