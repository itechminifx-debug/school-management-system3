const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

const getDb = (req) => req.app.get('db');

// ========================================
// PARENT LOGIN - Public
// ========================================
router.post('/login', async (req, res) => {
    const pool = getDb(req);
    const { email, password } = req.body;
    
    try {
        const result = await pool.query(
            `SELECT p.id, p.full_name, p.email, p.phone, p.password_hash, 
                    u.id as user_id, u.role
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
        res.status(500).json({ message: 'Login failed' });
    }
});

// ========================================
// GET PARENT'S CHILDREN - ONLY authenticateToken
// ========================================
router.get('/children', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const parentId = req.user?.parentId;
    
    console.log('=== /children ===');
    console.log('parentId:', parentId);
    
    if (!parentId) {
        return res.status(400).json({ message: 'Parent ID not found' });
    }
    
    try {
        const result = await pool.query(
            `SELECT s.id, s.full_name, s.admission_number, s.class_level_id, 
                    c.name as class_name, ps.relationship
             FROM students s
             JOIN class_levels c ON s.class_level_id = c.id
             JOIN parent_students ps ON s.id = ps.student_id
             WHERE ps.parent_id = $1
             ORDER BY s.full_name`,
            [parentId]
        );
        
        console.log('Found:', result.rows.length);
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
    const parentId = req.user?.parentId;
    const { studentId, term, academicYear } = req.params;
    
    if (!parentId) {
        return res.status(400).json({ message: 'Parent ID not found' });
    }
    
    try {
        const accessCheck = await pool.query(
            'SELECT * FROM parent_students WHERE parent_id = $1 AND student_id = $2',
            [parentId, studentId]
        );
        
        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const gradesResult = await pool.query(
            `SELECT subject, score, grade_letter, term, academic_year
             FROM grades
             WHERE student_id = $1 AND term = $2 AND academic_year = $3`,
            [studentId, term, academicYear]
        );
        
        res.json({ grades: gradesResult.rows || [] });
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
    const parentId = req.user?.parentId;
    const { studentId } = req.params;
    
    if (!parentId) {
        return res.status(400).json({ message: 'Parent ID not found' });
    }
    
    try {
        const accessCheck = await pool.query(
            'SELECT * FROM parent_students WHERE parent_id = $1 AND student_id = $2',
            [parentId, studentId]
        );
        
        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const result = await pool.query(
            `SELECT date, status
             FROM attendance
             WHERE student_id = $1
             ORDER BY date DESC
             LIMIT 30`,
            [studentId]
        );
        
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
// GET CHILD'S FEES
// ========================================
router.get('/fees/:studentId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const parentId = req.user?.parentId;
    const { studentId } = req.params;
    
    if (!parentId) {
        return res.status(400).json({ message: 'Parent ID not found' });
    }
    
    try {
        const accessCheck = await pool.query(
            'SELECT * FROM parent_students WHERE parent_id = $1 AND student_id = $2',
            [parentId, studentId]
        );
        
        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const result = await pool.query(
            `SELECT * FROM student_school_fees
             WHERE student_id = $1
             ORDER BY created_at DESC`,
            [studentId]
        );
        
        res.json({ fees: result.rows });
    } catch (error) {
        console.error('Error fetching fees:', error);
        res.status(500).json({ message: 'Failed to fetch fees' });
    }
});

// ========================================
// ADMIN ROUTES - require admin role
// ========================================
router.get('/all', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    try {
        const result = await pool.query(
            `SELECT p.*, COALESCE(COUNT(ps.student_id), 0) as children_count
             FROM parents p
             LEFT JOIN parent_students ps ON p.id = ps.parent_id
             GROUP BY p.id
             ORDER BY p.full_name`
        );
        res.json({ parents: result.rows });
    } catch (error) {
        console.error('Error fetching parents:', error);
        res.status(500).json({ message: 'Failed to fetch parents' });
    }
});

router.post('/create', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    const { full_name, email, phone, address, student_ids, password } = req.body;
    
    if (!full_name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    
    try {
        const existingParent = await pool.query('SELECT id FROM parents WHERE email = $1', [email]);
        if (existingParent.rows.length > 0) {
            return res.status(400).json({ message: 'Parent with this email already exists' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        await pool.query('BEGIN');
        
        const parentResult = await pool.query(
            `INSERT INTO parents (full_name, email, phone, address, password_hash)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [full_name, email, phone || null, address || null, hashedPassword]
        );
        
        const parentId = parentResult.rows[0].id;
        
        const userResult = await pool.query(
            `INSERT INTO users (full_name, email, password_hash, role, parent_id) 
             VALUES ($1, $2, $3, 'parent', $4) 
             RETURNING id`,
            [full_name, email, hashedPassword, parentId]
        );
        
        if (student_ids && student_ids.length > 0) {
            for (const studentId of student_ids) {
                await pool.query(
                    `INSERT INTO parent_students (parent_id, student_id, relationship)
                     VALUES ($1, $2, 'parent')`,
                    [parentId, studentId]
                );
            }
        }
        
        await pool.query('COMMIT');
        
        res.json({ 
            message: 'Parent account created successfully',
            parent_id: parentId,
            user_id: userResult.rows[0].id
        });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error creating parent:', error);
        res.status(500).json({ message: 'Failed to create parent account' });
    }
});

