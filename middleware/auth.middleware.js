const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });

  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    const user = await User.findByPk(decoded.id, { attributes: { exclude: ['password_hash'] } });
    if (!user) return res.status(403).json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } });
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: { message: 'Token expired', code: 'TOKEN_EXPIRED' } });
    }
    return res.status(403).json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } });
  }
};

const requireInternalAdmin = async (req, res, next) => {
  await authenticateToken(req, res, () => {
    if (!req.user) return;
    if (!['admin', 'manager', 'internal_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Admin only', code: 'FORBIDDEN' } });
    }
    next();
  });
};

module.exports = {
  authenticateToken,
  requireInternalAdmin,
};
