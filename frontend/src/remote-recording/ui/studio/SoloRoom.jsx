import React, { useEffect, useRef, useState } from 'react';
import { Circle, Square, Mic, ListMusic } from 'lucide-react';
import LevelMeter from './LevelMeter';
import TakeRack from './TakeRack';
import RoomTabs from './RoomTabs';

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

  // Below lg only one of these is visible at a time — see RoomTabs. All
  // three panels stay mounted regardless, so the meter and the take rack
  // keep running underneath whichever one is on screen.
  const [tab, setTab] = useState('transport');

  // A stopped take is the one moment you actually want to be looking at the
  // rack instead of the transport — no reason to make that a second tap on
  // a small screen. Harmless on lg, where every panel is visible anyway and
  // this state only decides which tab is highlighted.
  const wasRolling = useRef(false);
  useEffect(() => {
    if (wasRolling.current && !rolling) setTab('takes');
    wasRolling.current = rolling;
  }, [rolling]);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-rows-1 lg:gap-4 lg:p-4 lg:grid-cols-[13rem_minmax(0,1fr)_minmax(20rem,25rem)]">
      <RoomTabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'channel', label: 'Channel', icon: Mic },
          { id: 'transport', label: 'Transport', icon: Circle, live: rolling },
          { id: 'takes', label: 'Takes', icon: ListMusic, badge: takes.length || null },
        ]}
      />

      <section className={`${tab === 'channel' ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col overflow-y-auto border border-border bg-card p-4 lg:flex lg:overflow-visible`}>
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

      <section className={`${tab === 'transport' ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto border border-border bg-card p-4 lg:flex lg:overflow-visible lg:p-6`}>
        <div className="mb-5 text-center lg:mb-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {rolling ? 'Recording' : 'Next take'}
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-foreground lg:text-5xl">
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
          className={`group flex h-20 w-20 flex-none items-center justify-center rounded-full border-2 transition-all disabled:cursor-not-allowed disabled:opacity-30 lg:h-28 lg:w-28 ${
            rolling
              ? 'border-destructive bg-destructive/20 text-destructive hover:bg-destructive/30'
              : 'border-destructive/60 bg-destructive/10 text-destructive hover:border-destructive hover:bg-destructive/20'
          }`}
          style={rolling ? { boxShadow: '0 0 40px hsl(var(--destructive) / 0.45)' } : undefined}
        >
          {rolling
            ? <Square className="h-7 w-7 fill-current lg:h-9 lg:w-9" />
            : <Circle className="h-9 w-9 fill-current lg:h-12 lg:w-12" />}
        </button>

        <p className="mt-4 text-xs font-medium text-foreground lg:mt-5">
          {rolling ? 'Stop take' : 'Roll take'}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Listen back when you stop, then send your favorite take to the project. The rest stay here.
        </p>
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
          emptyHint="Nothing recorded yet. Roll a take and it will appear here as soon as you stop. Listen back, then send your favorite to the project."
        />
      </div>
    </div>
  );
}
