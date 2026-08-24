import React from 'react';

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[UI] Unhandled renderer error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <section className="w-full max-w-md border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold">ProdCollab needs a restart</h1>
          <p className="mt-3 text-sm text-muted-foreground">Your project files are safe. Restart the app to continue.</p>
          <button onClick={() => window.location.reload()} className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Restart view</button>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
