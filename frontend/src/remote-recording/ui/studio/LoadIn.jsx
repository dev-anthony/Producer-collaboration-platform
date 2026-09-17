import React, { useState } from 'react';
import { Loader2, Mic, SlidersHorizontal, User } from 'lucide-react';

export default function LoadIn({ session }) {
  const { ready, patching, fault, loadIn, projectName } = session;
  const [key, setKey] = useState('');

  const blocked = !ready || patching;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center py-4">
        <div className="mb-6 text-center sm:mb-10">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {projectName ? `${projectName} session` : 'Session'}
          </p>
          <h1 className="mt-3 text-xl font-semibold text-foreground sm:text-2xl">The room is cold</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick your side of the glass to patch in.
          </p>
        </div>

        <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4">
          {/* ── Control room ─────────────────────────────────────────────── */}
          <section className="flex flex-col border border-border bg-card p-5 sm:p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-border bg-background/60 text-muted-foreground">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Take the desk</h2>
            <p className="mt-1.5 text-[10px] uppercase tracking-[0.18em] text-primary">Control room</p>
            <p className="mt-3 flex-1 text-xs leading-relaxed text-muted-foreground">
              Open the room and get a code to share with your performer. You will hear
              them live, start and stop each take, talk to them between takes, and keep
              a backup recording of everything that comes through.
            </p>
            <button
              onClick={() => loadIn('producer')}
              disabled={blocked}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-40"
            >
              {patching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Open the room
            </button>
          </section>

          {/* The glass — a vertical pane between two side-by-side cards from
              md up, and the same idea laid on its side between two stacked
              cards below that, rather than just disappearing. Either way it
              reads as one continuous piece of glass, not a rule that was
              turned off for small screens. */}
          <div className="hidden flex-col items-center justify-center md:flex">
            <div className="h-full w-px bg-gradient-to-b from-transparent via-border to-transparent" />
            <span className="my-4 whitespace-nowrap text-[9px] uppercase tracking-[0.25em] text-muted-foreground/50">
              the glass
            </span>
            <div className="h-full w-px bg-gradient-to-b from-transparent via-border to-transparent" />
          </div>
          <div className="flex items-center justify-center py-3 md:hidden">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            <span className="mx-4 whitespace-nowrap text-[9px] uppercase tracking-[0.25em] text-muted-foreground/50">
              the glass
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          {/* ── Live room ────────────────────────────────────────────────── */}
          <section className="flex flex-col border border-border bg-card p-5 sm:p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-border bg-background/60 text-muted-foreground">
              <Mic className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Step into the booth</h2>
            <p className="mt-1.5 text-[10px] uppercase tracking-[0.18em] text-primary">Live room</p>
            <p className="mt-3 flex-1 text-xs leading-relaxed text-muted-foreground">
              Your microphone turns on and your take is recorded on your own computer
              in full quality. What the producer hears is only for monitoring. They
              start and stop each take, and you'll see it happen on your screen.
              Enter the code they sent you.
            </p>
            <input
              value={key}
              onChange={(event) => setKey(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && key.trim() && !blocked) loadIn('performer', { sessionKey: key }); }}
              placeholder="Session code"
              disabled={blocked}
              className="mt-6 w-full rounded-md border border-border bg-input px-3 py-2.5 font-mono text-xs text-foreground outline-none transition-colors placeholder:font-sans placeholder:text-muted-foreground focus:border-primary/50 disabled:opacity-40"
            />
            <button
              onClick={() => loadIn('performer', { sessionKey: key })}
              disabled={blocked || !key.trim()}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-40"
            >
              {patching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Walk in
            </button>
          </section>
        </div>

        {/* Recording by yourself is not a smaller version of a session — it
            is the honest case for a performer running their own transport.
            It gets its own room rather than being folded into either side of
            the glass above. */}
        <div className="mt-4 flex flex-col items-start gap-3 border border-border bg-card/60 px-5 py-4 sm:flex-row sm:items-center">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md border border-border bg-background/60 text-muted-foreground">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">Recording by yourself?</p>
            <p className="text-[11px] text-muted-foreground">
              No one else needs to join. Record on your own, listen back, and send your best take to the project.
            </p>
          </div>
          <button
            onClick={() => loadIn('solo')}
            disabled={blocked}
            className="inline-flex w-full flex-none items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-40 sm:w-auto"
          >
            {patching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Start a solo session
          </button>
        </div>

        {!ready && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Getting your studio ready…
          </p>
        )}
        {fault && (
          <p className="mt-6 text-center text-xs text-destructive">{fault}</p>
        )}
      </div>
    </div>
  );
}
