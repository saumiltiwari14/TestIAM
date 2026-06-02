const express = require('express');
const router = express.Router();
const OpsMember = require('../models/OpsMember');

router.get('/', async (req, res) => {
  try {
    const members = await OpsMember.find().sort({ isAdmin: -1, lastName: 1, firstName: 1 });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { email, password, firstName, lastName, isAdmin } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res
        .status(400)
        .json({ error: 'email, password, firstName, and lastName are required' });
    }

    const passwordHash = await OpsMember.hashPassword(password);
    const member = await OpsMember.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      isActive: true,
      isAdmin: !!isAdmin,
    });

    res.status(201).json(member);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'SoftOps member already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { firstName, lastName, isActive, isAdmin, password } = req.body;
    const member = await OpsMember.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'SoftOps member not found' });

    if (firstName !== undefined) member.firstName = String(firstName).trim();
    if (lastName !== undefined) member.lastName = String(lastName).trim();
    if (isActive !== undefined) member.isActive = !!isActive;
    if (isAdmin !== undefined) member.isAdmin = !!isAdmin;
    if (password) member.passwordHash = await OpsMember.hashPassword(password);

    await member.save();
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

