import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import StatsCard from '../components/StatsCard';
import ProjectCard from '../components/ProjectCard';
import { Plus, Users } from 'lucide-react';
import Modal from '../components/Modal';
import JoinProjectModal from '../components/JoinProjectModal';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';


//use the window.location.reload after a successful push..to reload the window to clear the changes flag

// ── Phase 4.15: session via httpOnly cookie; no more jwtToken prop/headers ──
function Dashboard({ onLogout }) {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [collaboratedProjects, setCollaboratedProjects] = useState([]);
  const [projectsWithChanges, setProjectsWithChanges] = useState(new Set());
  const [toast, setToast] = useState(null);
  
  const ensureFolderPath = async (projectId) => {
    try {
      // First check if Electron API is available
      if (!window.electronAPI?.getFolderPath) {
        throw new Error('FOLDER_SELECTION_NOT_AVAILABLE');
      }

      // Check if folder path exists
      const folderPath = await window.electronAPI.getFolderPath(projectId);
      
      if (folderPath) {
        // console.log(` Project ${projectId} already has path:`, folderPath);
        return folderPath;
      }
      
      // No folder path - prompt user to select one
      // console.log(` No folder path for project ${projectId}, prompting user...`);
      
      if (!window.electronAPI?.selectFolder) {
        throw new Error('FOLDER_SELECTION_NOT_AVAILABLE');
      }
      
      const selectedPath = await window.electronAPI.selectFolder();
      
      if (!selectedPath) {
        throw new Error('FOLDER_SELECTION_CANCELLED');
      }
      
      // Save the folder path
        await window.electronAPI.saveFolderPath(projectId, selectedPath);
      
      // Start watching the folder
      await window.electronAPI.startWatching(projectId, selectedPath);
      
      // console.log(` Folder path saved and watching started`);
      return selectedPath;
      
    } catch (error) {
      // console.error('[FOLDER] Error ensuring folder path:', error);
      setToast({
          type: 'error',
          message: error.message
        });
      
      if (error.message === 'FOLDER_SELECTION_NOT_AVAILABLE') {
        // More user-friendly error
        throw new Error('Folder selection is not available in this environment. Please restart the app.');
      }
      setToast({
        type: 'error',
        message: error.message
      });
      throw error;
    }
  };
  useEffect(() => {
    getUserData();
    getProjects();
    getCollaboratedProjects();

    // Listen for file changes from Electron
    if (window.electronAPI?.onFileChanged) {
      window.electronAPI.onFileChanged((data) => {
        console.log('[FILE-CHANGE]', data);
        handleFileChange(data.projectId, data.event, data.path);
      });
    }

    // Phase 6.4: when the debounce timer (or "push now") fires, auto-push silently
    if (window.electronAPI?.onAutoPushReady) {
      window.electronAPI.onAutoPushReady((data) => {
        console.log('[AUTO-PUSH]', data);
        handlePushChanges(data.projectId);
      });
    }

    const handleLocalSynced = (event) => {
      const projectId = String(event.detail?.id);
      setProjects(prev => prev.map(p => String(p.id) === projectId ? { ...p, hasUnpushedChanges: false } : p));
      setCollaboratedProjects(prev => prev.map(p => String(p.id) === projectId ? { ...p, hasUnpushedChanges: false } : p));
      setProjectsWithChanges(prev => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    };
    window.addEventListener('prodcollab:local-synced', handleLocalSynced);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('prodcollab:local-synced', handleLocalSynced);
      if (window.electronAPI?.removeFileChangedListener) {
        window.electronAPI.removeFileChangedListener();
      }
      if (window.electronAPI?.removeAutoPushReadyListener) {
        window.electronAPI.removeAutoPushReadyListener();
      }
    };
  }, []);
  const handleFileChange = (projectId, event, filePath) => {
    // console.log(`[DASHBOARD] Change detected in project ${projectId}: ${event} - ${filePath}`);
    
    // Mark project as having unpushed changes
    setProjectsWithChanges(prev => new Set([...prev, String(projectId)]));
    
    // Update project lists to reflect changes
    setProjects(prev => prev.map(p => 
      String(p.id) === String(projectId) ? { ...p, hasUnpushedChanges: true } : p
    ))
    
   setCollaboratedProjects(prev => prev.map(p =>
      String(p.id) === String(projectId) ? { ...p, hasUnpushedChanges: true } : p
    ))
  };
  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };
  const getUserData = async () => {
    try {
      // Phase 4.15: cookie-based session, fetch profile from /api/auth/me
      const response = await fetch("http://localhost:5000/api/auth/me", {
        credentials: 'include'
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setUser(data);
      }
    } catch (err) {
      setError(err.message);
      setToast({
         type: 'error',
         message: err.message
       });
    } finally {
      setLoading(false);
    }
  };
  const getProjects = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/projects", {
        credentials: 'include'
      });
      const data = await response.json();
      if (!data.error) {
        const projectsWithWatchStatus = data.projects?.map(p => ({
          ...p,
          hasUnpushedChanges: projectsWithChanges.has(String(p.id)) || p.hasUnpushedChanges
        })) || [];
        setProjects(projectsWithWatchStatus);
      }
    } catch (err) {
       setToast({
          type: 'error',
          message: `Error fetching projects: ${err.message}`
        });
      console.error("Error fetching projects:", err);
    }
  };
  const getCollaboratedProjects = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/projects/collaborated", {
        credentials: 'include'
      });
      const data = await response.json();
      if (!data.error) {
        const projectsWithWatchStatus = data.projects?.map(p => ({
          ...p,
          hasUnpushedChanges: projectsWithChanges.has(String(p.id)) || p.hasUnpushedChanges
        })) || [];
        setCollaboratedProjects(projectsWithWatchStatus);
        for (const project of projectsWithWatchStatus) {
          if (!project.localPath || !window.electronAPI?.saveFolderPath) continue;
          try {
            const currentPath = await window.electronAPI.getFolderPath(project.id);
            if (!currentPath) await window.electronAPI.saveFolderPath(project.id, project.localPath);
          } catch (folderError) {
            console.error(`[WATCHER] Could not restore project ${project.id}:`, folderError);
          }
        }
      }
    } catch (err) {
      setToast({
          type: 'error',
          message: `Error fetching collaborated projects: ${err.message}`
        });
      console.error("Error fetching collaborated projects:", err);
    }
  };
  const handlePushChanges = async (projectId) => {
    try {
      const project = projects.find(p => String(p.id) === String(projectId)) ||
                      collaboratedProjects.find(p => String(p.id) === String(projectId))

      if (!project) {
        setToast({ type: 'error', message: "Project not found" });
        return;
      }

      if (!project.hasUnpushedChanges) {
        setToast({ type: 'info', message: "No changes to push" });
        return;
      }

      // STEP 1: Ensure folder path exists
      let folderPath;
      try {
        folderPath = await ensureFolderPath(projectId);
      } catch (error) {
        if (error.message === 'FOLDER_SELECTION_CANCELLED') {
          setToast({ type: 'warning', message: "Folder selection cancelled. Cannot push without selecting a folder." });
          return;
        }
        throw error;
      }

      setToast({ type: 'info', message: 'Pushing changes' });

      // STEP 2: Get git credentials (ProdCollab token + repoUrl) from server
      const credRes = await fetch(`http://localhost:5000/api/projects/${projectId}/git-credentials`, {
        credentials: 'include'
      });
      const creds = await credRes.json();
      if (!credRes.ok) {
        throw new Error(creds.error || creds.message || 'Failed to get git credentials');
      }

      // STEP 3: Ensure the local folder is a git repo wired to origin
      const initRes = await window.electronAPI.initGit({
        folderPath,
        repoUrl: creds.repoUrl,
        token: creds.token
      });
      if (!initRes.success) throw new Error(initRes.error || 'Git init failed');

      // STEP 4: Commit + push via simple-git
      const pushRes = await window.electronAPI.gitPush({
        folderPath,
        message: `Update by ${user?.username || 'ProdCollab'}`,
        username: user?.username,
        email: user?.email,
        repoUrl: creds.repoUrl,
        token: creds.token
      });
      if (!pushRes.success) throw new Error(pushRes.code || 'PUSH_FAILED');

      // STEP 5: Tell the server the push happened
      const recordResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/record-push`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-prodcollab-client-id': window.localStorage.getItem('prodcollab_realtime_client_id') || ''
        },
        body: JSON.stringify({ commitMessage: `Update by ${user?.username || 'ProdCollab'}` })
      });
      if (!recordResponse.ok) {
        console.error('[PUSH] Files reached GitHub, but realtime update recording failed:', await recordResponse.text());
        throw new Error('PUSH_RECORD_FAILED');
      }

      // STEP 6: Update UI state
      setProjects(prev => prev.map(p =>
        String(p.id) === String(projectId) ? { ...p, hasUnpushedChanges: false } : p
      ));
      setCollaboratedProjects(prev => prev.map(p =>
        String(p.id) === String(projectId) ? { ...p, hasUnpushedChanges: false } : p
      ));
      setProjectsWithChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(String(projectId));
        return newSet;
      });

      setToast({
        type: 'success',
        message: pushRes.nothingToCommit
          ? 'Already up to date. Nothing new to push.'
          : 'Changes pushed successfully!'
      });

      /* ── OLD Octokit/FormData push flow (Phase 5 replaced with simple-git) ──
      // console.log(`[PUSH] Starting push for project ${projectId}...`);

      // STEP 2: Scan the CURRENT folder structure
      const scannedStructure = await window.electronAPI.scanFolder(folderPath);

      // STEP 3: Transform scanned structure to match backend format
      const storedStructure = typeof project.file_paths === 'string' 
    ? JSON.parse(project.file_paths) 
    : project.file_paths;
      const hasFolderStructure = storedStructure?.folders && storedStructure.folders.length > 0;
      
      let currentFileStructure;
      
      if (hasFolderStructure) {
        const folderName = storedStructure.folders[0].name;
        currentFileStructure = {
          individualFiles: [],
          folders: [{
            name: folderName,
            files: scannedStructure.files.map(file => ({
              name: file.name,
              size: file.size,
              relativePath: `${folderName}/${file.name}`,
              lastModified: file.lastModified
            }))
          }]
        };
      } else {
        currentFileStructure = {
          individualFiles: scannedStructure.files.map(file => ({
            name: file.name,
            size: file.size,
            relativePath: file.relativePath || file.name,
            lastModified: file.lastModified
          })),
          folders: []
        };
      }

      // STEP 4: Read files from disk
      let filesFromDisk;
      try {
        filesFromDisk = await window.electronAPI.readProjectFiles({
          projectId: projectId,
          fileStructure: storedStructure
        });
      } catch (error) {
        if (error.message.includes('NO_FOLDER_PATH') || error.message.includes('No folder path')) {
          setToast({ type: 'error', message: 'Folder path error. Please try again.' });
          return;
        }
        throw error;
      }

      if (filesFromDisk.length === 0) {
         setToast({
          type: 'error',
          message: 'No matching files found in the selected folder.\n\nMake sure your local files match the project structure.'
        });
        return;
      }

      // STEP 5: Build FormData with TRANSFORMED structure
      const formData = new FormData();
      formData.append('fileStructure', JSON.stringify(currentFileStructure));

      for (const fileData of filesFromDisk) {
        try {
          const binaryString = atob(fileData.content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes]);
          const file = new File([blob], fileData.name, {
            type: 'application/octet-stream',
            lastModified: fileData.lastModified || Date.now()
          });
          formData.append('files', file);
        } catch (err) {
          setToast({
            type: 'error',
            message: `Error processing file ${fileData.name}: ${err.message}`
          });
        }
      }

      // STEP 6: Send to server using FormData
      const pushResOld = await fetch(`http://localhost:5000/api/projects/${projectId}/push`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwtToken}` },
        body: formData
      });
      const pushData = await pushResOld.json();
      if(pushResOld.ok){
        setTimeout(()=>{
          setToast({
          type: 'success',
          message: ` Changes pushed successfully!\n\n${pushData.filesUploaded || filesFromDisk.length} files uploaded to GitHub.`
        });
        window.location.reload();
        }, 1000)
      }else{
       throw new Error(pushData.error || pushData.message || 'Push failed')
      }
      ── END OLD push flow ── */
    } catch (err) {
      console.error('[PUSH] Failed:', err);
      setToast({
        type: 'error',
        message: err.message === 'SYNC_IN_PROGRESS'
          ? 'This project is already syncing. Please wait a moment.'
          : err.message === 'PUSH_RECORD_FAILED'
            ? 'Your files were uploaded, but collaborators could not be notified. Refresh and try again if the update badge does not appear.'
          : err.message === 'DUPLICATE_CONTENT'
            ? 'That audio already exists in this project. Remove the duplicate copy before pushing.'
          : 'We could not upload your changes. They are still safe locally. Please try again.'
      });
    }
  };
  // Phase 6.8: handleCheckChanges removed — auto-push replaces manual change checks.
  /* const handleCheckChanges = async (projectId) => {
    try {
      
const project = projects.find(p => String(p.id) === String(projectId)) ||
                collaboratedProjects.find(p => String(p.id) === String(projectId))
      
      if (!project) {
        // alert('Project not found');
         setToast({
          type: 'error',
          message: 'Project not found'
        });
        return;
      }

      // console.log(`[CHECK] Checking changes for project ${projectId}...`);

      // Ensure folder path exists
      let folderPath;
      try {
        folderPath = await ensureFolderPath(projectId);
      } catch (error) {
        if (error.message === 'FOLDER_SELECTION_CANCELLED') {
            setToast({
              type: 'error',
              message: 'FOLDER_SELECTION_CANCELLED'
            });
          return; 
        }
        if (error.message.includes('FOLDER_SELECTION_NOT_AVAILABLE')) {
           setToast({
            type: 'warning',
            message: 'Folder selection is not available.\n\nPlease restart the application.'
          });
          return;
        }
        throw error;
      }

      // console.log(`[CHECK] Scanning folder:`, folderPath);

      // Scan the folder for current structure
      const scannedStructure = await window.electronAPI.scanFolder(folderPath);
      
      // Transform scanned structure to match backend format
      const storedStructure = typeof project.file_paths === 'string' 
        ? JSON.parse(project.file_paths) 
        : project.file_paths;
      
      const hasFolderStructure = storedStructure?.folders && storedStructure.folders.length > 0;
      
      let currentFileStructure;
      
      if (hasFolderStructure) {
        const folderName = storedStructure.folders[0].name;
        currentFileStructure = {
          individualFiles: [],
          folders: [{
            name: folderName,
            files: scannedStructure.files.map(file => ({
              name: file.name,
              size: file.size,
              relativePath: `${folderName}/${file.name}`,
              lastModified: file.lastModified
            }))
          }]
        };
      } else {
        currentFileStructure = {
          individualFiles: scannedStructure.files.map(file => ({
            name: file.name,
            size: file.size,
            relativePath: file.relativePath || file.name,
            lastModified: file.lastModified
          })),
          folders: []
        };
      }

      // console.log(`[CHECK] Transformed structure:`, currentFileStructure);

      // Compare with server
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/detect-changes`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentFileStructure })
      });

      const data = await response.json();
      
      if (data.hasChanges) {
        // alert(` Changes detected!\n\n${data.changeDetails.join('\n')}`);
         setToast({
        type: 'info',
        message: ` Changes detected!\n\n${data.changeDetails.join('\n')}`
      });
        setProjectsWithChanges(prev => new Set([...prev, String(projectId)]));
      } else {
        // alert(' No changes detected.\n\nYour local files match the repository.');
        setToast({
        type: 'info',
        message: ' No changes detected.\n\nYour local files match the repository.'
      });
        setProjectsWithChanges(prev => {
          const newSet = new Set(prev);
          newSet.delete(String(projectId));
          return newSet;
        });
      }

      // Refresh project lists to sync with backend
      await getProjects();
      await getCollaboratedProjects();
      
    } catch (err) {
      // console.error('[CHECK] Error checking changes:', err);
      // alert(`Failed to check for changes:\n\n${err.message}`);
      setToast({
        type: 'error',
        message: `Failed to check for changes:\n\n${err.message}`
      });
    }
  }; */
  const handleDeleteProject = async (projectId) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || 'Failed to delete project');
      
      if (response.ok) {
        // Stop watching and remove folder path
        if (window.electronAPI) {
          await window.electronAPI.deleteFolderPath(projectId);
        }
        
        setProjects(projects.filter(p => String(p.id) !== String(projectId)))
        setCollaboratedProjects(collaboratedProjects.filter(p => String(p.id) !== String(projectId)))
        setProjectsWithChanges(prev => {
          const newSet = new Set(prev);
          newSet.delete(String(projectId));
          return newSet;
        });
        
        setToast({
          type: 'success',
          message: data.message || 'Deleted successfully'
        });
      }
    } catch (err) {
      // alert("Error deleting project");
      setToast({
        type: 'error',
        message: err.message || "Error deleting project"
      });
    }
  };

  if (loading) return (
      <LoadingSpinner/>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden bg-grid-pattern">
      <Sidebar onLogout={onLogout} user={user} />
      <div className="flex-1 overflow-y-auto">
         
         {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={5000}
          onClose={() => setToast(null)}
        />
      )}
        {/* Header */}
        <div className="sticky top-0 z-10 glass-strong border-b border-border px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="animate-slide-in-left">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h2>
              <p className="text-muted-foreground mt-1">Welcome back, <span className="text-primary">{user?.username}</span></p>
            </div>
            <button
              onClick={getUserData}
              disabled={loading}
              className="group px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/80 text-accent-foreground font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-border flex items-center gap-2"
            >
              <svg className="w-4 h-4 transition-transform group-hover:rotate-180 duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="glass rounded-xl p-4 mb-6 border border-destructive/30 bg-destructive/5 animate-fade-in">
              <p className="text-destructive flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
                {error}
              </p>
            </div>
          )}

          {user && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatsCard
                  icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z"/></svg>}
                  title="Public Repos"
                  value={user?.public_repos ?? 0}
                  color="primary"
                />
                <StatsCard
                  icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>}
                  title="Your Projects"
                  value={projects.length}
                  color="secondary"
                />
                <StatsCard
                  icon={<Users className="w-6 h-6" />}
                  title="Collaborated Projects"
                  value={collaboratedProjects.length}
                  color="primary"
                />
              </div>

              {/* Action Buttons */}
              <div className="mb-8 flex items-center gap-4">
                <button
                  onClick={toggleModal}
                  className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] glow-primary"
                >
                  <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-200" />
                  Create Project
                </button>
                
                <button
                  onClick={() => setIsJoinModalOpen(true)}
                  className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/30 font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Users className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" />
                  Join Project
                </button>
              </div>

              {/* Your Projects Section */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
                  <h3 className="text-xl font-bold text-foreground">Your Projects</h3>
                </div>
                {projects.length === 0 ? (
                  <div className="glass rounded-2xl p-12 text-center border-dashed border-2 border-border">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                      <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                      </svg>
                    </div>
                    <p className="text-muted-foreground text-lg">No projects yet</p>
                    <p className="text-muted-foreground/60 text-sm mt-1">Create your first project to get started</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {projects.map((project, i) => (
                      <div key={project.id} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                        <ProjectCard
                          project={project}
                          hasUnpushedChanges={project.hasUnpushedChanges}
                          onDelete={() => handleDeleteProject(project.id)}
                          onPushChanges={() => handlePushChanges(project.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Collaborated Projects Section */}
              {collaboratedProjects.length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-gradient-to-b from-secondary to-secondary/50 rounded-full"></div>
                    <h3 className="text-xl font-bold text-foreground">Collaborated Projects</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {collaboratedProjects.map((project, i) => (
                      <div key={project.id} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                        <ProjectCard
                          project={project}
                          hasUnpushedChanges={project.hasUnpushedChanges}
                          onDelete={() => handleDeleteProject(project.id)}
                          onPushChanges={() => handlePushChanges(project.id)}
                          isCollaborator={true}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {isJoinModalOpen && (
          <JoinProjectModal 
            toggleModal={() => setIsJoinModalOpen(false)} 
          />
        )}

        {isModalOpen && <Modal toggleModal={toggleModal} />}
      </div>
    </div>
  );
}

export default Dashboard;
