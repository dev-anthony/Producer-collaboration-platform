import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic2, ChevronRight, Music2 } from 'lucide-react';
import ResponsiveShell from '../components/ResponsiveShell';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

export default function Sessions({ onLogout }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then(setUser)
      .catch(() => {});
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [ownedRes, sharedRes, history] = await Promise.all([
        fetch('http://localhost:5000/api/projects', { credentials: 'include' }),
        fetch('http://localhost:5000/api/projects/collaborated', { credentials: 'include' }),
        window.electronAPI?.rrListSessionRecords?.({}) ?? {},
      ]);
      const owned = ownedRes.ok ? (await ownedRes.json()).projects || [] : [];
      const shared = sharedRes.ok ? (await sharedRes.json()).projects || [] : [];
      const byId = new Map();
      [...owned, ...shared].forEach((project) => byId.set(String(project.id), project));

      const projectRows = Object.entries(history || {})
        .map(([projectId, sessions]) => {
          const project = byId.get(String(projectId));
          const takeCount = sessions.reduce((sum, session) => sum + session.takes.length, 0);
          const lastEndedAt = sessions.reduce((latest, session) => Math.max(latest, session.endedAt || 0), 0);
          return {
            projectId,
            projectName: project?.name || sessions[0]?.projectName || 'Deleted project',
            sessionCount: sessions.length,
            takeCount,
            lastEndedAt,
          };
        })
        .sort((a, b) => b.lastEndedAt - a.lastEndedAt);

      setRows(projectRows);
    } catch (error) {
      console.error('[SESSIONS] Could not load session history:', error);
      setToast({ type: 'error', message: 'Could not load your sessions.' });
    } finally {
      setLoading(false);
    }
  };

  const formatWhen = (ms) => {
    if (!ms) return '';
    const days = Math.floor((Date.now() - ms) / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(ms).toLocaleDateString();
  };

  return (
    <ResponsiveShell onLogout={onLogout} user={user}>
      <PageHeader
        eyebrow="Studio"
        title="Sessions"
        description="Every recording session you've run, kept by project — takes stay playable here even after the room closes."
      />
      {toast && <Toast message={toast.message} type={toast.type} duration={3000} onClose={() => setToast(null)} />}

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <LoadingSpinner />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center border border-dashed border-border px-6 py-16 text-center">
            <Mic2 className="mb-4 h-8 w-8 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">No sessions yet</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Open a project and click Record to start one. Once a session ends, it will show up here with every take you recorded.
            </p>
            <button
              onClick={() => navigate('/projects')}
              className="mt-6 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/85"
            >
              Go to projects
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border border border-border">
            {rows.map((row) => (
              <button
                key={row.projectId}
                onClick={() => navigate(`/sessions/${row.projectId}`)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-card"
              >
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
                  <Music2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{row.projectName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.sessionCount} {row.sessionCount === 1 ? 'session' : 'sessions'} · {row.takeCount} {row.takeCount === 1 ? 'take' : 'takes'} · {formatWhen(row.lastEndedAt)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 flex-none text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    </ResponsiveShell>
  );
}
