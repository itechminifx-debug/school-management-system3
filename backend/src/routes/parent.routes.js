const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

const getDb = (req) => req.app.get('db');

// ========================================
// ADMIN: GET ALL PARENTS
// ========================================
router.get('/all', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    try {
        const result = await pool.query(
            `SELECT p.*, 
                    COALESCE(COUNT(ps.student_id), 0) as children_count
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
        const existingParent = await pool.query('SELECT id FROM parents WHERE email = $1', [email]);
        if (existingParent.rows.length > 0) {
            return res.status(400).json({ message: 'Parent with this email already exists' });
        }
        
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'User with this email already exists' });
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
        console.log('Parent created with ID:', parentId);
        
        const userResult = await pool.query(
            `INSERT INTO users (full_name, email, password_hash, role, parent_id) 
             VALUES ($1, $2, $3, 'parent', $4) 
             RETURNING id`,
            [full_name, email, hashedPassword, parentId]
        );
        
        console.log('User created with ID:', userResult.rows[0].id, 'Role: parent');
        
        if (student_ids && student_ids.length > 0) {
            console.log('Linking students:', student_ids);
            for (const studentId of student_ids) {
                await pool.query(
                    `INSERT INTO parent_students (parent_id, student_id, relationship)
                     VALUES ($1, $2, 'parent')
                     ON CONFLICT (parent_id, student_id) DO NOTHING`,
                    [parentId, studentId]
                );
                console.log('Linked student:', studentId);
            }
        } else {
            console.log('No students to link');
        }
        
        await pool.query('COMMIT');
        
        res.json({ 
            message: 'Parent account created successfully',
            parent_id: parentId,
            user_id: userResult.rows[0].id,
            role: 'parent',
            linked_students: student_ids || []
        });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error creating parent:', error);
        res.status(500).json({ message: 'Failed to create parent account', error: error.message });
    }
});

// ========================================
// ADMIN: UPDATE PARENT
// ========================================
router.put('/:parentId', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    const { parentId } = req.params;
    const { full_name, email, phone, address, password, student_ids } = req.body;
    
    console.log('Updating parent:', { parentId, full_name, email, phone, student_ids });
    
    try {
        const parentCheck = await pool.query('SELECT id FROM parents WHERE id = $1', [parentId]);
        if (parentCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Parent not found' });
        }
        
        await pool.query('BEGIN');
        
        let updateQuery = `UPDATE parents SET 
            full_name = COALESCE($1, full_name),
            email = COALESCE($2, email),
            phone = COALESCE($3, phone),
            address = COALESCE($4, address)`;
        let params = [full_name || null, email || null, phone || null, address || null];
        
        if (password && password.length > 0) {
            if (password.length < 6) {
                await pool.query('ROLLBACK');
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
            params = [full_name || null, email || null, phone || null, address || null, hashedPassword, parentId];
        } else {
            updateQuery = `UPDATE parents SET 
                full_name = COALESCE($1, full_name),
                email = COALESCE($2, email),
                phone = COALESCE($3, phone),
                address = COALESCE($4, address)
                WHERE id = $5`;
            params = [full_name || null, email || null, phone || null, address || null, parentId];
        }
        
        await pool.query(updateQuery, params);
        console.log('Parent updated in parents table');
        
        if (email || full_name) {
            await pool.query(
                `UPDATE users SET email = COALESCE($1, email), full_name = COALESCE($2, full_name) WHERE parent_id = $3`,
                [email || null, full_name || null, parentId]
            );
            console.log('User updated in users table');
        }
        
        if (student_ids !== undefined) {
            await pool.query('DELETE FROM parent_students WHERE parent_id = $1', [parentId]);
            console.log('Deleted existing student links');
            
            if (student_ids.length > 0) {
                for (const studentId of student_ids) {
                    await pool.query(
                        `INSERT INTO parent_students (parent_id, student_id, relationship)
                         VALUES ($1, $2, 'parent')`,
                        [parentId, studentId]
                    );
                }
                console.log('Added new student links:', student_ids);
            }
        }
        
        await pool.query('COMMIT');
        console.log('Parent update completed successfully');
        
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
    
    console.log('Deleting parent:', parentId);
    
    try {
        const parentCheck = await pool.query('SELECT id, full_name FROM parents WHERE id = $1', [parentId]);
        if (parentCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Parent not found' });
        }
        
        const parentName = parentCheck.rows[0].full_name;
        
        await pool.query('BEGIN');
        
        await pool.query('DELETE FROM parent_students WHERE parent_id = $1', [parentId]);
        console.log('Deleted parent_students links');
        
        await pool.query('DELETE FROM users WHERE parent_id = $1', [parentId]);
        console.log('Deleted user record');
        
        await pool.query('DELETE FROM parents WHERE id = $1', [parentId]);
        console.log('Deleted parent record');
        
        await pool.query('COMMIT');
        
        res.json({ message: `Parent ${parentName} deleted successfully` });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error deleting parent:', error);
        res.status(500).json({ message: 'Failed to delete parent', error: error.message });
    }
});

// ========================================
// PARENT LOGIN
// ========================================
router.post('/login', async (req, res) => {
    const pool = getDb(req);
    const { email, password } = req.body;
    
    console.log('Parent login attempt:', email);
    
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
            console.log('Parent not found:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const parent = result.rows[0];
        console.log('Parent found:', parent.id, parent.full_name);
        
        const isValid = await bcrypt.compare(password, parent.password_hash);
        if (!isValid) {
            console.log('Invalid password for parent:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        if (parent.role !== 'parent') {
            console.log('User is not a parent:', parent.role);
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
        
        console.log('Parent login successful:', parent.id, parent.email);
        
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
    const parentId = req.user?.parentId;
    
    console.log('=== GET /children ===');
    console.log('Parent ID from token:', parentId);
    console.log('Full user:', req.user);
    
    if (!parentId) {
        console.log('No parentId in token');
        return res.status(400).json({ message: 'Parent ID not found in token. Please login again.' });
    }
    
    try {
        // Check if parent exists
        const parentCheck = await pool.query('SELECT id, full_name FROM parents WHERE id = $1', [parentId]);
        if (parentCheck.rows.length === 0) {
            console.log('Parent not found in database:', parentId);
            return res.status(404).json({ message: 'Parent not found' });
        }
        console.log('Parent found:', parentCheck.rows[0]);
        
        // Get children
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
        
        console.log('Found children count:', result.rows.length);
        console.log('Children data:', JSON.stringify(result.rows, null, 2));
        
        res.json({ children: result.rows });
    } catch (error) {
        console.error('Error fetching children:', error);
        res.status(500).json({ message: 'Failed to fetch children', error: error.message });
    }
});
// ========================================
// GET CHILD'S GRADES
// ========================================
router.get('/grades/:studentId/:term/:academicYear', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const parentId = req.user?.parentId;
    const { studentId, term, academicYear } = req.params;
    
    console.log('Fetching grades for student:', studentId, 'parent:', parentId);
    
    if (!parentId) {
        return res.status(400).json({ message: 'Parent ID not found in token' });
    }
    
    try {
        const accessCheck = await pool.query(
            'SELECT * FROM parent_students WHERE parent_id = $1 AND student_id = $2',
            [parentId, studentId]
        );
        
        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const studentResult = await pool.query(
            `SELECT s.id, s.full_name, s.admission_number, c.name as class_name
             FROM students s
             JOIN class_levels c ON s.class_level_id = c.id
             WHERE s.id = $1`,
            [studentId]
        );
        
        const gradesResult = await pool.query(
            `SELECT * FROM grades
             WHERE student_id = $1 AND term = $2 AND academic_year = $3`,
            [studentId, term, academicYear]
        );
        
        res.json({
            student: studentResult.rows[0],
            grades: gradesResult.rows
        });
    } catch (error) {
        console.error('Error fetching grades:', error);
        res.status(500).json({ message: 'Failed to fetch grades', error: error.message });
    }
});

// ========================================
// GET CHILD'S ATTENDANCE
// ========================================
router.get('/attendance/:studentId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const parentId = req.user?.parentId;
    const { studentId } = req.params;
    
    console.log('Fetching attendance for student:', studentId, 'parent:', parentId);
    
    if (!parentId) {
        return res.status(400).json({ message: 'Parent ID not found in token' });
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
        res.status(500).json({ message: 'Failed to fetch attendance', error: error.message });
    }
});

// ========================================
// GET CHILD'S FEES
// ========================================
router.get('/fees/:studentId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const parentId = req.user?.parentId;
    const { studentId } = req.params;
    
    console.log('Fetching fees for student:', studentId, 'parent:', parentId);
    
    if (!parentId) {
        return res.status(400).json({ message: 'Parent ID not found in token' });
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
        res.status(500).json({ message: 'Failed to fetch fees', error: error.message });
    }
});

module.exports = router;
