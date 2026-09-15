import React from 'react';

export default function ProducerView({ sessionId, onStart, onStop, recording, monitorPaused, onToggleMonitor, talkbackActive, onToggleTalkback, takes, onDeleteTake }) {
  return (
    <div className="space-y-4">
      <div className="border border-border bg-background/50 p-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-primary">Invite performer</p>
        <code className="mt-2 block break-all text-xs text-foreground">{sessionId}</code>
      </div>
      <button onClick={recording ? onStop : onStart} className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/85">
        {recording ? 'Stop take' : 'Record performer'}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onToggleMonitor} className="border border-border px-3 py-2 text-xs text-muted-foreground">{monitorPaused ? 'Resume monitor' : 'Pause monitor'}</button>
        <button onClick={onToggleTalkback} className="border border-primary/30 px-3 py-2 text-xs text-primary">{talkbackActive ? 'Stop talkback' : 'Talkback'}</button>
      </div>
      {takes.map((take) => (
        <div key={`${take.number}-${take.path}`} className="border-t border-border pt-3">
          <div className="mb-2 flex items-center gap-2"><span className="flex-1 text-xs text-muted-foreground">Take {take.number}</span><button onClick={() => onDeleteTake(take)} className="text-xs text-destructive">Delete</button></div>
          <audio controls src={take.replayUrl} className="w-full" />
        </div>
      ))}
    </div>
  );
}
