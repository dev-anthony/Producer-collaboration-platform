import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Music2, Search, X } from 'lucide-react';

export default function LiveRecordPicker({ projects, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter((project) => (project.name || '').toLowerCase().includes(term));
  }, [projects, query]);

  const openStudio = (project) => {
    navigate(`/studio/${project.id}`, { state: { projectName: project.repo_name || project.name } });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-fade-in-up"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.9)]">
        <div className="flex items-center justify-between gap-3 border-b border-border p-5">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 text-primary">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Start recording</h3>
              <p className="text-xs text-muted-foreground">Choose which project this session is for.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {projects.length > 5 && (
          <div className="border-b border-border px-5 py-3">
            <div className="flex items-center gap-2 rounded-md border border-border bg-input px-3 py-2">
              <Search className="h-3.5 w-3.5 flex-none text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search projects"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto app-scrollbar">
          {filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              {projects.length === 0 ? 'Create a project first, then come back to record.' : 'No projects match that search.'}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((project) => (
                <button
                  key={project.id}
                  onClick={() => openStudio(project)}
                  className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-background/60"
                >
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md border border-border bg-background/60 text-muted-foreground">
                    <Music2 className="h-4 w-4" />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{project.name}</span>
                  <Mic className="h-3.5 w-3.5 flex-none text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
