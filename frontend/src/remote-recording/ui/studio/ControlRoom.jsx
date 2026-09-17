import React, { useEffect, useRef, useState } from 'react';
import { Circle, Square, Volume2, VolumeX, Mic, Copy, Check, Radio, ListMusic } from 'lucide-react';
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

export default function ControlRoom({ session }) {
  const {
    sessionKey, patched, rolling, busyTake, takeNumber, takes, level, elapsedMs,
    signalPresent, monitorMuted, talkbackOpen, roll, stopTake, toggleMonitor,
    toggleTalkback, discardTake, pushTake, pushingTakeId,
  } = session;

  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('transport');

  const wasRolling = useRef(false);
  useEffect(() => {
    if (wasRolling.current && !rolling) setTab('takes');
    wasRolling.current = rolling;
  }, [rolling]);

  const copyKey = () => {
    navigator.clipboard.writeText(sessionKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

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

      {/* ── Booth channel ──────────────────────────────────────────────── */}
      <section className={`${tab === 'channel' ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col overflow-y-auto border border-border bg-card p-4 lg:flex lg:overflow-visible`}>
        <div className="mb-4 flex items-center gap-2">
          <Mic className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Booth channel</span>
        </div>

        <div className="flex min-h-0 justify-center pb-4 lg:flex-1">
          <LevelMeter level={level} orientation="vertical" responsive label="Input" />
        </div>

        {/* Signal lamp reads the line, not the speakers — it stays lit while
            the monitors are dimmed, which is exactly when it matters most. */}
        <div className="mb-3 flex items-center gap-2 border-t border-border pt-3">
          <span
            className={`h-2 w-2 rounded-full transition-colors ${signalPresent ? 'bg-success' : 'bg-muted'}`}
            style={signalPresent ? { boxShadow: '0 0 8px hsl(var(--success) / 0.7)' } : undefined}
          />
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {signalPresent ? 'Signal' : 'No signal'}
          </span>
        </div>

        <button
          onClick={toggleMonitor}
          disabled={!patched}
          className={`mb-2 inline-flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-xs font-medium transition-colors disabled:opacity-40 ${
            monitorMuted
              ? 'border-destructive/40 bg-destructive/10 text-destructive'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          {monitorMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          {monitorMuted ? 'Monitors dimmed' : 'Monitors on'}
        </button>

        <button
          onClick={toggleTalkback}
          disabled={!patched}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-xs font-medium transition-colors disabled:opacity-40 ${
            talkbackOpen
              ? 'border-primary/50 bg-primary/15 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <Radio className="h-3.5 w-3.5" />
          {talkbackOpen ? 'Talkback open' : 'Talkback'}
        </button>
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground/70">
          Talkback goes to the booth headphones only. It never reaches the take.
        </p>
      </section>

      {/* ── Transport ──────────────────────────────────────────────────── */}
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
          {patched
            ? rolling
              ? 'The booth is recording in sync with you.'
              : 'Rolling here starts the mic in the booth.'
            : 'Waiting for the performer to walk in.'}
        </p>

        {/* The key that gets handed to the performer. */}
        <div className="mt-5 w-full max-w-sm border border-border bg-background/60 p-3 lg:mt-8">
          <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Session code</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground">{sessionKey}</code>
            <button
              onClick={copyKey}
              className="inline-flex flex-none items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground/70">
            Send this to whoever is performing. They paste it to walk into this room.
          </p>
        </div>
      </section>

      {/* ── Take rack ──────────────────────────────────────────────────── */}
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
          emptyHint="Nothing recorded yet. Roll a take and it will appear here as soon as you stop, ready to play back and send to the project when you've picked a favorite."
        />
      </div>
    </div>
  );
}
