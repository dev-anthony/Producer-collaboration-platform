

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

// UPDATED handlePullFiles in ProjectCard.jsx
const handlePullFiles = async () => {
  setIsPulling(true);

  try {
    const projectId = project.id;
    
    // STEP 1: Get folder path
    let folderPath;
    try {
      folderPath = await window.electronAPI.getFolderPath(projectId);
      
      if (!folderPath) {
        console.log('[PULL] No folder path found, prompting user...');
        
        if (!window.electronAPI?.selectFolder) {
          alert('❌ Folder selection not available in this environment.');
          return;
        }

        folderPath = await window.electronAPI.selectFolder();
        
        if (!folderPath) {
          alert('Folder selection cancelled.');
          return;
        }

        await window.electronAPI.saveFolderPath(projectId, folderPath);
        console.log('[PULL] ✅ Folder path saved:', folderPath);
      } else {
        console.log('[PULL] Using existing folder:', folderPath);
      }
    } catch (pathError) {
      console.error('[PULL] Error getting folder path:', pathError);
      alert('Failed to get folder path. Please try again.');
      return;
    }

    // Optional: Validate folder name match
    const selectedFolderName = folderPath.split(/[\\/]/).pop();
    if (projectFolderName && !selectedFolderName.includes(projectFolderName)) {
      if (!confirm(
        `⚠️ Warning: Selected folder "${selectedFolderName}" ` +
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
        console.log('[PULL] Folder has files:', folderHasFiles);
      }
    } catch (err) {
      console.warn('[PULL] Could not check folder contents:', err);
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
        '📋 No new changes detected on GitHub.\n\n' +
        'However, your local folder may be empty or incomplete.\n\n' +
        'Would you like to pull all files anyway?'
      );
      
      if (!shouldPullAnyway) {
        alert('✅ Your local folder is already up to date!');
        return;
      }
    }

    console.log('[PULL] 📥 Remote changes detected, fetching files...');

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
      alert('❌ No files to download (remote repository is empty).');
      return;
    }

    console.log(`[PULL] 📦 Received ${data.changedFiles.length} files`);

    // STEP 5: Write files via Electron API
    if (!window.electronAPI?.writeFiles) {
      alert('❌ File writing not supported in this environment.');
      return;
    }

    // Validate that we have files and they have content
    const validFiles = data.changedFiles.filter(file => {
      if (!file.content) {
        console.warn(`[PULL] ⚠️ File has no content: ${file.path}`);
        return false;
      }
      if (!file.path) {
        console.warn(`[PULL] ⚠️ File has no path:`, file);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      alert('❌ No valid files to write (all files missing content)');
      return;
    }

    console.log(`[PULL] ✅ Writing ${validFiles.length} valid files...`);
    console.log('[PULL] Sample file:', {
      path: validFiles[0].path,
      hasContent: !!validFiles[0].content,
      contentLength: validFiles[0].content?.length,
      size: validFiles[0].size
    });

    const writePayload = {
      folderPath,
      files: validFiles.map(file => ({
        path: file.path,
        content: file.content, // base64
        size: file.size || 0
      }))
    };

    console.log('[PULL] Write payload:', {
      folderPath: writePayload.folderPath,
      filesCount: writePayload.files.length,
      firstFile: writePayload.files[0]
    });

    const result = await window.electronAPI.writeFiles(writePayload);

    console.log('[PULL] Write result:', result);

    if (result.success) {
      alert(
        `✅ Successfully pulled and saved ${result.successCount} file(s)!\n\n` +
        `Files written to:\n${folderPath}\n\n` +
        `You can now view and edit your files locally.`
      );
    } else {
      alert(
        `⚠️ Partial success:\n\n` +
        `✅ ${result.successCount} files saved\n` +
        `❌ ${result.failCount} files failed\n\n` +
        `Error: ${result.error || 'Unknown'}`
      );
    }

  } catch (error) {
    console.error('[PULL] ❌ Error:', error);
    alert(`❌ Failed to pull changes:\n\n${error.message || 'Unknown error'}`);
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

//ui redesign

// import React, { useState } from 'react';
// import { cn } from '@/lib/utils';
// import {
//   Github,
//   Trash2,
//   Upload,
//   AlertTriangle,
//   Lock,
//   Globe,
//   RefreshCw,
//   Share2,
//   Copy,
//   Check,
//   Download,
//   X,
//   Folder,
//   Users
// } from 'lucide-react';
// import { Button } from '@/components/ui/button';

// interface Project {
//   id: string;
//   name: string;
//   description?: string;
//   visibility?: 'private' | 'public';
//   fileCount?: number;
//   updatedAt?: string;
//   file_paths?: string | object;
//   localPath?: string;
//   owner?: {
//     username: string;
//   };
// }

// interface ProjectCardProps {
//   project: Project;
//   hasUnpushedChanges?: boolean;
//   onDelete?: () => void;
//   onPushChanges?: () => void;
//   onCheckChanges?: (projectId: string) => Promise<void>;
//   jwtToken?: string;
//   isCollaborator?: boolean;
// }

// const ProjectCard: React.FC<ProjectCardProps> = ({
//   project,
//   hasUnpushedChanges = false,
//   onDelete,
//   onPushChanges,
//   onCheckChanges,
//   jwtToken,
//   isCollaborator = false
// }) => {
//   const [isChecking, setIsChecking] = useState(false);
//   const [showShareModal, setShowShareModal] = useState(false);
//   const [shareLink, setShareLink] = useState('');
//   const [copied, setCopied] = useState(false);
//   const [loadingShare, setLoadingShare] = useState(false);
//   const [isPulling, setIsPulling] = useState(false);

//   const getProjectFolderName = () => {
//     if (!project.file_paths) return null;

//     const filePaths = typeof project.file_paths === 'string'
//       ? JSON.parse(project.file_paths)
//       : project.file_paths;

//     if (filePaths.folders?.length > 0) {
//       const firstFolder = filePaths.folders[0].name;
//       return firstFolder.split('/')[0];
//     }

//     if (filePaths.individualFiles?.length > 0) {
//       const firstFile = filePaths.individualFiles[0];
//       if (firstFile.relativePath) {
//         const parts = firstFile.relativePath.split('/');
//         if (parts.length > 1) return parts[0];
//       }
//     }

//     return null;
//   };

//   const projectFolderName = getProjectFolderName();

//   const handleCheckForChanges = async () => {
//     if (!onCheckChanges) return;
//     setIsChecking(true);
//     try {
//       await onCheckChanges(project.id);
//     } finally {
//       setIsChecking(false);
//     }
//   };

//   const handleGenerateShareLink = async () => {
//     setLoadingShare(true);
//     try {
//       const response = await fetch(`http://localhost:5000/api/projects/${project.id}/share`, {
//         method: 'POST',
//         headers: { 'Authorization': `Bearer ${jwtToken}` }
//       });
//       const data = await response.json();
//       if (response.ok) {
//         setShareLink(data.shareLink);
//         setShowShareModal(true);
//       } else {
//         alert(data.error || 'Failed to generate share link');
//       }
//     } catch (error) {
//       console.error('Error generating share link:', error);
//       alert('Failed to generate share link');
//     } finally {
//       setLoadingShare(false);
//     }
//   };

//   const handleCopyLink = () => {
//     navigator.clipboard.writeText(shareLink);
//     setCopied(true);
//     setTimeout(() => setCopied(false), 2000);
//   };

//   const handlePullFiles = async () => {
//     setIsPulling(true);
//     // Implementation would go here
//     setTimeout(() => setIsPulling(false), 1500);
//   };

//   return (
//     <>
//       <div
//         className={cn(
//           "group relative glass-strong rounded-2xl overflow-hidden transition-all duration-300",
//           "hover:-translate-y-1",
//           hasUnpushedChanges 
//             ? "ring-2 ring-warning/50 glow-warning" 
//             : "hover:glow-primary"
//         )}
//       >
//         {/* Status Badges */}
//         <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
//           {hasUnpushedChanges && (
//             <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-warning text-warning-foreground animate-pulse-glow">
//               <AlertTriangle className="w-3 h-3" />
//               Changes
//             </span>
//           )}
//           {isCollaborator && (
//             <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary/20 text-secondary border border-secondary/30">
//               <Users className="w-3 h-3" />
//               Collaborator
//             </span>
//           )}
//         </div>

//         {/* Card Content */}
//         <div className="p-5">
//           {/* Header */}
//           <div className="flex items-start gap-4 mb-4">
//             <div 
//               className={cn(
//                 "flex-shrink-0 p-3 rounded-xl transition-all duration-300",
//                 isCollaborator 
//                   ? "bg-secondary/15 text-secondary group-hover:bg-secondary/25" 
//                   : "bg-primary/15 text-primary group-hover:bg-primary/25"
//               )}
//             >
//               <Github className="w-5 h-5" />
//             </div>
            
//             <div className="flex-1 min-w-0 pr-20">
//               <h3 className="text-lg font-semibold text-foreground truncate mb-1">
//                 {project.name}
//               </h3>
//               <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
//                 {project.description || 'No description provided'}
//               </p>
//               {isCollaborator && project.owner && (
//                 <p className="text-xs text-muted-foreground/70 mt-1.5 flex items-center gap-1">
//                   <span className="w-1 h-1 rounded-full bg-secondary" />
//                   Owner: {project.owner.username}
//                 </p>
//               )}
//             </div>
//           </div>

//           {/* Meta Info */}
//           <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
//             <span className="inline-flex items-center gap-1.5">
//               {project.visibility === 'private' ? (
//                 <><Lock className="w-3.5 h-3.5" /> Private</>
//               ) : (
//                 <><Globe className="w-3.5 h-3.5" /> Public</>
//               )}
//             </span>
//             <span className="w-1 h-1 rounded-full bg-border" />
//             <span>{project.fileCount ?? 0} files</span>
//             <span className="w-1 h-1 rounded-full bg-border" />
//             <span>{project.updatedAt || 'Just now'}</span>
//           </div>

//           {/* Folder Info */}
//           {projectFolderName && (
//             <div className="mb-4 p-3 rounded-xl bg-muted/50 border border-border/50">
//               <div className="flex items-center gap-2 text-sm">
//                 <Folder className="w-4 h-4 text-primary" />
//                 <span className="text-muted-foreground">Project folder:</span>
//                 <code className="text-foreground font-mono text-xs bg-background/50 px-2 py-0.5 rounded">
//                   {projectFolderName}
//                 </code>
//               </div>
//             </div>
//           )}

//           {/* Actions */}
//           <div className="flex flex-wrap gap-2">
//             <Button
//               variant="secondary"
//               size="sm"
//               onClick={handleCheckForChanges}
//               disabled={isChecking}
//               className="flex-1 min-w-[120px] bg-muted hover:bg-muted/80 text-foreground"
//             >
//               <RefreshCw className={cn("w-4 h-4 mr-2", isChecking && "animate-spin")} />
//               {isChecking ? 'Checking...' : 'Check'}
//             </Button>

//             <Button
//               variant={hasUnpushedChanges ? "default" : "secondary"}
//               size="sm"
//               onClick={onPushChanges}
//               disabled={!hasUnpushedChanges}
//               className={cn(
//                 "flex-1 min-w-[120px]",
//                 hasUnpushedChanges 
//                   ? "bg-warning hover:bg-warning/90 text-warning-foreground" 
//                   : "bg-muted text-muted-foreground cursor-not-allowed"
//               )}
//             >
//               <Upload className="w-4 h-4 mr-2" />
//               Push
//             </Button>

//             <Button
//               variant="secondary"
//               size="sm"
//               onClick={handlePullFiles}
//               disabled={isPulling}
//               className="bg-success/15 hover:bg-success/25 text-success border border-success/30"
//             >
//               <Download className={cn("w-4 h-4", isPulling && "animate-bounce")} />
//             </Button>

//             {!isCollaborator && (
//               <Button
//                 variant="secondary"
//                 size="sm"
//                 onClick={handleGenerateShareLink}
//                 disabled={loadingShare}
//                 className="bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30"
//               >
//                 <Share2 className="w-4 h-4" />
//               </Button>
//             )}

//             <Button
//               variant="ghost"
//               size="sm"
//               onClick={onDelete}
//               className="text-destructive hover:bg-destructive/15 hover:text-destructive"
//             >
//               <Trash2 className="w-4 h-4" />
//             </Button>
//           </div>
//         </div>
//       </div>

//       {/* Share Modal */}
//       {showShareModal && (
//         <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-up">
//           <div className="glass-strong rounded-2xl shadow-2xl w-full max-w-md border border-border overflow-hidden">
//             <div className="p-6">
//               <div className="flex items-center justify-between mb-6">
//                 <div className="flex items-center gap-3">
//                   <div className="p-2 rounded-lg bg-primary/15 text-primary">
//                     <Share2 className="w-5 h-5" />
//                   </div>
//                   <h3 className="text-xl font-semibold text-foreground">Share Project</h3>
//                 </div>
//                 <button
//                   onClick={() => setShowShareModal(false)}
//                   className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>
              
//               <p className="text-muted-foreground text-sm mb-4">
//                 Share this link with others to let them join as collaborators.
//               </p>
              
//               <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50 mb-4">
//                 <input
//                   type="text"
//                   value={shareLink}
//                   readOnly
//                   className="flex-1 bg-transparent text-foreground text-sm font-mono focus:outline-none"
//                 />
//                 <Button
//                   size="sm"
//                   onClick={handleCopyLink}
//                   className="bg-primary hover:bg-primary/90 text-primary-foreground"
//                 >
//                   {copied ? (
//                     <><Check className="w-4 h-4 mr-1" /> Copied</>
//                   ) : (
//                     <><Copy className="w-4 h-4 mr-1" /> Copy</>
//                   )}
//                 </Button>
//               </div>
              
//               <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
//                 <p className="text-primary text-xs flex items-start gap-2">
//                   <span className="text-base">💡</span>
//                   Anyone with this link can join and push changes to the project.
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// };

// export default ProjectCard;
