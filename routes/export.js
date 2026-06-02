const express = require('express');
const ExcelJS = require('exceljs');
const router = express.Router();
const Employee = require('../models/Employee');
const Application = require('../models/Application');
const AccessGrant = require('../models/AccessGrant');

function styleHeader(sheet) {
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' },
  };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
}

router.get('/user-wise', async (req, res) => {
  try {
    const employees = await Employee.find().sort({ lastName: 1, firstName: 1 });
    const grants = await AccessGrant.find({ isActive: true })
      .populate('employee')
      .populate('application');

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('User Access Report');

    sheet.columns = [
      { header: 'First Name', key: 'firstName', width: 18 },
      { header: 'Last Name', key: 'lastName', width: 18 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'SSO ID', key: 'ssoId', width: 18 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Application', key: 'application', width: 25 },
      { header: 'Access Type', key: 'accessType', width: 14 },
      { header: 'Granted By', key: 'grantedBy', width: 22 },
      { header: 'Granted At', key: 'grantedAt', width: 22 },
      { header: 'JIRA Ticket', key: 'jiraTicket', width: 40 },
    ];
    styleHeader(sheet);

    grants.forEach((grant) => {
      const lastGrant = [...grant.history].reverse().find((h) => h.action === 'grant');
      sheet.addRow({
        firstName: grant.employee.firstName,
        lastName: grant.employee.lastName,
        email: grant.employee.email,
        ssoId: grant.employee.ssoId,
        department: grant.employee.department || '',
        application: grant.application.name,
        accessType: grant.accessType,
        grantedBy: lastGrant?.performedBy || '',
        grantedAt: lastGrant?.performedAt ? new Date(lastGrant.performedAt).toLocaleString() : '',
        jiraTicket: lastGrant?.jiraTicketLink || '',
      });
    });

    if (grants.length === 0) {
      employees.forEach((emp) => {
        sheet.addRow({
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          ssoId: emp.ssoId,
          department: emp.department || '',
          application: '(no active access)',
          accessType: '',
          grantedBy: '',
          grantedAt: '',
          jiraTicket: '',
        });
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=user-access-report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/application-wise', async (req, res) => {
  try {
    const applications = await Application.find().sort({ name: 1 });
    const grants = await AccessGrant.find({ isActive: true })
      .populate('employee')
      .populate('application');

    const workbook = new ExcelJS.Workbook();

    applications.forEach((app) => {
      const sheet = workbook.addWorksheet(app.name.substring(0, 31));
      sheet.columns = [
        { header: 'First Name', key: 'firstName', width: 18 },
        { header: 'Last Name', key: 'lastName', width: 18 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'SSO ID', key: 'ssoId', width: 18 },
        { header: 'Access Type', key: 'accessType', width: 14 },
        { header: 'Granted By', key: 'grantedBy', width: 22 },
        { header: 'Granted At', key: 'grantedAt', width: 22 },
        { header: 'JIRA Ticket', key: 'jiraTicket', width: 40 },
      ];
      styleHeader(sheet);

      const appGrants = grants.filter((g) => g.application._id.toString() === app._id.toString());

      if (appGrants.length === 0) {
        sheet.addRow({
          firstName: '(no users)',
          lastName: '',
          email: '',
          ssoId: '',
          accessType: '',
          grantedBy: '',
          grantedAt: '',
          jiraTicket: '',
        });
      } else {
        appGrants.forEach((grant) => {
          const lastGrant = [...grant.history].reverse().find((h) => h.action === 'grant');
          sheet.addRow({
            firstName: grant.employee.firstName,
            lastName: grant.employee.lastName,
            email: grant.employee.email,
            ssoId: grant.employee.ssoId,
            accessType: grant.accessType,
            grantedBy: lastGrant?.performedBy || '',
            grantedAt: lastGrant?.performedAt ? new Date(lastGrant.performedAt).toLocaleString() : '',
            jiraTicket: lastGrant?.jiraTicketLink || '',
          });
        });
      }
    });

    const summary = workbook.addWorksheet('Summary');
    summary.columns = [
      { header: 'Application', key: 'application', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Active Users', key: 'count', width: 14 },
      { header: 'Admin Count', key: 'adminCount', width: 14 },
      { header: 'Member Count', key: 'memberCount', width: 14 },
    ];
    styleHeader(summary);

    applications.forEach((app) => {
      const appGrants = grants.filter((g) => g.application._id.toString() === app._id.toString());
      summary.addRow({
        application: app.name,
        category: app.category,
        count: appGrants.length,
        adminCount: appGrants.filter((g) => g.accessType === 'admin').length,
        memberCount: appGrants.filter((g) => g.accessType === 'member').length,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=application-access-report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
