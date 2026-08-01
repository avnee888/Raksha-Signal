const express = require('express');
const router = express.Router();
const axios = require('axios');

// GET /api/nearby?lat=..&lng=..&type=hospital|police
router.get('/', async (req, res) => {
  try {
    const { lat, lng, type } = req.query;
    if (!lat || !lng || !type) {
      return res.status(400).json({ error: 'lat, lng, and type are required' });
    }

    const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
    const response = await axios.get(url, {
      params: {
        location: `${lat},${lng}`,
        radius: 5000,
        type,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      return res.status(502).json({ error: response.data.status, details: response.data.error_message });
    }

    const results = (response.data.results || []).map(place => ({
      name: place.name,
      address: place.vicinity,
      location: place.geometry.location,
      rating: place.rating || 'N/A'
    }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
