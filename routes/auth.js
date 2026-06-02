const express = require('express');
const router = express.Router();
const OpsMember = require('../models/OpsMember');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const member = await OpsMember.findOne({ email: email.toLowerCase().trim(), isActive: true });
    if (!member) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await member.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.user = {
      id: member._id.toString(),
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      fullName: member.fullName,
      isAdmin: !!member.isAdmin,
    };

    res.json({ user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

router.get('/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ user: req.session.user });
  }
  res.status(401).json({ error: 'Not authenticated' });
});

module.exports = router;
