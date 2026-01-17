

import React, { useState } from 'react';
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
  Folder
} from 'lucide-react';

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

  // Extract expected root folder name
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
        alert(data.error || 'Failed to generate share link');
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      alert('Failed to generate share link');
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
    if (!confirm('Pull latest changes from GitHub?')) return;
    setIsPulling(true);

    try {
      // Check for remote changes first
      const changesRes = await fetch(`http://localhost:5000/api/projects/${project.id}/check-remote-changes`, {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      const changesData = await changesRes.json();

      if (!changesRes.ok) throw new Error(changesData.error || 'Failed to check remote changes');
      if (!changesData.hasChanges) {
        alert('No new changes to pull. Your local folder is already up to date!');
        return;
      }

      // Fetch only changed files
      const pullRes = await fetch(`http://localhost:5000/api/projects/${project.id}/pull-changes`, {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      const data = await pullRes.json();

      if (!pullRes.ok) throw new Error(data.error || 'Failed to pull changes');
      if (data.changedFiles?.length === 0) {
        alert('No files to download (remote is in sync).');
        return;
      }

      // Folder selection logic
      const storedPathKey = `folder_path_${project.id}`;
      let folderPath = localStorage.getItem(storedPathKey);

      if (!folderPath) {
        if (!window.electron?.selectFolder) {
          alert('Folder selection not available in this environment.');
          return;
        }

        folderPath = await window.electron.selectFolder();
        if (!folderPath) {
          alert('Folder selection cancelled.');
          return;
        }

        localStorage.setItem(storedPathKey, folderPath);
        console.log('Stored folder path:', folderPath);
      }

      // Optional: Validate folder name match
      const selectedFolderName = folderPath.split(/[\\/]/).pop();
      if (projectFolderName && !selectedFolderName.includes(projectFolderName)) {
        if (!confirm(
          `Warning: Selected folder "${selectedFolderName}" ` +
          `does not seem to match expected project folder "${projectFolderName}"\n\nContinue anyway?`
        )) {
          return;
        }
      }

      // Write files via Electron
      if (window.electron?.writeFiles) {
        const result = await window.electron.writeFiles({
          folderPath,
          files: data.changedFiles.map(file => ({
            path: file.path,
            content: file.content, // base64
            size: file.size
          }))
        });

        if (result.success) {
          alert(`Successfully pulled and saved ${result.successCount} changed file(s)!`);
        } else {
          alert(
            `Partial success: ${result.successCount} saved, ` +
            `${result.failCount} failed.\n\nError: ${result.error || 'Unknown'}`
          );
        }
      } else {
        alert('File writing not supported in this environment.');
      }
    } catch (error) {
      console.error('Pull error:', error);
      alert('Failed to pull changes: ' + (error.message || 'Unknown error'));
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <>
      <div className={`relative glass rounded-2xl p-5 transition-all duration-300 hover:scale-[1.01] border ${
        hasUnpushedChanges
          ? 'border-yellow-400/50 shadow-yellow-400/20 shadow-lg'
          : 'border-border hover:border-primary/30'
      }`}>
        {/* Change & Collaborator badges */}
        {hasUnpushedChanges && (
          <div className="absolute -top-3 -right-3 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Changes detected
          </div>
        )}
        {isCollaborator && (
          <div className="absolute -top-3 -left-3 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <Share2 className="w-3 h-3" />
            Collaborator
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`${isCollaborator ? 'bg-secondary' : 'bg-primary'} p-2 rounded-lg glow-${isCollaborator ? 'secondary' : 'primary'}`}>
              <Github className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground truncate">{project.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {project.description || 'No description'}
              </p>
              {isCollaborator && project.owner && (
                <p className="text-xs text-muted-foreground mt-1">
                  Owner: {project.owner.username}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {project.visibility === 'private' ? (
              <><Lock className="w-4 h-4" /> Private</>
            ) : (
              <><Globe className="w-4 h-4" /> Public</>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="text-xs text-muted-foreground mb-4">
          <span>{project.fileCount ?? 0} files</span>
          <span className="mx-2">•</span>
          <span>Last updated: {project.updatedAt || 'Just now'}</span>
          {isCollaborator && project.localPath && (
            <>
              <span className="mx-2">•</span>
              <span className="text-secondary">Synced to: {project.localPath}</span>
            </>
          )}
        </div>

        {/* Folder hint */}
        {projectFolderName && (
          <div className="glass border border-border/50 rounded-lg px-3 py-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <Folder className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Project folder:</span>
              <span className="text-foreground font-medium">{projectFolderName}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              ⚠️ Select a folder containing "{projectFolderName}" when pushing/pulling
            </p>
          </div>
        )}

        {/* Main Actions */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={handleCheckForChanges}
            disabled={isChecking}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-secondary hover:bg-secondary/80 text-secondary-foreground disabled:opacity-50 hover:scale-105 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Check Changes'}
          </button>

          <button
            onClick={onPushChanges}
            disabled={!hasUnpushedChanges}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95 ${
              hasUnpushedChanges
                ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <Upload className="w-4 h-4" />
            Push Changes
          </button>

          <button
            onClick={handlePullFiles}
            disabled={isPulling}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 hover:scale-105 active:scale-95"
            title="Pull latest changes from GitHub"
          >
            <Download className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="flex gap-2">
          {!isCollaborator && (
            <button
              onClick={handleGenerateShareLink}
              disabled={loadingShare}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          )}
          <button
            onClick={onDelete}
            className="bg-destructive/10 hover:bg-destructive/20 text-destructive px-3 py-2 rounded-lg transition-all hover:scale-105 active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl shadow-2xl w-full max-w-md border border-border">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-foreground">Share Project</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Share this link with others to let them join as collaborators.
              </p>
              <div className="glass rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 bg-transparent text-foreground text-sm focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="bg-primary hover:bg-primary/80 text-primary-foreground px-3 py-1 rounded text-sm flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="glass border border-primary/30 rounded-lg p-3">
                <p className="text-primary text-xs">
                  💡 Anyone with this link can join and push changes to the project.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProjectCard;