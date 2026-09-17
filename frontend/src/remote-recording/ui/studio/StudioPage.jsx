import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, PowerOff, AlertTriangle, Loader2 } from 'lucide-react';
import { useSession } from '../../session/SessionProvider';
import LoadIn from './LoadIn';
import ControlRoom from './ControlRoom';
import LiveRoom from './LiveRoom';
import SoloRoom from './SoloRoom';

const clock = (ms) => {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export default function StudioPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  const { active, side, projectId: sessionProjectId, rolling, patched, status, fault, elapsedMs, closeSession, setProject } = session;

  const projectName = location.state?.projectName || session.projectName;

  // Claim the room for this project while it is empty. Once a session is live
  // it owns the room, and the guard below handles anyone arriving from a
  // different project.
  useEffect(() => {
    if (!active) setProject(projectId, location.state?.projectName);
  }, [active, projectId, location.state?.projectName, setProject]);

  const leave = () => navigate('/projects');

  const [ending, setEnding] = useState(false);
  const endSession = async () => {
    if (ending) return;
    setEnding(true);
    const endedProjectId = sessionProjectId;
    try {
      // Saving the session record is awaited before navigating away, so the
      // Sessions page it lands on is never missing the session that just
      // finished.
      await closeSession();
      navigate(`/sessions/${endedProjectId}`);
    } finally {
      setEnding(false);
    }
  };

  // One room at a time. A second session would mean two open mics and two
  // peer connections on one machine, which is not a thing that happens in a
  // studio and not a thing the audio path can do cleanly.
  const wrongProject = active && String(sessionProjectId) !== String(projectId);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {/* ── Studio chrome ──────────────────────────────────────────────── */}
      <header className="flex h-14 flex-none items-center gap-4 border-b border-border bg-card/40 px-4">
        <button
          onClick={leave}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {active ? 'Leave studio' : 'Back'}
        </button>

        <div className="h-5 w-px bg-border" />

        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {projectName || 'Studio'}
          </span>
          {/* The room name says where you are; this says who you are in it —
              the two read differently at a glance (Control room vs Producer)
              and someone glancing at the header should not have to infer
              their own role from the room name. */}
          {(side === 'producer' || side === 'performer') && (
            <span className="flex-none rounded-sm border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-primary">
              {side === 'producer' ? 'Producer' : 'Performer'}
            </span>
          )}
          {side && (
            <span className="flex-none text-[10px] uppercase tracking-[0.18em] text-primary">
              {side === 'producer' ? 'Control room' : side === 'performer' ? 'Live room' : 'Solo session'}
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-4">
          {active && (
            <div className="hidden items-center gap-2 sm:flex">
              <span
                className={`h-1.5 w-1.5 rounded-full ${patched ? 'bg-success' : 'bg-muted-foreground/50'}`}
              />
              <span className="max-w-[18rem] truncate text-[11px] text-muted-foreground">{status}</span>
            </div>
          )}

          {rolling && (
            <div className="flex items-center gap-2 rounded-sm border border-destructive/50 bg-destructive/10 px-2.5 py-1">
              <span
                className="h-2 w-2 animate-pulse rounded-full bg-destructive"
                style={{ boxShadow: '0 0 8px hsl(var(--destructive))' }}
              />
              <span className="font-mono text-[11px] font-semibold tabular-nums text-destructive">
                REC {clock(elapsedMs)}
              </span>
            </div>
          )}

          {active && (
            <button
              onClick={endSession}
              disabled={ending}
              title="End session"
              className="inline-flex flex-none items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
            >
              {ending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PowerOff className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{ending ? 'Saving…' : 'End session'}</span>
            </button>
          )}
        </div>
      </header>

      {/* ── The room ───────────────────────────────────────────────────── */}
      {wrongProject ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md border border-border bg-card p-6 text-center">
            <AlertTriangle className="mx-auto mb-4 h-6 w-6 text-primary" />
            <h2 className="text-base font-semibold text-foreground">A session is already live</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              A session for another project is already running on this computer. Finish or end
              it before starting a new one. Two open microphones at once would conflict with
              each other.
            </p>
            <button
              onClick={() => navigate(`/studio/${sessionProjectId}`)}
              className="mt-5 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/85"
            >
              Go to the live session
            </button>
          </div>
        </div>
      ) : !active ? (
        <LoadIn session={session} />
      ) : side === 'producer' ? (
        <ControlRoom session={session} />
      ) : side === 'solo' ? (
        <SoloRoom session={session} />
      ) : (
        <LiveRoom session={session} />
      )}

      {/* Faults surface as a strip rather than a dialog — nothing should ever
          sit on top of the transport while a take might be running. */}
      {active && fault && (
        <div className="flex flex-none items-center gap-3 border-t border-destructive/30 bg-destructive/10 px-4 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 flex-none text-destructive" />
          <span className="min-w-0 flex-1 truncate text-xs text-destructive">{fault}</span>
          <button
            onClick={session.clearFault}
            className="flex-none text-[11px] text-destructive/70 transition-colors hover:text-destructive"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
