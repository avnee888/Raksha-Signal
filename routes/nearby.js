const express = require('express');
const router = express.Router();
const axios = require('axios');

const TYPE_TAGS = {
  hospital: '["amenity"="hospital"]',
  police: '["amenity"="police"]'
};

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

function buildQuery(tag, lat, lng, radius) {
  return `
    [out:json][timeout:20];
    (
      node${tag}(around:${radius},${lat},${lng});
      way${tag}(around:${radius},${lat},${lng});
    );
    out center 20;
  `;
}

async function queryOverpass(query) {
  let lastError;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await axios.post(endpoint, query, {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 12000
      });
      return response.data;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

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

    const data = await queryOverpass(buildQuery(tag, lat, lng, 5000));

    const results = (data.elements || [])
      .map(el => {
        const elLat = el.lat || (el.center && el.center.lat);
        const elLon = el.lon || (el.center && el.center.lon);
        if (!elLat || !elLon) return null;
        const tags = el.tags || {};
        const addressParts = [tags['addr:street'], tags['addr:city']].filter(Boolean);
        return {
          name: tags.name || (type === 'hospital' ? 'Unnamed Hospital' : 'Unnamed Police Station'),
          address: addressParts.join(', ') || 'Address not available',
          location: { lat: elLat, lng: elLon }
        };
      })
      .filter(Boolean)
      .slice(0, 15);

    res.json(results);
  } catch (err) {
    console.error('Nearby lookup failed:', err.message);
    res.status(502).json({
      error: 'Could not reach the map data service right now. Please try again in a moment.'
    });
  }
});

module.exports = router;
