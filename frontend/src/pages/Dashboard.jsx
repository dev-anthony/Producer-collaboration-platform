
// // import React, { useState, useEffect } from 'react';
// // import Sidebar from '../components/Sidebar';
// // import StatsCard from '../components/StatsCard';
// // import ProjectCard from '../components/ProjectCard';
// // import {Plus} from 'lucide-react';
// // import Modal from '../components/Modal';
// // function Dashboard({ onLogout, jwtToken }) {
// //   const [user, setUser] = useState(null);
// //   const [projects, setProjects] = useState([]);
// //   const [loading, setLoading] = useState(true);
// //   const [error, setError] = useState(null);
// //   const [isModalOpen, setIsModalOpen] = useState(false);

// //   useEffect(() => {
// //     getUserData();
// //     getProjects();
// //   }, []);

// //   const toggleModal = () => {
// //     setIsModalOpen(!isModalOpen);
// //   };

// //   const getUserData = async () => {
// //     if (!jwtToken) {
// //       setError("Missing authentication token");
// //       setLoading(false);
// //       return;
// //     }

// //     try {
// //       const response = await fetch("http://localhost:5000/api/auth/getUserData", {
// //         headers: { "Authorization": `Bearer ${jwtToken}` }
// //       });

// //       const data = await response.json();
// //       if (data.error) {
// //         setError(data.error);
// //       } else {
// //         setUser(data);
// //       }
// //     } catch (err) {
// //       setError(err.message);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const getProjects = async () => {
// //     try {
// //       const response = await fetch("http://localhost:5000/api/projects", {
// //         headers: { "Authorization": `Bearer ${jwtToken}` }
// //       });
// //       const data = await response.json();
// //       if (!data.error) {
// //         setProjects(data.projects || []);
// //       }
// //     } catch (err) {
// //       console.error("Error fetching projects:", err);
// //     }
// //   };

// //   const handleDeleteProject = async (projectId) => {
// //     if (!confirm("Are you sure you want to delete this project?")) return;
    
// //     try {
// //       const response = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
// //         method: 'DELETE',
// //         headers: { "Authorization": `Bearer ${jwtToken}` }
// //       });
      
// //       if (response.ok) {
// //         setProjects(projects.filter(p => p.id !== projectId));
// //         alert("Project deleted successfully");
// //       }
// //     } catch (err) {
// //       alert("Error deleting project");
// //     }
// //   };

// //   const handlePushChanges = async (projectId) => {
// //     try {
// //       const response = await fetch(`http://localhost:5000/api/projects/${projectId}/push`, {
// //         method: 'POST',
// //         headers: { "Authorization": `Bearer ${jwtToken}` }
// //       });
      
// //       if (response.ok) {
// //         alert("Changes pushed successfully");
// //         getProjects();
// //       }
// //     } catch (err) {
// //       alert("Error pushing changes");
// //     }
// //   };

// //   if (loading) return <p className="text-white text-center mt-8">⏳ Loading...</p>;

// //   return (
// //     <div className="flex h-screen bg-gray-900">
// //       <Sidebar onLogout={onLogout} user={user} />
// //       <div className="flex-1 overflow-y-auto">
// //         <div className="bg-gray-800 border-b border-gray-700 px-8 py-6">
// //           <div className="flex items-center justify-between">
// //             <div>
// //               <h2 className="text-2xl font-bold text-white">Dashboard</h2>
// //               <p className="text-gray-400 mt-1">Welcome back, {user?.username}!</p>
// //             </div>
// //             <button
// //               onClick={getUserData}
// //               disabled={loading}
// //               className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
// //             >
// //               Refresh Data
// //             </button>
// //           </div>
// //         </div>

// //         <div className="p-8">
// //           {error && (
// //             <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
// //               {error}
// //             </div>
// //           )}

// //           {user && (
// //             <>
// //               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
// //                 <StatsCard
// //                   icon={<svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z"/></svg>}
// //                   title="Public Repos"
// //                   value={user?.public_repos ?? 0}
// //                   color="blue"
// //                 />
// //                 <StatsCard
// //                   icon={<svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>}
// //                   title="Your Projects"
// //                   value={projects.length}
// //                   color="purple"
// //                 />
// //               </div>

