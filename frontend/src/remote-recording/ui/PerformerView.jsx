import React from 'react';

export default function PerformerView({ onStart, onStop, recording, talkbackActive, onToggleTalkback }) {
  return <div className="space-y-4">
    <button onClick={recording ? onStop : onStart} className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/85">
      {recording ? 'Stop take' : 'Record take'}
    </button>
    <button onClick={onToggleTalkback} className="w-full border border-primary/30 px-3 py-2 text-xs text-primary">
      {talkbackActive ? 'Stop talkback' : 'Talkback'}
    </button>
  </div>;
}
