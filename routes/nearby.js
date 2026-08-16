const express = require('express');
const router = express.Router();
const axios = require('axios');

const TYPE_TAGS = {
  hospital: '["amenity"="hospital"]',
  police: '["amenity"="police"]'
};

router.get('/', async (req, res) => {
  try {
    const { lat, lng, type } = req.query;
    if (!lat || !lng || !type) {
      return res.status(400).json({ error: 'lat, lng, and type are required' });
    }

    const tag = TYPE_TAGS[type];
    if (!tag) {
      return res.status(400).json({ error: 'type must be "hospital" or "police"' });
    }

    const radius = 5000;
    const query = `
      [out:json][timeout:15];
      (
        node${tag}(around:${radius},${lat},${lng});
        way${tag}(around:${radius},${lat},${lng});
      );
      out center 20;
    `;

    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      query,
      { headers: { 'Content-Type': 'text/plain' } }
    );

    const results = (response.data.elements || [])
      .map(el => {
        const lat = el.lat || (el.center && el.center.lat);
        const lon = el.lon || (el.center && el.center.lon);
        if (!lat || !lon) return null;
        const tags = el.tags || {};
        const addressParts = [tags['addr:street'], tags['addr:city']].filter(Boolean);
        return {
          name: tags.name || (type === 'hospital' ? 'Unnamed Hospital' : 'Unnamed Police Station'),
          address: addressParts.join(', ') || 'Address not available',
          location: { lat, lng: lon }
        };
      })
      .filter(Boolean)
      .slice(0, 15);

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
