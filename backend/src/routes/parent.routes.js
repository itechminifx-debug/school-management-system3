const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

const getDb = (req) => req.app.get('db');

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
    
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
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
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
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
// PARENT LOGIN
// ========================================
router.post('/login', async (req, res) => {
    const pool = getDb(req);
    const { email, password } = req.body;
    
    try {
        // Find parent by email
        const result = await pool.query(
            `SELECT p.id, p.full_name, p.email, p.phone, p.password_hash, u.id as user_id, u.role
             FROM parents p
             JOIN users u ON p.id = u.parent_id
             WHERE p.email = $1`,
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const parent = result.rows[0];
        
        // Verify password
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
// ADMIN: GET ALL PARENTS
// ========================================
router.get('/all', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    try {
        const result = await pool.query(
            `SELECT p.*, 
                    COUNT(ps.student_id) as children_count
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

// ========================================
// ADMIN: GET PARENT DETAILS
// ========================================
router.get('/:parentId', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    const { parentId } = req.params;
    
    try {
        const result = await pool.query(
            `SELECT p.*
             FROM parents p
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

// ========================================
// ADMIN: UPDATE PARENT
// ========================================
router.put('/:parentId', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    const { parentId } = req.params;
    const { full_name, email, phone, address, password, student_ids } = req.body;
    
    try {
        // Check if parent exists
        const parentCheck = await pool.query('SELECT id FROM parents WHERE id = $1', [parentId]);
        if (parentCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Parent not found' });
        }
        
        // Start transaction
        await pool.query('BEGIN');
        
        // Update parent
        let updateQuery = `UPDATE parents SET 
            full_name = COALESCE($1, full_name),
            email = COALESCE($2, email),
            phone = COALESCE($3, phone),
            address = COALESCE($4, address)
            WHERE id = $5`;
        
        let params = [full_name, email, phone, address, parentId];
        
        // If password is provided, hash and update it
        if (password && password.length > 0) {
            if (password.length < 6) {
                return res.status(400).json({ message: 'Password must be at least 6 characters' });
            }
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            updateQuery = `UPDATE parents SET 
                full_name = COALESCE($1, full_name),
                email = COALESCE($2, email),
                phone = COALESCE($3, phone),
                address = COALESCE($4, address),
                password_hash = $5
                WHERE id = $6`;
            params = [full_name, email, phone, address, hashedPassword, parentId];
        }
        
        await pool.query(updateQuery, params);
        
        // Update user email if changed
        if (email) {
            await pool.query(
                `UPDATE users SET email = $1, full_name = $2 WHERE parent_id = $3`,
                [email, full_name, parentId]
            );
        }
        
        // Update student links
        if (student_ids !== undefined) {
            // Delete existing links
            await pool.query('DELETE FROM parent_students WHERE parent_id = $1', [parentId]);
            
            // Add new links
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
        res.status(500).json({ message: 'Failed to update parent', error: error.message });
    }
});

// ========================================
// ADMIN: DELETE PARENT
// ========================================
router.delete('/:parentId', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    const { parentId } = req.params;
    
    try {
        // Check if parent exists
        const parentCheck = await pool.query('SELECT id FROM parents WHERE id = $1', [parentId]);
        if (parentCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Parent not found' });
        }
        
        // Delete parent (cascade will delete parent_students and user)
        await pool.query('DELETE FROM parents WHERE id = $1', [parentId]);
        
        res.json({ message: 'Parent deleted successfully' });
    } catch (error) {
        console.error('Error deleting parent:', error);
        res.status(500).json({ message: 'Failed to delete parent', error: error.message });
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

module.exports = router;
