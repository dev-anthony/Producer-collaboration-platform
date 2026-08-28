import React, { useState, useEffect } from 'react';
import { LogoLockup, LogoMark, LogoSlogan } from './Logo';

const DEFAULT_DESCRIPTIONS = [
  "Keep your flow state intact. Work directly inside your favorite DAW while ProdCollab syncs stems, presets, and project files seamlessly in the background.",
  "Collaborate in real time. Receive instant alerts the moment your team drops a new track or revision, and bring their updates into your session with one click.",
  "Never lose a mix direction. Explore session history, review arrangement changes, and restore earlier project versions with total peace of mind.",
  "Eliminate file-sharing chaos. Smart protection prevents accidental overwrites and duplicate audio files, so you can focus strictly on producing."
];

function AuthLayout({ title = "WELCOME BACK", descriptions = DEFAULT_DESCRIPTIONS, children }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animState, setAnimState] = useState('active');

  useEffect(() => {
    if (!descriptions || descriptions.length <= 1) return;

    const interval = setInterval(() => {
      setAnimState('exiting');

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % descriptions.length);
        setAnimState('entering');

        setTimeout(() => {
          setAnimState('active');
        }, 40);
      }, 500);
    }, 4500);

    return () => clearInterval(interval);
  }, [descriptions]);

  const currentDescription = descriptions[currentIndex] || DEFAULT_DESCRIPTIONS[0];

  const getAnimClass = () => {
    switch (animState) {
      case 'exiting':
        return '-translate-x-12 opacity-0 transition-all duration-500 ease-in-out';
      case 'entering':
        return 'translate-x-12 opacity-0 transition-none';
      case 'active':
      default:
        return 'translate-x-0 opacity-100 transition-all duration-500 ease-in-out';
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2 overflow-hidden">
      {/* Left Branding Section */}
      <section className="relative hidden min-h-screen flex-col justify-between border-r border-border bg-muted/10 p-8 xl:p-14 lg:flex overflow-hidden">
        <div className="z-20">
          <LogoLockup size={32} className="text-foreground" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center my-auto px-4 max-w-lg mx-auto w-full">
          <LogoMark 
            className="h-20 text-foreground opacity-95 transition-transform duration-700 hover:scale-105 mb-2" 
          />
          <LogoSlogan className="h-8 w-1/2 mb-8" />

          <h1 className="text-3xl font-bold tracking-tight text-foreground xl:text-4xl">
            {title}
          </h1>

          <div className="mt-4 min-h-[90px] w-full flex flex-col items-center justify-start overflow-hidden">
            <p className={`text-sm leading-relaxed text-muted-foreground xl:text-base max-w-md transform ${getAnimClass()}`}>
              {currentDescription}
            </p>
          </div>
        </div>

        <div className="z-20 text-[10px] tracking-wider text-muted-foreground uppercase">
          © ProdCollab 2026. All rights reserved.
        </div>
      </section>

      {/* Right Form Section with Custom Scrollbar */}
      <section className="relative flex max-h-screen flex-col justify-center overflow-y-auto app-scrollbar px-6 py-10 sm:px-12 lg:px-20">
        <div className="absolute left-6 top-6 lg:hidden">
          <LogoLockup size={32} className="text-foreground" />
        </div>

        <div className="mx-auto w-full max-w-sm my-auto">
          {children}
        </div>
      </section>
    </div>
  );
}

export default AuthLayout;