router.put('/:parentId', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    const { parentId } = req.params;
    const { full_name, email, phone, address, password, student_ids } = req.body;
    
    try {
        const parentCheck = await pool.query('SELECT id FROM parents WHERE id = $1', [parentId]);
        if (parentCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Parent not found' });
        }
        
        await pool.query('BEGIN');
        
        let params = [full_name || null, email || null, phone || null, address || null];
        let query = `UPDATE parents SET 
            full_name = COALESCE($1, full_name),
            email = COALESCE($2, email),
            phone = COALESCE($3, phone),
            address = COALESCE($4, address)`;
        
        if (password && password.length > 0) {
            if (password.length < 6) {
                await pool.query('ROLLBACK');
                return res.status(400).json({ message: 'Password must be at least 6 characters' });
            }
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            query = `UPDATE parents SET 
                full_name = COALESCE($1, full_name),
                email = COALESCE($2, email),
                phone = COALESCE($3, phone),
                address = COALESCE($4, address),
                password_hash = $5
                WHERE id = $6`;
            params = [full_name || null, email || null, phone || null, address || null, hashedPassword, parentId];
        } else {
            query = `UPDATE parents SET 
                full_name = COALESCE($1, full_name),
                email = COALESCE($2, email),
                phone = COALESCE($3, phone),
                address = COALESCE($4, address)
                WHERE id = $5`;
            params = [full_name || null, email || null, phone || null, address || null, parentId];
        }
        
        await pool.query(query, params);
        
        if (student_ids !== undefined) {
            await pool.query('DELETE FROM parent_students WHERE parent_id = $1', [parentId]);
            for (const studentId of student_ids) {
                await pool.query(
                    `INSERT INTO parent_students (parent_id, student_id, relationship)
                     VALUES ($1, $2, 'parent')`,
                    [parentId, studentId]
                );
            }
        }
        
        await pool.query('COMMIT');
        res.json({ message: 'Parent updated successfully' });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error updating parent:', error);
        res.status(500).json({ message: 'Failed to update parent' });
    }
});

router.delete('/:parentId', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    const { parentId } = req.params;
    
    try {
        const parentCheck = await pool.query('SELECT id, full_name FROM parents WHERE id = $1', [parentId]);
        if (parentCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Parent not found' });
        }
        
        await pool.query('BEGIN');
        await pool.query('DELETE FROM parent_students WHERE parent_id = $1', [parentId]);
        await pool.query('DELETE FROM users WHERE parent_id = $1', [parentId]);
        await pool.query('DELETE FROM parents WHERE id = $1', [parentId]);
        await pool.query('COMMIT');
        
        res.json({ message: 'Parent deleted successfully' });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error deleting parent:', error);
        res.status(500).json({ message: 'Failed to delete parent' });
    }
});

module.exports = router;
