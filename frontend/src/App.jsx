
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
import { Loader2, CheckCircle2 } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary.jsx';

function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

// ── Phase 4.14 ──────────────────────────────────────────────────────────────
// Session is now managed entirely by httpOnly cookies + Supabase Auth.
// Removed: localStorage token logic, isTokenExpired, refreshAccessToken,
// Legacy auth flow removed. The current session uses the app account cookie.
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
    Promise.all([
      fetch('http://localhost:5000/api/projects', { credentials: 'include' }),
      fetch('http://localhost:5000/api/projects/collaborated', { credentials: 'include' })
    ]).then(async ([ownedResponse, sharedResponse]) => {
      if (!ownedResponse.ok || !sharedResponse.ok) {
        throw new Error(`Project restore request failed (${ownedResponse.status}/${sharedResponse.status})`);
      }
      const [owned, shared] = await Promise.all([ownedResponse.json(), sharedResponse.json()]);
      if (!Array.isArray(owned.projects) || !Array.isArray(shared.projects)) {
        throw new Error('Project restore returned an invalid project list');
      }
      return window.electronAPI?.restoreSessionWatchers?.([
        ...owned.projects.map((project) => project.id),
        ...shared.projects.map((project) => project.id)
      ]);
    }).catch((error) => {
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
      window.dispatchEvent(new CustomEvent('prodcollab:remote-project-refresh', { detail: { id: project.id } }));
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
    let clearTimer;
    const removeProgress = window.electronAPI.onGitProgress(({ operation, stage, percent }) => {
      const operationLabel = operation === 'clone'
        ? 'Opening project'
        : operation === 'pull'
          ? 'Getting latest changes'
          : 'Backing up changes';
      clearTimeout(clearTimer);
      if (percent === 100) {
        setSyncProgress({ operationLabel, stage: 'Done', percent: 100, done: true });
        clearTimer = setTimeout(() => setSyncProgress(null), 1600);
      } else {
        setSyncProgress({ operationLabel, stage, percent, done: false });
      }
    });
    const removeEnd = window.electronAPI.onGitProgressEnd?.(() => {
      clearTimeout(clearTimer);
      clearTimer = setTimeout(() => setSyncProgress(null), 600);
    });
    return () => {
      clearTimeout(clearTimer);
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

  // Keep native auto-push events alive while route pages unmount. A timer can
  // finish while Settings or another page is open, so the event must be queued
  // at the app level instead of being lost by a page-level listener.
  useEffect(() => {
    if (!window.electronAPI?.onAutoPushReady) return undefined;
    return window.electronAPI.onAutoPushReady(({ projectId }) => {
      let queued = [];
      try {
        queued = JSON.parse(window.localStorage.getItem('prodcollab_auto_push_ready') || '[]');
      } catch {
        queued = [];
      }
      if (!Array.isArray(queued)) queued = [queued].filter(Boolean);
      queued = [...new Set([...queued.map(String), String(projectId)])];
      window.localStorage.setItem('prodcollab_auto_push_ready', JSON.stringify(queued));
      window.dispatchEvent(new CustomEvent('prodcollab:auto-push-ready', { detail: { projectId } }));
    });
  }, []);

  // File watchers also outlive route pages. Persist and route their events here
  // so edits made while Settings/Profile is open still appear on project cards.
  useEffect(() => {
    if (!window.electronAPI?.onFileChanged) return undefined;
    return window.electronAPI.onFileChanged((data) => {
      window.localStorage.setItem(`prodcollab_pending_${data.projectId}`, '1');
      window.dispatchEvent(new CustomEvent('prodcollab:file-changed', { detail: data }));
    });
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.onAutoPushScheduled) return undefined;
    return window.electronAPI.onAutoPushScheduled(({ projectId, dueAt, delay }) => {
      const key = `prodcollab_push_due_${projectId}`;
      if (dueAt) window.localStorage.setItem(key, JSON.stringify({ dueAt, delay }));
      else window.localStorage.removeItem(key);
      window.dispatchEvent(new CustomEvent('prodcollab:auto-push-scheduled', { detail: { projectId, dueAt, delay } }));
    });
  }, []);

  // Enabling automatic pull applies to changes that already exist remotely;
  // it does not wait for another WebSocket update to arrive.
  useEffect(() => {
    const pullExistingProjects = async () => {
      try {
        const responses = await Promise.all([
          fetch('http://localhost:5000/api/projects', { credentials: 'include' }),
          fetch('http://localhost:5000/api/projects/collaborated', { credentials: 'include' })
        ]);
        const payloads = await Promise.all(responses.map((response) => response.ok ? response.json() : { projects: [] }));
        const projects = [...(payloads[0].projects || []), ...(payloads[1].projects || [])];
        for (const project of projects) {
          const remoteKey = `prodcollab_remote_ahead_${project.id}`;
          const folderPath = await window.electronAPI?.getFolderPath?.(project.id);
          if (!folderPath) continue;
          const checkResponse = await fetch(`http://localhost:5000/api/projects/${project.id}/check-remote-changes`, { credentials: 'include' });
          const remoteStatus = checkResponse.ok ? await checkResponse.json() : null;
          if (!remoteStatus?.hasChanges && !window.localStorage.getItem(remoteKey)) continue;
          const infoResponse = await fetch(`http://localhost:5000/api/projects/${project.id}/pull-info`, { credentials: 'include' });
          if (!infoResponse.ok) continue;
          const info = await infoResponse.json();
          const result = await window.electronAPI?.gitPull?.({ folderPath, repoUrl: info.repoUrl, token: info.token });
          if (!result?.success) continue;
          window.localStorage.removeItem(remoteKey);
          window.dispatchEvent(new CustomEvent('prodcollab:remote-synced', { detail: { id: project.id } }));
          window.dispatchEvent(new CustomEvent('prodcollab:local-synced', { detail: { id: project.id } }));
        }
        window.dispatchEvent(new CustomEvent('prodcollab:remote-project-refresh'));
      } catch (error) {
        console.error('[SYNC] Existing automatic pull failed:', error);
      }
    };
    const handleEnabled = () => { pullExistingProjects(); };
    window.addEventListener('prodcollab:auto-pull-enabled', handleEnabled);
    return () => window.removeEventListener('prodcollab:auto-pull-enabled', handleEnabled);
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  // Ask the server who we are. If the cookie is valid, we're in.
  const checkAuth = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch('http://localhost:5000/api/auth/me', {
        credentials: 'include',
        signal: controller.signal,
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
      clearTimeout(timeout);
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
        <div className="pointer-events-none fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
          <div className="w-[min(92vw,420px)] overflow-hidden rounded-md border border-border bg-background shadow-[0_24px_80px_rgba(0,0,0,0.92)]">
            <div className="flex items-center gap-4 px-6 py-5">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-border bg-card">
                {syncProgress.done
                  ? <CheckCircle2 className="h-5 w-5 text-success animate-scale-in" />
                  : <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{syncProgress.operationLabel}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {syncProgress.done ? 'Complete' : syncProgress.stage}
                </p>
              </div>
              {syncProgress.percent != null && (
                <span className={`flex-none text-xs tabular-nums ${syncProgress.done ? 'text-success' : 'text-primary'}`}>
                  {syncProgress.percent}%
                </span>
              )}
            </div>
            <div className="h-1 bg-muted">
              <div
                className={`h-full transition-[width] duration-300 ${syncProgress.done ? 'bg-success' : 'bg-primary'} ${syncProgress.percent == null ? 'w-1/3 animate-pulse' : ''}`}
                style={syncProgress.percent == null ? undefined : { width: `${syncProgress.percent}%` }}
              />
            </div>
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
