const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// All bus routes require the user to be logged in
router.use(requireAuth);

// Helper to send consistent errors
function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

// GET /api/buses - list all buses
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM buses ORDER BY created_at DESC');
    res.json({ success: true, buses: rows });
  } catch (err) {
    console.error('Fetch buses error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch buses.' });
  }
});

// GET /api/buses/:id - single bus
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM buses WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Bus not found.' });
    res.json({ success: true, bus: rows[0] });
  } catch (err) {
    console.error('Fetch bus error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch bus.' });
  }
});

// POST /api/buses - create a new bus
// POST /api/buses - create a new bus
router.post('/', async (req, res) => {
  try {
    const {
      bus_name,
      bus_number,
      driver_name,
      driver_phone,
      start_location,
      destination,
      route_details,
      latitude,
      longitude
    } = req.body;

    if (!bus_name || !bus_name.trim())
      return badRequest(res, 'Bus Name is required.');

    if (!bus_number || !bus_number.trim())
      return badRequest(res, 'Bus Number is required.');

    if (!driver_name || !driver_name.trim())
      return badRequest(res, 'Driver Name is required.');

    if (!driver_phone || !driver_phone.trim())
      return badRequest(res, 'Driver Phone Number is required.');

    if (!start_location || !start_location.trim())
      return badRequest(res, 'Starting Location is required.');

    if (!destination || !destination.trim())
      return badRequest(res, 'Destination is required.');

    // Check duplicate bus number
    const [dup] = await pool.query(
      'SELECT id FROM buses WHERE bus_number = ?',
      [bus_number.trim()]
    );

    if (dup.length > 0)
      return badRequest(res, 'A bus with this Bus Number already exists.');

    // Safely handle optional latitude and longitude
    let lat = null;
    let lng = null;

    if (latitude !== undefined && latitude !== null && latitude !== '') {
      const value = Number(latitude);
      if (Number.isFinite(value)) {
        lat = value;
      }
    }

    if (longitude !== undefined && longitude !== null && longitude !== '') {
      const value = Number(longitude);
      if (Number.isFinite(value)) {
        lng = value;
      }
    }

    const [result] = await pool.query(
      `INSERT INTO buses
        (bus_name, bus_number, driver_name, driver_phone,
         start_location, destination, route_details,
         latitude, longitude, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'STOPPED')`,
      [
        bus_name.trim(),
        bus_number.trim(),
        driver_name.trim(),
        driver_phone.trim(),
        start_location.trim(),
        destination.trim(),
        (route_details || '').trim(),
        lat,
        lng
      ]
    );

    const [rows] = await pool.query(
      'SELECT * FROM buses WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Bus Submitted Successfully!',
      bus: rows[0]
    });

  } catch (err) {
    console.error('Create bus error:', err);

    if (err.code === 'ER_DUP_ENTRY') {
      return badRequest(
        res,
        'A bus with this Bus Number already exists.'
      );
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add bus.'
    });
  }
});

// PUT /api/buses/:id/name - change bus name
router.put('/:id/name', async (req, res) => {
  try {
    const { bus_name } = req.body;
    if (!bus_name || !bus_name.trim()) return badRequest(res, 'New bus name is required.');

    const [existing] = await pool.query('SELECT id FROM buses WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Bus not found.' });

    await pool.query('UPDATE buses SET bus_name = ? WHERE id = ?', [bus_name.trim(), req.params.id]);
    res.json({ success: true, message: 'Bus Name Updated Successfully' });
  } catch (err) {
    console.error('Update bus name error:', err);
    res.status(500).json({ success: false, message: 'Failed to update bus name.' });
  }
});

// POST /api/buses/:id/start - start journey
router.post('/:id/start', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const [existing] = await pool.query('SELECT * FROM buses WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Bus not found.' });

    const lat = latitude !== undefined ? parseFloat(latitude) : existing[0].latitude;
    const lng = longitude !== undefined ? parseFloat(longitude) : existing[0].longitude;

    await pool.query(
      `UPDATE buses
       SET status = 'LIVE', latitude = ?, longitude = ?, journey_started_at = NOW(), journey_stopped_at = NULL
       WHERE id = ?`,
      [lat, lng, req.params.id]
    );

    const [rows] = await pool.query('SELECT * FROM buses WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Journey Started Successfully', bus: rows[0] });
  } catch (err) {
    console.error('Start journey error:', err);
    res.status(500).json({ success: false, message: 'Failed to start journey.' });
  }
});

// POST /api/buses/:id/stop - stop journey
router.post('/:id/stop', async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT * FROM buses WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Bus not found.' });

    await pool.query(
      `UPDATE buses SET status = 'COMPLETED', journey_stopped_at = NOW() WHERE id = ?`,
      [req.params.id]
    );

    const [rows] = await pool.query('SELECT * FROM buses WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Journey Stopped Successfully', bus: rows[0] });
  } catch (err) {
    console.error('Stop journey error:', err);
    res.status(500).json({ success: false, message: 'Failed to stop journey.' });
  }
});

// PUT /api/buses/:id/location - update live location (only for LIVE buses)
router.put('/:id/location', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return badRequest(res, 'Latitude and longitude are required.');
    }

    const [existing] = await pool.query('SELECT * FROM buses WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Bus not found.' });

    if (existing[0].status !== 'LIVE') {
      return badRequest(res, 'Location can only be updated for buses that are LIVE.');
    }

    await pool.query('UPDATE buses SET latitude = ?, longitude = ? WHERE id = ?', [
      parseFloat(latitude), parseFloat(longitude), req.params.id
    ]);

    res.json({ success: true, message: 'Location updated' });
  } catch (err) {
    console.error('Update location error:', err);
    res.status(500).json({ success: false, message: 'Failed to update location.' });
  }
});

// DELETE /api/buses/:id
router.delete('/:id', async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM buses WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Bus not found.' });

    await pool.query('DELETE FROM buses WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Bus deleted successfully' });
  } catch (err) {
    console.error('Delete bus error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete bus.' });
  }
});

module.exports = router;
