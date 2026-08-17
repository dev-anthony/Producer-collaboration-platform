
import React, { useEffect, useState } from 'react';
import Toast from './Toast'
import {
  Github,
  Trash2,
  Upload,
  AlertTriangle,
  Lock,
  Globe,
  RefreshCw,
  Share2,
  Copy,
  Check,
  Download,
  X,
  Folder,
  Users,
  CheckCircle2,
  CircleDashed,
  Loader2
} from 'lucide-react';
import { createPortal } from 'react-dom';
// ── Phase 4.15: session via httpOnly cookie; jwtToken prop no longer used ──
function ProjectCard({
  project,
  hasUnpushedChanges = false,
  onDelete,
  onPushChanges,
  isCollaborator = false
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

  useEffect(() => {
    const handleRemoteChange = (event) => {
      if (String(event.detail?.id) === String(project.id)) setRemoteChangesAvailable(true);
    };
    const handleRemoteSynced = (event) => {
      if (String(event.detail?.id) === String(project.id)) setRemoteChangesAvailable(false);
    };
    window.addEventListener('prodcollab:remote-change', handleRemoteChange);
    window.addEventListener('prodcollab:remote-synced', handleRemoteSynced);
    return () => {
      window.removeEventListener('prodcollab:remote-change', handleRemoteChange);
      window.removeEventListener('prodcollab:remote-synced', handleRemoteSynced);
    };
  }, [project.id]);

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
  const getProjectFolderName = () => {
    if (!project.file_paths) return null;

    const filePaths = typeof project.file_paths === 'string'
      ? JSON.parse(project.file_paths)
      : project.file_paths;

    if (filePaths.folders?.length > 0) {
      const firstFolder = filePaths.folders[0].name;
      return firstFolder.split('/')[0];
    }

    if (filePaths.individualFiles?.length > 0) {
      const firstFile = filePaths.individualFiles[0];
      if (firstFile.relativePath) {
        const parts = firstFile.relativePath.split('/');
        if (parts.length > 1) return parts[0];
      }
    }

    return null;
  };
  const projectFolderName = getProjectFolderName();

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
      setTimeout(() => setCopied(false), 2000);
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
        className={`group relative glass-strong rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
          hasUnpushedChanges 
            ? 'ring-2 ring-[hsl(45,100%,51%)] glow-warning' 
            : 'hover:glow-primary'
        }`}
      >
        {/* Status Badges */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          {remoteChangesAvailable && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[hsl(210,90%,55%)]/20 text-[hsl(210,90%,65%)] border border-[hsl(210,90%,55%)]/30">
              <Download className="w-3 h-3" />
              Update available
            </span>
          )}
          {/* Phase 6.10: subtle sync status indicator */}
          {pushState === 'pushing' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[hsl(185,85%,50%)]/20 text-[hsl(185,85%,50%)] border border-[hsl(185,85%,50%)]/30">
              <Loader2 className="w-3 h-3 animate-spin" />
              Pushing…
            </span>
          ) : pushState === 'failed' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/20 text-destructive border border-destructive/30">
              <AlertTriangle className="w-3 h-3" />
              Push failed
            </span>
          ) : hasUnpushedChanges ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[hsl(45,100%,51%)] text-[hsl(220,20%,4%)] animate-pulse-glow">
              <CircleDashed className="w-3 h-3" />
              Changes pending
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[hsl(142,76%,36%)]/15 text-[hsl(142,76%,36%)] border border-[hsl(142,76%,36%)]/30">
              <CheckCircle2 className="w-3 h-3" />
              Synced
            </span>
          )}
          {isCollaborator && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[hsl(35,90%,55%)]/20 text-[hsl(35,90%,55%)] border border-[hsl(35,90%,55%)]/30">
              <Users className="w-3 h-3" />
              Collaborator
            </span>
          )}
        </div>

        {/* Card Content */}
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div 
              className={`flex-shrink-0 p-3 rounded-xl transition-all duration-300 ${
                isCollaborator 
                  ? 'bg-[hsl(35,90%,55%)]/15 text-[hsl(35,90%,55%)] group-hover:bg-[hsl(35,90%,55%)]/25' 
                  : 'bg-[hsl(185,85%,50%)]/15 text-[hsl(185,85%,50%)] group-hover:bg-[hsl(185,85%,50%)]/25'
              }`}
            >
              <Github className="w-5 h-5" />
            </div>
            
            <div className="flex-1 min-w-0 pr-20">
              <h3 className="text-lg font-semibold text-foreground truncate mb-1">
                {project.name}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {project.description || 'No description provided'}
              </p>
              {isCollaborator && project.owner && (
                <p className="text-xs text-muted-foreground/70 mt-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[hsl(35,90%,55%)]" />
                  Owner: {project.owner.username}
                </p>
              )}
            </div>
          </div>

          {/* Meta Info */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
            <span className="inline-flex items-center gap-1.5">
              {project.visibility === 'private' ? (
                <><Lock className="w-3.5 h-3.5" /> Private</>
              ) : (
                <><Globe className="w-3.5 h-3.5" /> Public</>
              )}
            </span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>{project.fileCount ?? 0} files</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>{project.updatedAt || 'Just now'}</span>
          </div>

          {/* Folder Info */}
          {projectFolderName && (
            <div className="mb-4 p-3 rounded-xl bg-muted/50 border border-border/50">
              <div className="flex items-center gap-2 text-sm">
                <Folder className="w-4 h-4 text-[hsl(185,85%,50%)]" />
                <span className="text-muted-foreground">Project folder:</span>
                <code className="text-foreground font-mono text-xs bg-background/50 px-2 py-0.5 rounded">
                  {projectFolderName}
                </code>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {/* Phase 6.7: manual "Check" button removed — file watcher + auto-push handle this now */}

            <button
              onClick={handlePushClick}
              disabled={!hasUnpushedChanges || pushState === 'pushing'}
              className={`flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                hasUnpushedChanges 
                  ? 'bg-[hsl(45,100%,51%)] hover:bg-[hsl(45,100%,51%)]/90 text-[hsl(220,20%,4%)]' 
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              <Upload className="w-4 h-4" />
              Push
            </button>

            <button
              onClick={handlePullFiles}
              disabled={isPulling}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-[hsl(142,76%,36%)]/15 hover:bg-[hsl(142,76%,36%)]/25 text-[hsl(142,76%,36%)] border border-[hsl(142,76%,36%)]/30 disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
            </button>

            {!isCollaborator && (
              <button
                onClick={handleGenerateShareLink}
                disabled={loadingShare}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-[hsl(185,85%,50%)]/15 hover:bg-[hsl(185,85%,50%)]/25 text-[hsl(185,85%,50%)] border border-[hsl(185,85%,50%)]/30 disabled:opacity-50"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onDelete}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-destructive hover:bg-destructive/15 hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && createPortal (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-up">
          <div className="glass-strong rounded-2xl shadow-2xl w-full max-w-md border border-border overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[hsl(185,85%,50%)]/15 text-[hsl(185,85%,50%)]">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Share Project</h3>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-muted-foreground text-sm mb-4">
                Share this link with others to let them join as collaborators.
              </p>
              
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50 mb-4">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 bg-transparent text-foreground text-sm font-mono focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 bg-[hsl(185,85%,50%)] hover:bg-[hsl(185,85%,50%)]/90 text-[hsl(220,20%,4%)]"
                >
                  {copied ? (
                    <><Check className="w-4 h-4" /> Copied</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copy</>
                  )}
                </button>
              </div>
              
              <div className="p-3 rounded-xl bg-[hsl(185,85%,50%)]/10 border border-[hsl(185,85%,50%)]/20">
                <p className="text-[hsl(185,85%,50%)] text-xs flex items-start gap-2">
                  <span className="text-base">💡</span>
                  Anyone with this link can join and push changes to the project.
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
