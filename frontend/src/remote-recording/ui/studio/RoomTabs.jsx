import React from 'react';

export default function RoomTabs({ tabs, active, onChange }) {
  return (
    <div className="flex flex-none gap-1 border-b border-border bg-card/60 p-1.5 lg:hidden">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[11px] font-semibold transition-colors ${
            active === tab.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <tab.icon className="h-3.5 w-3.5" />
          {tab.label}
          {Boolean(tab.badge) && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {tab.badge}
            </span>
          )}
          {tab.live && (
            <span className="absolute right-2 top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
          )}
        </button>
      ))}
    </div>
  );
}