// //               <div className="mb-6">
// //                 <button
// //                   onClick={toggleModal}
// //                   className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
// //                 >
// //                   <Plus className="w-5 h-5" />
// //                   Create New Project
// //                 </button>
// //               </div>

// //               <div>
// //                 <h3 className="text-xl font-bold text-white mb-4">Your Projects</h3>
// //                 {projects.length === 0 ? (
// //                   <p className="text-gray-400">No projects yet. Create your first project!</p>
// //                 ) : (
// //                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
// //                     {projects.map((project) => (
// //                       <ProjectCard
// //                         key={project.id}
// //                         project={project}
// //                         hasUnpushedChanges={project.hasUnpushedChanges}
// //                         onDelete={() => handleDeleteProject(project.id)}
// //                         onPushChanges={() => handlePushChanges(project.id)}
// //                       />
// //                     ))}
// //                   </div>
// //                 )}
// //               </div>
// //             </>
// //           )}
// //         </div>

// //         {isModalOpen && <Modal toggleModal={toggleModal} />}
// //       </div>
// //     </div>
// //   );
// // }

// // export default Dashboard;
// import React, { useState, useEffect } from 'react';
// import Sidebar from '../components/Sidebar';
// import StatsCard from '../components/StatsCard';
// import ProjectCard from '../components/ProjectCard';
// import {Plus} from 'lucide-react';
// import Modal from '../components/Modal';

// function Dashboard({ onLogout, jwtToken }) {
//   const [user, setUser] = useState(null);
//   const [projects, setProjects] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);

//   useEffect(() => {
//     getUserData();
//     getProjects();
//   }, []);

//   const toggleModal = () => {
//     setIsModalOpen(!isModalOpen);
//   };

//   const getUserData = async () => {
//     if (!jwtToken) {
//       setError("Missing authentication token");
//       setLoading(false);
//       return;
//     }

//     try {
//       const response = await fetch("http://localhost:5000/api/auth/getUserData", {
//         headers: { "Authorization": `Bearer ${jwtToken}` }
//       });

