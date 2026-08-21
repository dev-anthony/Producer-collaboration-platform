// middleware/authMiddleware.js
// ── Phase 4.10: read session from httpOnly cookie, validate via Supabase Auth ──
const supabase = require('../config/supabase');
const { createAuthClient } = require('../config/supabase');

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
      const { data: refreshed, error: refreshError } = await createAuthClient().auth.refreshSession({ refresh_token: refreshToken });
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
