import React, { useEffect, useRef, useState } from 'react';
import { Mic, Radio, ListMusic } from 'lucide-react';
import LevelMeter from './LevelMeter';
import TakeRack from './TakeRack';
import RoomTabs from './RoomTabs';

const clock = (ms) => {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}.${Math.floor((ms % 1000) / 100)}`;
};

export default function LiveRoom({ session }) {
  const { patched, rolling, takeNumber, takes, level, elapsedMs, talkbackOpen, toggleTalkback, discardTake, pushTake, pushingTakeId } = session;

  const [tab, setTab] = useState('performance');

  const wasRolling = useRef(false);
  useEffect(() => {
    if (wasRolling.current && !rolling) setTab('takes');
    wasRolling.current = rolling;
  }, [rolling]);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-rows-1 lg:gap-4 lg:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,25rem)]">
      <RoomTabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'performance', label: 'Performance', icon: Mic, live: rolling },
          { id: 'takes', label: 'Takes', icon: ListMusic, badge: takes.length || null },
        ]}
      />

      <section className={`${tab === 'performance' ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto border border-border bg-card p-4 lg:flex lg:overflow-visible lg:p-6`}>
        {/* On-air sign. The one thing that has to be readable from across a
            room, because it answers the only question that matters in a booth. */}
        <div
          className={`mb-6 rounded-sm border px-6 py-2.5 transition-all lg:mb-10 lg:px-8 lg:py-3 ${
            rolling
              ? 'border-destructive bg-destructive/15'
              : 'border-border bg-background/50'
          }`}
          style={rolling ? { boxShadow: '0 0 48px hsl(var(--destructive) / 0.35)' } : undefined}
        >
          <span
            className={`font-mono text-lg font-bold tracking-[0.3em] lg:text-2xl ${
              rolling ? 'text-destructive' : 'text-muted-foreground/40'
            }`}
          >
            ON AIR
          </span>
        </div>

        <div className="mb-6 flex flex-col items-center lg:mb-8">
          <div
            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full border transition-colors lg:mb-5 lg:h-16 lg:w-16 ${
              rolling ? 'border-destructive/50 bg-destructive/10 text-destructive' : 'border-border bg-background/50 text-muted-foreground'
            }`}
          >
            <Mic className="h-5 w-5 lg:h-7 lg:w-7" />
          </div>
          <div className="w-56 lg:w-64">
            <LevelMeter level={level} orientation="horizontal" label="Your mic" />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {rolling ? 'This is going to tape.' : 'Mic is on. Check your level before you start.'}
          </p>
        </div>

        <p className="mb-2 font-mono text-3xl font-semibold tabular-nums text-foreground lg:text-4xl">
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

      <div className={`${tab === 'takes' ? 'block' : 'hidden'} min-h-0 flex-1 lg:block`}>
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
