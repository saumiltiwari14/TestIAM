function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.isAdmin) {
    return next();
  }
  return res.status(403).json({ error: 'Admin permission required' });
}

function getPerformer(req) {
  const u = req.session.user;
  return `${u.fullName} (${u.email})`;
}

module.exports = { requireAuth, requireAdmin, getPerformer };
