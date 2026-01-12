import React from "react";

const AudioWaveform = ({ barCount = 5, className = "" }) => {
  return (
    <div className={`flex items-end gap-0.5 ${className}`}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-gradient-to-t from-primary to-neon-pink rounded-full animate-wave"
          style={{
            height: `${30 + Math.random() * 70}%`,
            animationDelay: `${i * 100}ms`,
          }}
        />
      ))}
    </div>
  );
};

export default AudioWaveform;