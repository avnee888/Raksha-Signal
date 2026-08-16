const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

router.post('/signup', async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'name, phone, and password are required' });
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(409).json({ error: 'An account with this phone number already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, phone, password: hashed, emergencyContacts: [] });

    const token = signToken(user._id);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, phone: user.phone, emergencyContacts: user.emergencyContacts }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: 'phone and password are required' });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    const token = signToken(user._id);
    res.json({
      token,
      user: { id: user._id, name: user.name, phone: user.phone, emergencyContacts: user.emergencyContacts }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
