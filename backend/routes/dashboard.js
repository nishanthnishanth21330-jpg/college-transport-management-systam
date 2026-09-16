const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM buses');
    const [[{ active }]] = await pool.query(
      "SELECT COUNT(*) AS active FROM buses WHERE status IN ('LIVE', 'STOPPED')"
    );
    const [[{ live }]] = await pool.query("SELECT COUNT(*) AS live FROM buses WHERE status = 'LIVE'");
    const [[{ completed }]] = await pool.query("SELECT COUNT(*) AS completed FROM buses WHERE status = 'COMPLETED'");

    res.json({
      success: true,
      stats: {
        totalBuses: total,
        activeBuses: active,
        liveBuses: live,
        completedJourneys: completed
      }
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats.' });
  }
});

module.exports = router;
