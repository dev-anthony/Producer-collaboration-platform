import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ProjectCard from '../components/ProjectCard';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import PageHeader from '../components/PageHeader';
import { Plus } from 'lucide-react';

// ── Phase 4.15: session via httpOnly cookie; no more jwtToken prop/headers ──
function Projects({ onLogout }) {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectsWithChanges, setProjectsWithChanges] = useState(new Set());
  const [toast, setToast] = useState(null);

  useEffect(() => {
    getUserData();
    getProjects();

    const handleWatchedFileChange = (event) => {
      const data = event.detail;
      if (!data) return;
      console.log('[FILE-CHANGE]', data);
      handleFileChange(data.projectId, data.event, data.path);
    };
    window.addEventListener('prodcollab:file-changed', handleWatchedFileChange);

    const handleAutoPushReady = (event) => {
      const projectId = event.detail?.projectId;
      if (!projectId) return;
      const parsed = JSON.parse(window.localStorage.getItem('prodcollab_auto_push_ready') || '[]');
      const queued = Array.isArray(parsed) ? parsed : [parsed].filter(Boolean);
      window.localStorage.setItem('prodcollab_auto_push_ready', JSON.stringify(queued.filter((id) => String(id) !== String(projectId))));
      handlePushChanges(projectId);
    };
    window.addEventListener('prodcollab:auto-push-ready', handleAutoPushReady);
    let queuedAutoPush = [];
    try {
      queuedAutoPush = JSON.parse(window.localStorage.getItem('prodcollab_auto_push_ready') || '[]');
    } catch {
      queuedAutoPush = [];
    }
    if (!Array.isArray(queuedAutoPush)) queuedAutoPush = [queuedAutoPush].filter(Boolean);
    if (queuedAutoPush.length > 0) {
      window.localStorage.setItem('prodcollab_auto_push_ready', '[]');
      queuedAutoPush.forEach(handlePushChanges);
    }

    const handleLocalSynced = (event) => {
      const projectId = String(event.detail?.id);
      window.localStorage.removeItem(`prodcollab_pending_${projectId}`);
      setProjects(prev => prev.map(p => String(p.id) === projectId ? { ...p, hasUnpushedChanges: false } : p));
      setProjectsWithChanges(prev => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    };
    window.addEventListener('prodcollab:local-synced', handleLocalSynced);
    const refreshProjects = () => getProjects();
    window.addEventListener('prodcollab:projects-refresh', refreshProjects);
    window.addEventListener('prodcollab:remote-project-refresh', refreshProjects);
    const handleHistoryRestored = (event) => handleFileChange(event.detail?.id, 'restore', 'version history');
    window.addEventListener('prodcollab:history-restored', handleHistoryRestored);

    return () => {
      window.removeEventListener('prodcollab:local-synced', handleLocalSynced);
      window.removeEventListener('prodcollab:file-changed', handleWatchedFileChange);
      window.removeEventListener('prodcollab:auto-push-ready', handleAutoPushReady);
      window.removeEventListener('prodcollab:projects-refresh', refreshProjects);
      window.removeEventListener('prodcollab:remote-project-refresh', refreshProjects);
      window.removeEventListener('prodcollab:history-restored', handleHistoryRestored);
    };
  }, []);

  const handleFileChange = (projectId, event, filePath) => {
    setProjectsWithChanges(prev => new Set([...prev, String(projectId)]));
    window.localStorage.setItem(`prodcollab_pending_${projectId}`, '1');
    setProjects(prev => prev.map(p => 
     String(p.id) === String(projectId) ? { ...p, hasUnpushedChanges: true } : p
    ));
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
          hasUnpushedChanges: projectsWithChanges.has(String(p.id)) ||
            window.localStorage.getItem(`prodcollab_pending_${p.id}`) === '1' ||
            p.hasUnpushedChanges
        })) || [];
        setProjects(projectsWithWatchStatus);
        setProjectsWithChanges(prev => {
          const next = new Set(prev);
          for (const p of projectsWithWatchStatus) {
            if (window.localStorage.getItem(`prodcollab_pending_${p.id}`) === '1') next.add(String(p.id));
          }
          return next;
        });
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: "Error fetching projects"
      });
      console.error("Error fetching projects:", err);
    }
  };

  const ensureFolderPath = async (projectId) => {
    try {
      if (!window.electronAPI?.getFolderPath) {
        throw new Error('FOLDER_SELECTION_NOT_AVAILABLE');
      }

      const folderPath = await window.electronAPI.getFolderPath(projectId);
      
      if (folderPath) {
        return folderPath;
      }
      
      if (!window.electronAPI?.selectFolder) {
        throw new Error('FOLDER_SELECTION_NOT_AVAILABLE');
      }
      
      const selectedPath = await window.electronAPI.selectFolder();
      
      if (!selectedPath) {
        throw new Error('FOLDER_SELECTION_CANCELLED');
      }
      
      await window.electronAPI.saveFolderPath(projectId, selectedPath);
      await window.electronAPI.startWatching(projectId, selectedPath);
      
      return selectedPath;
    } catch (error) {
      if (error.message === 'FOLDER_SELECTION_NOT_AVAILABLE') {
        throw new Error('Folder selection is not available in this environment. Please restart the app.');
      }
      setToast({
        type: 'error',
        message: error.message
      });
      throw error;
    }
  };

  const handlePushChanges = async (projectId) => {
  try {
    let project = projects.find(p => String(p.id) === String(projectId));

    if (!project) {
      try {
        const lookup = await fetch(`http://localhost:5000/api/projects/${projectId}`, { credentials: 'include' });
        if (lookup.ok) {
          const fetched = await lookup.json();
          project = { ...fetched, hasUnpushedChanges: true };
        }
      } catch (lookupError) {
        console.error('[PUSH] Project lookup failed:', lookupError);
      }
    }

    if (!project) {
      setToast({ type: 'error', message: "Project not found" });
      return;
    }

    if (!project.hasUnpushedChanges && !projectsWithChanges.has(String(projectId))) {
      setToast({ type: 'info', message: "Everything is already backed up" });
      return;
    }

    let folderPath;
    try {
      folderPath = await ensureFolderPath(projectId);
    } catch (error) {
      if (error.message === 'FOLDER_SELECTION_CANCELLED') {
        setToast({ type: 'warning', message: "Folder selection cancelled. Choose a studio folder to continue." });
        return;
      }
      throw error;
    }

    setToast({ type: 'info', message: 'Backing up your changes' });

    // Get git credentials (ProdCollab token + repoUrl) from server
    const credRes = await fetch(`http://localhost:5000/api/projects/${projectId}/git-credentials`, {
      credentials: 'include'
    });
    const creds = await credRes.json();
    if (!credRes.ok) {
      throw new Error(creds.error || creds.message || 'Failed to get git credentials');
    }

    // Ensure the local folder is a git repo wired to origin
    const initRes = await window.electronAPI.initGit({
      folderPath,
      repoUrl: creds.repoUrl,
      token: creds.token
    });
    if (!initRes.success) throw new Error(initRes.error || 'Git init failed');

    // Commit + push via simple-git
    const pushRes = await window.electronAPI.gitPush({
      folderPath,
       message: `Update by ${creds.authorName || 'ProdCollab'}`,
       username: creds.authorName,
       email: creds.authorEmail,
      repoUrl: creds.repoUrl,
      token: creds.token
    });
    if (!pushRes.success) throw new Error(pushRes.code || 'PUSH_FAILED');

    // Tell the server the push happened
    const recordResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/record-push`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'x-prodcollab-client-id': window.localStorage.getItem('prodcollab_realtime_client_id') || ''
      },
      body: JSON.stringify({ commitMessage: `Update by ${creds.authorName || 'ProdCollab'}` })
    });
    if (!recordResponse.ok) {
      console.error('[BACKUP] Files were saved, but collaborator notification recording failed:', await recordResponse.text());
      throw new Error('PUSH_RECORD_FAILED');
    }

    setProjects(prev => prev.map(p =>
      String(p.id) === String(projectId) ? { ...p, hasUnpushedChanges: false } : p
    ));
    window.localStorage.removeItem(`prodcollab_pending_${projectId}`);
    setProjectsWithChanges(prev => {
      const newSet = new Set(prev);
      newSet.delete(String(projectId));
      return newSet;
    });
    setToast({
      type: 'success',
      message: pushRes.nothingToCommit
        ? 'Everything is already backed up.'
        : 'Your changes are backed up.'
    });

    /* ── OLD Octokit/FormData push flow (Phase 5 replaced with simple-git) ──
    const scannedStructure = await window.electronAPI.scanFolder(folderPath);
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
      setToast({ type: 'error', message: 'No matching files found in the selected folder.\n\nMake sure your local files match the project structure.' });
      return;
    }
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
        setToast({ type: 'error', message: `Error processing file ${fileData.name}` });
      }
    }
    const pushResOld = await fetch(`http://localhost:5000/api/projects/${projectId}/push`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${jwtToken}` },
      body: formData
    });
    const pushData = await pushResOld.json();
    if (pushResOld.ok) {
      setTimeout(() => {
        setToast({ type: 'success', message: `Backup complete. ${pushData.filesUploaded || filesFromDisk.length} file(s) are protected.` });
        window.dispatchEvent(new CustomEvent('prodcollab:projects-refresh'));
      }, 1000);
    } else {
      throw new Error(pushData.error || pushData.message || 'Push failed');
    }
    ── END OLD push flow ── */
  } catch (err) {
    console.error('[PUSH] Failed:', err);
    setToast({
      type: 'error',
      message: err.message === 'SYNC_IN_PROGRESS'
        ? 'This project is already syncing. Please wait a moment.'
        : err.message === 'FILE_TOO_LARGE'
          ? 'One or more files are too large for this project. Move them out or export a smaller version before backing up.'
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
      
      const project = projects.find(p => String(p.id) === String(projectId));
      
      if (!project) {
        setToast({
          type: 'error',
          message: 'Project not found'
        });
        return;
      }

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

      const scannedStructure = await window.electronAPI.scanFolder(folderPath);
      
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
        setToast({
          type: 'info',
          message: ` Changes detected!\n\n${data.changeDetails.join('\n')}`
        });
        setProjectsWithChanges(prev => new Set([...prev, String(projectId)]));
      } else {
        setToast({
          type: 'info',
          message: 'Everything is up to date. Your local files match the shared session.'
        });
        setProjectsWithChanges(prev => {
          const newSet = new Set(prev);
          newSet.delete(String(projectId));
          return newSet;
        });
      }

      await getProjects();
    } catch (err) {
      setToast({
        type: 'error',
        message: `Failed to check for changes:\n\n${err.message}`
      });
    }
  }; */

  // const handleDeleteProject = async (projectId) => {
  //   if (!confirm("Are you sure you want to delete this project?")) return;
    
  //   try {
  //     const response = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
  //       method: 'DELETE',
  //       headers: { "Authorization": `Bearer ${jwtToken}` }
  //     });
      
  //     if (response.ok) {
  //       if (window.electronAPI) {
  //         await window.electronAPI.stopWatching(projectId);
  //         await window.electronAPI.deleteFolderPath(projectId);
  //       }
        
  //       setProjects(projects.filter(p => p.id !== projectId));
  //       setProjectsWithChanges(prev => {
  //         const newSet = new Set(prev);
  //         newSet.delete(String(projectId));
  //         return newSet;
  //       });
        
  //       setToast({
  //         type: 'success',
  //         message: 'Deleted successfully'
  //       });
  //     }
  //   } catch (err) {
  //     setToast({
  //       type: 'error',
  //       message: "Error deleting project"
  //     });
  //   }
  // };
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
      if (window.electronAPI) {
        await window.electronAPI.deleteFolderPath(projectId);
      }
      setProjects(projects.filter(p => String(p.id) !== String(projectId)));
      setProjectsWithChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(String(projectId));
        return newSet;
      });
      setToast({ type: 'success', message: data.message || 'Deleted successfully' });
    }
  } catch (err) {
    setToast({ type: 'error', message: err.message || "Error deleting project" });
  }
};

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
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
        
        <PageHeader eyebrow="Workspace" title="Projects" description="Your private sessions and project folders." action={<button onClick={getUserData} disabled={loading} className="rounded-md border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">Refresh</button>} />

        {/* Content */}
        <div className="p-8">
          {error && (
            <div className="mb-6 border border-destructive/30 bg-destructive/10 p-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mb-8 flex items-center gap-4">
            <button
              onClick={toggleModal}
              className="group flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/85"
            >
              <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-200" />
              Create Project
            </button>
          </div>

          {/* Projects Section */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-6 w-1 rounded-full bg-primary"></div>
              <h3 className="text-xl font-bold text-foreground">Your Projects</h3>
            </div>
            {projects.length === 0 ? (
              <div className="border-2 border-dashed border-border bg-card p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted flex items-center justify-center">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                  </svg>
                </div>
                <p className="text-muted-foreground text-lg">No projects yet</p>
                <p className="text-muted-foreground/60 text-sm mt-1">Create your first project to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {projects.map((project, i) => (
                  <div key={project.id} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                    <ProjectCard
                      project={project}
                      currentUser={user}
                      hasUnpushedChanges={project.hasUnpushedChanges}
                      onDelete={() => handleDeleteProject(project.id)}
                      onPushChanges={() => handlePushChanges(project.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {isModalOpen && <Modal toggleModal={toggleModal} />}
      </div>
    </div>
  );
}
export default Projects;
