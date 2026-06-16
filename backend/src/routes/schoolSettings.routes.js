const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

const getDb = (req) => req.app.get('db');

// Get school settings
router.get('/', authenticateToken, async (req, res) => {
    const pool = getDb(req);
    try {
        // Check if settings exist
        let result = await pool.query('SELECT * FROM school_settings LIMIT 1');
        
        if (result.rows.length === 0) {
            // Insert default settings
            await pool.query(
                `INSERT INTO school_settings (school_name, school_address, school_phone, school_email, school_motto, academic_year, term, currency_symbol)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                ['Greenwood High School', '123 Education Street, Accra, Ghana', '+233 24 123 4567', 'info@greenwood.edu.gh', 'Excellence in Education', '2026', 'Term 1', '₵']
            );
            result = await pool.query('SELECT * FROM school_settings LIMIT 1');
        }
        
        res.json({ settings: result.rows[0] });
    } catch (error) {
        console.error('Error fetching school settings:', error);
        res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
    }
});

// Update school settings (Admin only)
router.put('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const pool = getDb(req);
    const { 
        school_name, 
        school_address, 
        school_phone, 
        school_email, 
        school_website, 
        school_motto, 
        academic_year, 
        term, 
        currency_symbol,
        school_logo
    } = req.body;
    
    console.log('Updating school settings:', req.body);
    
    try {
        // Check if settings exist
        const existCheck = await pool.query('SELECT id FROM school_settings LIMIT 1');
        
        let result;
        if (existCheck.rows.length === 0) {
            // Insert new settings
            result = await pool.query(
                `INSERT INTO school_settings 
                 (school_name, school_address, school_phone, school_email, school_website, school_motto, academic_year, term, currency_symbol, school_logo)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING *`,
                [
                    school_name || 'Greenwood High School', 
                    school_address || '', 
                    school_phone || '', 
                    school_email || '', 
                    school_website || '', 
                    school_motto || '', 
                    academic_year || '2026', 
                    term || 'Term 1', 
                    currency_symbol || '₵',
                    school_logo || null
                ]
            );
        } else {
            // Update existing settings
            result = await pool.query(
                `UPDATE school_settings 
                 SET school_name = COALESCE($1, school_name),
                     school_address = COALESCE($2, school_address),
                     school_phone = COALESCE($3, school_phone),
                     school_email = COALESCE($4, school_email),
                     school_website = COALESCE($5, school_website),
                     school_motto = COALESCE($6, school_motto),
                     academic_year = COALESCE($7, academic_year),
                     term = COALESCE($8, term),
                     currency_symbol = COALESCE($9, currency_symbol),
                     school_logo = COALESCE($10, school_logo),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = (SELECT id FROM school_settings LIMIT 1)
                 RETURNING *`,
                [
                    school_name, 
                    school_address, 
                    school_phone, 
                    school_email, 
                    school_website, 
                    school_motto, 
                    academic_year, 
                    term, 
                    currency_symbol,
                    school_logo
                ]
            );
        }
        
        console.log('Settings updated:', result.rows[0]);
        res.json({ message: 'Settings updated successfully', settings: result.rows[0] });
    } catch (error) {
        console.error('Error updating school settings:', error);
        res.status(500).json({ message: 'Failed to update settings', error: error.message });
    }
});

module.exports = router;
