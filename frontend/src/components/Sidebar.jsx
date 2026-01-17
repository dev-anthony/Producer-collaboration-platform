

//ui redesign
import React from "react";
import { Home, FolderGit2, Users, Settings, LogOut, Music } from "lucide-react";
import AudioWaveform from "./AudioWaveform";

const navItems = [
  { icon: Home, label: "Dashboard", active: true },
  { icon: FolderGit2, label: "Projects", active: false },
  { icon: Users, label: "Collaborations", active: false },
  { icon: Settings, label: "Settings", active: false },
];

const Sidebar = ({ onLogout, user }) => {
  return (
    <div className="w-64 glass-strong border-r border-white/5 flex flex-col animate-slide-in-left">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-neon-pink flex items-center justify-center hover:scale-105 hover:rotate-6 transition-all duration-300 cursor-pointer">
            <Music className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <span className="text-xl font-bold gradient-text">ProdCollab</span>
            <AudioWaveform barCount={5} className="h-3 mt-1" />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navItems.map((item, index) => (
            <a
              key={item.label}
              href="#"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:translate-x-1 ${
                item.active
                  ? "bg-primary/20 text-foreground border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              } animate-fade-in`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <item.icon className={`w-5 h-5 ${item.active ? "text-primary" : ""}`} />
              <span className="font-medium">{item.label}</span>
              {item.active && (
                <div className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}
            </a>
          ))}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-white/5">
        {user && (
          <div className="glass rounded-xl p-4 mb-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={user.avatar_url}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full ring-2 ring-primary/50"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-medium text-sm truncate">
                  {user.login || user.username}
                </p>
                <p className="text-muted-foreground text-xs truncate">
                  {user.email || "Producer"}
                </p>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all duration-300 border border-transparent hover:border-destructive/30 hover:scale-105 active:scale-95"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;