
// import React, { useState } from 'react';
// import { X, Link2, FolderOpen, Users, Github, Loader, Check } from 'lucide-react';

// function JoinProjectModal({ toggleModal, jwtToken }) {
//   const [shareLink, setShareLink] = useState('');
//   const [projectInfo, setProjectInfo] = useState(null);
//   const [localPath, setLocalPath] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [step, setStep] = useState(1); // 1: Enter link, 2: Choose folder, 3: Confirm

//   const extractTokenFromLink = (link) => {
//     const match = link.match(/\/join\/([a-f0-9]+)/i);
//     return match ? match[1] : link;
//   };

//   const handleFetchProject = async () => {
//     if (!shareLink.trim()) {
//       alert('Please enter a share link');
//       return;
//     }

//     setLoading(true);

//     try {
//       const shareToken = extractTokenFromLink(shareLink);
      
//       const response = await fetch(`http://localhost:5000/api/projects/share/${shareToken}`, {
//         headers: {
//           'Authorization': `Bearer ${jwtToken}`
//         }
//       });

//       const data = await response.json();

//       if (response.ok) {
//         setProjectInfo(data);
//         setStep(2);
//       } else {
//         alert(data.error || 'Invalid share link');
//       }
//     } catch (error) {
//       console.error('Error fetching project:', error);
//       alert('Failed to fetch project. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleChooseFolder = () => {
//     const input = document.createElement('input');
//     input.type = 'file';
//     input.webkitdirectory = true;
    
//     input.onchange = (e) => {
//       const files = Array.from(e.target.files);
//       if (files.length > 0) {
//         const firstFile = files[0];
//         const fullPath = firstFile.webkitRelativePath;
//         const folderName = fullPath.split('/')[0];
//         setLocalPath(folderName);
//       }
//     };
    
//     input.click();
//   };

//   const handleJoinProject = async () => {
//     setLoading(true);

//     try {
//       const shareToken = extractTokenFromLink(shareLink);
      
//       const response = await fetch('http://localhost:5000/api/projects/join', {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${jwtToken}`,
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//           shareToken,
//           localPath
//         })
//       });

//       const data = await response.json();

//       if (response.ok) {
//         alert(`Successfully joined "${projectInfo.name}"!\n\nFiles will be synced to: ${localPath}`);
//         toggleModal();
//         window.location.reload();
//       } else {
//         alert(data.error || 'Failed to join project');
//       }
//     } catch (error) {
//       console.error('Error joining project:', error);
//       alert('Failed to join project. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
//       {/* Backdrop */}
//       <div 
//         className="absolute inset-0 bg-background/80 backdrop-blur-sm"
//         onClick={toggleModal}
//       ></div>
      
//       {/* Modal */}
//       <div className="relative z-10 w-full max-w-2xl glass-strong rounded-2xl p-8 animate-scale-in border border-border">
//         {/* Header */}
//         <div className="flex items-center justify-between mb-6">
//           <div>
//             <h3 className="text-xl font-bold text-foreground">Join a Project</h3>
//             <p className="text-sm text-muted-foreground mt-1">
//               {step === 1 && 'Enter collaboration link'}
//               {step === 2 && 'Choose local folder'}
//               {step === 3 && 'Confirm and join'}
//             </p>
//           </div>
//           <button 
//             onClick={toggleModal}
//             className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
//           >
//             <X className="w-5 h-5" />
//           </button>
//         </div>

//         {/* Content */}
//         <div className="space-y-6">
//           {/* Step 1: Enter Share Link */}
//           {step === 1 && (
//             <>
//               <div>
//                 <label className="block text-sm font-medium text-foreground mb-2">
//                   Project Share Link <span className="text-red-400">*</span>
//                 </label>
//                 <div className="relative">
//                   <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
//                   <input
//                     type="text"
//                     value={shareLink}
//                     onChange={(e) => setShareLink(e.target.value)}
//                     placeholder="Paste the share link here..."
//                     className="w-full px-4 py-3 pl-11 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
//                   />
//                 </div>
//                 <p className="text-xs text-muted-foreground mt-2">
//                   The project owner will share a link with you
//                 </p>
//               </div>

//               <button
//                 onClick={handleFetchProject}
//                 disabled={loading || !shareLink.trim()}
//                 className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
//               >
//                 {loading ? (
//                   <>
//                     <Loader className="w-5 h-5 animate-spin" />
//                     Verifying...
//                   </>
//                 ) : (
//                   'Continue'
//                 )}
//               </button>
//             </>
//           )}

