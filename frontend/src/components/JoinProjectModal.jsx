import React, { useEffect, useState } from 'react';
import { X, Link2, FolderOpen, Music, Loader, Check, AlertCircle } from 'lucide-react';
import ProjectMetadata from './ProjectMetadata';

function JoinProjectModal({ toggleModal }) {
  const [shareLink, setShareLink] = useState('');
  const [projectInfo, setProjectInfo] = useState(null);
  const [localPath, setLocalPath] = useState('');
  const [selectedFolderHandle, setSelectedFolderHandle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Enter link, 2: Choose folder, 3: Confirm
  const [cloneProgress, setCloneProgress] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!window.electronAPI?.onGitProgress) return undefined;
    return window.electronAPI.onGitProgress((progress) => {
      if (progress.operation === 'clone') setCloneProgress(progress);
    });
  }, []);

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') toggleModal(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [toggleModal]);

  const extractTokenFromLink = (link) => {
    const match = link.match(/\/join\/([a-f0-9]+)/i);
    return match ? match[1] : link;
  };

  const handleFetchProject = async () => {
    if (!shareLink.trim()) {
      setNotice({ type: 'error', message: 'Paste your invitation link to continue.' });
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
        setNotice({ type: 'error', message: 'That invitation link is not valid.' });
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      setNotice({ type: 'error', message: 'We could not open that invitation. Check your connection and try again.' });
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
      setNotice({
        type: 'info',
        message: isEmpty
          ? 'Empty folder selected. The shared files will be added here.'
          : 'Folder selected. Existing files will be kept safe.'
      });
    } catch (err) {
      console.error('[JOIN] Folder selection failed:', err);
    }
  };

  const handleJoinProject = async () => {
    if (!localPath || !selectedFolderHandle) {
      setNotice({ type: 'error', message: 'Choose a local studio folder before joining.' });
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
            setNotice({ type: 'error', message: 'That folder is already connected to another project. Choose a different folder.' });
          } else {
            setNotice({ type: 'error', message: 'That folder cannot be connected to this project.' });
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
                throw new Error(cloneRes.error || 'Project download failed');
              }
              cloneCompleted = true;
            }
          }
          // Phase 6.6: ensure standard stems/ and exports/ subfolders exist
          if (localPath && window.electronAPI?.setupProjectFolder) {
            await window.electronAPI.setupProjectFolder(localPath);
          }

          if (!cloneCompleted) {
            throw new Error('The project was joined, but its files could not be downloaded into the selected folder.');
          }

          // Persist locally and start watching only after clone/merge succeeds.
          await window.electronAPI.saveFolderPath(joinedProjectId, localPath);
          await window.electronAPI.startWatching(joinedProjectId, localPath);
        } catch (cloneErr) {
          console.error('[JOIN] Clone step failed:', cloneErr);
          setNotice({ type: 'error', message: 'You joined the project, but the files could not be downloaded. Check your connection and try again.' });
          return;
        }

        setCloneProgress({ stage: 'Project ready', percent: 100, complete: true });
        setNotice({ type: 'info', message: `You joined “${projectInfo.name}”. The project is ready in your selected folder.` });
        window.dispatchEvent(new CustomEvent('prodcollab:projects-refresh'));
        window.dispatchEvent(new CustomEvent('prodcollab:remote-project-refresh', { detail: { id: data.project?.id } }));
        setTimeout(toggleModal, 1200);
      } else {
        if (data.code === 'PROJECT_OWNER_CANNOT_JOIN') {
          setNotice({ type: 'error', message: 'This project already belongs to your account.' });
        } else {
          setNotice({ type: 'error', message: 'We could not join this project. Try again in a moment.' });
        }
      }
    } catch (error) {
      console.error('Error joining project:', error);
      setNotice({ type: 'error', message: 'We could not join this project. Check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80"
        onClick={toggleModal}
      ></div>
      
      {/* Modal */}
       <div className="relative z-10 w-full max-w-2xl border border-border bg-card p-7 animate-scale-in">
        {notice && <div className={`mb-4 border px-3 py-2 text-xs ${notice.type === 'error' ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-primary/30 bg-primary/10 text-primary'}`}>{notice.message}</div>}
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
             <h3 className="text-xl font-semibold text-foreground">Join a project</h3>
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
                   Invitation link <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={shareLink}
                    onChange={(e) => setShareLink(e.target.value)}
                    placeholder="Paste your invitation link..."
                    className="w-full border border-border bg-input px-4 py-3 pl-11 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Ask the producer who invited you for this link.
                </p>
              </div>

              <button
                onClick={handleFetchProject}
                disabled={loading || !shareLink.trim()}
                 className="w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/85 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              <div className="border border-border bg-accent/50 p-4">
                <div className="flex items-start gap-4">
                   <div className="bg-primary/10 p-3 text-primary">
                    <Music className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-foreground mb-1">
                      {projectInfo.name}
                    </h4>
                    <div className="mb-3"><ProjectMetadata metadata={projectInfo.metadata} /></div>
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
                  Choose Local Folder <span className="text-destructive">*</span>
                </label>
                <button
                  onClick={handleChooseFolder}
                  className="flex w-full items-center justify-center gap-2 border border-border bg-input px-4 py-3 text-foreground transition-colors hover:border-primary/40"
                >
                  <FolderOpen className="w-5 h-5" />
                  {localPath ? localPath : 'Select Folder'}
                </button>
                
                <p className="text-xs text-muted-foreground mt-2">Choose the folder where you want this studio session to live.</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-border bg-background px-4 py-3 font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!localPath}
                   className="flex-1 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/85 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="border border-border bg-accent/50 p-4">
                <h4 className="text-foreground font-semibold mb-2 flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary" />
                  Ready to join
                </h4>
                <p className="text-foreground text-sm mb-3">
                  You're about to join <span className="font-bold">"{projectInfo.name}"</span>
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Local folder: <span className="text-foreground font-medium">{localPath}</span></p>
                  {selectedFolderHandle?.isEmpty && (
                    <p className="text-primary flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Empty folder — ready for a clean sync
                    </p>
                  )}
                  <p>Owner: <span className="text-foreground font-medium">{projectInfo.owner.username}</span></p>
                   <p>Files: <span className="text-foreground font-medium">{projectInfo.fileCount} files</span></p>
                   <ProjectMetadata metadata={projectInfo.metadata} compact />
                </div>
              </div>

              <div className="border border-primary/30 bg-primary/10 p-3">
                 <p className="text-primary text-xs">
                  After joining, {selectedFolderHandle?.isEmpty 
                    ? 'files added to your folder will be detected and backed up.' 
                    : 'you can get the latest files into your local folder and share your changes back with the team.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 border border-border bg-background px-4 py-3 font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Back
                </button>
                <button
                  onClick={handleJoinProject}
                  disabled={loading}
                   className="flex-1 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/85 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
