const express = require('express');
const router = express.Router();
const Offboarding = require('../models/Offboarding');
const Employee = require('../models/Employee');
const AccessGrant = require('../models/AccessGrant');
const { getPerformer } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status === 'in_progress' || status === 'completed') {
      filter.status = status;
    }

    const records = await Offboarding.find(filter)
      .populate('employee', 'firstName lastName email ssoId department')
      .sort({ updatedAt: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const record = await Offboarding.findById(req.params.id)
      .populate('employee', 'firstName lastName email ssoId department status')
      .populate('tasks.application', 'name logoUrl category');

    if (!record) return res.status(404).json({ error: 'Offboarding record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/initiate', async (req, res) => {
  try {
    const { employeeId, jiraTicketLink, notes } = req.body;
    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId is required' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    if (employee.status !== 'active') {
      return res.status(400).json({ error: 'Employee is not active or already in offboarding' });
    }

    const existing = await Offboarding.findOne({ employee: employeeId, status: 'in_progress' });
    if (existing) {
      return res.status(409).json({ error: 'Offboarding already in progress for this employee' });
    }

    const activeGrants = await AccessGrant.find({ employee: employeeId, isActive: true }).populate(
      'application',
      'name logoUrl'
    );

    const tasks = activeGrants.map((grant) => ({
      grant: grant._id,
      application: grant.application._id,
      applicationName: grant.application.name,
      accessType: grant.accessType,
      status: 'pending',
    }));

    const performer = getPerformer(req);
    const user = req.session.user;

    const offboarding = await Offboarding.create({
      employee: employeeId,
      status: 'in_progress',
      initiatedBy: performer,
      initiatedByEmail: user.email,
      jiraTicketLink: jiraTicketLink || '',
      notes: notes || '',
      tasks,
    });

    employee.status = 'offboarding';
    await employee.save();

    const populated = await Offboarding.findById(offboarding._id).populate(
      'employee',
      'firstName lastName email ssoId department status'
    );

    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Offboarding record already exists for this employee' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/complete-task', async (req, res) => {
  try {
    const { taskId, jiraTicketLink, notes } = req.body;
    if (!taskId || !jiraTicketLink) {
      return res.status(400).json({ error: 'taskId and jiraTicketLink are required' });
    }

    const offboarding = await Offboarding.findById(req.params.id);
    if (!offboarding) return res.status(404).json({ error: 'Offboarding not found' });
    if (offboarding.status === 'completed') {
      return res.status(400).json({ error: 'Offboarding is already completed' });
    }

    const task = offboarding.tasks.id(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status === 'completed') {
      return res.status(400).json({ error: 'Task already completed' });
    }

    const performer = getPerformer(req);
    const user = req.session.user;

    const grant = await AccessGrant.findById(task.grant);
    if (grant && grant.isActive) {
      grant.isActive = false;
      grant.history.push({
        action: 'revoke',
        accessType: grant.accessType,
        performedBy: performer,
        performedAt: new Date(),
        jiraTicketLink,
        notes: notes ? `Offboarding: ${notes}` : 'Offboarding access removal',
      });
      await grant.save();
    }

    task.status = 'completed';
    task.completedBy = performer;
    task.completedByEmail = user.email;
    task.completedAt = new Date();
    task.jiraTicketLink = jiraTicketLink;
    task.notes = notes || '';

    const allDone = offboarding.tasks.every((t) => t.status === 'completed');
    if (allDone) {
      offboarding.status = 'completed';
      offboarding.completedAt = new Date();

      const employee = await Employee.findById(offboarding.employee);
      if (employee) {
        employee.status = 'offboarded';
        await employee.save();
      }
    }

    await offboarding.save();

    const populated = await Offboarding.findById(offboarding._id)
      .populate('employee', 'firstName lastName email ssoId department status')
      .populate('tasks.application', 'name logoUrl category');

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