//           {/* Step 2: Project Info & Choose Folder */}
//           {step === 2 && projectInfo && (
//             <>
//               {/* Project Preview */}
//               <div className="bg-accent/50 rounded-xl p-4 border border-border">
//                 <div className="flex items-start gap-4">
//                   <div className="bg-gradient-to-br from-secondary to-secondary/80 p-3 rounded-lg">
//                     <Github className="w-8 h-8 text-secondary-foreground" />
//                   </div>
//                   <div className="flex-1">
//                     <h4 className="text-lg font-bold text-foreground mb-1">
//                       {projectInfo.name}
//                     </h4>
//                     <p className="text-sm text-muted-foreground mb-2">
//                       {projectInfo.description || 'No description'}
//                     </p>
//                     <div className="flex items-center gap-4 text-xs text-muted-foreground">
//                       <span className="flex items-center gap-1">
//                         <img 
//                           src={projectInfo.owner.avatar} 
//                           alt={projectInfo.owner.username}
//                           className="w-4 h-4 rounded-full"
//                         />
//                         {projectInfo.owner.username}
//                       </span>
//                       <span>•</span>
//                       <span>{projectInfo.fileCount} files</span>
//                       <span>•</span>
//                       <span className="capitalize">{projectInfo.visibility}</span>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-foreground mb-2">
//                   Choose Local Folder <span className="text-red-400">*</span>
//                 </label>
//                 <button
//                   onClick={handleChooseFolder}
//                   className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground hover:bg-accent transition-all flex items-center justify-center gap-2"
//                 >
//                   <FolderOpen className="w-5 h-5" />
//                   {localPath ? localPath : 'Select Folder'}
//                 </button>
//                 <p className="text-xs text-muted-foreground mt-2">
//                   ⚠️ Choose an empty folder or your FL Studio project folder for easy tracking
//                 </p>
//               </div>

//               <div className="flex items-center gap-3">
//                 <button
//                   onClick={() => setStep(1)}
//                   className="flex-1 py-3 px-4 rounded-xl bg-accent hover:bg-accent/80 text-accent-foreground font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-border"
//                 >
//                   Back
//                 </button>
//                 <button
//                   onClick={() => setStep(3)}
//                   disabled={!localPath}
//                   className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   Continue
//                 </button>
//               </div>
//             </>
//           )}

//           {/* Step 3: Confirm and Join */}
//           {step === 3 && projectInfo && (
//             <>
//               {/* Final Confirmation */}
//               <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
//                 <h4 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
//                   <Check className="w-5 h-5" />
//                   Ready to Join!
//                 </h4>
//                 <p className="text-foreground text-sm mb-3">
//                   You're about to join <span className="font-bold">"{projectInfo.name}"</span>
//                 </p>
//                 <div className="space-y-2 text-sm text-muted-foreground">
//                   <p>📁 Local folder: <span className="text-foreground font-medium">{localPath}</span></p>
//                   <p>👤 Owner: <span className="text-foreground font-medium">{projectInfo.owner.username}</span></p>
//                   <p>📊 Files: <span className="text-foreground font-medium">{projectInfo.fileCount} files</span></p>
//                 </div>
//               </div>

//               <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-3">
//                 <p className="text-secondary text-xs">
//                   ℹ️ After joining, you'll be able to pull files from GitHub to your local folder and push your changes back to the repository.
//                 </p>
//               </div>

//               <div className="flex items-center gap-3">
//                 <button
//                   onClick={() => setStep(2)}
//                   className="flex-1 py-3 px-4 rounded-xl bg-accent hover:bg-accent/80 text-accent-foreground font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-border"
//                 >
//                   Back
//                 </button>
//                 <button
//                   onClick={handleJoinProject}
//                   disabled={loading}
//                   className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-green-600 to-green-600/80 text-white font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
//                 >
//                   {loading ? (
//                     <>
//                       <Loader className="w-5 h-5 animate-spin" />
//                       Joining...
//                     </>
//                   ) : (
//                     <>
//                       <Check className="w-5 h-5" />
//                       Confirm & Join Project
//                     </>
//                   )}
//                 </button>
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// export default JoinProjectModal;

import React, { useEffect, useState } from 'react';
import { X, Link2, FolderOpen, Users, Github, Loader, Check, AlertCircle } from 'lucide-react';

function JoinProjectModal({ toggleModal }) {
  const [shareLink, setShareLink] = useState('');
  const [projectInfo, setProjectInfo] = useState(null);
  const [localPath, setLocalPath] = useState('');
  const [selectedFolderHandle, setSelectedFolderHandle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Enter link, 2: Choose folder, 3: Confirm
  const [cloneProgress, setCloneProgress] = useState(null);

  useEffect(() => {
    if (!window.electronAPI?.onGitProgress) return undefined;
    return window.electronAPI.onGitProgress((progress) => {
      if (progress.operation === 'clone') setCloneProgress(progress);
    });
  }, []);

  const extractTokenFromLink = (link) => {
    const match = link.match(/\/join\/([a-f0-9]+)/i);
    return match ? match[1] : link;
  };

  const handleFetchProject = async () => {
    if (!shareLink.trim()) {
      alert('Please enter a share link');
      return;
    }

    setLoading(true);

    try {
      const shareToken = extractTokenFromLink(shareLink);
      
      const response = await fetch(`http://localhost:5000/api/projects/share/${shareToken}`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        setProjectInfo(data);
        setStep(2);
      } else {
        alert(data.error || 'Invalid share link');
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      alert('Failed to fetch project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChooseFolder = async () => {
    // Use the native Electron directory picker so ANY folder can be chosen,
    // including empty ones (the browser <input webkitdirectory> can't return a
    // path for an empty folder because it derives the path from its files).
    try {
      const folderPath = await window.electronAPI.selectFolder();
      if (!folderPath) return; // user cancelled

      const sep = folderPath.includes('\\') ? '\\' : '/';
      const folderName = folderPath.split(/[\\/]/).filter(Boolean).pop() || folderPath;

      // Read contents just to report empty/not — this never blocks selection.
      let isEmpty = true;
      try {
        const scan = await window.electronAPI.readFolderFiles(folderPath);
        const files = Array.isArray(scan) ? scan : (scan?.files || []);
        isEmpty = files.length === 0;
      } catch (err) {
        console.warn('[JOIN] Could not read folder contents:', err);
      }

      setLocalPath(folderPath); // full absolute path
      setSelectedFolderHandle({
        name: folderName,
        path: folderPath,
        isEmpty
      });
    } catch (err) {
      console.error('[JOIN] Folder selection failed:', err);
    }
  };

  const handleJoinProject = async () => {
    if (!localPath || !selectedFolderHandle) {
      alert('Please select a local folder before joining the project.');
      return;
    }

    setLoading(true);
    setCloneProgress(null);

    try {
      // Validate before adding/updating the collaborator record on the server.
      if (window.electronAPI?.validateFolderLink) {
        const validation = await window.electronAPI.validateFolderLink(
          localPath,
          projectInfo?.id
        );
        if (!validation.valid) {
          if (validation.error === 'FOLDER_ALREADY_LINKED') {
            alert('That folder is already linked to another project. Select a different folder.');
          } else {
            alert('The selected folder cannot be linked to this project.');
          }
          return;
        }
      }

      const shareToken = extractTokenFromLink(shareLink);
      
      const response = await fetch('http://localhost:5000/api/projects/join', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shareToken,
          localPath,
          folderInfo: selectedFolderHandle ? {
            name: selectedFolderHandle.name,
            path: selectedFolderHandle.path,
            isEmpty: selectedFolderHandle.isEmpty
          } : null
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Phase 5: clone the repo into the chosen local folder via simple-git
        try {
          const joinedProjectId = data.project?.id;
          const repoUrl = data.project?.repoUrl;
          let cloneCompleted = false;
          if (joinedProjectId && repoUrl && window.electronAPI?.gitClone) {
            // Fetch ProdCollab git credentials (token) so we can clone private repos
            const credRes = await fetch(`http://localhost:5000/api/projects/${joinedProjectId}/git-credentials`, {
              credentials: 'include'
            });
            const creds = await credRes.json();
            if (credRes.ok) {
              const cloneRes = await window.electronAPI.gitClone({
                repoUrl: creds.repoUrl || repoUrl,
                folderPath: localPath,
                token: creds.token
              });
              if (!cloneRes.success) {
                throw new Error(cloneRes.error || 'Git clone failed');
              }
              cloneCompleted = true;
            }
          }
          // Phase 6.6: ensure standard stems/ and exports/ subfolders exist
          if (localPath && window.electronAPI?.setupProjectFolder) {
            await window.electronAPI.setupProjectFolder(localPath);
          }

          if (!cloneCompleted) {
            throw new Error('The project was joined, but its files could not be cloned into the selected folder.');
          }

          // Persist locally and start watching only after clone/merge succeeds.
          await window.electronAPI.saveFolderPath(joinedProjectId, localPath);
          await window.electronAPI.startWatching(joinedProjectId, localPath);
        } catch (cloneErr) {
          console.error('[JOIN] Clone step failed:', cloneErr);
          alert(`Project joined, but file sync failed:\n\n${cloneErr.message}\n\nYou can retry the same join link after checking your connection.`);
          return;
        }

        const message = selectedFolderHandle?.isEmpty 
          ? `Successfully joined "${projectInfo.name}"!\n\nEmpty folder linked. Files will be synced when added to: ${localPath}`
          : `Successfully joined "${projectInfo.name}"!\n\nFiles will be synced to: ${localPath}`;
        
        alert(message);
        toggleModal();
        window.location.reload();
      } else {
        if (data.code === 'PROJECT_OWNER_CANNOT_JOIN') {
          alert('You already own this project. Log in with a different ProdCollab account to join as a collaborator.');
        } else {
          alert(data.error || 'Failed to join project');
        }
      }
    } catch (error) {
      console.error('Error joining project:', error);
      alert('Failed to join project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={toggleModal}
      ></div>
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl glass-strong rounded-2xl p-8 animate-scale-in border border-border">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-foreground">Join a Project</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {step === 1 && 'Enter collaboration link'}
              {step === 2 && 'Choose local folder'}
              {step === 3 && 'Confirm and join'}
            </p>
          </div>
          <button 
            onClick={toggleModal}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Step 1: Enter Share Link */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Project Share Link <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={shareLink}
                    onChange={(e) => setShareLink(e.target.value)}
                    placeholder="Paste the share link here..."
                    className="w-full px-4 py-3 pl-11 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  The project owner will share a link with you
                </p>
              </div>

              <button
                onClick={handleFetchProject}
                disabled={loading || !shareLink.trim()}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </>
          )}

          {/* Step 2: Project Info & Choose Folder */}
          {step === 2 && projectInfo && (
            <>
              {/* Project Preview */}
              <div className="bg-accent/50 rounded-xl p-4 border border-border">
                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-br from-secondary to-secondary/80 p-3 rounded-lg">
                    <Github className="w-8 h-8 text-secondary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-foreground mb-1">
                      {projectInfo.name}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {projectInfo.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <img 
                          src={projectInfo.owner.avatar} 
                          alt={projectInfo.owner.username}
                          className="w-4 h-4 rounded-full"
                        />
                        {projectInfo.owner.username}
                      </span>
                      <span>•</span>
                      <span>{projectInfo.fileCount} files</span>
                      <span>•</span>
                      <span className="capitalize">{projectInfo.visibility}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Choose Local Folder <span className="text-red-400">*</span>
                </label>
                <button
                  onClick={handleChooseFolder}
                  className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground hover:bg-accent transition-all flex items-center justify-center gap-2"
                >
                  <FolderOpen className="w-5 h-5" />
                  {localPath ? localPath : 'Select Folder'}
                </button>
                
                {/* Folder Status Indicator */}
                {selectedFolderHandle && (
                  <div className={`mt-2 p-3 rounded-lg border ${
                    selectedFolderHandle.isEmpty 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : 'bg-blue-500/10 border-blue-500/30'
                  }`}>
                    <div className="flex items-start gap-2">
                      {selectedFolderHandle.isEmpty ? (
                        <>
                          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-green-400 text-sm font-medium">Empty folder selected</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Perfect! Files will be synced when added to this folder.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-blue-400 text-sm font-medium">Folder contains files</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Existing files will be preserved. New files will be synced.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ Choose an empty folder or your FL Studio project folder for easy tracking
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-4 rounded-xl bg-accent hover:bg-accent/80 text-accent-foreground font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-border"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!localPath}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {/* Step 3: Confirm and Join */}
          {step === 3 && projectInfo && (
            <>
              {/* Final Confirmation */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <h4 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  Ready to Join!
                </h4>
                <p className="text-foreground text-sm mb-3">
                  You're about to join <span className="font-bold">"{projectInfo.name}"</span>
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>📁 Local folder: <span className="text-foreground font-medium">{localPath}</span></p>
                  {selectedFolderHandle?.isEmpty && (
                    <p className="text-green-400 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Empty folder - ready for clean sync
                    </p>
                  )}
                  <p>👤 Owner: <span className="text-foreground font-medium">{projectInfo.owner.username}</span></p>
                  <p>📊 Files: <span className="text-foreground font-medium">{projectInfo.fileCount} files</span></p>
                </div>
              </div>

              <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-3">
                <p className="text-secondary text-xs">
                  ℹ️ After joining, {selectedFolderHandle?.isEmpty 
                    ? 'files added to your folder will be detected and you can push them to the repository.' 
                    : 'you can pull files from GitHub to your local folder and push your changes back to the repository.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 px-4 rounded-xl bg-accent hover:bg-accent/80 text-accent-foreground font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-border"
                >
                  Back
                </button>
                <button
                  onClick={handleJoinProject}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-green-600 to-green-600/80 text-white font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      {cloneProgress
                        ? `${cloneProgress.stage} ${cloneProgress.percent}%`
                        : 'Joining...'}
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Confirm & Join Project
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default JoinProjectModal;
