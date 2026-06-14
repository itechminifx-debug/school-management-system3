const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');

const getDb = (req) => req.app.get('db');

// Get subjects by class level
router.get('/by-class/:classLevelId', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    const classLevelId = parseInt(req.params.classLevelId);
    
    try {
        let departmentId;
        let subjectsQuery;
        
        // Direct mapping based on class IDs
        // KG 1 (ID 4), KG 2 (ID 5)
        if (classLevelId === 4 || classLevelId === 5) {
            departmentId = 1; // Kindergarten
            subjectsQuery = await pool.query(
                `SELECT id, name, is_core, level_order FROM subjects WHERE department_id = $1 ORDER BY level_order`,
                [departmentId]
            );
        }
        // Lower Primary - Basic 1 (ID 6), Basic 2 (ID 7), Basic 3 (ID 8)
        else if (classLevelId === 6 || classLevelId === 7 || classLevelId === 8) {
            // Hardcoded subjects for Lower Primary (NO Computing, NO History)
            const lowerPrimarySubjects = [
                { id: 1, name: 'English Language', is_core: true, level_order: 1 },
                { id: 2, name: 'Mathematics', is_core: true, level_order: 2 },
                { id: 3, name: 'Science', is_core: true, level_order: 3 },
                { id: 4, name: 'Religious & Moral Education', is_core: true, level_order: 4 },
                { id: 5, name: 'French', is_core: false, level_order: 5 },
                { id: 6, name: 'Creative Arts', is_core: false, level_order: 6 },
                { id: 7, name: 'Phonics', is_core: false, level_order: 7 }
            ];
            return res.json({ subjects: lowerPrimarySubjects });
        }
        // Upper Primary - Basic 4 (ID 9), Basic 5 (ID 10), Basic 6 (ID 11)
        else if (classLevelId === 9 || classLevelId === 10 || classLevelId === 11) {
            departmentId = 3; // Upper Primary
            subjectsQuery = await pool.query(
                `SELECT id, name, is_core, level_order FROM subjects WHERE department_id = $1 ORDER BY level_order`,
                [departmentId]
            );
        }
        // JHS 1 (ID 12), JHS 2 (ID 13), JHS 3 (ID 14)
        else if (classLevelId === 12 || classLevelId === 13 || classLevelId === 14) {
            departmentId = 4; // JHS
            subjectsQuery = await pool.query(
                `SELECT id, name, is_core, level_order FROM subjects WHERE department_id = $1 ORDER BY level_order`,
                [departmentId]
            );
        }
        else {
            return res.json({ subjects: [] });
        }
        
        res.json({ subjects: subjectsQuery.rows });
    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({ message: 'Failed to fetch subjects', error: error.message });
    }
});

// Get all departments
router.get('/departments', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    try {
        const result = await pool.query(
            'SELECT id, name, description FROM departments ORDER BY id'
        );
        res.json({ departments: result.rows });
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ message: 'Failed to fetch departments' });
    }
});

// Get all subjects
router.get('/all', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    try {
        const result = await pool.query(
            `SELECT s.id, s.name, s.is_core, d.name as department 
             FROM subjects s
             JOIN departments d ON s.department_id = d.id
             ORDER BY d.id, s.level_order`
        );
        res.json({ subjects: result.rows });
    } catch (error) {
        console.error('Error fetching all subjects:', error);
        res.status(500).json({ message: 'Failed to fetch subjects' });
    }
});

module.exports = router;