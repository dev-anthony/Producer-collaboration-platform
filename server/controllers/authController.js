// controllers/authController.js
// ── Phase 3.9 + 4.6/4.7/4.8 ────────────────────────────────────────────────
// Auth migrated from GitHub OAuth + JWT + MySQL to Supabase Auth (email/password)
// with httpOnly cookies. Users no longer need a GitHub account. The old
// implementation is preserved (commented) at the bottom for review.
// ────────────────────────────────────────────────────────────────────────────
const supabase = require('../config/supabase');
const { createAuthClient } = require('../config/supabase');

// Cookie options shared by the auth cookies
const cookieOpts = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge,
});

// ── 4.7 Signup: email, password, username ──────────────────────────────────
exports.signup = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'email, password and username are required' });
    }

    // Create the auth user in Supabase Auth (admin API bypasses email confirm)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) return res.status(400).json({ error: error.message });

    // Create the profile row in the public users table
    const { error: profileError } = await supabase
      .from('users')
      .insert({ id: data.user.id, email, username });

    if (profileError) {
      // Roll back the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(data.user.id).catch(() => {});
      return res.status(400).json({ error: profileError.message });
    }

    res.json({ message: 'Account created' });
  } catch (error) {
    console.error('signup error:', error);
    res.status(500).json({ error: 'Signup failed', message: error.message });
  }
};

// ── 4.8 Login: sets httpOnly cookies, returns user ─────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { data, error } = await createAuthClient().auth.signInWithPassword({ email, password });

    if (error) return res.status(401).json({ error: 'Invalid credentials' });

    res.cookie('prodcollab_token', data.session.access_token, cookieOpts(60 * 60 * 1000)); // 1h
    res.cookie('prodcollab_refresh', data.session.refresh_token, cookieOpts(7 * 24 * 60 * 60 * 1000)); // 7d

    res.json({ user: data.user });
  } catch (error) {
    console.error('login error:', error);
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
};

// ── Logout: clear cookies ──────────────────────────────────────────────────
exports.logout = async (req, res) => {
  try {
    res.clearCookie('prodcollab_token');
    res.clearCookie('prodcollab_refresh');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('logout error:', error);
    res.status(500).json({ error: 'Logout failed', message: error.message });
  }
};

// ── GET /me: return the current user's profile ─────────────────────────────
exports.getMe = async (req, res) => {
  try {
    // req.userId is set by authMiddleware (from the cookie)
    const userId = req.userId;

    const { data: profile, error } = await supabase
      .from('users')
      .select('id, username, email, avatar_url, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: profile.id,
      username: profile.username,
      email: profile.email,
      avatar_url: profile.avatar_url,
    });
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ error: 'Failed to fetch user', message: error.message });
  }
};

module.exports = {
  // New Phase 4 auth surface
  signup: exports.signup,
  login: exports.login,
  logout: exports.logout,
  getMe: exports.getMe,
};

