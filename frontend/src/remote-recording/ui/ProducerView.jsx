import React from 'react';

export default function ProducerView({ sessionId, onStart, onStop, recording }) {
  return <div className="space-y-4">
    <div className="border border-border bg-background/50 p-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-primary">Invite performer</p>
      <code className="mt-2 block break-all text-xs text-foreground">{sessionId}</code>
    </div>
    <button onClick={recording ? onStop : onStart} className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/85">
      {recording ? 'Stop take' : 'Record performer'}
    </button>
  </div>;
}
