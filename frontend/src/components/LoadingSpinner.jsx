import React from 'react';
import { Loader2 } from 'lucide-react';
import { LogoMark } from './Logo';

const LoadingSpinner = () => (
  <div className="flex min-h-screen items-center justify-center bg-background px-6">
    <div className="flex w-full max-w-xs flex-col items-center text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-md border border-border bg-black">
        <LogoMark className="h-9 w-9 text-foreground" />
      </div>
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Preparing your studio
      </p>
      <div className="mt-4 h-0.5 w-full overflow-hidden bg-muted">
        <div className="h-full w-1/3 animate-pulse bg-primary" />
      </div>
    </div>
  </div>
);

export default LoadingSpinner;
