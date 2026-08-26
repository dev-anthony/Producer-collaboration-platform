
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, FolderGit2, Users, Settings, LogOut, GitBranch, CircleUserRound } from "lucide-react";
import { LogoMark } from "./Logo";

const navItems = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: FolderGit2, label: "Projects", path: "/projects" },
  { icon: Users, label: "Collaborations", path: "/collaboration" },
  { icon: GitBranch, label: "Version history", path: "/history" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const Sidebar = ({ onLogout, user }) => {
  const location = useLocation();

  return (
    <div className="w-56 bg-card/40 border-r border-border shadow-[8px_0_24px_rgba(0,0,0,0.35)] flex flex-col animate-slide-in-left">
      {/* Logo */}
      <div className="p-4">
        <Link to="/dashboard" title="ProdCollab" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-black transition-colors hover:border-primary/40">
            <LogoMark className="h-6 w-6 text-foreground" />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">ProdCollab</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.label}
                to={item.path}
                title={item.label}
                className={`relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                } animate-fade-in`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className={isActive ? "font-medium text-primary" : "font-medium"}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="w-full p-4">
        {user && (
          <Link to="/profile" title="Profile" className="relative mb-3 flex items-center gap-3 transition-colors hover:text-primary">
            {user.avatar_url ? <img src={user.avatar_url} alt="Avatar" className="h-9 w-9 rounded-full" /> : <CircleUserRound className="h-9 w-9 text-muted-foreground" />}
            <div className="absolute bottom-0 right-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-success" />
            <span className="min-w-0 truncate text-xs text-muted-foreground">{user.username || user.email}</span>
          </Link>
        )}
        <button
          onClick={onLogout}
          title="Log out"
          className="flex w-full items-center gap-3 rounded-md p-2 text-sm text-muted-foreground transition-colors hover:text-destructive"
        >
          <LogOut className="w-5 h-5" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
