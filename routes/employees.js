const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const AccessGrant = require('../models/AccessGrant');

router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};

    if (status === 'all') {
      // no status filter
    } else if (status === 'offboarded') {
      filter.status = 'offboarded';
    } else {
      filter.status = 'active';
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { ssoId: regex },
      ];
    }

    const employees = await Employee.find(filter).sort({ lastName: 1, firstName: 1 });
    const employeeIds = employees.map((e) => e._id);

    const grants = await AccessGrant.find({
      employee: { $in: employeeIds },
      isActive: true,
    }).populate('application', 'name category logoUrl');

    const grantMap = {};
    grants.forEach((g) => {
      const id = g.employee.toString();
      if (!grantMap[id]) grantMap[id] = [];
      grantMap[id].push(g);
    });

    const result = employees.map((emp) => ({
      ...emp.toObject(),
      activeAccessCount: (grantMap[emp._id.toString()] || []).length,
      activeAccess: grantMap[emp._id.toString()] || [],
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/offboarding-candidates', async (req, res) => {
  try {
    const { search } = req.query;
    const filter = { status: 'active' };

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { ssoId: regex },
      ];
    }

    const employees = await Employee.find(filter).sort({ lastName: 1, firstName: 1 });
    const employeeIds = employees.map((e) => e._id);

    const grants = await AccessGrant.find({
      employee: { $in: employeeIds },
      isActive: true,
    }).populate('application', 'name logoUrl');

    const grantMap = {};
    grants.forEach((g) => {
      const id = g.employee.toString();
      if (!grantMap[id]) grantMap[id] = [];
      grantMap[id].push(g);
    });

    const result = employees.map((emp) => ({
      ...emp.toObject(),
      activeAccessCount: (grantMap[emp._id.toString()] || []).length,
      activeAccess: grantMap[emp._id.toString()] || [],
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const grants = await AccessGrant.find({ employee: employee._id })
      .populate('application', 'name category description logoUrl')
      .sort({ isActive: -1, updatedAt: -1 });

    res.json({ employee, grants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, ssoId, department } = req.body;

    if (!firstName || !lastName || !email || !ssoId) {
      return res.status(400).json({ error: 'firstName, lastName, email, and ssoId are required' });
    }

    const employee = await Employee.create({
      firstName,
      lastName,
      email,
      ssoId,
      department,
      status: 'active',
    });
    res.status(201).json(employee);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email or SSO ID already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { firstName, lastName, email, ssoId, department } = req.body;
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, email, ssoId, department },
      { new: true, runValidators: true }
    );

    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email or SSO ID already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    await AccessGrant.deleteMany({ employee: employee._id });
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
