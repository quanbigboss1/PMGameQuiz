const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

function getToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function optionalAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return next();
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'development-secret');
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

async function requireAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'development-secret');
    const user = await userRepository.findById(payload.userId);
    if (!user) return res.status(401).json({ message: 'User account is inactive or missing.' });
    req.user = user;
    next();
  } catch (error) {
    next(error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' ? Object.assign(new Error('Invalid or expired token.'), { statusCode: 401 }) : error);
  }
}

function resolveUserId(req) {
  return req.user?.userId || Number(req.query.userId || req.body?.userId || process.env.CURRENT_USER_ID) || 1;
}

module.exports = { optionalAuth, requireAuth, resolveUserId };
