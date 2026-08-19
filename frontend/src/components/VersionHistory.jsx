import React, { useEffect, useState } from 'react';
import { Clock3, Loader2, RotateCcw } from 'lucide-react';

function VersionHistory({ folderPath, currentUser, onRestored }) {
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);
  const [message, setMessage] = useState(null);

  const loadHistory = async () => {
    if (!folderPath) return;
    setLoading(true);
    try {
      const result = await window.electronAPI.gitLog({ folderPath });
      if (!result.success) throw new Error(result.error || 'History unavailable');
      setCommits(result.log || []);
    } catch (error) {
      console.error('[HISTORY] Could not load history:', error);
      setMessage('Version history is unavailable for this folder.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, [folderPath]);

  const restoreCommit = async (commit) => {
    if (!confirm(`Restore the project to "${commit.message}"? Your current local files must be committed first.`)) return;
    setRestoring(commit.hash);
    try {
      const profileResponse = await fetch('http://localhost:5000/api/auth/me', { credentials: 'include' });
      const profile = profileResponse.ok ? await profileResponse.json() : {};
      const result = await window.electronAPI.gitRestore({
        folderPath,
        commitSha: commit.hash,
        username: profile.username,
        email: profile.email
      });
      if (!result.success) {
        setMessage(result.code === 'LOCAL_CHANGES_PENDING'
          ? 'Commit or push your current local changes before restoring a version.'
          : 'This version could not be restored.');
        return;
      }
      setMessage(result.nothingToRestore ? 'The project is already at that version.' : 'Version restored locally. Review it before pushing.');
      onRestored?.();
      await loadHistory();
    } catch (error) {
      console.error('[HISTORY] Restore failed:', error);
      setMessage('This version could not be restored.');
    } finally {
      setRestoring(null);
    }
  };

  if (loading) return <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading history...</div>;
  return (
    <div className="mt-4 border-t border-border/60 pt-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Clock3 className="h-4 w-4 text-primary" /> Version history</div>
      {message && <p className="mb-3 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">{message}</p>}
      {commits.length === 0 ? <p className="text-xs text-muted-foreground">No commits yet.</p> : <div className="space-y-2">
        {commits.map((commit) => <div key={commit.hash} className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/30 p-3">
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-foreground">{commit.message}</p><p className="mt-1 text-[11px] text-muted-foreground">{commit.author_email === currentUser?.email ? 'You' : commit.author_name} · {new Date(commit.date).toLocaleString()}</p>{commit.changedFiles?.length > 0 && <p className="mt-1 truncate text-[10px] text-muted-foreground/70">{commit.changedFiles.slice(0, 3).join(', ')}{commit.changedFiles.length > 3 ? ` +${commit.changedFiles.length - 3} more` : ''}</p>}</div>
          <button onClick={() => restoreCommit(commit)} disabled={restoring === commit.hash} className="inline-flex flex-none items-center gap-1 rounded-md border border-primary/30 px-2 py-1.5 text-[11px] text-primary hover:bg-primary/10 disabled:opacity-50">{restoring === commit.hash ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />} Restore</button>
        </div>)}
      </div>}
    </div>
  );
}

export default VersionHistory;
