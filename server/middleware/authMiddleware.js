// middleware/authMiddleware.js
// ── Phase 4.10: read session from httpOnly cookie, validate via Supabase Auth ──
const supabase = require('../config/supabase');

const cookieOpts = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge,
});

exports.verifyToken = async (req, res, next) => {
  try {
    let token = req.cookies?.prodcollab_token;
    const refreshToken = req.cookies?.prodcollab_refresh;

    if (!token && !refreshToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    let { data, error } = token
      ? await supabase.auth.getUser(token)
      : { data: null, error: new Error('Access token missing') };

    if ((error || !data?.user) && refreshToken) {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
      if (!refreshError && refreshed?.session && refreshed?.user) {
        token = refreshed.session.access_token;
        res.cookie('prodcollab_token', token, cookieOpts(60 * 60 * 1000));
        res.cookie('prodcollab_refresh', refreshed.session.refresh_token, cookieOpts(7 * 24 * 60 * 60 * 1000));
        data = { user: refreshed.user };
        error = null;
      }
    }

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
