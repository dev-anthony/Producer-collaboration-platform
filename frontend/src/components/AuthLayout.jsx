import React from 'react';
import { LogoLockup } from './Logo';

function AuthLayout({ children }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Left Section - Minimal Graphic/Logo Area */}
      <section className="relative hidden min-h-screen flex-col overflow-hidden border-r border-border bg-muted/10 lg:flex">
        {/* Top Left Logo */}
        <div className="absolute left-8 top-8 z-20 xl:left-14 xl:top-10">
          <LogoLockup size={32} className="text-foreground" />
        </div>

        {/* Center ProdCollab Symbol (Replaced the cross lines with a clean wave/studio symbol) */}
        <div className="relative z-10 flex flex-1 items-center justify-center">
          <div className="text-foreground/80">
            {/* You can swap this SVG out for your actual ProdCollab symbol */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-40 w-40 transition-transform duration-700 hover:scale-105 xl:h-52 xl:w-52">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h3l3 -9 6 18 3 -9h3" />
            </svg>
          </div>
        </div>

        {/* Bottom Left Copyright/Credits */}
        <div className="absolute bottom-8 left-8 z-20 text-[10px] text-muted-foreground xl:left-14">
          © ProdCollab 2026. All rights reserved.
        </div>
      </section>

      {/* Right Section - Form Content (Compact & No Card) */}
      <section className="relative flex min-h-screen flex-col justify-center px-6 py-10 sm:px-12 lg:px-20">
        {/* Mobile Header Logo */}
        <div className="absolute left-6 top-6 lg:hidden">
          <LogoLockup size={32} className="text-foreground" />
        </div>

        {/* max-w-sm mx-auto centers the form and keeps the width contained/traditional */}
        <div className="mx-auto w-full max-w-sm">
          {children}
        </div>
      </section>
    </div>
  );
}

export default AuthLayout;