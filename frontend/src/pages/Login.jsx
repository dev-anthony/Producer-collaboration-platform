
import React, { useState } from 'react';

// ── Phase 4.11 + 4.12 ───────────────────────────────────────────────────────
// GitHub-OAuth login replaced with email/password (Supabase Auth via server).
// The old GitHub OAuth LoginPage is preserved (commented) at the bottom.
// Props:
//   onLogin(user)      → called after a successful login
//   onNavigateSignup() → switch to the signup screen
//   setToast(toast)    → optional toast setter
// ────────────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin, onNavigateSignup, setToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        credentials: 'include', // receive httpOnly cookies
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      if (onLogin) onLogin(data.user);
    } catch (err) {
      setErrorMsg(err.message);
      if (setToast) setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-9 text-center">
          <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-md bg-primary">
            <svg className="w-10 h-10 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">ProdCollab</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your studio. Anywhere.</p>
        </div>

        <div className="border border-border bg-card p-7">
          <h2 className="mb-1 text-xl font-semibold text-foreground">Sign in</h2>
          <p className="mb-7 text-sm text-muted-foreground">Access your studio workspace.</p>

          {errorMsg && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/85 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <button
              onClick={onNavigateSignup}
              className="text-primary font-medium hover:underline"
            >
              Sign up
            </button>
          </p>
        </div>

        <p className="mt-7 text-center text-xs text-muted-foreground/60">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

export default LoginPage;

/* ── OLD GitHub-OAuth LoginPage (Phase 4.11 replaced) ──
import React from 'react';

function LoginPage({ clientId }) {
  const loginWithGithub = () => {
    const isProduction = !window.location.href.includes('localhost');
    const redirectUri = 'http://localhost:9000/';

    const authUrl = `https://github.com/login/oauth/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=user%20repo`;

    console.log('[LOGIN] Starting OAuth:', { isProduction, redirectUri, authUrl });
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      ... (GitHub "Continue with GitHub" button UI) ...
    </div>
  );
}

export default LoginPage;
── END OLD LoginPage ── */
