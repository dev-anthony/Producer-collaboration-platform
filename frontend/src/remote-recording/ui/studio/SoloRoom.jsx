import React from 'react';
import { Circle, Square, Mic } from 'lucide-react';
import LevelMeter from './LevelMeter';
import TakeRack from './TakeRack';

const clock = (ms) => {
  const total = Math.floor(ms / 1000);
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  const tenths = Math.floor((ms % 1000) / 100);
  return `${minutes}:${seconds}.${tenths}`;
};

// A solo session: one person, alone, self-operating — the honest case for a
// performer running their own transport. There is no other side of the
// glass here, so there is no counterpart, no session key, no talkback and
// no patched connection to wait on; the room is ready the moment the mic
// opens. Everything else a session has — meter, transport, take rack, the
// choice of which take to push — is still here in full.
export default function SoloRoom({ session }) {
  const {
    patched, rolling, busyTake, takeNumber, takes, level, elapsedMs,
    roll, stopTake, discardTake, pushTake, pushingTakeId,
  } = session;

  return (
    <div className="grid min-h-0 flex-1 grid-rows-[auto_auto_minmax(0,1fr)] gap-4 overflow-y-auto p-4 lg:grid-rows-1 lg:overflow-visible lg:grid-cols-[13rem_minmax(0,1fr)_minmax(20rem,25rem)]">
      <section className="flex min-h-0 flex-col border border-border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <Mic className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Your channel</span>
        </div>
        <div className="flex min-h-0 justify-center pb-4 lg:flex-1">
          <LevelMeter level={level} orientation="vertical" responsive label="Input" />
        </div>
        <p className="border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground/70">
          Recording alone. Each take is captured at full quality on this machine and lands in the rack the moment you stop.
        </p>
      </section>

      <section className="flex min-h-0 flex-col items-center justify-center border border-border bg-card p-6">
        <div className="mb-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {rolling ? 'Recording' : 'Next take'}
          </p>
          <p className="mt-2 font-mono text-5xl font-semibold tabular-nums text-foreground">
            {rolling ? clock(elapsedMs) : `TAKE ${String(takeNumber).padStart(2, '0')}`}
          </p>
          {rolling && (
            <p className="mt-2 font-mono text-xs tracking-wide text-muted-foreground">
              TAKE {String(takeNumber).padStart(2, '0')}
            </p>
          )}
        </div>

        <button
          onClick={rolling ? stopTake : roll}
          disabled={!patched || busyTake}
          className={`group flex h-28 w-28 items-center justify-center rounded-full border-2 transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
            rolling
              ? 'border-destructive bg-destructive/20 text-destructive hover:bg-destructive/30'
              : 'border-destructive/60 bg-destructive/10 text-destructive hover:border-destructive hover:bg-destructive/20'
          }`}
          style={rolling ? { boxShadow: '0 0 40px hsl(var(--destructive) / 0.45)' } : undefined}
        >
          {rolling
            ? <Square className="h-9 w-9 fill-current" />
            : <Circle className="h-12 w-12 fill-current" />}
        </button>

        <p className="mt-5 text-xs font-medium text-foreground">
          {rolling ? 'Stop take' : 'Roll take'}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Listen back when you stop, then send your favorite take to the project. The rest stay here.
        </p>
      </section>

      <div className="min-h-0 w-full">
        <TakeRack
          takes={takes}
          onDiscard={discardTake}
          onPush={pushTake}
          pushingId={pushingTakeId}
          recording={rolling}
          level={level}
          elapsedMs={elapsedMs}
          liveTakeNumber={takeNumber}
          emptyHint="Nothing recorded yet. Roll a take and it will appear here as soon as you stop. Listen back, then send your favorite to the project."
        />
      </div>
    </div>
  );
}
