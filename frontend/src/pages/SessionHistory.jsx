import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Trash2, Mic2, SlidersHorizontal, User, Radio } from 'lucide-react';
import ResponsiveShell from '../components/ResponsiveShell';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import TakeRack from '../remote-recording/ui/studio/TakeRack';
import { base64ToReplayUrl } from '../remote-recording/audio/replayUrl';
import { ensureProjectFolder, pushTakeToProject } from '../remote-recording/session/pushTake';

const SIDE_LABEL = { producer: 'Control room', performer: 'Live room', solo: 'Solo session' };
const SIDE_ICON = { producer: SlidersHorizontal, performer: Radio, solo: User };

const formatDate = (ms) => (ms ? new Date(ms).toLocaleString(undefined, {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
}) : 'Unknown time');

const formatDuration = (startMs, endMs) => {
  if (!startMs || !endMs) return '';
  const totalMinutes = Math.max(0, Math.round((endMs - startMs) / 60000));
  if (totalMinutes < 1) return 'Under a minute';
  if (totalMinutes < 60) return `${totalMinutes} min`;
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
};

// A past session, reopened. Nothing here talks to a live room — there is no
// transport, no meter, no connection to patch into — it is purely the
// record of what happened: who was recording, when, and the takes that came
// out of it, still playable exactly as they were the day they were made.
export default function SessionHistory({ onLogout }) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedTakes, setSelectedTakes] = useState(null);
  const [loadingTakes, setLoadingTakes] = useState(false);
  const [pushingId, setPushingId] = useState(null);
  const [toast, setToast] = useState(null);
  // A plain ref, not just the state — the unmount cleanup below needs
  // whatever the latest set of replay URLs actually is, and a closure over
  // state from the render that first set up this effect would still be
  // looking at null on the way out.
  const selectedTakesRef = useRef(null);
  useEffect(() => { selectedTakesRef.current = selectedTakes; }, [selectedTakes]);

  const revokeTakes = (takesToRevoke) => {
    (takesToRevoke || []).forEach((take) => { if (take.replayUrl) URL.revokeObjectURL(take.replayUrl); });
  };

  useEffect(() => {
    fetch('http://localhost:5000/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then(setUser)
      .catch(() => {});
    load();
    // Every replay URL is a Blob URL, alive in this tab's memory only —
    // leaving the page has to let all of them go, not just the ones for
    // whichever session was open when the effect was first set up.
    return () => revokeTakes(selectedTakesRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const load = async () => {
    setLoading(true);
    try {
      const [lookupRes, history] = await Promise.all([
        fetch(`http://localhost:5000/api/projects/${projectId}`, { credentials: 'include' }),
        window.electronAPI?.rrListSessionRecords?.({ projectId }) ?? [],
      ]);
      if (lookupRes.ok) setProjectName((await lookupRes.json()).name || '');
      const sorted = [...(history || [])].sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
      setSessions(sorted);
    } catch (error) {
      console.error('[SESSIONS] Could not load project sessions:', error);
      setToast({ type: 'error', message: 'Could not load this project\'s sessions.' });
    } finally {
      setLoading(false);
    }
  };

  const openSession = async (session) => {
    if (session.id === selectedId) return;
    // Switching sessions leaks the previous one's replay URLs unless they
    // are revoked here — closing the page is not the only way to move on
    // from a session, clicking a different one in the list is just as
    // common and has to release the same memory.
    revokeTakes(selectedTakesRef.current);
    setSelectedId(session.id);
    setLoadingTakes(true);
    setSelectedTakes(null);
    try {
      const built = await Promise.all(session.takes.map(async (take) => {
        try {
          const base64 = await window.electronAPI.rrReadAudioFile(take.path);
          return { ...take, id: `${session.id}-${take.number}`, replayUrl: base64ToReplayUrl(base64) };
        } catch (error) {
          console.warn(`[SESSIONS] Take ${take.number} in session ${session.id} could not be read:`, error.message);
          return { ...take, id: `${session.id}-${take.number}`, missing: true };
        }
      }));
      setSelectedTakes(built);
    } finally {
      setLoadingTakes(false);
    }
  };

  const closeSession = () => {
    revokeTakes(selectedTakesRef.current);
    setSelectedId(null);
    setSelectedTakes(null);
  };

  const handlePush = async (take) => {
    setPushingId(take.id);
    try {
      const folderPath = await ensureProjectFolder(projectId);
      const moved = await window.electronAPI.rrPushTakeToFolder({
        vaultPath: take.path,
        folderPath,
        takeNumber: take.number,
      });
      if (!moved?.success) throw new Error('Could not move the take into the project folder.');
      await pushTakeToProject({ projectId, folderPath });
      await window.electronAPI.rrUpdateSessionTake({
        projectId, sessionId: selectedId, takeNumber: take.number,
        patch: { path: moved.path, fileName: moved.fileName, pushed: true },
      });
      setSelectedTakes((current) => current.map((item) => (
        item.id === take.id ? { ...item, path: moved.path, fileName: moved.fileName, pushed: true } : item
      )));
      setSessions((current) => current.map((session) => (
        session.id === selectedId
          ? { ...session, takes: session.takes.map((item) => (item.number === take.number ? { ...item, pushed: true } : item)) }
          : session
      )));
    } catch (error) {
      console.error('[SESSIONS] push failed:', error);
      setToast({
        type: 'error',
        message: error.message === 'FOLDER_SELECTION_CANCELLED'
          ? 'Choose a project folder to push this take.'
          : 'Could not push this take. Try again.',
      });
    } finally {
      setPushingId(null);
    }
  };

  const handleDiscard = async (take) => {
    await window.electronAPI.rrDeleteAudioFile(take.path);
    await window.electronAPI.rrUpdateSessionTake({ projectId, sessionId: selectedId, takeNumber: take.number, remove: true });
    if (take.replayUrl) URL.revokeObjectURL(take.replayUrl);
    setSelectedTakes((current) => current.filter((item) => item.id !== take.id));
    setSessions((current) => current.map((session) => (
      session.id === selectedId ? { ...session, takes: session.takes.filter((item) => item.number !== take.number) } : session
    )));
  };

  const deleteSession = async (session, event) => {
    event.stopPropagation();
    if (!window.confirm(`Delete this session from your history? Takes that were never backed up to the project will be removed permanently.`)) return;
    await window.electronAPI.rrDeleteSessionRecord({ projectId, sessionId: session.id, deleteFiles: true });
    if (selectedId === session.id) closeSession();
    setSessions((current) => current.filter((item) => item.id !== session.id));
  };

  const selectedSession = sessions.find((session) => session.id === selectedId);

  return (
    <ResponsiveShell onLogout={onLogout} user={user}>
      <PageHeader
        eyebrow="Studio"
        title={projectName || 'Sessions'}
        description="Every session recorded for this project, with the same take rack you had live — still playable, still ready to push."
        action={(
          <button
            onClick={() => navigate('/sessions')}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            All projects
          </button>
        )}
      />
      {toast && <Toast message={toast.message} type={toast.type} duration={3000} onClose={() => setToast(null)} />}

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <LoadingSpinner />
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center border border-dashed border-border px-6 py-16 text-center">
            <Mic2 className="mb-4 h-8 w-8 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">No sessions for this project yet</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Sessions show up here once you end one from the studio.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
            <div className="divide-y divide-border border border-border lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto app-scrollbar">
              {sessions.map((session) => {
                const Icon = SIDE_ICON[session.side] || Mic2;
                const isSelected = session.id === selectedId;
                return (
                  <button
                    key={session.id}
                    onClick={() => openSession(session)}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${isSelected ? 'bg-card' : 'hover:bg-card/60'}`}
                  >
                    <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-md border ${isSelected ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{formatDate(session.endedAt)}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {SIDE_LABEL[session.side] || 'Session'} · {session.takes.length} {session.takes.length === 1 ? 'take' : 'takes'}
                        {formatDuration(session.startedAt, session.endedAt) ? ` · ${formatDuration(session.startedAt, session.endedAt)}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={(event) => deleteSession(session, event)}
                      title="Delete this session"
                      className="flex-none rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <ChevronRight className="h-4 w-4 flex-none text-muted-foreground" />
                  </button>
                );
              })}
            </div>

            <div className="min-h-[20rem]">
              {!selectedId ? (
                <div className="flex h-full min-h-[20rem] flex-col items-center justify-center border border-dashed border-border px-6 py-16 text-center">
                  <p className="text-sm text-muted-foreground">Choose a session to open its take rack.</p>
                </div>
              ) : loadingTakes ? (
                <LoadingSpinner />
              ) : (
                <TakeRack
                  takes={selectedTakes || []}
                  onDiscard={handleDiscard}
                  onPush={handlePush}
                  pushingId={pushingId}
                  recording={false}
                  level={null}
                  elapsedMs={0}
                  liveTakeNumber={0}
                  emptyHint="Every take from this session was already discarded."
                />
              )}
            </div>
          </div>
        )}
      </div>
    </ResponsiveShell>
  );
}
