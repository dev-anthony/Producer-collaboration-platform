import React from 'react';
import { Gauge, Music2, Radio, Timer } from 'lucide-react';

function ProjectMetadata({ metadata = {}, compact = false }) {
  const values = [
    metadata.bpm && { icon: Gauge, label: `${metadata.bpm} BPM` },
    metadata.key && { icon: Music2, label: metadata.key },
    metadata.timeSignature && { icon: Timer, label: metadata.timeSignature },
    metadata.sampleRate && { icon: Radio, label: `${Number(metadata.sampleRate) / 1000} kHz` },
  ].filter(Boolean);

  if (values.length === 0) return <p className="text-xs text-muted-foreground">Session details not added yet.</p>;

  return (
    <div className={`grid gap-1.5 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
      {values.map(({ icon: Icon, label }) => (
        <div key={label} className="flex min-w-0 items-center gap-1.5 border border-border/60 bg-background/50 px-2 py-1.5 text-[11px] text-muted-foreground">
          <Icon className="h-3 w-3 flex-none text-primary" />
          <span className="truncate">{label}</span>
        </div>
      ))}
    </div>
  );
}

export default ProjectMetadata;
