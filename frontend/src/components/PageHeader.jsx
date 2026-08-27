import React from 'react';

function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="sticky top-0 z-10 bg-background px-4 py-5 shadow-[0_22px_44px_rgba(0,0,0,0.95)] sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">{eyebrow}</p>}
          <h1 className="mt-1.5 truncate text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="w-full flex-none sm:w-auto">{action}</div>}
      </div>
    </header>
  );
}

export default PageHeader;