/* ── OLD GitHub-OAuth + JWT + MySQL implementation (Phase 3.9/4 replaced) ──

const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Helper function to generate JWT tokens
const generateTokens = (userId, githubId, username) => {
  const accessToken = jwt.sign(
    { userId, githubId, username },
    process.env.JWT_SECRET,
    { expiresIn: '15m' } // Short-lived access token
  );

  const refreshToken = jwt.sign(
    { userId, githubId, username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // Long-lived refresh token
  );

  return { accessToken, refreshToken };
};

exports.getAccessToken = async (req, res) => {
  const code = req.query.code;
  console.log('Received OAuth code:', code);

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  const params = `?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.GITHUB_CLIENT_SECRET}&code=${code}`;

  try {
    // Exchange code for GitHub access token
    const response = await fetch('https://github.com/login/oauth/access_token' + params, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`GitHub OAuth failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.access_token) {
      return res.status(400).json({ error: 'Failed to get access token', details: data });
    }

    // Get GitHub user info
    const userResponse = await fetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${data.access_token}`,
        'User-Agent': 'ProdCollab-App',
      },
    });

    if (!userResponse.ok) {
      throw new Error(`Failed to fetch GitHub user data: ${userResponse.status}`);
    }

    const userData = await userResponse.json();

    // Save/Update user and token in database
    const connection = await pool.promise().getConnection();
    try {
      await connection.beginTransaction();

      const [existingUser] = await connection.execute(
        'SELECT id FROM users WHERE github_id = ?',
        [userData.id]
      );

      let userId;
      if (existingUser.length > 0) {
        userId = existingUser[0].id;
        await connection.execute(
          `UPDATE users 
           SET username = ?, email = ?, avatar_url = ?, bio = ?, 
               public_repos = ?, updated_at = NOW() 
           WHERE github_id = ?`,
          [userData.login, userData.email, userData.avatar_url, userData.bio, userData.public_repos, userData.id]
        );
      } else {
        const [result] = await connection.execute(
          `INSERT INTO users 
           (github_id, username, email, avatar_url, bio, public_repos, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [userData.id, userData.login, userData.email, userData.avatar_url, userData.bio, userData.public_repos]
        );
        userId = result.insertId;
      }

      const [existingToken] = await connection.execute(
        'SELECT access_token FROM github_tokens WHERE user_id = ?',
        [userId]
      );

      if (existingToken.length > 0) {
        await connection.execute(
          `UPDATE github_tokens 
           SET access_token = ?, token_type = ?, scope = ?, updated_at = NOW() 
           WHERE user_id = ?`,
          [data.access_token, data.token_type, data.scope, userId]
        );
      } else {
        await connection.execute(
          `INSERT INTO github_tokens 
           (user_id, access_token, token_type, scope, created_at, updated_at) 
           VALUES (?, ?, ?, ?, NOW(), NOW())`,
          [userId, data.access_token, data.token_type, data.scope]
        );
      }

      await connection.commit();

      const { accessToken, refreshToken } = generateTokens(userId, userData.id, userData.login);

      res.json({
        token: accessToken,
        refreshToken: refreshToken,
        user: {
          id: userId,
          githubId: userData.id,
          username: userData.login,
          email: userData.email,
          avatar_url: userData.avatar_url,
          bio: userData.bio,
          public_repos: userData.public_repos,
        },
      });
    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in getAccessToken:', error);
    if (error.code === 'ENOTFOUND' || error.type === 'system') {
      return res.status(503).json({
        error: 'Network connectivity issue',
        message: 'Unable to connect to GitHub. Please check your internet connection.',
        debug: error.message
      });
    }
    res.status(500).json({ error: 'Failed to exchange code for token', message: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, githubId: decoded.githubId, username: decoded.username },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    res.json({ token: newAccessToken, message: 'Token refreshed successfully' });
  } catch (error) {
    console.error('Token refresh error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired', message: 'Please log in again', requiresLogin: true });
    }
    res.status(401).json({ error: 'Invalid refresh token', message: 'Please log in again', requiresLogin: true });
  }
};

exports.getUserData = async (req, res) => {
  try {
    const userId = req.userId;
    const connection = await pool.promise().getConnection();
    try {
      const [users] = await connection.execute(
        `SELECT u.*, gt.access_token 
         FROM users u 
         LEFT JOIN github_tokens gt ON u.id = gt.user_id 
         WHERE u.id = ?`,
        [userId]
      );
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const user = users[0];
      let githubData;
      if (user.access_token) {
        try {
          const response = await fetch('https://api.github.com/user', {
            method: 'GET',
            headers: { Authorization: `Bearer ${user.access_token}`, 'User-Agent': 'ProdCollab-App' },
          });
          if (response.ok) {
            githubData = await response.json();
          } else {
            throw new Error('GitHub API request failed');
          }
        } catch (fetchError) {
          githubData = {
            login: user.username, email: user.email, avatar_url: user.avatar_url,
            bio: user.bio, public_repos: user.public_repos,
          };
        }
      } else {
        githubData = {
          login: user.username, email: user.email, avatar_url: user.avatar_url,
          bio: user.bio, public_repos: user.public_repos,
        };
      }
      const normalizedData = {
        id: githubData.id || user.github_id,
        username: githubData.login,
        email: githubData.email,
        avatar_url: githubData.avatar_url,
        bio: githubData.bio,
        public_repos: githubData.public_repos ?? 0,
        followers: githubData.followers ?? 0,
        following: githubData.following ?? 0,
      };
      res.json(normalizedData);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Failed to fetch user data', message: error.message });
  }
};

exports.revokeGitHubToken = async (req, res) => {
  try {
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error in logout:', error);
    res.status(500).json({ error: 'Logout failed', message: error.message });
  }
};

module.exports = {
  getAccessToken: exports.getAccessToken,
  refreshToken: exports.refreshToken,
  getUserData: exports.getUserData,
  revokeGitHubToken: exports.revokeGitHubToken
};
── END OLD authController ── */
