import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = () => (
  <div className="flex min-h-screen items-center justify-center bg-background px-6">
    <div className="flex w-full max-w-xs flex-col items-center text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center border border-primary/30 bg-primary/10">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
      <p className="text-sm font-medium text-foreground">Preparing your studio</p>
      <div className="mt-4 h-0.5 w-full overflow-hidden bg-muted">
        <div className="h-full w-1/3 animate-pulse bg-primary" />
      </div>
    </div>
  </div>
);

export default LoadingSpinner;
