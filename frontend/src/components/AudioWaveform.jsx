import React from "react";

const AudioWaveform = ({ barCount = 5, className = "" }) => {
  return (
    <div className={`flex items-end gap-0.5 ${className}`}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-primary animate-wave"
          style={{
             height: `${35 + ((i * 23) % 60)}%`,
            animationDelay: `${i * 100}ms`,
          }}
        />
      ))}
    </div>
  );
};

export default AudioWaveform;
