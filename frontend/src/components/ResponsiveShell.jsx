import React, { useEffect, useState } from 'react';
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { LogoMark } from './Logo';
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
      {/* Fixed Sidebar for Desktop / Drawer for Mobile */}
      <Sidebar
        onLogout={onLogout}
        user={user}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
        onToggleCollapse={toggleCollapsed}
        onCloseMobile={() => setMobileOpen(false)}
      />
      
      {/* Mobile Drawer Overlay Backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
        />
      )}

      {/* Main Container */}
      <main className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
        {/* Mobile Header Bar */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center">
              <LogoMark className="h-6 w-6 text-foreground" />
            </div>
            <span className="text-base font-semibold tracking-tight text-foreground">ProdCollab</span>
          </div>

          <button
            type="button"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {mobileOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeftOpen className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Scrollable Main Viewport */}
        <div className="flex-1 overflow-y-auto app-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}

export default ResponsiveShell;