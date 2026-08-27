import React, { useState } from 'react';
import AuthLayout from '../components/AuthLayout';

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
    <AuthLayout 
      title="Create sound without limits."
      description="Connect your DAW directly to your collaborators. Experience real-time feedback and seamless studio sharing."
    >
      <div className="animate-fade-in flex flex-col justify-center">
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Create account
          </h2>
        </div>

        {errorMsg && (
          <div className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full border-0 border-b border-border bg-transparent px-0 py-2 text-sm text-foreground transition-colors focus:border-foreground focus:outline-none focus:ring-0"
              placeholder="producer_name"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border-0 border-b border-border bg-transparent px-0 py-2 text-sm text-foreground transition-colors focus:border-foreground focus:outline-none focus:ring-0"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border-0 border-b border-border bg-transparent px-0 py-2 text-sm text-foreground transition-colors focus:border-foreground focus:outline-none focus:ring-0"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border-0 border-b border-border bg-transparent px-0 py-2 text-sm text-foreground transition-colors focus:border-foreground focus:outline-none focus:ring-0"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-60"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              onClick={onNavigateLogin}
              className="font-semibold text-foreground hover:underline"
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}

export default SignupPage;