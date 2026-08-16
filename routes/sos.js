const express = require('express');
const router = express.Router();
const SOS = require('../models/SOS');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const sos = await SOS.create({ userId: req.userId, latitude, longitude });
    res.status(201).json(sos);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const sos = await SOS.findById(req.params.id);
    if (!sos) return res.status(404).json({ error: 'SOS not found' });
    res.json(sos);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id/location', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const sos = await SOS.findByIdAndUpdate(
      req.params.id,
      { latitude, longitude },
      { new: true }
    );
    if (!sos) return res.status(404).json({ error: 'SOS not found' });

    const io = req.app.get('io');
    io.to(sos._id.toString()).emit('location-broadcast', {
      sosId: sos._id,
      latitude,
      longitude
    });

    res.json(sos);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const sos = await SOS.findByIdAndUpdate(
      req.params.id,
      { status: 'Resolved', endedAt: new Date() },
      { new: true }
    );
    if (!sos) return res.status(404).json({ error: 'SOS not found' });
    res.json({ message: 'SOS resolved', sos });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
