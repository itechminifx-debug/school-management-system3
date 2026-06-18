const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Helper function to get database connection
const getDb = (req) => req.app.get('db');

// REGISTER - Create new user (admin, teacher, etc.)
router.post('/register', async (req, res) => {
    const { full_name, email, password, role, school_name, school_phone, school_address } = req.body;
    const pool = getDb(req);

    try {
        // Check if user already exists
        const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Start transaction
        await pool.query('BEGIN');

        // Create school (for admin users) or find existing school
        let schoolId;
        if (role === 'admin') {
            const schoolResult = await pool.query(
                `INSERT INTO schools (name, email, phone, address) 
                 VALUES ($1, $2, $3, $4) RETURNING id`,
                [school_name, email, school_phone || null, school_address || null]
            );
            schoolId = schoolResult.rows[0].id;
        } else {
            // For teachers/staff, you'd need to pass school_id from request
            return res.status(400).json({ message: 'For non-admin users, school_id is required' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const userResult = await pool.query(
            `INSERT INTO users (school_id, full_name, email, password_hash, role) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, role`,
            [schoolId, full_name, email, hashedPassword, role]
        );

        await pool.query('COMMIT');

        // Generate JWT token
        const token = jwt.sign(
            { userId: userResult.rows[0].id, email, role, schoolId },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: userResult.rows[0]
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
});

// LOGIN - Authenticate user
router.post('/login', async (req, res) => {
    const pool = getDb(req);
    const { email, password } = req.body;

    try {
        // Find user
        const userResult = await pool.query(
            `SELECT id, full_name, email, password_hash, role, school_id 
             FROM users WHERE email = $1`,
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = userResult.rows[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // ========================================
        // IMPORTANT: Block parents from admin login
        // ========================================
        if (user.role === 'parent') {
            return res.status(403).json({ 
                message: 'Access denied. This is a parent account. Please use the Parent Portal.',
                redirect: '/parent-login'
            });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role, schoolId: user.school_id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Return user info (without password)
        const { password_hash, ...userWithoutPassword } = user;
        res.json({
            message: 'Login successful',
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

module.exports = router;
