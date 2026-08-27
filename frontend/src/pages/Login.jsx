import React, { useState } from 'react';
import AuthLayout from '../components/AuthLayout';

function LoginPage({ onLogin, onNavigateSignup, setToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mode, setMode] = useState('login');
  const [resetTokens, setResetTokens] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState('');

  React.useEffect(() => {
    window.electronAPI?.onAuthUrl?.((url) => {
      const hash = url.split('#')[1] || '';
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        setResetTokens({ accessToken, refreshToken });
        setMode('reset');
        setErrorMsg('');
      }
    });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
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
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setToast?.({ type: 'success', message: data.message });
      setMode('login');
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) return setErrorMsg('Passwords do not match');
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...resetTokens, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setToast?.({ type: 'success', message: data.message });
      setMode('login');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="animate-fade-in flex flex-col justify-center">
        {/* Header Section (Tighter margins) */}
        <div className="mb-8">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            {mode === 'forgot' ? 'Reset password' : mode === 'reset' ? 'Choose a password' : 'Sign in'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === 'forgot' ? 'We will email you a secure reset link.' : mode === 'reset' ? 'Enter your new account password.' : 'Access your studio workspace.'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMsg}
          </div>
        )}

        {/* Form Section (Reduced vertical spacing with space-y-5) */}
        <form onSubmit={mode === 'forgot' ? handleForgot : mode === 'reset' ? handleReset : handleLogin} className="space-y-5">
          {mode !== 'reset' && (
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
          )}
          
          {mode === 'reset' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full border-0 border-b border-border bg-transparent px-0 py-2 text-sm text-foreground transition-colors focus:border-foreground focus:outline-none focus:ring-0"
                placeholder="••••••••"
              />
            </div>
          )}

          {mode !== 'forgot' && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-medium text-muted-foreground">Password</label>
                {/* Forgot password moved to align traditionally with the password label */}
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg('');
                    }}
                    className="text-xs font-medium text-foreground hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border-0 border-b border-border bg-transparent px-0 py-2 text-sm text-foreground transition-colors focus:border-foreground focus:outline-none focus:ring-0"
                placeholder="••••••••"
              />
            </div>
          )}

          {/* Standard Traditional Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
            >
              {loading ? 'Please wait...' : mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Update password' : 'Sign in'}
            </button>
          </div>

          {mode === 'forgot' && (
             <button
               type="button"
               onClick={() => {
                 setMode('login');
                 setErrorMsg('');
               }}
               className="mt-2 w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline"
             >
               Back to sign in
             </button>
          )}
        </form>

        {/* Traditional Footer */}
        {mode === 'login' && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <button
                onClick={onNavigateSignup}
                className="font-medium text-foreground hover:underline"
              >
                Sign up
              </button>
            </p>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}

export default LoginPage;