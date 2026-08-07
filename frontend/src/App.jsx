
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login.jsx';
import SignupPage from './pages/SignupPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import Toast from './components/Toast.jsx';
import Collaboration from './pages/Collaboration.jsx';
import Projects from './pages/Projects.jsx';

// ── Phase 4.14 ──────────────────────────────────────────────────────────────
// Session is now managed entirely by httpOnly cookies + Supabase Auth.
// Removed: localStorage token logic, isTokenExpired, refreshAccessToken,
// GitHub OAuth callback handling. checkAuth() now calls GET /api/auth/me.
// The old JWT/localStorage implementation is preserved (commented) at the bottom.
// ────────────────────────────────────────────────────────────────────────────
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [authScreen, setAuthScreen] = useState('login'); // 'login' | 'signup'

  useEffect(() => {
    checkAuth();
  }, []);

  // Ask the server who we are. If the cookie is valid, we're in.
  const checkAuth = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/me', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('[AUTH] checkAuth failed:', err);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser || null);
    setIsAuthenticated(true);
    setToast({ type: 'success', message: 'Welcome back!' });
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Server logout error:', error);
    } finally {
      if (window.electronAPI?.clearOAuthSession) {
        await window.electronAPI.clearOAuthSession().catch(() => {});
      }
      setUser(null);
      setIsAuthenticated(false);
      setToast({ type: 'success', message: 'Logged out successfully' });
    }
  };

  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <HashRouter>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={3000}
          onClose={() => setToast(null)}
        />
      )}
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : authScreen === 'signup' ? (
              <SignupPage
                setToast={setToast}
                onSignupComplete={() => setAuthScreen('login')}
                onNavigateLogin={() => setAuthScreen('login')}
              />
            ) : (
              <LoginPage
                setToast={setToast}
                onLogin={handleLoginSuccess}
                onNavigateSignup={() => setAuthScreen('signup')}
              />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/collaboration"
          element={
            <ProtectedRoute>
              <Collaboration onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Projects onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
        />
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
        />
      </Routes>
    </HashRouter>
  );
}

export default App;

/* ── OLD JWT + localStorage + GitHub OAuth App (Phase 4.14 replaced) ──
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import Toast from './components/Toast.jsx';
import Collaboration from './pages/Collaboration.jsx';
import Projects from './pages/Projects.jsx';

const productionClientId = process.env.CLIENT_ID;

const refreshAccessToken = async (refreshToken) => {
  try {
    const response = await fetch('http://localhost:5000/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!response.ok) throw new Error('Token refresh failed');
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
};

const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [jwtToken, setJwtToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    checkAuth();
    const cleanup = window.electronAPI?.onOAuthCode?.((code) => {
      handleOAuthCallback(code);
    });
    const refreshInterval = setInterval(async () => {
      const currentToken = localStorage.getItem('jwtToken');
      const currentRefresh = localStorage.getItem('refreshToken');
      if (currentToken && currentRefresh && isTokenExpired(currentToken)) {
        const newToken = await refreshAccessToken(currentRefresh);
        if (newToken) {
          localStorage.setItem('jwtToken', newToken);
          setJwtToken(newToken);
        } else {
          handleLogout();
        }
      }
    }, 10 * 60 * 1000);
    return () => {
      if (cleanup) cleanup();
      clearInterval(refreshInterval);
    };
  }, []);

  // ... (checkAuth reading localStorage, handleOAuthCallback hitting
  //      /api/auth/getAccessToken, handleLogout with Bearer header) ...
  // Full prior source retained in git history.
}

export default App;
── END OLD App ── */
