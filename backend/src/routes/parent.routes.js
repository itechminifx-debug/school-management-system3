const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

const getDb = (req) => req.app.get('db');

// ========================================
// PARENT LOGIN
// ========================================
router.post('/login', async (req, res) => {
    const pool = getDb(req);
    const { email, password } = req.body;
    
    try {
        const result = await pool.query(
            `SELECT p.id, p.full_name, p.email, p.phone, u.id as user_id, u.role
             FROM parents p
             JOIN users u ON p.id = u.parent_id
             WHERE p.email = $1`,
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const parent = result.rows[0];
        const isValid = await bcrypt.compare(password, parent.password_hash);
        
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Verify role is parent
        if (parent.role !== 'parent') {
            return res.status(403).json({ message: 'Access denied. This account is not a parent account.' });
        }
        
        const token = jwt.sign(
            { 
                userId: parent.user_id, 
                parentId: parent.id,
                role: 'parent',
                email: parent.email,
                full_name: parent.full_name
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            parent: {
                id: parent.id,
                full_name: parent.full_name,
                email: parent.email,
                phone: parent.phone,
                role: 'parent'
            }
        });
    } catch (error) {
        console.error('Parent login error:', error);
        res.status(500).json({ message: 'Login failed', error: error.message });
    }
});
// ========================================
// GET PARENT'S CHILDREN
// ========================================
router.get('/children', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const parentId = req.user.parentId;
    
    try {
        const result = await pool.query(
            `SELECT s.id, s.full_name, s.admission_number, s.class_level_id, c.name as class_name,
                    ps.relationship
             FROM parent_students ps
             JOIN students s ON ps.student_id = s.id
             JOIN class_levels c ON s.class_level_id = c.id
             WHERE ps.parent_id = $1
             ORDER BY s.full_name`,
            [parentId]
        );
        
        res.json({ children: result.rows });
    } catch (error) {
        console.error('Error fetching children:', error);
        res.status(500).json({ message: 'Failed to fetch children' });
    }
});

// ========================================
// GET CHILD'S GRADES
// ========================================
router.get('/grades/:studentId/:term/:academicYear', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const parentId = req.user.parentId;
    const { studentId, term, academicYear } = req.params;
    
    try {
        // Verify parent has access to this student
        const accessCheck = await pool.query(
            'SELECT * FROM parent_students WHERE parent_id = $1 AND student_id = $2',
            [parentId, studentId]
        );
        
        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        // Get student info
        const studentResult = await pool.query(
            `SELECT s.id, s.full_name, s.admission_number, c.name as class_name
             FROM students s
             JOIN class_levels c ON s.class_level_id = c.id
             WHERE s.id = $1`,
            [studentId]
        );
        
        // Get grades
        const gradesResult = await pool.query(
            `SELECT sf.*, fc.name as fee_name
             FROM student_school_fees sf
             JOIN school_fee_categories fc ON sf.fee_category_id = fc.id
             WHERE sf.student_id = $1 AND fc.term = $2 AND fc.academic_year = $3`,
            [studentId, term, academicYear]
        );
        
        res.json({
            student: studentResult.rows[0],
            grades: gradesResult.rows
        });
    } catch (error) {
        console.error('Error fetching grades:', error);
        res.status(500).json({ message: 'Failed to fetch grades' });
    }
});

