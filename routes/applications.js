const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Application = require('../models/Application');
const { uploadLogo } = require('../middleware/upload');

router.get('/', async (req, res) => {
  try {
    const applications = await Application.find().sort({ name: 1 });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', uploadLogo.single('logo'), async (req, res) => {
  try {
    const { name, description, category } = req.body;
    if (!name) return res.status(400).json({ error: 'Application name is required' });

    const data = { name, description, category };
    if (req.file) {
      data.logoUrl = `/uploads/apps/${req.file.filename}`;
    }

    const application = await Application.create(data);
    res.status(201).json(application);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Application already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', uploadLogo.single('logo'), async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ error: 'Application not found' });

    const { name, description, category } = req.body;
    if (name) application.name = name;
    if (description !== undefined) application.description = description;
    if (category !== undefined) application.category = category;

    if (req.file) {
      if (application.logoUrl) {
        const oldPath = path.join(__dirname, '..', 'public', application.logoUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      application.logoUrl = `/uploads/apps/${req.file.filename}`;
    }

    await application.save();
    res.json(application);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/logo', uploadLogo.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Logo image is required' });

    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ error: 'Application not found' });

    if (application.logoUrl) {
      const oldPath = path.join(__dirname, '..', 'public', application.logoUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    application.logoUrl = `/uploads/apps/${req.file.filename}`;
    await application.save();
    res.json(application);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ error: 'Application not found' });

    if (application.logoUrl) {
      const logoPath = path.join(__dirname, '..', 'public', application.logoUrl);
      if (fs.existsSync(logoPath)) fs.unlinkSync(logoPath);
    }

    await application.deleteOne();
    res.json({ message: 'Application deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
