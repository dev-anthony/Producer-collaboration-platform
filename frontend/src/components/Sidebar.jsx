
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, FolderGit2, Users, Settings, LogOut, Music, GitBranch, CircleUserRound } from "lucide-react";

const navItems = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: FolderGit2, label: "Projects", path: "/projects" },
  { icon: Users, label: "Collaborations", path: "/collaboration" },
  { icon: GitBranch, label: "Version history", path: "/projects" },
];

const Sidebar = ({ onLogout, user }) => {
  const location = useLocation();

  return (
    <div className="w-56 bg-background flex flex-col animate-slide-in-left">
      {/* Logo */}
      <div className="p-4">
        <Link to="/dashboard" title="ProdCollab" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center transition-colors hover:bg-primary/85">
            <Music className="w-6 h-6 text-primary-foreground" />
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
          <div title={user.username || user.email} className="relative mb-3 flex items-center gap-3">
            {user.avatar_url ? <img src={user.avatar_url} alt="Avatar" className="h-9 w-9 rounded-full" /> : <CircleUserRound className="h-9 w-9 text-muted-foreground" />}
            <div className="absolute bottom-0 right-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-success" />
            <span className="min-w-0 truncate text-xs text-muted-foreground">{user.username || user.email}</span>
          </div>
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
