
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
    <div className="w-16 bg-background border-r border-border flex flex-col items-center animate-slide-in-left">
      {/* Logo */}
      <div className="p-3 border-b border-border">
        <Link to="/dashboard" title="ProdCollab" className="flex items-center justify-center">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center transition-colors hover:bg-primary/85">
            <Music className="w-6 h-6 text-primary-foreground" />
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <div className="space-y-2">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.label}
                to={item.path}
                title={item.label}
                className={`relative flex items-center justify-center p-3 rounded-md transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                } animate-fade-in`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                {isActive && (
                  <div className="absolute left-0 h-5 w-0.5 rounded-r bg-primary" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="w-full p-3 border-t border-border">
        {user && (
          <div title={user.username || user.email} className="relative mb-3 flex justify-center">
            {user.avatar_url ? <img src={user.avatar_url} alt="Avatar" className="h-9 w-9 rounded-full" /> : <CircleUserRound className="h-9 w-9 text-muted-foreground" />}
            <div className="absolute bottom-0 right-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-success" />
          </div>
        )}
        <button
          onClick={onLogout}
          title="Log out"
          className="flex w-full items-center justify-center rounded-md p-3 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
