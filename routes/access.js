const express = require('express');
const router = express.Router();
const AccessGrant = require('../models/AccessGrant');
const Employee = require('../models/Employee');
const Application = require('../models/Application');
const { getPerformer } = require('../middleware/auth');

router.post('/grant', async (req, res) => {
  try {
    const { employeeId, applicationId, accessType, jiraTicketLink, notes } = req.body;
    const performedBy = getPerformer(req);

    if (!employeeId || !applicationId || !accessType || !jiraTicketLink) {
      return res.status(400).json({
        error: 'employeeId, applicationId, accessType, and jiraTicketLink are required',
      });
    }

    const [employee, application] = await Promise.all([
      Employee.findById(employeeId),
      Application.findById(applicationId),
    ]);

    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    if (employee.status !== 'active') {
      return res.status(400).json({ error: 'Cannot grant access to employee who is offboarding or offboarded' });
    }
    if (!application) return res.status(404).json({ error: 'Application not found' });

    let grant = await AccessGrant.findOne({ employee: employeeId, application: applicationId });

    const auditEntry = {
      action: 'grant',
      accessType,
      performedBy,
      performedAt: new Date(),
      jiraTicketLink,
      notes: notes || '',
    };

    if (grant) {
      if (grant.isActive && grant.accessType === accessType) {
        return res.status(409).json({ error: 'Active access with same type already exists' });
      }

      grant.accessType = accessType;
      grant.isActive = true;
      grant.history.push(auditEntry);
      await grant.save();
    } else {
      grant = await AccessGrant.create({
        employee: employeeId,
        application: applicationId,
        accessType,
        isActive: true,
        history: [auditEntry],
      });
    }

    const populated = await AccessGrant.findById(grant._id)
      .populate('employee', 'firstName lastName email ssoId')
      .populate('application', 'name category logoUrl');

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/revoke', async (req, res) => {
  try {
    const { grantId, jiraTicketLink, notes } = req.body;
    const performedBy = getPerformer(req);

    if (!grantId || !jiraTicketLink) {
      return res.status(400).json({ error: 'grantId and jiraTicketLink are required' });
    }

    const grant = await AccessGrant.findById(grantId);
    if (!grant) return res.status(404).json({ error: 'Access grant not found' });
    if (!grant.isActive) return res.status(400).json({ error: 'Access is already revoked' });

    grant.isActive = false;
    grant.history.push({
      action: 'revoke',
      accessType: grant.accessType,
      performedBy,
      performedAt: new Date(),
      jiraTicketLink,
      notes: notes || '',
    });
    await grant.save();

    const populated = await AccessGrant.findById(grant._id)
      .populate('employee', 'firstName lastName email ssoId')
      .populate('application', 'name category logoUrl');

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/employee/:employeeId', async (req, res) => {
  try {
    const grants = await AccessGrant.find({ employee: req.params.employeeId })
      .populate('application', 'name category logoUrl')
      .sort({ isActive: -1, updatedAt: -1 });
    res.json(grants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/application/:applicationId', async (req, res) => {
  try {
    const grants = await AccessGrant.find({
      application: req.params.applicationId,
      isActive: true,
    })
      .populate('employee', 'firstName lastName email ssoId department')
      .sort({ updatedAt: -1 });
    res.json(grants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
