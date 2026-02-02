import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ProjectCard from '../components/ProjectCard';
import JoinProjectModal from '../components/JoinProjectModal';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { Users } from 'lucide-react';

function Collaboration({ onLogout, jwtToken }) {
  const [user, setUser] = useState(null);
  const [collaboratedProjects, setCollaboratedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [projectsWithChanges, setProjectsWithChanges] = useState(new Set());
  const [toast, setToast] = useState(null);

  useEffect(() => {
    getUserData();
    getCollaboratedProjects();

    // Listen for file changes from Electron
    if (window.electronAPI?.onFileChanged) {
      window.electronAPI.onFileChanged((data) => {
        console.log('[FILE-CHANGE]', data);
        handleFileChange(data.projectId, data.event, data.path);
      });
    }

    return () => {
      if (window.electronAPI?.removeFileChangedListener) {
        window.electronAPI.removeFileChangedListener();
      }
    };
  }, []);

  const handleFileChange = (projectId, event, filePath) => {
    setProjectsWithChanges(prev => new Set([...prev, String(projectId)]));
    setCollaboratedProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, hasUnpushedChanges: true } : p
    ));
  };

  const getUserData = async () => {
    if (!jwtToken) {
      setError("Missing authentication token");
      setLoading(false);
      setToast({
        type: 'error',
        message: "Missing authentication token"
      });
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/auth/getUserData", {
        headers: { "Authorization": `Bearer ${jwtToken}` }
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

  const getCollaboratedProjects = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/projects/collaborated", {
        headers: { "Authorization": `Bearer ${jwtToken}` }
      });
      const data = await response.json();
      if (!data.error) {
        const projectsWithWatchStatus = data.projects?.map(p => ({
          ...p,
          hasUnpushedChanges: projectsWithChanges.has(String(p.id)) || p.hasUnpushedChanges
        })) || [];
        setCollaboratedProjects(projectsWithWatchStatus);
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: "Error fetching collaborated projects"
      });
      console.error("Error fetching collaborated projects:", err);
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
      const project = collaboratedProjects.find(p => p.id === projectId);

      if (!project) {
        setToast({
          type: 'error',
          message: "Project not found"
        });
        return;
      }

      if (!project.hasUnpushedChanges) {
        setToast({
          type: 'info',
          message: "No changes to push"
        });
        return;
      }

      let folderPath;
      try {
        folderPath = await ensureFolderPath(projectId);
      } catch (error) {
        if (error.message === 'FOLDER_SELECTION_CANCELLED') {
          setToast({
            type: 'warning',
            message: "Folder selection cancelled. Cannot push without selecting a folder."
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

      let filesFromDisk;
      try {
        filesFromDisk = await window.electronAPI.readProjectFiles({
          projectId: projectId,
          fileStructure: storedStructure
        });
      } catch (error) {
        if (error.message.includes('NO_FOLDER_PATH') || error.message.includes('No folder path')) {
          setToast({
            type: 'error',
            message: 'Folder path error. Please try again.'
          });
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
            message: `Error processing file ${fileData.name}`
          });
        }
      }

      setToast({
        type: 'info',
        message: 'Pushing changes'
      });

      const pushRes = await fetch(`http://localhost:5000/api/projects/${projectId}/push`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${jwtToken}`
        },
        body: formData
      });
      
      const pushData = await pushRes.json();

      if(pushRes.ok){
        setCollaboratedProjects(prev => prev.map(p => 
          p.id === projectId ? { ...p, hasUnpushedChanges: false } : p
        ));

        setProjectsWithChanges(prev => {
          const newSet = new Set(prev);
          newSet.delete(String(projectId));
          return newSet;
        });

        setTimeout(()=>{
          setToast({
            type: 'success',
            message: ` Changes pushed successfully!\n\n${pushData.filesUploaded || filesFromDisk.length} files uploaded to GitHub.`
          });
          window.location.reload();
        }, 1000);
      }else{
        const errorData = await pushRes.json();
        throw new Error(errorData.error || errorData.message || 'Push failed');
      }
    } catch (err) {
      console.error('[PUSH] Failed:', err);
      setToast({
        type: 'error',
        message: 'Failed to push changes.'
      });
    }
  };

  const handleCheckChanges = async (projectId) => {
    try {
      const project = collaboratedProjects.find(p => p.id === projectId);
      
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
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
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
          message: ' No changes detected.\n\nYour local files match the repository.'
        });
        setProjectsWithChanges(prev => {
          const newSet = new Set(prev);
          newSet.delete(String(projectId));
          return newSet;
        });
      }

      await getCollaboratedProjects();
    } catch (err) {
      setToast({
        type: 'error',
        message: `Failed to check for changes:\n\n${err.message}`
      });
    }
  };

  const handleLeaveProject = async (projectId) => {
    if (!confirm("Are you sure you want to leave this project?")) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/leave`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${jwtToken}` }
      });
      
      if (response.ok) {
        if (window.electronAPI) {
          await window.electronAPI.stopWatching(projectId);
          await window.electronAPI.deleteFolderPath(projectId);
        }
        
        setCollaboratedProjects(collaboratedProjects.filter(p => p.id !== projectId));
        setProjectsWithChanges(prev => {
          const newSet = new Set(prev);
          newSet.delete(String(projectId));
          return newSet;
        });
        
        setToast({
          type: 'success',
          message: 'Left project successfully'
        });
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: "Error leaving project"
      });
    }
  };

  if (loading) return <LoadingSpinner />;

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
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Collaborations</h2>
              <p className="text-muted-foreground mt-1">Welcome back, <span className="text-primary">{user?.username}</span></p>
            </div>
            <button
              onClick={getUserData}
              disabled={loading}
              className="group px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/80 text-accent-foreground font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-border flex items-center gap-2"
            >
              <svg className="w-4 h-4 transition-transform group-hover:rotate-180 duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {error && (
            <div className="glass rounded-2xl p-6 border border-red-500/20 bg-red-500/10 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mb-8 flex items-center gap-4">
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] glow-secondary"
            >
              <Users className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" />
              Join Project
            </button>
          </div>

          {/* Collaborated Projects Section */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 bg-gradient-to-b from-secondary to-secondary/50 rounded-full"></div>
              <h3 className="text-xl font-bold text-foreground">Collaborated Projects</h3>
            </div>
            {collaboratedProjects.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center border-dashed border-2 border-border">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-2a6 6 0 0112 0v2zm0 0h6v-2a6 6 0 00-9-5.582V9" />
                  </svg>
                </div>
                <p className="text-muted-foreground text-lg">No collaborative projects yet</p>
                <p className="text-muted-foreground/60 text-sm mt-1">Click "Join Project" above to start collaborating</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {collaboratedProjects.map((project, i) => (
                  <div key={project.id} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                    <ProjectCard
                      project={project}
                      hasUnpushedChanges={project.hasUnpushedChanges}
                      onDelete={() => handleLeaveProject(project.id)}
                      onPushChanges={() => handlePushChanges(project.id)}
                      onCheckChanges={handleCheckChanges}
                      jwtToken={jwtToken}
                      isCollaborator={true}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {isJoinModalOpen && (
          <JoinProjectModal 
            toggleModal={() => setIsJoinModalOpen(false)} 
            jwtToken={jwtToken}
          />
        )}
      </div>
    </div>
  );
}

export default Collaboration;