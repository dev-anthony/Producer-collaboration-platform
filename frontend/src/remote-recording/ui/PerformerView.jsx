import React from 'react';

export default function PerformerView({ onStart, onStop, recording }) {
  return <div className="space-y-4"><button onClick={recording ? onStop : onStart} className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/85">
      {recording ? 'Stop take' : 'Record take'}
    </button></div>;
}
