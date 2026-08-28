import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

function ResponsiveShell({ children, onLogout, user }) {
  const [collapsed, setCollapsed] = useState(() => window.localStorage.getItem('prodcollab_sidebar_collapsed') === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      window.localStorage.setItem('prodcollab_sidebar_collapsed', String(!value));
      return !value;
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Pinned Fixed Sidebar */}
      <Sidebar
        onLogout={onLogout}
        user={user}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
        onToggleCollapse={toggleCollapsed}
        onCloseMobile={() => setMobileOpen(false)}
      />
      
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
        />
      )}

      {/* Main Container locked to screen height */}
      <main className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
        {/* Mobile Header Bar */}
        <div className="flex h-14 shrink-0 items-center border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 text-sm font-semibold text-foreground">ProdCollab</span>
        </div>

        {/* Dedicated Scrollable Viewport with Custom Scrollbar */}
        <div className="flex-1 overflow-y-auto app-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}

export default ResponsiveShell;