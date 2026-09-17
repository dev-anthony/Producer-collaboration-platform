import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, Trash2, FolderCheck, HardDrive, Repeat, UploadCloud, Loader2 } from 'lucide-react';
import LiveWaveform from './LiveWaveform';

const clock = (ms) => {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

// The row for the take currently rolling. This is the "literally writing"
// view: a live scrolling strip of the real incoming level plus a running
// clock, standing in for watching a take arrive in a DAW until that
// integration exists. It sits above the finished takes, not among them —
// it is not a take yet, it is one being made.
function LiveTakeRow({ level, elapsedMs, takeNumber }) {
  return (
    <div className="border-b border-destructive/30 bg-destructive/5 px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive"
          style={{ boxShadow: '0 0 6px hsl(var(--destructive))' }}
        />
        <span className="font-mono text-xs font-semibold tracking-wide text-destructive">
          RECORDING TAKE {String(takeNumber).padStart(2, '0')}
        </span>
        <span className="ml-auto font-mono text-[10px] tabular-nums text-destructive">
          {clock(elapsedMs)}
        </span>
      </div>
      <LiveWaveform level={level} height={36} />
    </div>
  );
}

// One take on the rack. Every take gets a real transport — play, pause, scrub,
// loop — because the whole point is that a take stops being a live stream the
// moment it is done and becomes something you can sit with and play back.
function Take({ take, onDiscard, onPush, pushing }) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(take.durationMs / 1000 || 0);
  const [looping, setLooping] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [playError, setPlayError] = useState(false);

  useEffect(() => {
    const element = audio.current;
    if (!element) return undefined;
    const onTime = () => setPosition(element.currentTime);
    const onMeta = () => {
      // A streamed WAV can report Infinity until it is fully buffered; the
      // wall-clock length of the take is the honest fallback.
      if (Number.isFinite(element.duration)) setDuration(element.duration);
    };
    const onEnd = () => { setPlaying(false); setPosition(0); };
    const MEDIA_ERROR_NAMES = { 1: 'ABORTED', 2: 'NETWORK', 3: 'DECODE', 4: 'SRC_NOT_SUPPORTED' };
    const onError = () => {
      const code = element.error?.code;
      console.error(`[RR-PLAYBACK] take ${take.number} failed: ${MEDIA_ERROR_NAMES[code] || code} — ${element.error?.message || 'no message'}`);
      setPlayError(true);
      setPlaying(false);
    };
    element.addEventListener('timeupdate', onTime);
    element.addEventListener('loadedmetadata', onMeta);
    element.addEventListener('ended', onEnd);
    element.addEventListener('error', onError);
    return () => {
      element.removeEventListener('timeupdate', onTime);
      element.removeEventListener('loadedmetadata', onMeta);
      element.removeEventListener('ended', onEnd);
      element.removeEventListener('error', onError);
    };
  }, []);

  const toggle = () => {
    const element = audio.current;
    if (!element) return;
    if (playing) { element.pause(); setPlaying(false); return; }
    setPlayError(false);
    element.play().then(() => setPlaying(true)).catch((error) => {
      console.error(`[RR-PLAYBACK] take ${take.number} play() rejected:`, error);
      setPlaying(false);
      setPlayError(true);
    });
  };

  const scrub = (event) => {
    const element = audio.current;
    if (!element || !duration) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    element.currentTime = ratio * duration;
    setPosition(element.currentTime);
  };

  const progress = duration ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <div className="border-b border-border/60 px-4 py-3 last:border-b-0">
      <div className="mb-2 flex items-center gap-3">
        <span className="font-mono text-xs font-semibold tracking-wide text-foreground">
          TAKE {String(take.number).padStart(2, '0')}
        </span>
        <span
          title={take.pushed ? 'Backed up to the project' : 'Saved on this computer only'}
          className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] ${
            take.pushed
              ? 'bg-success/10 text-success'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {take.pushed ? <FolderCheck className="h-2.5 w-2.5" /> : <HardDrive className="h-2.5 w-2.5" />}
          {take.pushed ? 'Backed up' : 'Not backed up'}
        </span>
        <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground">
          {clock(duration * 1000 || take.durationMs)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          aria-label={playing ? `Pause take ${take.number}` : `Play take ${take.number}`}
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary transition-colors hover:bg-primary/20"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
        </button>

        <button
          type="button"
          onClick={scrub}
          aria-label={`Scrub take ${take.number}`}
          className="group relative h-6 flex-1 cursor-pointer"
        >
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 transition-opacity group-hover:opacity-100"
            style={{ left: `${progress}%` }}
          />
        </button>

        <span className="w-10 flex-none text-right font-mono text-[10px] tabular-nums text-muted-foreground">
          {clock(position * 1000)}
        </span>

        <button
          onClick={() => { setLooping((value) => { const next = !value; if (audio.current) audio.current.loop = next; return next; }); }}
          aria-label="Loop take"
          title="Loop"
          className={`flex h-7 w-7 flex-none items-center justify-center rounded-md border transition-colors ${
            looping ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <Repeat className="h-3 w-3" />
        </button>

        <button
          onClick={() => { setDiscarding(true); Promise.resolve(onDiscard(take)).finally(() => setDiscarding(false)); }}
          disabled={discarding}
          aria-label="Discard take"
          title="Discard take"
          className="flex h-7 w-7 flex-none items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-40"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {playError && (
        <p className="mt-2 text-[10px] text-destructive">This take could not be played back.</p>
      )}

      {/* The deliberate choice: listen, then decide which take is the
          keeper. Pushing is per-take and never automatic. */}
      <button
        onClick={() => onPush(take)}
        disabled={take.pushed || pushing}
        className={`mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-[11px] font-medium transition-colors disabled:cursor-default ${
          take.pushed
            ? 'border-success/30 bg-success/5 text-success disabled:opacity-100'
            : 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 disabled:opacity-50'
        }`}
      >
        {pushing ? (
          <><Loader2 className="h-3 w-3 animate-spin" /> Backing up…</>
        ) : take.pushed ? (
          <><FolderCheck className="h-3 w-3" /> Backed up to the project</>
        ) : (
          <><UploadCloud className="h-3 w-3" /> Use take</>
        )}
      </button>

      <audio ref={audio} src={take.replayUrl} preload="metadata" className="hidden" />
    </div>
  );
}

export default function TakeRack({ takes, onDiscard, onPush, pushingId, recording, level, elapsedMs, liveTakeNumber, emptyHint }) {
  return (
    <div className="flex h-full min-h-0 flex-col border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Take rack</span>
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
          {takes.length} {takes.length === 1 ? 'take' : 'takes'}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto app-scrollbar">
        {recording && <LiveTakeRow level={level} elapsedMs={elapsedMs} takeNumber={liveTakeNumber} />}
        {takes.length === 0 && !recording ? (
          <p className="px-4 py-8 text-center text-xs leading-relaxed text-muted-foreground">
            {emptyHint}
          </p>
        ) : (
          takes.map((take) => (
            <Take
              key={take.id}
              take={take}
              onDiscard={onDiscard}
              onPush={onPush}
              pushing={pushingId === take.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
