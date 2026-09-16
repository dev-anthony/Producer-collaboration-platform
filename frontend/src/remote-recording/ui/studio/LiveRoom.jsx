import React from 'react';
import { Mic, Radio } from 'lucide-react';
import LevelMeter from './LevelMeter';
import TakeRack from './TakeRack';

const clock = (ms) => {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}.${Math.floor((ms % 1000) / 100)}`;
};

// The live room: the other side of the glass. In a real studio the performer
// does not run their own transport — the person at the desk does, and the
// performer's job is to perform. So this view has no record button of its
// own: the control room rolls and stops (roll()/stopTake() fire here in
// response to that relayed command), and the performer sees it happen —
// the ON AIR sign, the clock, their own level — without operating anything.
// A solo take, where one person legitimately does run their own transport,
// lives in its own Solo Session view instead of here.
export default function LiveRoom({ session }) {
  const { patched, rolling, takeNumber, takes, level, elapsedMs, talkbackOpen, toggleTalkback, discardTake, pushTake, pushingTakeId } = session;

  return (
    <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,25rem)]">
      <section className="flex min-h-0 flex-col items-center justify-center border border-border bg-card p-6">
        {/* On-air sign. The one thing that has to be readable from across a
            room, because it answers the only question that matters in a booth. */}
        <div
          className={`mb-10 rounded-sm border px-8 py-3 transition-all ${
            rolling
              ? 'border-destructive bg-destructive/15'
              : 'border-border bg-background/50'
          }`}
          style={rolling ? { boxShadow: '0 0 48px hsl(var(--destructive) / 0.35)' } : undefined}
        >
          <span
            className={`font-mono text-2xl font-bold tracking-[0.3em] ${
              rolling ? 'text-destructive' : 'text-muted-foreground/40'
            }`}
          >
            ON AIR
          </span>
        </div>

        <div className="mb-8 flex flex-col items-center">
          <div
            className={`mb-5 flex h-16 w-16 items-center justify-center rounded-full border transition-colors ${
              rolling ? 'border-destructive/50 bg-destructive/10 text-destructive' : 'border-border bg-background/50 text-muted-foreground'
            }`}
          >
            <Mic className="h-7 w-7" />
          </div>
          <div className="w-64">
            <LevelMeter level={level} orientation="horizontal" label="Your mic" />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {rolling ? 'This is going to tape.' : 'Mic is on. Check your level before you start.'}
          </p>
        </div>

        <p className="mb-2 font-mono text-4xl font-semibold tabular-nums text-foreground">
          {rolling ? clock(elapsedMs) : `TAKE ${String(takeNumber).padStart(2, '0')}`}
        </p>
        <p className="mb-8 text-[11px] text-muted-foreground">
          {patched
            ? rolling
              ? 'The control room is recording.'
              : 'The control room starts and stops each take. You will see it happen here.'
            : 'Waiting for the control room.'}
        </p>

        <button
          onClick={toggleTalkback}
          disabled={!patched}
          className={`inline-flex items-center justify-center gap-2 rounded-md border px-5 py-2.5 text-xs font-medium transition-colors disabled:opacity-40 ${
            talkbackOpen
              ? 'border-primary/50 bg-primary/15 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <Radio className="h-3.5 w-3.5" />
          {talkbackOpen ? 'Talkback open' : 'Talk to the control room'}
        </button>
      </section>

      <div className="min-h-0">
        <TakeRack
          takes={takes}
          onDiscard={discardTake}
          onPush={pushTake}
          pushingId={pushingTakeId}
          recording={rolling}
          level={level}
          elapsedMs={elapsedMs}
          liveTakeNumber={takeNumber}
          emptyHint="Your takes will appear here. Each one is recorded on this computer in full quality, so nothing depends on the connection staying strong. Listen back, then send your favorite to the project."
        />
      </div>
    </div>
  );
}
