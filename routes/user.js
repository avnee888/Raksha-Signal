const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Create a user
router.post('/', async (req, res) => {
  try {
    const { name, phone, emergencyContacts } = req.body;
    const user = await User.create({ name, phone, emergencyContacts });
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a user by id
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
