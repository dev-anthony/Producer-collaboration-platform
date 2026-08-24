
import React, { useState } from 'react';

function SignupPage({ onSignupComplete, onNavigateLogin, setToast }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }
      if (setToast) setToast({ type: 'success', message: 'Account created. Please log in.' });
      if (onSignupComplete) onSignupComplete();
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
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-md bg-primary">
            <svg className="w-10 h-10 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Start collaborating in minutes.</p>
        </div>

        <div className="border border-border bg-card p-7 text-center">
          {errorMsg && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4 text-center">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-center text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="producer_name"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-center text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-center text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-center text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/85 disabled:opacity-60"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              onClick={onNavigateLogin}
              className="text-primary font-medium hover:underline"
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