//       const data = await response.json();
//       if (data.error) {
//         setError(data.error);
//       } else {
//         setUser(data);
//       }
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getProjects = async () => {
//     try {
//       const response = await fetch("http://localhost:5000/api/projects", {
//         headers: { "Authorization": `Bearer ${jwtToken}` }
//       });
//       const data = await response.json();
//       if (!data.error) {
//         setProjects(data.projects || []);
//       }
//     } catch (err) {
//       console.error("Error fetching projects:", err);
//     }
//   };

//   const handleCheckChanges = async (projectId) => {
//     try {
//       // Get the project details
//       const project = projects.find(p => p.id === projectId);
//       if (!project) {
//         alert('Project not found');
//         return;
//       }

//       // Prompt user to select the project folder
//       const input = document.createElement('input');
//       input.type = 'file';
//       input.multiple = true;
//       input.webkitdirectory = true;
      
//       input.onchange = async (e) => {
//         const selectedFiles = Array.from(e.target.files);
        
//         if (selectedFiles.length === 0) {
//           alert('No files selected');
//           return;
//         }

//         // Filter out hidden files, git files, and system files (same as upload)
//         const filteredFiles = selectedFiles.filter(file => {
//           const name = file.name.toLowerCase();
//           const path = file.webkitRelativePath || file.name;
          
//           // Skip hidden files
//           if (name.startsWith('.')) return false;
          
//           // Skip git folders and files
//           if (path.includes('/.git/') || path.includes('\\.git\\')) return false;
          
//           // Skip system files
//           const systemFiles = ['thumbs.db', 'desktop.ini', '.ds_store'];
//           if (systemFiles.includes(name)) return false;
          
//           // Check file extension
//           const allowedExtensions = [
//             '.wav', '.mp3', '.mp4', '.flac', '.aiff', '.ogg', 
//             '.m4a', '.mpeg', '.avi', '.mov', '.flv', '.midi', '.mid'
//           ];
//           const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
          
//           return allowedExtensions.includes(ext);
//         });

//         // Build current file structure
//         const currentFileStructure = {
//           individualFiles: [],
//           folders: []
//         };

//         // Group files by folder
//         const folderGroups = {};
//         filteredFiles.forEach(file => {
//           const relativePath = file.webkitRelativePath || file.name;
//           const pathParts = relativePath.split('/');
          
//           if (pathParts.length > 1) {
//             // File is in a folder
//             const folderPath = pathParts.slice(0, -1).join('/');
//             if (!folderGroups[folderPath]) {
//               folderGroups[folderPath] = [];
//             }
//             folderGroups[folderPath].push({
//               name: file.name,
//               size: file.size,
//               lastModified: new Date(file.lastModified).toISOString(),
//               relativePath: relativePath
//             });
//           } else {
//             // Individual file
//             currentFileStructure.individualFiles.push({
//               name: file.name,
//               size: file.size,
//               lastModified: new Date(file.lastModified).toISOString(),
//               relativePath: relativePath
//             });
//           }
//         });

//         // Add folders to structure
//         Object.keys(folderGroups).forEach(folderPath => {
//           currentFileStructure.folders.push({
//             name: folderPath,
//             files: folderGroups[folderPath]
//           });
//         });

//         console.log('📂 Current file structure:', currentFileStructure);

//         // Send to backend to compare
//         try {
//           const response = await fetch(`http://localhost:5000/api/projects/${projectId}/detect-changes`, {
//             method: 'POST',
//             headers: {
//               'Authorization': `Bearer ${jwtToken}`,
//               'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({ currentFileStructure })
//           });

//           const data = await response.json();
          
//           if (data.hasChanges) {
//             alert(`Changes detected!\n\n${data.changeDetails.join('\n')}`);
//           } else {
//             alert('No changes detected. Your local files match the repository.');
//           }

//           // Refresh projects to update the UI
//           getProjects();
//         } catch (err) {
//           console.error('Error checking changes:', err);
//           alert('Failed to check for changes. Please try again.');
//         }
//       };
      
//       input.click();
//     } catch (err) {
//       console.error('Error in handleCheckChanges:', err);
//       alert('Failed to check for changes');
//     }
//   };

//   const handleDeleteProject = async (projectId) => {
//     if (!confirm("Are you sure you want to delete this project?")) return;
    
//     try {
//       const response = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
//         method: 'DELETE',
//         headers: { "Authorization": `Bearer ${jwtToken}` }
//       });
      
//       if (response.ok) {
//         setProjects(projects.filter(p => p.id !== projectId));
//         alert("Project deleted successfully");
//       }
//     } catch (err) {
//       alert("Error deleting project");
//     }
//   };

//   const handlePushChanges = async (projectId) => {
//     try {
//       const response = await fetch(`http://localhost:5000/api/projects/${projectId}/push`, {
//         method: 'POST',
//         headers: { "Authorization": `Bearer ${jwtToken}` }
//       });
      
//       if (response.ok) {
//         alert("Changes pushed successfully");
//         getProjects();
//       }
//     } catch (err) {
//       alert("Error pushing changes");
//     }
//   };

//   if (loading) return <p className="text-white text-center mt-8">⏳ Loading...</p>;

//   return (
//     <div className="flex h-screen bg-gray-900">
//       <Sidebar onLogout={onLogout} user={user} />
//       <div className="flex-1 overflow-y-auto">
//         <div className="bg-gray-800 border-b border-gray-700 px-8 py-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <h2 className="text-2xl font-bold text-white">Dashboard</h2>
//               <p className="text-gray-400 mt-1">Welcome back, {user?.username}!</p>
//             </div>
//             <button
//               onClick={getUserData}
//               disabled={loading}
//               className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
//             >
//               Refresh Data
//             </button>
//           </div>
//         </div>

//         <div className="p-8">
//           {error && (
//             <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
//               {error}
//             </div>
//           )}

//           {user && (
//             <>
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
//                 <StatsCard
//                   icon={<svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z"/></svg>}
//                   title="Public Repos"
//                   value={user?.public_repos ?? 0}
//                   color="blue"
//                 />
//                 <StatsCard
//                   icon={<svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>}
//                   title="Your Projects"
//                   value={projects.length}
//                   color="purple"
//                 />
//               </div>

//               <div className="mb-6">
//                 <button
//                   onClick={toggleModal}
//                   className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
//                 >
//                   <Plus className="w-5 h-5" />
//                   Create New Project
//                 </button>
//               </div>

//               <div>
//                 <h3 className="text-xl font-bold text-white mb-4">Your Projects</h3>
//                 {projects.length === 0 ? (
//                   <p className="text-gray-400">No projects yet. Create your first project!</p>
//                 ) : (
//                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                     {projects.map((project) => (
//                       <ProjectCard
//                         key={project.id}
//                         project={project}
//                         hasUnpushedChanges={project.hasUnpushedChanges}
//                         onDelete={() => handleDeleteProject(project.id)}
//                         onPushChanges={() => handlePushChanges(project.id)}
//                         onCheckChanges={handleCheckChanges}
//                       />
//                     ))}
//                   </div>
//                 )}
//               </div>
//             </>
//           )}
//         </div>

//         {isModalOpen && <Modal toggleModal={toggleModal} />}
//       </div>
//     </div>
//   );
// }

// export default Dashboard;
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import StatsCard from '../components/StatsCard';
import ProjectCard from '../components/ProjectCard';
import {Plus} from 'lucide-react';
import Modal from '../components/Modal';

function Dashboard({ onLogout, jwtToken }) {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    getUserData();
    getProjects();
  }, []);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const getUserData = async () => {
    if (!jwtToken) {
      setError("Missing authentication token");
      setLoading(false);
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
    } finally {
      setLoading(false);
    }
  };

  const getProjects = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/projects", {
        headers: { "Authorization": `Bearer ${jwtToken}` }
      });
      const data = await response.json();
      if (!data.error) {
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  const handleCheckChanges = async (projectId) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        alert('Project not found');
        return;
      }

      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.webkitdirectory = true;
      
      input.onchange = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        
        if (selectedFiles.length === 0) {
          alert('No files selected');
          return;
        }

        // Filter files
        const filteredFiles = selectedFiles.filter(file => {
          const name = file.name.toLowerCase();
          const path = file.webkitRelativePath || file.name;
          
          if (name.startsWith('.')) return false;
          if (path.includes('/.git/') || path.includes('\\.git\\')) return false;
          
          const systemFiles = ['thumbs.db', 'desktop.ini', '.ds_store'];
          if (systemFiles.includes(name)) return false;
          
          const allowedExtensions = [
            '.wav', '.mp3', '.mp4', '.flac', '.aiff', '.ogg', 
            '.m4a', '.mpeg', '.avi', '.mov', '.flv', '.midi', '.mid'
          ];
          const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
          
          return allowedExtensions.includes(ext);
        });

        // Build current file structure
        const currentFileStructure = {
          individualFiles: [],
          folders: []
        };

        const folderGroups = {};
        filteredFiles.forEach(file => {
          const relativePath = file.webkitRelativePath || file.name;
          const pathParts = relativePath.split('/');
          
          if (pathParts.length > 1) {
            const folderPath = pathParts.slice(0, -1).join('/');
            if (!folderGroups[folderPath]) {
              folderGroups[folderPath] = [];
            }
            folderGroups[folderPath].push({
              name: file.name,
              size: file.size,
              lastModified: new Date(file.lastModified).toISOString(),
              relativePath: relativePath
            });
          } else {
            currentFileStructure.individualFiles.push({
              name: file.name,
              size: file.size,
              lastModified: new Date(file.lastModified).toISOString(),
              relativePath: relativePath
            });
          }
        });

        Object.keys(folderGroups).forEach(folderPath => {
          currentFileStructure.folders.push({
            name: folderPath,
            files: folderGroups[folderPath]
          });
        });

        console.log('📂 Current file structure:', currentFileStructure);

        try {
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
            alert(`Changes detected!\n\n${data.changeDetails.join('\n')}`);
          } else {
            alert('No changes detected. Your local files match the repository.');
          }

          getProjects();
        } catch (err) {
          console.error('Error checking changes:', err);
          alert('Failed to check for changes. Please try again.');
        }
      };
      
      input.click();
    } catch (err) {
      console.error('Error in handleCheckChanges:', err);
      alert('Failed to check for changes');
    }
  };

  const handlePushChanges = async (projectId) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        alert('Project not found');
        return;
      }

      if (!project.hasUnpushedChanges) {
        alert('No changes to push');
        return;
      }

      // Prompt user to select the folder with changes
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.webkitdirectory = true;
      
      input.onchange = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        
        if (selectedFiles.length === 0) {
          alert('No files selected');
          return;
        }

        // Filter files
        const filteredFiles = selectedFiles.filter(file => {
          const name = file.name.toLowerCase();
          const path = file.webkitRelativePath || file.name;
          
          if (name.startsWith('.')) return false;
          if (path.includes('/.git/') || path.includes('\\.git\\')) return false;
          
          const systemFiles = ['thumbs.db', 'desktop.ini', '.ds_store'];
          if (systemFiles.includes(name)) return false;
          
          const allowedExtensions = [
            '.wav', '.mp3', '.mp4', '.flac', '.aiff', '.ogg', 
            '.m4a', '.mpeg', '.avi', '.mov', '.flv', '.midi', '.mid'
          ];
          const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
          
          return allowedExtensions.includes(ext);
        });

        // Build file structure
        const fileStructure = {
          individualFiles: [],
          folders: []
        };

        const folderGroups = {};
        filteredFiles.forEach(file => {
          const relativePath = file.webkitRelativePath || file.name;
          const pathParts = relativePath.split('/');
          
          if (pathParts.length > 1) {
            const folderPath = pathParts.slice(0, -1).join('/');
            if (!folderGroups[folderPath]) {
              folderGroups[folderPath] = [];
            }
            folderGroups[folderPath].push({
              name: file.name,
              size: file.size,
              lastModified: new Date(file.lastModified).toISOString(),
              relativePath: relativePath
            });
          } else {
            fileStructure.individualFiles.push({
              name: file.name,
              size: file.size,
              lastModified: new Date(file.lastModified).toISOString(),
              relativePath: relativePath
            });
          }
        });

        Object.keys(folderGroups).forEach(folderPath => {
          fileStructure.folders.push({
            name: folderPath,
            files: folderGroups[folderPath]
          });
        });

        // Prepare FormData
        const formData = new FormData();
        formData.append('fileStructure', JSON.stringify(fileStructure));
        
        // Add all files
        filteredFiles.forEach(file => {
          formData.append('files', file);
        });

        console.log('📤 Pushing changes...');

        try {
          const response = await fetch(`http://localhost:5000/api/projects/${projectId}/push`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${jwtToken}`
            },
            body: formData
          });

          const data = await response.json();

          if (response.ok) {
            alert('Changes pushed successfully to GitHub!');
            getProjects();
          } else {
            alert(`Error: ${data.error || 'Failed to push changes'}`);
          }
        } catch (err) {
          console.error('Error pushing changes:', err);
          alert('Failed to push changes. Please try again.');
        }
      };

      input.click();
    } catch (err) {
      console.error('Error in handlePushChanges:', err);
      alert('Failed to push changes');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { "Authorization": `Bearer ${jwtToken}` }
      });
      
      if (response.ok) {
        setProjects(projects.filter(p => p.id !== projectId));
        alert("Project deleted successfully");
      }
    } catch (err) {
      alert("Error deleting project");
    }
  };

  if (loading) return <p className="text-white text-center mt-8">⏳ Loading...</p>;

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar onLogout={onLogout} user={user} />
      <div className="flex-1 overflow-y-auto">
        <div className="bg-gray-800 border-b border-gray-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Dashboard</h2>
              <p className="text-gray-400 mt-1">Welcome back, {user?.username}!</p>
            </div>
            <button
              onClick={getUserData}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
            >
              Refresh Data
            </button>
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {user && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatsCard
                  icon={<svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z"/></svg>}
                  title="Public Repos"
                  value={user?.public_repos ?? 0}
                  color="blue"
                />
                <StatsCard
                  icon={<svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>}
                  title="Your Projects"
                  value={projects.length}
                  color="purple"
                />
              </div>

              <div className="mb-6">
                <button
                  onClick={toggleModal}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create New Project
                </button>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-4">Your Projects</h3>
                {projects.length === 0 ? (
                  <p className="text-gray-400">No projects yet. Create your first project!</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        hasUnpushedChanges={project.hasUnpushedChanges}
                        onDelete={() => handleDeleteProject(project.id)}
                        onPushChanges={() => handlePushChanges(project.id)}
                        onCheckChanges={handleCheckChanges}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {isModalOpen && <Modal toggleModal={toggleModal} />}
      </div>
    </div>
  );
}

export default Dashboard;