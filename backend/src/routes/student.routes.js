const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

// Helper to get database
const getDb = (req) => req.app.get('db');

// GET all students (for current user's school)
router.get('/', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const schoolId = req.user.schoolId;
    
    try {
        const result = await pool.query(
            `SELECT s.id, s.admission_number, s.full_name, s.class_level_id, 
                    s.parent_phone, s.date_of_birth, s.address, s.created_at,
                    c.name as class_name, c.category as class_category
             FROM students s
             LEFT JOIN class_levels c ON s.class_level_id = c.id
             WHERE s.school_id = $1 
             ORDER BY s.created_at DESC`,
            [schoolId]
        );
        res.json({ students: result.rows });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ message: 'Failed to fetch students', error: error.message });
    }
});

// GET single student by ID
router.get('/:id', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const schoolId = req.user.schoolId;
    const studentId = req.params.id;
    
    try {
        const result = await pool.query(
            `SELECT s.id, s.admission_number, s.full_name, s.class_level_id, 
                    s.parent_phone, s.date_of_birth, s.address, s.created_at,
                    c.name as class_name, c.category as class_category
             FROM students s
             LEFT JOIN class_levels c ON s.class_level_id = c.id
             WHERE s.id = $1 AND s.school_id = $2`,
            [studentId, schoolId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        res.json({ student: result.rows[0] });
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({ message: 'Failed to fetch student', error: error.message });
    }
});

// POST create new student
router.post('/', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const schoolId = req.user.schoolId;
    const { admission_number, full_name, class_level_id, parent_phone, date_of_birth, address } = req.body;
    
    // Validation
    if (!admission_number || !full_name || !class_level_id) {
        return res.status(400).json({ 
            message: 'Missing required fields',
            required: ['admission_number', 'full_name', 'class_level_id']
        });
    }
    
    try {
        // Check if admission number already exists
        const existingCheck = await pool.query(
            'SELECT id FROM students WHERE admission_number = $1 AND school_id = $2',
            [admission_number, schoolId]
        );
        
        if (existingCheck.rows.length > 0) {
            return res.status(409).json({ message: 'Admission number already exists' });
        }

        // Verify class level exists
        const classCheck = await pool.query(
            'SELECT id FROM class_levels WHERE id = $1',
            [class_level_id]
        );

        if (classCheck.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid class level selected' });
        }
        
        const result = await pool.query(
            `INSERT INTO students (school_id, admission_number, full_name, class_level_id, parent_phone, date_of_birth, address) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING id, admission_number, full_name, class_level_id, parent_phone, date_of_birth, address, created_at`,
            [schoolId, admission_number, full_name, class_level_id, parent_phone || null, date_of_birth || null, address || null]
        );
        
        res.status(201).json({ 
            message: 'Student added successfully',
            student: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating student:', error);
        res.status(500).json({ message: 'Failed to create student', error: error.message });
    }
});

// PUT update student
router.put('/:id', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const schoolId = req.user.schoolId;
    const studentId = req.params.id;
    const { full_name, class_level_id, parent_phone, date_of_birth, address, admission_number } = req.body;
    
    try {
        // Check if student exists and belongs to this school
        const studentCheck = await pool.query(
            'SELECT id FROM students WHERE id = $1 AND school_id = $2',
            [studentId, schoolId]
        );
        
        if (studentCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Verify class level exists if provided
        if (class_level_id) {
            const classCheck = await pool.query(
                'SELECT id FROM class_levels WHERE id = $1',
                [class_level_id]
            );
            if (classCheck.rows.length === 0) {
                return res.status(400).json({ message: 'Invalid class level selected' });
            }
        }
        
        // Check if admission number already exists for another student
        if (admission_number) {
            const existingCheck = await pool.query(
                'SELECT id FROM students WHERE admission_number = $1 AND id != $2 AND school_id = $3',
                [admission_number, studentId, schoolId]
            );
            if (existingCheck.rows.length > 0) {
                return res.status(409).json({ message: 'Admission number already exists for another student' });
            }
        }
        
        const result = await pool.query(
            `UPDATE students 
             SET full_name = COALESCE($1, full_name),
                 class_level_id = COALESCE($2, class_level_id),
                 parent_phone = COALESCE($3, parent_phone),
                 date_of_birth = COALESCE($4, date_of_birth),
                 address = COALESCE($5, address),
                 admission_number = COALESCE($6, admission_number)
             WHERE id = $7 AND school_id = $8
             RETURNING id, admission_number, full_name, class_level_id, parent_phone, date_of_birth, address`,
            [full_name, class_level_id, parent_phone, date_of_birth, address, admission_number, studentId, schoolId]
        );
        
        res.json({ 
            message: 'Student updated successfully',
            student: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ message: 'Failed to update student', error: error.message });
    }
});

// DELETE student
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    const schoolId = req.user.schoolId;
    const studentId = req.params.id;
    
    try {
        const result = await pool.query(
            'DELETE FROM students WHERE id = $1 AND school_id = $2 RETURNING id',
            [studentId, schoolId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ message: 'Failed to delete student', error: error.message });
    }
});

module.exports = router;
