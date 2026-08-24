import React from "react";

import AudioWaveform from "./AudioWaveform";

const LoadingSpinner = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {/* Background glow effects */}
      <div className="relative z-10 text-center animate-fade-in">
        {/* Logo spinner */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-spin-slow" />
          <div className="absolute inset-2 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin-reverse" />
          <div className="absolute inset-4 rounded-md bg-primary flex items-center justify-center">
            <AudioWaveform barCount={3} className="h-6" />
          </div>
        </div>

        <p className="text-xl text-foreground font-medium animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
