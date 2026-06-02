require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const applicationRoutes = require('./routes/applications');
const accessRoutes = require('./routes/access');
const exportRoutes = require('./routes/export');
const offboardingRoutes = require('./routes/offboarding');
const opsMemberRoutes = require('./routes/opsMembers');
const OpsMember = require('./models/OpsMember');
const { requireAuth, requireAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ops-iam';

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'ops-iam-dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000,
      sameSite: 'lax',
    },
  })
);

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path.startsWith('/auth')) {
    return next();
  }
  return requireAuth(req, res, next);
});

app.use('/api/employees', employeeRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/offboarding', offboardingRoutes);

app.get('/api/stats', async (req, res) => {
  try {
    const Employee = require('./models/Employee');
    const Application = require('./models/Application');
    const AccessGrant = require('./models/AccessGrant');
    const Offboarding = require('./models/Offboarding');

    const [
      employeeCount,
      applicationCount,
      activeGrants,
      revokedGrants,
      offboardingInProgress,
      offboardingCompleted,
    ] = await Promise.all([
      Employee.countDocuments({ status: 'active' }),
      Application.countDocuments(),
      AccessGrant.countDocuments({ isActive: true }),
      AccessGrant.countDocuments({ isActive: false }),
      Offboarding.countDocuments({ status: 'in_progress' }),
      Offboarding.countDocuments({ status: 'completed' }),
    ]);

    res.json({
      employeeCount,
      applicationCount,
      activeGrants,
      revokedGrants,
      offboardingInProgress,
      offboardingCompleted,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    (async () => {
      const adminEmail = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@softops.com').toLowerCase().trim();
      const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'softops123';
      const existing = await OpsMember.findOne({ email: adminEmail });
      if (!existing) {
        const passwordHash = await OpsMember.hashPassword(adminPassword);
        await OpsMember.create({
          email: adminEmail,
          passwordHash,
          firstName: 'SoftOps',
          lastName: 'Admin',
          isActive: true,
          isAdmin: true,
        });
        console.log(`Default admin created: ${adminEmail}`);
      }
    })().catch((e) => console.error('Admin bootstrap failed:', e.message));

    app.use('/api/ops-members', requireAdmin, opsMemberRoutes);

    app.listen(PORT, () => {
      console.log(`OPS IAM server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