// ========================================
// GET CHILD'S ATTENDANCE
// ========================================
router.get('/attendance/:studentId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const parentId = req.user.parentId;
    const { studentId } = req.params;
    
    try {
        // Verify parent has access
        const accessCheck = await pool.query(
            'SELECT * FROM parent_students WHERE parent_id = $1 AND student_id = $2',
            [parentId, studentId]
        );
        
        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const result = await pool.query(
            `SELECT a.date, a.status, s.full_name, s.admission_number
             FROM attendance a
             JOIN students s ON a.student_id = s.id
             WHERE a.student_id = $1
             ORDER BY a.date DESC
             LIMIT 30`,
            [studentId]
        );
        
        // Calculate attendance summary
        const summaryResult = await pool.query(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
             FROM attendance
             WHERE student_id = $1
             AND date >= CURRENT_DATE - INTERVAL '30 days'`,
            [studentId]
        );
        
        res.json({
            attendance: result.rows,
            summary: summaryResult.rows[0]
        });
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ message: 'Failed to fetch attendance' });
    }
});

// ========================================
// GET CHILD'S SCHOOL FEES
// ========================================
router.get('/fees/:studentId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const parentId = req.user.parentId;
    const { studentId } = req.params;
    
    try {
        const accessCheck = await pool.query(
            'SELECT * FROM parent_students WHERE parent_id = $1 AND student_id = $2',
            [parentId, studentId]
        );
        
        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const result = await pool.query(
            `SELECT sf.*, fc.name as fee_name, fc.description
             FROM student_school_fees sf
             JOIN school_fee_categories fc ON sf.fee_category_id = fc.id
             WHERE sf.student_id = $1
             ORDER BY fc.term, fc.academic_year`,
            [studentId]
        );
        
        res.json({ fees: result.rows });
    } catch (error) {
        console.error('Error fetching fees:', error);
        res.status(500).json({ message: 'Failed to fetch fees' });
    }
});

// ========================================
// ADMIN: CREATE PARENT ACCOUNT
// ========================================
router.post('/create', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    const { full_name, email, phone, address, student_ids, password } = req.body;
    
    console.log('Creating parent account:', { full_name, email, phone, student_ids });
    
    if (!full_name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    
    try {
        // Check if parent already exists
        const existingParent = await pool.query('SELECT id FROM parents WHERE email = $1', [email]);
        if (existingParent.rows.length > 0) {
            return res.status(400).json({ message: 'Parent with this email already exists' });
        }
        
        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Start transaction
        await pool.query('BEGIN');
        
        // Create parent record
        const parentResult = await pool.query(
            `INSERT INTO parents (full_name, email, phone, address, password_hash)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [full_name, email, phone || null, address || null, hashedPassword]
        );
        
        const parentId = parentResult.rows[0].id;
        console.log('Parent created with ID:', parentId);
        
        // Create user account linked to parent with role 'parent'
        const userResult = await pool.query(
            `INSERT INTO users (full_name, email, password_hash, role, parent_id) 
             VALUES ($1, $2, $3, 'parent', $4) 
             RETURNING id`,
            [full_name, email, hashedPassword, parentId]
        );
        
        console.log('User created with ID:', userResult.rows[0].id, 'Role: parent');
        
        // Link parent to students
        if (student_ids && student_ids.length > 0) {
            for (const studentId of student_ids) {
                await pool.query(
                    `INSERT INTO parent_students (parent_id, student_id, relationship)
                     VALUES ($1, $2, 'parent')
                     ON CONFLICT (parent_id, student_id) DO NOTHING`,
                    [parentId, studentId]
                );
                console.log('Linked student:', studentId);
            }
        }
        
        // Commit transaction
        await pool.query('COMMIT');
        
        res.json({ 
            message: 'Parent account created successfully',
            parent_id: parentId,
            user_id: userResult.rows[0].id,
            role: 'parent'
        });
    } catch (error) {
        // Rollback on error
        await pool.query('ROLLBACK');
        console.error('Error creating parent:', error);
        res.status(500).json({ message: 'Failed to create parent account', error: error.message });
    }
});
// ========================================
// ADMIN: GET ALL PARENTS
// ========================================
router.get('/all', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    try {
        const result = await pool.query(
            `SELECT p.*, u.email, 
                    COUNT(ps.student_id) as children_count
             FROM parents p
             JOIN users u ON p.user_id = u.id
             LEFT JOIN parent_students ps ON p.id = ps.parent_id
             GROUP BY p.id, u.email
             ORDER BY p.full_name`
        );
        res.json({ parents: result.rows });
    } catch (error) {
        console.error('Error fetching parents:', error);
        res.status(500).json({ message: 'Failed to fetch parents' });
    }
});

// ========================================
// ADMIN: GET PARENT DETAILS
// ========================================
router.get('/:parentId', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    const { parentId } = req.params;
    
    try {
        const result = await pool.query(
            `SELECT p.*, u.email
             FROM parents p
             JOIN users u ON p.user_id = u.id
             WHERE p.id = $1`,
            [parentId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Parent not found' });
        }
        
        // Get linked students
        const studentsResult = await pool.query(
            `SELECT s.id, s.full_name, s.admission_number, c.name as class_name
             FROM parent_students ps
             JOIN students s ON ps.student_id = s.id
             JOIN class_levels c ON s.class_level_id = c.id
             WHERE ps.parent_id = $1`,
            [parentId]
        );
        
        res.json({
            parent: result.rows[0],
            students: studentsResult.rows
        });
    } catch (error) {
        console.error('Error fetching parent details:', error);
        res.status(500).json({ message: 'Failed to fetch parent details' });
    }
});

module.exports = router;
