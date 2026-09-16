import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Radio } from 'lucide-react';
import { useSession } from '../session/SessionProvider';

const clock = (ms) => {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

// The session keeps running when you walk out of the studio, so something has
// to say so from everywhere else in the app. This is that: a live room you can
// step back into, and while a take is rolling it is impossible to miss.
export default function SessionDock() {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  if (!session.active) return null;
  if (location.pathname.startsWith('/studio/')) return null;

  const { rolling, patched, side, projectName, elapsedMs, takes, projectId } = session;

  return (
    <button
      onClick={() => navigate(`/studio/${projectId}`)}
      className={`fixed bottom-4 right-4 z-[130] flex items-center gap-3 rounded-md border px-4 py-3 text-left shadow-[0_18px_50px_rgba(0,0,0,0.8)] transition-colors ${
        rolling
          ? 'border-destructive/50 bg-destructive/10 hover:bg-destructive/15'
          : 'border-border bg-card hover:border-primary/40'
      }`}
    >
      {rolling ? (
        <span
          className="h-2.5 w-2.5 flex-none animate-pulse rounded-full bg-destructive"
          style={{ boxShadow: '0 0 10px hsl(var(--destructive))' }}
        />
      ) : (
        <Radio className={`h-4 w-4 flex-none ${patched ? 'text-success' : 'text-muted-foreground'}`} />
      )}

      <span className="min-w-0">
        <span className="block text-xs font-semibold text-foreground">
          {rolling ? 'Take rolling' : 'Session live'}
          {projectName ? <span className="font-normal text-muted-foreground"> · {projectName}</span> : null}
        </span>
        <span className="block text-[10px] text-muted-foreground">
          {rolling
            ? <span className="font-mono tabular-nums text-destructive">REC {clock(elapsedMs)}</span>
            : `${side === 'producer' ? 'Control room' : side === 'performer' ? 'Live room' : 'Solo session'} · ${takes.length} ${takes.length === 1 ? 'take' : 'takes'}`}
        </span>
      </span>

      <ArrowUpRight className="h-3.5 w-3.5 flex-none text-muted-foreground" />
    </button>
  );
}
