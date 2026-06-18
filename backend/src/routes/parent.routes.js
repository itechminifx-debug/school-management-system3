const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth.middleware');

const getDb = (req) => req.app.get('db');

// ========================================
// PARENT LOGIN - No auth required
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
        
        console.log('Parent login successful:', parent.id);
        
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
// GET PARENT'S CHILDREN - Simple version
// ========================================
router.get('/children', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const parentId = req.user?.parentId;
    
    console.log('=== GET /children ===');
    console.log('Parent ID from token:', parentId);
    
    if (!parentId) {
        return res.status(400).json({ message: 'Parent ID not found in token.' });
    }
    
    try {
        // Direct query - simple and clean
        const result = await pool.query(
            `SELECT s.id, s.full_name, s.admission_number, s.class_level_id, 
                    c.name as class_name, ps.relationship
             FROM parent_students ps
             JOIN students s ON ps.student_id = s.id
             JOIN class_levels c ON s.class_level_id = c.id
             WHERE ps.parent_id = $1
             ORDER BY s.full_name`,
            [parentId]
        );
        
        console.log('Found children:', result.rows.length);
        
        res.json({ children: result.rows });
    } catch (error) {
        console.error('Error fetching children:', error);
        res.status(500).json({ message: 'Failed to fetch children', error: error.message });
    }
});

module.exports = router;
