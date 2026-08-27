
import React, { useState } from 'react';
import { LogoLockup } from '../components/Logo';

function LoginPage({ onLogin, onNavigateSignup, setToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mode, setMode] = useState('login');
  const [resetTokens, setResetTokens] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState('');

  React.useEffect(() => window.electronAPI?.onAuthUrl?.((url) => {
    const hash = url.split('#')[1] || '';
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
      setResetTokens({ accessToken, refreshToken });
      setMode('reset');
      setErrorMsg('');
    }
  }), []);

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

  const handleForgot = async (event) => {
    event.preventDefault();
    setLoading(true); setErrorMsg('');
    try {
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setToast?.({ type: 'success', message: data.message });
      setMode('login');
    } catch (error) { setErrorMsg(error.message); } finally { setLoading(false); }
  };

  const handleReset = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) return setErrorMsg('Passwords do not match');
    setLoading(true); setErrorMsg('');
    try {
      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...resetTokens, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setToast?.({ type: 'success', message: data.message });
      setMode('login'); setPassword(''); setConfirmPassword('');
    } catch (error) { setErrorMsg(error.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-9 text-center">
          <LogoLockup size={52} className="text-foreground" />
        </div>

        <div className="border border-border bg-card p-7">
          <div className="mb-7 text-center">
            <h2 className="mb-1 text-xl font-semibold text-foreground">{mode === 'forgot' ? 'Reset password' : mode === 'reset' ? 'Choose a password' : 'Sign in'}</h2>
            <p className="text-sm text-muted-foreground">{mode === 'forgot' ? 'We will email you a secure reset link.' : mode === 'reset' ? 'Enter your new account password.' : 'Access your studio workspace.'}</p>
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMsg}
            </div>
          )}

          <form onSubmit={mode === 'forgot' ? handleForgot : mode === 'reset' ? handleReset : handleLogin} className="space-y-4">
            {mode !== 'reset' && <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="you@example.com"
              />
            </div>}
            {mode === 'reset' && <div><label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Confirm password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none" /></div>}
            {mode !== 'forgot' && <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/85 disabled:opacity-60"
            >
              {loading ? 'Please wait…' : mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Update password' : 'Login'}
            </button>
          </form>

          <button type="button" onClick={() => { setMode(mode === 'login' ? 'forgot' : 'login'); setErrorMsg(''); }} className="mt-4 w-full text-center text-xs text-primary hover:underline">{mode === 'login' ? 'Forgot password?' : 'Back to sign in'}</button>

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
