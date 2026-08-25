
import React, { useEffect, useState } from 'react';
import Toast from './Toast'
import {
  Music2,
  Trash2,
  Upload,
  AlertTriangle,
  RefreshCw,
  Share2,
  Copy,
  Check,
  Download,
  X,
  Users,
  CheckCircle2,
  CircleDashed,
  Loader2,
  Clock3
} from 'lucide-react';
import VersionHistory from './VersionHistory';
import ProjectMetadata from './ProjectMetadata';
import { createPortal } from 'react-dom';
// ── Phase 4.15: session via httpOnly cookie; jwtToken prop no longer used ──
function ProjectCard({
  project,
  hasUnpushedChanges = false,
  onDelete,
  onPushChanges,
  isCollaborator = false,
  currentUser
}) {
  // Phase 6.7: isChecking state kept for the (removed) check button — no longer used
  const [isChecking, setIsChecking] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadingShare, setLoadingShare] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [toast, setToast] = useState(null);
  // Phase 6.10: sync status — 'idle' | 'pushing' | 'failed'
  const [pushState, setPushState] = useState('idle');
  const [remoteChangesAvailable, setRemoteChangesAvailable] = useState(
    () => Boolean(window.localStorage.getItem(`prodcollab_remote_ahead_${project.id}`))
  );
  const [folderPath, setFolderPath] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [resolvingConflict, setResolvingConflict] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showConflictReview, setShowConflictReview] = useState(false);

  const loadConflicts = async () => {
    if (!window.electronAPI?.getProjectConflicts) return;
    const linkedFolder = await window.electronAPI.getFolderPath(project.id);
    setFolderPath(linkedFolder);
    if (!linkedFolder) {
      setConflicts([]);
      return;
    }
    setConflicts(await window.electronAPI.getProjectConflicts(linkedFolder));
  };

  useEffect(() => {
    loadConflicts().catch((error) => console.error('[CONFLICT] Could not load conflicts:', error));
  }, [project.id]);

  useEffect(() => {
    if (!showHistory) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setShowHistory(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showHistory]);

  useEffect(() => {
    const handleRemoteChange = (event) => {
      if (String(event.detail?.id) === String(project.id)) setRemoteChangesAvailable(true);
    };
    const handleRemoteSynced = (event) => {
      if (String(event.detail?.id) === String(project.id)) {
        setRemoteChangesAvailable(false);
        loadConflicts().catch((error) => console.error('[CONFLICT] Could not refresh conflicts:', error));
      }
    };
    window.addEventListener('prodcollab:remote-change', handleRemoteChange);
    window.addEventListener('prodcollab:remote-synced', handleRemoteSynced);
    return () => {
      window.removeEventListener('prodcollab:remote-change', handleRemoteChange);
      window.removeEventListener('prodcollab:remote-synced', handleRemoteSynced);
    };
  }, [project.id]);

  const resolveConflict = async (conflict, action) => {
    if (!folderPath) return;
    setResolvingConflict(conflict.preservedPath);
    try {
      const result = await window.electronAPI.resolveProjectConflict({
        projectId: project.id,
        folderPath,
        preservedPath: conflict.preservedPath,
        action
      });
      if (!result.success) throw new Error(result.code || 'RESOLUTION_FAILED');
      setConflicts((current) => current.filter((item) => item.preservedPath !== conflict.preservedPath));
      const messages = {
        'use-remote': 'Remote version kept. The local conflict copy was removed.',
        'keep-both': 'Both versions kept. The local copy can be included in your next push.',
        'use-local': 'Local version selected. It is now ready to replace the shared version on your next push.'
      };
      setToast({ type: 'success', message: messages[action] });
    } catch (error) {
      console.error('[CONFLICT] Resolution failed:', error);
      setToast({ type: 'error', message: 'We could not apply that choice. Your files have not been changed.' });
    } finally {
      setResolvingConflict(null);
    }
  };

  // Phase 6.10: wrap the parent push handler so we can show a "Pushing…" state
  const handlePushClick = async () => {
    setPushState('pushing');
    try {
      await onPushChanges?.();
      setPushState('idle');
    } catch (err) {
      console.error('[PUSH] failed:', err);
      setPushState('failed');
    }
  };
  const formatUpdatedAt = (value) => {
    if (!value) return 'Just now';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Just now';
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return days < 7 ? `${days}d ago` : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Phase 6.7/6.8: "Check for changes" removed — auto-push handles syncing.
  // const handleCheckForChanges = async () => {
  //   setIsChecking(true);
  //   try {
  //     await onCheckChanges(project.id);
  //   } finally {
  //     setIsChecking(false);
  //   }
  // };

  const handleGenerateShareLink = async () => {
    setLoadingShare(true);
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${project.id}/share`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setShareLink(data.shareLink);
        setShowShareModal(true);
      } else {
        // alert(data.error || 'Failed to generate share link');
        setToast({ type: 'error', message: data.error || 'Failed to generate share link' });
      }
    } catch (error) {
      // console.error('Error generating share link:', error);
      // alert('Failed to generate share link');
       setToast({ type: 'error', message:'Failed to generate share link' });
      
    } finally {
      setLoadingShare(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      if (window.electronAPI?.copyText) {
        await window.electronAPI.copyText(shareLink);
      } else if (navigator.clipboard?.writeText && document.hasFocus()) {
        await navigator.clipboard.writeText(shareLink);
      } else {
        const input = document.createElement('textarea');
        input.value = shareLink;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        if (!document.execCommand('copy')) throw new Error('Clipboard copy failed');
        input.remove();
      }
      setCopied(true);
      setToast({ type: 'success', message: 'Invitation link copied to clipboard.' });
      setTimeout(() => {
        setCopied(false);
        setShowShareModal(false);
      }, 900);
    } catch (error) {
      setToast({ type: 'error', message: 'Unable to copy the share link. Select and copy it manually.' });
    }
  };

  const handlePullFiles = async () => {
    setIsPulling(true);

    try {
      const projectId = project.id;
      const infoResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/pull-info`, {
        credentials: 'include'
      });
      const pullInfo = await infoResponse.json();
      if (!infoResponse.ok) throw new Error(pullInfo.error || 'Could not get pull details');

      let folderPath = await window.electronAPI.getFolderPath(projectId);
      if (!folderPath && window.electronAPI?.findProjectFolder) {
        folderPath = await window.electronAPI.findProjectFolder({ projectId, repoUrl: pullInfo.repoUrl });
      }
      if (!folderPath) {
        folderPath = await window.electronAPI.selectFolder();
        if (!folderPath) {
          setToast({ type: 'info', message: 'Folder selection cancelled.' });
          return;
        }
        await window.electronAPI.saveFolderPath(projectId, folderPath);
      }

      const result = await window.electronAPI.gitPull({
        folderPath,
        repoUrl: pullInfo.repoUrl,
        token: pullInfo.token
      });
      if (!result.success) {
        if (result.code === 'SYNC_IN_PROGRESS') {
          setToast({ type: 'info', message: 'This project is already syncing. Please wait a moment.' });
          return;
        }
        throw new Error(result.code || 'PULL_FAILED');
      }

      if (result.conflicts?.length > 0) {
        console.warn(`[PULL] Preserved ${result.conflicts.length} local conflict file(s):`, result.conflicts);
      }

      setRemoteChangesAvailable(false);
      window.localStorage.removeItem(`prodcollab_remote_ahead_${projectId}`);
      window.dispatchEvent(new CustomEvent('prodcollab:remote-synced', { detail: { id: projectId } }));
      window.dispatchEvent(new CustomEvent('prodcollab:local-synced', { detail: { id: projectId } }));
      setToast({
        type: result.conflicts?.length > 0 ? 'warning' : 'success',
        message: result.conflicts?.length > 0
          ? `Latest changes pulled. ${result.conflicts.length} local file version was preserved as a conflict copy.`
          : 'Latest changes pulled into the linked project folder.'
      });

    } catch (error) {
      console.error(`[PULL] Project ${project.id} failed:`, error);
      const message = error.message === 'PULL_OBJECTS_FAILED'
        ? 'The project could not finish syncing. Please try again in a moment.'
        : 'We could not pull the latest changes. Check your connection and try again.';
      setToast({ type: 'error', message });
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <>
      <div
        className={`group relative overflow-hidden border border-border bg-card transition-colors duration-150 ${
          hasUnpushedChanges 
            ? 'border-l-2 border-l-primary'
            : remoteChangesAvailable
              ? 'border-l-2 border-l-primary'
              : 'hover:border-primary/40'
        }`}
      >
        {/* Status Badges */}
        <div className="flex min-h-6 justify-end px-5 pt-4">
          {/* Phase 6.10: subtle sync status indicator */}
          {pushState === 'pushing' ? (
            <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
              <Loader2 className="w-3 h-3 animate-spin" />
              Backing up…
            </span>
          ) : pushState === 'failed' ? (
            <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive">
              <AlertTriangle className="w-3 h-3" />
              Backup failed
            </span>
          ) : remoteChangesAvailable ? (
            <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
              <Download className="w-3 h-3" />
              Update available
            </span>
          ) : hasUnpushedChanges ? (
            <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
              <CircleDashed className="w-3 h-3" />
              Changes waiting
            </span>
          ) : (
            <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-md border border-success/30 bg-success/10 px-2 py-1 text-[11px] font-medium text-success">
              <CheckCircle2 className="w-3 h-3" />
              Synced
            </span>
          )}
        </div>

        {/* Card Content */}
          <div className="flex min-h-[270px] flex-col px-5 pb-5 pt-2">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div 
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md border border-white/15 bg-black text-white transition-colors duration-150 group-hover:border-white/35"
            >
              <Music2 className="w-5 h-5" />
            </div>
            
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-foreground truncate mb-1">
                {project.name}
              </h3>
              {isCollaborator && project.owner && (
                <p className="text-xs text-muted-foreground/70 mt-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-success" />
                  Owner: {project.owner.username}
                </p>
              )}
              {isCollaborator && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-success">
                  <Users className="h-3 w-3" /> Shared collaboration
                </p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <ProjectMetadata metadata={project.metadata} compact />
          </div>

          {/* Meta Info */}
           <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{project.fileCount ?? 0} files</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>{formatUpdatedAt(project.updatedAt)}</span>
          </div>

          {conflicts.length > 0 && (
            <button onClick={() => setShowConflictReview(true)} className="mb-3 inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80">
              <AlertTriangle className="h-3.5 w-3.5" /> Review {conflicts.length} protected local version{conflicts.length === 1 ? '' : 's'}
            </button>
          )}

          <button
            onClick={() => setShowHistory((visible) => !visible)}
            className="mb-4 inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            <Clock3 className="h-3.5 w-3.5" />
            {showHistory ? 'Hide version history' : 'View version history'}
          </button>

          {/* Actions */}
          <div className="mt-auto flex items-center gap-2 border-t border-border pt-4">
            {/* Phase 6.7: manual "Check" button removed — file watcher + auto-push handle this now */}

            <button
              onClick={handlePushClick}
              disabled={!hasUnpushedChanges || pushState === 'pushing'}
              className={`flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                hasUnpushedChanges 
                  ? 'bg-primary hover:bg-primary/85 text-primary-foreground'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              {pushState === 'pushing' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isCollaborator ? 'Pushing…' : 'Backing up…'}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {!hasUnpushedChanges
                    ? 'Up to date'
                    : isCollaborator
                      ? 'Push update'
                      : 'Back up now'}
                </>
              )}
            </button>

            <button
              onClick={handlePullFiles}
              disabled={isPulling}
              className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm font-medium text-success transition-colors duration-150 hover:bg-success/20 disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
            </button>

            {!isCollaborator && (
              <button
                title="Invite collaborator"
                onClick={handleGenerateShareLink}
                disabled={loadingShare}
                className="border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            <button
              title="Remove project"
              onClick={onDelete}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-destructive hover:bg-destructive/15 hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showHistory && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowHistory(false); }}>
          <section className="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.9)]">
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">Version history</p>
                <h2 className="mt-1 truncate text-lg font-semibold text-foreground">{project.name}</h2>
              </div>
              <button onClick={() => setShowHistory(false)} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Close version history"><X className="h-5 w-5" /></button>
            </header>
            <div className="overflow-y-auto px-5 pb-5">
              <VersionHistory
                folderPath={folderPath}
                currentUser={currentUser}
                onRestored={() => window.dispatchEvent(new CustomEvent('prodcollab:history-restored', { detail: { id: project.id } }))}
              />
            </div>
          </section>
        </div>,
        document.body
      )}

      {showConflictReview && createPortal(
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/80 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowConflictReview(false); }}>
          <section className="flex max-h-[78vh] w-full max-w-xl flex-col overflow-hidden border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.9)]">
            <header className="flex items-center justify-between border-b border-border px-5 py-4"><div><p className="text-[10px] uppercase tracking-[0.2em] text-primary">Needs your choice</p><h2 className="mt-1 text-lg font-semibold">Protected local versions</h2></div><button onClick={() => setShowConflictReview(false)} className="p-2 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button></header>
            <div className="history-scrollbar space-y-3 overflow-y-auto p-5">{conflicts.map((conflict) => <article key={conflict.preservedPath} className="border border-border bg-background/40 p-4"><p className="truncate text-sm font-medium" title={conflict.originalPath}>{conflict.originalPath}</p><p className="mt-1 text-xs text-muted-foreground">Your local version stays protected until you choose.</p><div className="mt-4 grid grid-cols-3 gap-2"><button disabled={resolvingConflict === conflict.preservedPath} onClick={() => resolveConflict(conflict, 'use-remote')} className="border border-border px-2 py-2 text-xs text-muted-foreground hover:text-foreground">Use shared</button><button disabled={resolvingConflict === conflict.preservedPath} onClick={() => resolveConflict(conflict, 'keep-both')} className="border border-primary/30 px-2 py-2 text-xs text-primary">Keep both</button><button disabled={resolvingConflict === conflict.preservedPath} onClick={() => resolveConflict(conflict, 'use-local')} className="bg-primary px-2 py-2 text-xs font-semibold text-primary-foreground">Use mine</button></div></article>)}</div>
          </section>
        </div>, document.body
      )}

      {/* Share Modal */}
      {showShareModal && createPortal (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-up">
          <div className="w-full max-w-md overflow-hidden border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.9)]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 text-primary">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Invite a collaborator</h3>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-muted-foreground text-sm mb-4">
                Send this invitation link to the producer you want to work with.
              </p>
              
              <div className="mb-4 flex items-center gap-2 border border-border/50 bg-muted/50 p-3">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 bg-transparent text-foreground text-sm font-mono focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
                >
                  {copied ? (
                    <><Check className="w-4 h-4" /> Copied</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copy</>
                  )}
                </button>
              </div>
              
              <div className="border border-primary/20 bg-primary/10 p-3">
                <p className="text-primary text-xs flex items-start gap-2">
                  <span className="text-base">💡</span>
                  Anyone with this link can join this project and share updates.
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default ProjectCard;
