// middleware/authMiddleware.js
// ── Phase 4.10: read session from httpOnly cookie, validate via Supabase Auth ──
const supabase = require('../config/supabase');

exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies?.prodcollab_token;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    req.userId = data.user.id;
    req.user = data.user;
    next();
  } catch (error) {
    console.error('verifyToken error:', error);
    return res.status(401).json({ error: 'Invalid session' });
  }
};

module.exports = { verifyToken: exports.verifyToken };

/* ── OLD JWT (Authorization header) implementation (Phase 4.10 replaced) ──
const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  const authHeader = req.get('Authorization');

  if (!authHeader) {
    return res.status(401).json({
      error: 'No Authorization header provided',
      debug: 'Authorization header is missing from the request'
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Invalid Authorization header format',
      debug: `Header should start with "Bearer " but got: ${authHeader.substring(0, 20)}...`
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Invalid Authorization header format',
      debug: 'Token is empty after "Bearer " prefix'
    });
  }

  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    return res.status(401).json({
      error: 'Malformed JWT token',
      debug: `Token has ${tokenParts.length} parts, expected 3`
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      error: 'Server configuration error',
      debug: 'JWT_SECRET is not configured'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.githubId = decoded.githubId;
    req.username = decoded.username;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please login again.',
        debug: { expiredAt: error.expiredAt, now: new Date().toISOString() }
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token signature is invalid or token is malformed',
        debug: error.message
      });
    }
    return res.status(401).json({
      error: 'Invalid token',
      message: error.message,
      debug: { errorType: error.name, tokenPreview: token.substring(0, 30) + '...' }
    });
  }
};

module.exports = { verifyToken: exports.verifyToken };
── END OLD authMiddleware ── */
