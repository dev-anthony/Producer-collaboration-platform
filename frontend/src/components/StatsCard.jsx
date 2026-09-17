import React from 'react';

function StatsCard({ icon, title, value, color = 'primary' }) {
  const colorStyles = {
    primary: 'from-primary/20 to-primary/5 text-primary border-primary/20',
    secondary: 'from-secondary/20 to-secondary/5 text-secondary border-secondary/20',
  };

  return (
    <div className="group border border-border bg-card p-5 transition-colors duration-150 hover:border-primary/40">
      <div className="flex items-start justify-between mb-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-md border ${colorStyles[color].replace(/from-[^ ]+ to-[^ ]+ /, '')}`}>
          {icon}
        </div>
        <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse"></div>
      </div>
      <p className="text-muted-foreground text-sm font-medium mb-1 uppercase tracking-wider">{title}</p>
      <p className="text-4xl font-bold text-foreground tracking-tight">
        {typeof value === 'number' ? value.toLocaleString() : '0'}
      </p>
    </div>
  );
}

export default StatsCard;
