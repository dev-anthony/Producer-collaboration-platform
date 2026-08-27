import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { LogoLockup } from './Logo';

function AuthLayout({ login, onSecondaryAction, children }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="hidden min-h-screen flex-col border-r border-border px-8 py-8 lg:flex xl:px-14">
        <LogoLockup size={52} className="text-foreground" />
        <div className="mt-auto max-w-xl pb-12 xl:pb-20">
          <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.24em] text-primary">ProdCollab</p>
          <h1 className="max-w-lg text-4xl font-semibold leading-tight text-foreground xl:text-5xl">A studio-grade collaboration layer between your DAW and your collaborators.</h1>
          <div className="mt-8 h-px w-20 bg-primary" />
        </div>
      </section>
      <section className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-8 sm:py-10">
        <div className="w-full max-w-xl">
          <div className="mb-6 flex items-center justify-between gap-4 sm:mb-8">
            <LogoLockup size={38} className="text-foreground lg:hidden" />
            <span className="hidden flex-1 lg:block" />
            <button type="button" onClick={onSecondaryAction} className="inline-flex flex-none items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary">
              {login ? 'Create account' : 'Log in'} <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          <div className="border border-border bg-card p-5 sm:p-8 lg:p-10">{children}</div>
        </div>
      </section>
    </div>
  );
}

export default AuthLayout;
