
const supabase = require('../config/supabase');
const { createAuthClient } = require('../config/supabase');

// ── Packaged Electron uses http://localhost during local operation. A cookie
// marked Secure there is never sent back, even though NODE_ENV is production.
// Enable COOKIE_SECURE=true only when the API is served over HTTPS.
const cookieOpts = (maxAge) => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: process.env.COOKIE_SAME_SITE || 'lax',
  maxAge,
});
exports.signup = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'email, password and username are required' });
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) return res.status(400).json({ error: error.message });

    const { error: profileError } = await supabase
      .from('users')
      .insert({ id: data.user.id, email, username });

    if (profileError) {
      await supabase.auth.admin.deleteUser(data.user.id).catch(() => {});
      return res.status(400).json({ error: profileError.message });
    }

    res.json({ message: 'Account created' });
  } catch (error) {
    console.error('signup error:', error);
    res.status(500).json({ error: 'Signup failed', message: error.message });
  }
};

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

exports.forgotPassword = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const { error } = await createAuthClient().auth.resetPasswordForEmail(email, {
    redirectTo: 'prodcollab://reset-password'
  });
  if (error) console.error('forgotPassword error:', error);
  // Do not reveal whether an account exists.
  res.json({ message: 'If that account exists, a reset link has been sent.' });
};

exports.resetPassword = async (req, res) => {
  const { accessToken, refreshToken, password } = req.body;
  if (!accessToken || !refreshToken || !password || password.length < 8) {
    return res.status(400).json({ error: 'A valid reset link and an 8-character password are required' });
  }
  const auth = createAuthClient();
  const { error: sessionError } = await auth.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });
  if (sessionError) return res.status(400).json({ error: 'This reset link is invalid or expired' });
  const { error } = await auth.auth.updateUser({ password });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Password updated. You can now sign in.' });
};

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

exports.getMe = async (req, res) => {
  try {
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
  signup: exports.signup,
  login: exports.login,
  logout: exports.logout,
  getMe: exports.getMe,
  forgotPassword: exports.forgotPassword,
  resetPassword: exports.resetPassword,
};
