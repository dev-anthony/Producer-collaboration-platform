import React from 'react';

function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="sticky top-0 z-10 bg-background px-6 py-6 shadow-[0_22px_44px_rgba(0,0,0,0.95)] md:px-8">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          {eyebrow && <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">{eyebrow}</p>}
          <h1 className="mt-1.5 truncate text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="flex-none">{action}</div>}
      </div>
    </header>
  );
}

export default PageHeader;
