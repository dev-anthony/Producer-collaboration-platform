
import React, { useState } from 'react';
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
  Users
} from 'lucide-react';
import { createPortal } from 'react-dom';
function ProjectCard({
  project,
  hasUnpushedChanges = false,
  onDelete,
  onPushChanges,
  onCheckChanges,
  jwtToken,
  isCollaborator = false
}) {
  const [isChecking, setIsChecking] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadingShare, setLoadingShare] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [toast, setToast] = useState(null);
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

  const handleCheckForChanges = async () => {
    setIsChecking(true);
    try {
      await onCheckChanges(project.id);
    } finally {
      setIsChecking(false);
    }
  };

  const handleGenerateShareLink = async () => {
    setLoadingShare(true);
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${project.id}/share`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwtToken}` }
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePullFiles = async () => {
    setIsPulling(true);

    try {
      const projectId = project.id;
      
      // STEP 1: Get folder path
      let folderPath;
      try {
        folderPath = await window.electronAPI.getFolderPath(projectId);
        
        if (!folderPath) {
          // console.log('[PULL] No folder path found, prompting user...');
          
          if (!window.electronAPI?.selectFolder) {
            // alert('Folder selection not available in this environment.');
             setToast({ type: 'warning', message: 'Folder selection not available in this environment.'});
            return;
          }

          folderPath = await window.electronAPI.selectFolder();
          
          if (!folderPath) {
            // alert('Folder selection cancelled.');
            setToast({ type: 'info', message: 'Folder selection cancelled.'});
            return;
          }

          await window.electronAPI.saveFolderPath(projectId, folderPath);
          // console.log('[PULL] Folder path saved:', folderPath);
        } else {
          // console.log('[PULL] Using existing folder:', folderPath);
        }
      } catch (pathError) {
        // console.error('[PULL] Error getting folder path:', pathError);
        // alert('Failed to get folder path. Please try again.');
        setToast({ type: 'error', message: 'Failed to get folder path. Please try again.'});
        return;
      }

      // Optional: Validate folder name match
      const selectedFolderName = folderPath.split(/[\\/]/).pop();
      if (projectFolderName && !selectedFolderName.includes(projectFolderName)) {
        if (!confirm(
          ` Warning: Selected folder "${selectedFolderName}" ` +
          `does not match expected project folder "${projectFolderName}"\n\nContinue anyway?`
        )) {
          return;
        }
      }

      // STEP 2: Check if folder has files (to detect first-time pull)
      let folderHasFiles = false;
      try {
        if (window.electronAPI?.checkFolderContents) {
          folderHasFiles = await window.electronAPI.checkFolderContents(folderPath);
          // console.log('[PULL] Folder has files:', folderHasFiles);
        }
      } catch (err) {
        // console.warn('[PULL] Could not check folder contents:', err);
        setToast({ type: 'warning', message: 'Could not check folder contents.'});
      }

      // STEP 3: Check for remote changes (with force flag if folder is empty)
      const forceCheck = !folderHasFiles;
      const changesRes = await fetch(
        `http://localhost:5000/api/projects/${projectId}/check-remote-changes${forceCheck ? '?forceCheck=true' : ''}`,
        { headers: { 'Authorization': `Bearer ${jwtToken}` } }
      );
      
      const changesData = await changesRes.json();

      if (!changesRes.ok) {
        throw new Error(changesData.error || 'Failed to check remote changes');
      }
      
      // If folder is empty, skip the "no changes" check
      if (!forceCheck && !changesData.hasChanges) {
        const shouldPullAnyway = confirm(
          ' No new changes detected on GitHub.\n\n' +
          'However, your local folder may be empty or incomplete.\n\n' +
          'Would you like to pull all files anyway?'
        );
        
        if (!shouldPullAnyway) {
          // alert(' Your local folder is already up to date!');
          setToast({ type: 'info', message: 'Your local folder is already up to date!'});
          return;
        }
      }

      // console.log('[PULL] Remote changes detected, fetching files...');

      // STEP 4: Fetch files
      const pullRes = await fetch(
        `http://localhost:5000/api/projects/${projectId}/pull-changes`,
        { headers: { 'Authorization': `Bearer ${jwtToken}` } }
      );
      
      const data = await pullRes.json();

      if (!pullRes.ok) {
        throw new Error(data.error || 'Failed to pull changes');
      }
      
      if (!data.changedFiles || data.changedFiles.length === 0) {
        // alert(' No files to download (remote repository is empty).');
        setToast({ type: 'info', message: 'No files to download (remote repository is empty).'});

        return;
      }

      // console.log(`[PULL]  Received ${data.changedFiles.length} files`);

      // STEP 5: Write files via Electron API
      if (!window.electronAPI?.writeFiles) {
        // alert(' File writing not supported in this environment.');
        setToast({ type: 'error', message: 'File writing not supported in this environment.'});
        return;
      }

      // Validate that we have files and they have content
      const validFiles = data.changedFiles.filter(file => {
        if (!file.content) {
          // console.warn(`[PULL] File has no content: ${file.path}`);
          return false;
        }
        if (!file.path) {
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) {
        // alert(' No valid files to write (all files missing content)');
        setToast({ type: 'info', message: 'No valid files to write (all files missing content)'});
        return;
      }


      const writePayload = {
        folderPath,
        files: validFiles.map(file => ({
          path: file.path,
          content: file.content,
          size: file.size || 0
        }))
      };

      const result = await window.electronAPI.writeFiles(writePayload);

      // console.log('[PULL] Write result:', result);

      if (result.success) {
        setToast({ type: 'success', message:
          `Successfully pulled and saved ${result.successCount} file(s)! Files written to: ${folderPath}`
        });
      } else {
        setToast({ type: 'warning', message:
          `Partial success: ${result.successCount} files saved, ${result.failCount} files failed.`
        });
      }

    } catch (error) {
 
      setToast({ type: 'error', message: `Failed to pull changes: ${error.message || 'Unknown error'}`});
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
          {hasUnpushedChanges && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[hsl(45,100%,51%)] text-[hsl(220,20%,4%)] animate-pulse-glow">
              <AlertTriangle className="w-3 h-3" />
              Changes
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
            <button
              onClick={handleCheckForChanges}
              disabled={isChecking}
              className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-muted hover:bg-muted/80 text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Checking...' : 'Check'}
            </button>

            <button
              onClick={onPushChanges}
              disabled={!hasUnpushedChanges}
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