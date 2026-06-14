const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');

const getDb = (req) => req.app.get('db');

// Get all class levels
router.get('/', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    try {
        const result = await pool.query(
            'SELECT id, name, level_order, category FROM class_levels ORDER BY level_order'
        );
        res.json({ classLevels: result.rows });
    } catch (error) {
        console.error('Error fetching class levels:', error);
        res.status(500).json({ message: 'Failed to fetch class levels' });
    }
});

module.exports = router;