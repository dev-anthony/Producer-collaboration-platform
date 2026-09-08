import React from 'react';

export default function PerformerView({ devices, selectedDevice, onDeviceChange, onStart, onStop, recording }) {
  return <div className="space-y-4">
    <label className="block text-xs text-muted-foreground">Recording input
      <select value={selectedDevice} onChange={(event) => onDeviceChange(Number(event.target.value))} className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
        <option value={-1}>System default</option>
        {devices.map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
      </select>
    </label>
    <button onClick={recording ? onStop : onStart} className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/85">
      {recording ? 'Stop take' : 'Record take'}
    </button>
  </div>;
}
