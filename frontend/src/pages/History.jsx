import React, { useEffect, useState } from 'react';
import { Clock3, FolderGit2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import VersionHistory from '../components/VersionHistory';

function History({ onLogout }) {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [folderPath, setFolderPath] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:5000/api/auth/me', { credentials: 'include' }).then((response) => response.json()),
      fetch('http://localhost:5000/api/projects', { credentials: 'include' }).then((response) => response.json()),
      fetch('http://localhost:5000/api/projects/collaborated', { credentials: 'include' }).then((response) => response.json()),
    ]).then(([profile, owned, collaborated]) => {
      setUser(profile);
      setProjects([...(owned.projects || []), ...(collaborated.projects || [])]);
    }).catch((error) => console.error('[HISTORY] Could not load projects:', error));
  }, []);

  const openHistory = async (project) => {
    setSelected(project);
    setFolderPath(await window.electronAPI.getFolderPath(project.id));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar onLogout={onLogout} user={user} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <PageHeader eyebrow="Versions" title="Version history" description="Choose a session to review its saved versions." />
        <section className="grid grid-cols-1 gap-3 p-6 md:grid-cols-2 md:p-8 xl:grid-cols-3">
          {projects.length === 0 ? <div className="col-span-full border border-dashed border-border p-10 text-center"><Clock3 className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">No session history is available yet.</p></div> : projects.map((project) => (
            <button key={`${project.isCollaborator ? 'shared' : 'owned'}-${project.id}`} onClick={() => openHistory(project)} className="flex items-center gap-3 border border-border bg-card p-4 text-left transition-colors hover:border-primary/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><FolderGit2 className="h-5 w-5" /></div>
              <div className="min-w-0"><p className="truncate text-sm font-medium">{project.name}</p><p className="mt-1 text-xs text-muted-foreground">{project.isCollaborator ? 'Shared session' : 'My session'} · {project.fileCount || 0} files</p></div>
            </button>
          ))}
        </section>
      </main>
      {selected && createPortal(<div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.9)]"><header className="flex items-center justify-between border-b border-border px-5 py-4"><div><p className="text-[10px] uppercase tracking-[0.2em] text-primary">Version history</p><h2 className="mt-1 text-lg font-semibold">{selected.name}</h2></div><button onClick={() => setSelected(null)} className="p-2 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button></header><div className="history-scrollbar overflow-y-auto px-5 pb-5"><VersionHistory folderPath={folderPath} currentUser={user} /></div></section></div>, document.body)}
    </div>
  );
}

export default History;
