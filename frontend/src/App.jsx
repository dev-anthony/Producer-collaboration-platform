
import React, { useEffect, useRef, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login.jsx';
import SignupPage from './pages/SignupPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import Toast from './components/Toast.jsx';
import Collaboration from './pages/Collaboration.jsx';
import Projects from './pages/Projects.jsx';
import Settings from './pages/Settings.jsx';
import Profile from './pages/Profile.jsx';
import History from './pages/History.jsx';
import { Loader2 } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary.jsx';

function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

// ── Phase 4.14 ──────────────────────────────────────────────────────────────
// Session is now managed entirely by httpOnly cookies + Supabase Auth.
// Removed: localStorage token logic, isTokenExpired, refreshAccessToken,
// GitHub OAuth callback handling. checkAuth() now calls GET /api/auth/me.
// The old JWT/localStorage implementation is preserved (commented) at the bottom.
// ────────────────────────────────────────────────────────────────────────────
function App() {
  const devAccount = new URLSearchParams(window.location.search).get('devAccount');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [syncProgress, setSyncProgress] = useState(null);
  const [authScreen, setAuthScreen] = useState('login'); // 'login' | 'signup'
  const seenPushes = useRef(new Set());
  const realtimeClientId = useRef(null);
  if (!realtimeClientId.current) {
    const storedClientId = window.localStorage.getItem('prodcollab_realtime_client_id');
    realtimeClientId.current = storedClientId || crypto.randomUUID();
    if (!storedClientId) window.localStorage.setItem('prodcollab_realtime_client_id', realtimeClientId.current);
  }

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    window.electronAPI?.setAutoPushDelay?.(
      window.localStorage.getItem('prodcollab_auto_push_delay') || '10'
    );
    window.electronAPI?.restoreSessionWatchers?.().catch((error) => {
      console.error('[WATCHER] Could not restore session watchers:', error);
    });
    let socket;
    let reconnectTimer;
    let reconnectDelay = 1000;
    let disposed = false;
    const connect = () => {
      if (disposed) return;
      const realtimeProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const realtimeHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'localhost:5000'
        : window.location.host;
      socket = new WebSocket(`${realtimeProtocol}//${realtimeHost}/realtime`);
      socket.onopen = () => {
        reconnectDelay = 1000;
        console.log('[REALTIME-WS] Connected');
      };
      socket.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch (error) {
          console.warn('[REALTIME-WS] Ignoring invalid event:', error);
          return;
        }
        if (message.type !== 'project-updated') return;
        handleProjectUpdate(message.project);
      };
      socket.onerror = (error) => console.warn('[REALTIME-WS] Connection interrupted:', error);
      socket.onclose = async () => {
        if (disposed) return;
        try {
          await fetch('http://localhost:5000/api/auth/me', { credentials: 'include' });
        } catch (error) {
          console.warn('[REALTIME-WS] Session refresh before reconnect failed:', error);
        }
        console.warn(`[REALTIME-WS] Disconnected; retrying in ${reconnectDelay}ms`);
        reconnectTimer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      };
    };
    const handleProjectUpdate = async (project) => {
      if (!project.last_pushed_by || project.source_client_id === realtimeClientId.current) return;
      if (!project.source_client_id && (
        project.last_pushed_by === user?.email || project.last_pushed_by === user?.username
      )) return;
      const pushKey = `${project.id}:${project.last_pushed_by}:${project.updated_at}`;
      if (seenPushes.current.has(pushKey)) return;
      seenPushes.current.add(pushKey);
      const message = `${project.last_pushed_by} pushed changes to ${project.repo_name}`;
      setToast({ type: 'info', message });
      window.localStorage.setItem(`prodcollab_remote_ahead_${project.id}`, pushKey);
      window.dispatchEvent(new CustomEvent('prodcollab:remote-change', { detail: project }));
      if (window.localStorage.getItem('prodcollab_desktop_notifications') !== 'false') {
        window.electronAPI?.showNotification({ title: 'ProdCollab update', body: message });
      }
      if (window.localStorage.getItem('prodcollab_auto_pull') !== 'true') return;
      try {
        const folderPath = await window.electronAPI?.getFolderPath(project.id);
        if (!folderPath) return;
        const response = await fetch(`http://localhost:5000/api/projects/${project.id}/pull-info`, { credentials: 'include' });
        const pullInfo = await response.json();
        if (!response.ok) throw new Error(pullInfo.error || 'Could not get pull details');
        const result = await window.electronAPI.gitPull({ folderPath, repoUrl: pullInfo.repoUrl, token: pullInfo.token });
        if (!result.success) throw new Error(result.code || 'PULL_FAILED');
        if (result.conflicts?.length > 0) {
          console.warn(`[SYNC] Preserved ${result.conflicts.length} local conflict file(s):`, result.conflicts);
          setToast({
            type: 'warning',
            message: `Project updated. ${result.conflicts.length} local file version was preserved as a conflict copy.`
          });
        }
        window.localStorage.removeItem(`prodcollab_remote_ahead_${project.id}`);
        window.dispatchEvent(new CustomEvent('prodcollab:remote-synced', { detail: { id: project.id } }));
        window.dispatchEvent(new CustomEvent('prodcollab:local-synced', { detail: { id: project.id } }));
        if (window.localStorage.getItem('prodcollab_desktop_notifications') !== 'false') window.electronAPI?.showNotification({
          title: 'ProdCollab synced',
          body: `${project.repo_name} was updated in your local folder.`
        });
      } catch (error) {
        console.error('[SYNC] Automatic pull failed:', error);
        setToast({ type: 'error', message: 'We could not download the latest changes. You can retry from the project card.' });
      }
    };
    connect();
    return () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [isAuthenticated, user?.email]);

  useEffect(() => {
    if (!window.electronAPI?.onGitProgress) return undefined;
    const removeProgress = window.electronAPI.onGitProgress(({ operation, stage, percent }) => {
      const operationLabel = operation === 'clone'
        ? 'Joining project'
        : operation === 'pull'
          ? 'Pulling changes'
          : 'Pushing changes';
      setSyncProgress({ operationLabel, stage, percent });
      if (percent === 100) setTimeout(() => setSyncProgress(null), 1500);
    });
    const removeEnd = window.electronAPI.onGitProgressEnd?.(() => {
      setTimeout(() => setSyncProgress(null), 500);
    });
    return () => {
      removeProgress?.();
      removeEnd?.();
    };
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.onFileDeleted) return undefined;
    return window.electronAPI.onFileDeleted(({ path: filePath, event }) => {
      const name = filePath.split(/[\\/]/).pop();
      setToast({
        type: 'info',
        message: `${event === 'unlinkDir' ? 'Folder' : 'File'} deleted locally: ${name}. This deletion will not be pushed.`
      });
    });
  }, []);

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

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <HashRouter>
      {devAccount && (
        <div className="fixed bottom-3 right-3 z-[100] bg-yellow-400 text-black px-3 py-1.5 rounded-md text-xs font-bold shadow-lg">
          DEV TEST {devAccount}
        </div>
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={3000}
          onClose={() => setToast(null)}
        />
      )}
      {syncProgress && (
        <div className="pointer-events-none fixed left-1/2 top-3 z-[110] w-[min(92vw,420px)] -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-background/95 shadow-lg backdrop-blur-xl">
          <div className="flex h-11 items-center gap-3 px-4 text-sm text-foreground">
            <Loader2 className="h-4 w-4 flex-none animate-spin text-primary" />
            <span className="min-w-0 flex-1 truncate"><strong>{syncProgress.operationLabel}</strong> · {syncProgress.stage}</span>
            {syncProgress.percent != null && <span className="flex-none tabular-nums text-primary">{syncProgress.percent}%</span>}
          </div>
          <div className="h-0.5 bg-muted">
            <div
              className={`h-full bg-primary transition-[width] duration-300 ${syncProgress.percent == null ? 'w-1/3 animate-pulse' : ''}`}
              style={syncProgress.percent == null ? undefined : { width: `${syncProgress.percent}%` }}
            />
          </div>
        </div>
      )}
      <ErrorBoundary><Routes>
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
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Dashboard onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/collaboration"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Collaboration onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Projects onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <History onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={<ProtectedRoute isAuthenticated={isAuthenticated}><Settings onLogout={handleLogout} /></ProtectedRoute>}
        />
        <Route
          path="/profile"
          element={<ProtectedRoute isAuthenticated={isAuthenticated}><Profile onLogout={handleLogout} /></ProtectedRoute>}
        />
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
        />
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
        />
      </Routes></ErrorBoundary>
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
