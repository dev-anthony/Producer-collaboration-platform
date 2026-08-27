
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, FolderGit2, Users, Settings, LogOut, GitBranch, CircleUserRound, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { LogoMark } from "./Logo";

const navItems = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: FolderGit2, label: "Projects", path: "/projects" },
  { icon: Users, label: "Collaborations", path: "/collaboration" },
  { icon: GitBranch, label: "Version history", path: "/history" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const Sidebar = ({ onLogout, user, collapsed = false, mobileOpen = false, onNavigate, onToggleCollapse, onCloseMobile }) => {
  const location = useLocation();

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-none flex-col border-r border-border bg-card shadow-[8px_0_24px_rgba(0,0,0,0.35)] transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'lg:w-16' : 'lg:w-56'}`}>
      {/* Logo */}
      <div className={`flex items-center p-4 ${collapsed ? 'lg:justify-center' : 'justify-between'}`}>
        <Link to="/dashboard" title="ProdCollab" onClick={onNavigate} className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-black transition-colors hover:border-primary/40">
            <LogoMark className="h-6 w-6 text-foreground" />
          </div>
          {!collapsed && <span className="truncate text-base font-semibold tracking-tight text-foreground">ProdCollab</span>}
        </Link>
        <button type="button" onClick={onCloseMobile} aria-label="Close navigation" className="p-2 text-muted-foreground hover:text-foreground lg:hidden"><X className="h-5 w-5" /></button>
      </div>

      <button type="button" onClick={onToggleCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} className="absolute -right-3 top-16 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground lg:flex">
        {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
      </button>

      {/* Navigation */}
      <nav className={`flex-1 p-4 ${collapsed ? 'lg:px-2' : ''}`}>
        <div className="space-y-2">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.label}
                to={item.path}
                title={item.label}
                onClick={onNavigate}
                className={`relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${collapsed ? 'lg:justify-center lg:px-2' : ''} ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                } animate-fade-in`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                {!collapsed && <span className={isActive ? "truncate font-medium text-primary" : "truncate font-medium"}>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className={`w-full p-4 ${collapsed ? 'lg:px-2' : ''}`}>
        {user && (
          <Link to="/profile" title="Profile" onClick={onNavigate} className={`relative mb-3 flex items-center gap-3 transition-colors hover:text-primary ${collapsed ? 'lg:justify-center' : ''}`}>
            {user.avatar_url ? <img src={user.avatar_url} alt="Avatar" className="h-9 w-9 rounded-full" /> : <CircleUserRound className="h-9 w-9 text-muted-foreground" />}
            <div className="absolute bottom-0 right-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-success" />
            {!collapsed && <span className="min-w-0 truncate text-xs text-muted-foreground">{user.username || user.email}</span>}
          </Link>
        )}
        <button
          onClick={onLogout}
          title="Log out"
          className={`flex w-full items-center gap-3 rounded-md p-2 text-sm text-muted-foreground transition-colors hover:text-destructive ${collapsed ? 'lg:justify-center' : ''}`}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
