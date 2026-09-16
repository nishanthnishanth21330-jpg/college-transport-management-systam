const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { createSession, destroySession, requireAuth } = require('../middleware/auth');

// Basic Indian/international-friendly phone validation: 7-15 digits, optional +
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }
    if (!phone || !PHONE_REGEX.test(phone.trim())) {
      return res.status(400).json({ success: false, message: 'Please enter a valid phone number.' });
    }

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    // Check if user already exists by phone; otherwise create a new one
    const [existing] = await pool.query('SELECT * FROM users WHERE phone = ? LIMIT 1', [cleanPhone]);

    let user;
    if (existing.length > 0) {
      user = existing[0];
      // Keep the name up to date in case it changed
      if (user.name !== cleanName) {
        await pool.query('UPDATE users SET name = ? WHERE id = ?', [cleanName, user.id]);
        user.name = cleanName;
      }
    } else {
      const [result] = await pool.query(
        'INSERT INTO users (name, phone) VALUES (?, ?)',
        [cleanName, cleanPhone]
      );
      user = { id: result.insertId, name: cleanName, phone: cleanPhone };
    }

    const token = createSession({ id: user.id, name: user.name, phone: user.phone });

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, phone: user.phone }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// GET /api/auth/me - returns current logged-in user (used to verify session on page load)
router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  destroySession(req.token);
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
