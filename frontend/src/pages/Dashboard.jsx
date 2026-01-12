
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


// import React, { useState, useEffect } from 'react';
// import Sidebar from '../components/Sidebar';
// import StatsCard from '../components/StatsCard';
// import ProjectCard from '../components/ProjectCard';
// import {Plus, Users} from 'lucide-react';
// import Modal from '../components/Modal';
// import JoinProjectModal from '../components/JoinProjectModal';


// function Dashboard({ onLogout, jwtToken }) {
//   const [user, setUser] = useState(null);
//   const [projects, setProjects] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
//   const [collaboratedProjects, setCollaboratedProjects] = useState([]);
//   useEffect(() => {
//     getUserData();
//     getProjects();
//      getCollaboratedProjects();
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
//   const getCollaboratedProjects = async () => {
//   try {
//     const response = await fetch("http://localhost:5000/api/projects/collaborated", {
//       headers: { "Authorization": `Bearer ${jwtToken}` }
//     });
//     const data = await response.json();
//     if (!data.error) {
//       setCollaboratedProjects(data.projects || []);
//     }
//   } catch (err) {
//     console.error("Error fetching collaborated projects:", err);
//   }
// };

//   const handleCheckChanges = async (projectId) => {
//     try {
//       const project = projects.find(p => p.id === projectId);
//       if (!project) {
//         alert('Project not found');
//         return;
//       }

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

//         // Filter files
//         const filteredFiles = selectedFiles.filter(file => {
//           const name = file.name.toLowerCase();
//           const path = file.webkitRelativePath || file.name;
          
//           if (name.startsWith('.')) return false;
//           if (path.includes('/.git/') || path.includes('\\.git\\')) return false;
          
//           const systemFiles = ['thumbs.db', 'desktop.ini', '.ds_store'];
//           if (systemFiles.includes(name)) return false;
          
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

//         const folderGroups = {};
//         filteredFiles.forEach(file => {
//           const relativePath = file.webkitRelativePath || file.name;
//           const pathParts = relativePath.split('/');
          
//           if (pathParts.length > 1) {
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
//             currentFileStructure.individualFiles.push({
//               name: file.name,
//               size: file.size,
//               lastModified: new Date(file.lastModified).toISOString(),
//               relativePath: relativePath
//             });
//           }
//         });

//         Object.keys(folderGroups).forEach(folderPath => {
//           currentFileStructure.folders.push({
//             name: folderPath,
//             files: folderGroups[folderPath]
//           });
//         });

//         console.log('📂 Current file structure:', currentFileStructure);

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

//   const handlePushChanges = async (projectId) => {
//     try {
//       const project = projects.find(p => p.id === projectId);
//       if (!project) {
//         alert('Project not found');
//         return;
//       }

//       if (!project.hasUnpushedChanges) {
//         alert('No changes to push');
//         return;
//       }

//       // Prompt user to select the folder with changes
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

//         // Filter files
//         const filteredFiles = selectedFiles.filter(file => {
//           const name = file.name.toLowerCase();
//           const path = file.webkitRelativePath || file.name;
          
//           if (name.startsWith('.')) return false;
//           if (path.includes('/.git/') || path.includes('\\.git\\')) return false;
          
//           const systemFiles = ['thumbs.db', 'desktop.ini', '.ds_store'];
//           if (systemFiles.includes(name)) return false;
          
//           const allowedExtensions = [
//             '.wav', '.mp3', '.mp4', '.flac', '.aiff', '.ogg', 
//             '.m4a', '.mpeg', '.avi', '.mov', '.flv', '.midi', '.mid'
//           ];
//           const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
          
//           return allowedExtensions.includes(ext);
//         });

//         // Build file structure
//         const fileStructure = {
//           individualFiles: [],
//           folders: []
//         };

//         const folderGroups = {};
//         filteredFiles.forEach(file => {
//           const relativePath = file.webkitRelativePath || file.name;
//           const pathParts = relativePath.split('/');
          
//           if (pathParts.length > 1) {
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
//             fileStructure.individualFiles.push({
//               name: file.name,
//               size: file.size,
//               lastModified: new Date(file.lastModified).toISOString(),
//               relativePath: relativePath
//             });
//           }
//         });

//         Object.keys(folderGroups).forEach(folderPath => {
//           fileStructure.folders.push({
//             name: folderPath,
//             files: folderGroups[folderPath]
//           });
//         });

//         // Prepare FormData
//         const formData = new FormData();
//         formData.append('fileStructure', JSON.stringify(fileStructure));
        
//         // Add all files
//         filteredFiles.forEach(file => {
//           formData.append('files', file);
//         });

//         console.log('📤 Pushing changes...');

//         try {
//           const response = await fetch(`http://localhost:5000/api/projects/${projectId}/push`, {
//             method: 'POST',
//             headers: {
//               'Authorization': `Bearer ${jwtToken}`
//             },
//             body: formData
//           });

//           const data = await response.json();

//           if (response.ok) {
//             alert('Changes pushed successfully to GitHub!');
//             getProjects();
//           } else {
//             alert(`Error: ${data.error || 'Failed to push changes'}`);
//           }
//         } catch (err) {
//           console.error('Error pushing changes:', err);
//           alert('Failed to push changes. Please try again.');
//         }
//       };

//       input.click();
//     } catch (err) {
//       console.error('Error in handlePushChanges:', err);
//       alert('Failed to push changes');
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
//               {/* New Buttons for Create and Join Project */}
//               <div className="mb-6 flex items-center justify-between">
//                 <button
//                   onClick={toggleModal}
//                   className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
//                 >
//                   <Plus className="w-5 h-5" />
//                   Create New Project
//                 </button>
                
//                 <button
//                   onClick={() => setIsJoinModalOpen(true)}
//                   className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
//                 >
//                   <Users className="w-5 h-5" />
//                   Join Project
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
//                            jwtToken={jwtToken}
//                       />
//                     ))}
//                   </div>
//                 )}
//               </div>
//             </>
//           )}
//         </div>
//         {collaboratedProjects.length > 0 && (
//           <div className="mb-8">
//             <h3 className="text-xl font-bold text-white mb-4">Collaborated Projects</h3>
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//               {collaboratedProjects.map((project) => (
//                 <ProjectCard
//                   key={project.id}
//                   project={project}
//                   hasUnpushedChanges={project.hasUnpushedChanges}
//                   onDelete={() => handleDeleteProject(project.id)}
//                   onPushChanges={() => handlePushChanges(project.id)}
//                   onCheckChanges={handleCheckChanges}
//                   jwtToken={jwtToken}
//                   isCollaborator={true}
//                 />
//               ))}
//             </div>
//           </div>
//         )}

//         {isJoinModalOpen && (
//           <JoinProjectModal 
//             toggleModal={() => setIsJoinModalOpen(false)} 
//             jwtToken={jwtToken}
//           />
//         )}

//         {isModalOpen && <Modal toggleModal={toggleModal} />}
//       </div>
//     </div>
//   );
// }

// export default Dashboard;


// import React, { useState, useEffect } from 'react';
// import Sidebar from '../components/Sidebar';
// import StatsCard from '../components/StatsCard';
// import ProjectCard from '../components/ProjectCard';
// import {Plus, Users} from 'lucide-react';
// import Modal from '../components/Modal';
// import JoinProjectModal from '../components/JoinProjectModal';


// function Dashboard({ onLogout, jwtToken }) {
//   const [user, setUser] = useState(null);
//   const [projects, setProjects] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
//   const [collaboratedProjects, setCollaboratedProjects] = useState([]);
  
//   useEffect(() => {
//     getUserData();
//     getProjects();
//     getCollaboratedProjects();
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

//   const getCollaboratedProjects = async () => {
//     try {
//       const response = await fetch("http://localhost:5000/api/projects/collaborated", {
//         headers: { "Authorization": `Bearer ${jwtToken}` }
//       });
//       const data = await response.json();
//       if (!data.error) {
//         setCollaboratedProjects(data.projects || []);
//       }
//     } catch (err) {
//       console.error("Error fetching collaborated projects:", err);
//     }
//   };

//   const handleCheckChanges = async (projectId) => {
//     try {
//       // Search in BOTH owned projects and collaborated projects
//       const project = projects.find(p => p.id === projectId) || 
//                       collaboratedProjects.find(p => p.id === projectId);
      
//       if (!project) {
//         alert('Project not found');
//         return;
//       }

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

//         // Filter files
//         const filteredFiles = selectedFiles.filter(file => {
//           const name = file.name.toLowerCase();
//           const path = file.webkitRelativePath || file.name;
          
//           if (name.startsWith('.')) return false;
//           if (path.includes('/.git/') || path.includes('\\.git\\')) return false;
          
//           const systemFiles = ['thumbs.db', 'desktop.ini', '.ds_store'];
//           if (systemFiles.includes(name)) return false;
          
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

//         const folderGroups = {};
//         filteredFiles.forEach(file => {
//           const relativePath = file.webkitRelativePath || file.name;
//           const pathParts = relativePath.split('/');
          
//           if (pathParts.length > 1) {
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
//             currentFileStructure.individualFiles.push({
//               name: file.name,
//               size: file.size,
//               lastModified: new Date(file.lastModified).toISOString(),
//               relativePath: relativePath
//             });
//           }
//         });

//         Object.keys(folderGroups).forEach(folderPath => {
//           currentFileStructure.folders.push({
//             name: folderPath,
//             files: folderGroups[folderPath]
//           });
//         });

//         console.log('📂 Current file structure:', currentFileStructure);

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

//           // Refresh both project lists
//           getProjects();
//           getCollaboratedProjects();
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

//   const handlePushChanges = async (projectId) => {
//     try {
//       // Search in BOTH owned projects and collaborated projects
//       const project = projects.find(p => p.id === projectId) || 
//                       collaboratedProjects.find(p => p.id === projectId);
      
//       if (!project) {
//         alert('Project not found');
//         return;
//       }

//       if (!project.hasUnpushedChanges) {
//         alert('No changes to push');
//         return;
//       }

//       // Prompt user to select the folder with changes
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

//         // Filter files
//         const filteredFiles = selectedFiles.filter(file => {
//           const name = file.name.toLowerCase();
//           const path = file.webkitRelativePath || file.name;
          
//           if (name.startsWith('.')) return false;
//           if (path.includes('/.git/') || path.includes('\\.git\\')) return false;
          
//           const systemFiles = ['thumbs.db', 'desktop.ini', '.ds_store'];
//           if (systemFiles.includes(name)) return false;
          
//           const allowedExtensions = [
//             '.wav', '.mp3', '.mp4', '.flac', '.aiff', '.ogg', 
//             '.m4a', '.mpeg', '.avi', '.mov', '.flv', '.midi', '.mid'
//           ];
//           const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
          
//           return allowedExtensions.includes(ext);
//         });

//         // Build file structure
//         const fileStructure = {
//           individualFiles: [],
//           folders: []
//         };

//         const folderGroups = {};
//         filteredFiles.forEach(file => {
//           const relativePath = file.webkitRelativePath || file.name;
//           const pathParts = relativePath.split('/');
          
//           if (pathParts.length > 1) {
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
//             fileStructure.individualFiles.push({
//               name: file.name,
//               size: file.size,
//               lastModified: new Date(file.lastModified).toISOString(),
//               relativePath: relativePath
//             });
//           }
//         });

//         Object.keys(folderGroups).forEach(folderPath => {
//           fileStructure.folders.push({
//             name: folderPath,
//             files: folderGroups[folderPath]
//           });
//         });

//         // Prepare FormData
//         const formData = new FormData();
//         formData.append('fileStructure', JSON.stringify(fileStructure));
        
//         // Add all files
//         filteredFiles.forEach(file => {
//           formData.append('files', file);
//         });

//         console.log('📤 Pushing changes...');

//         try {
//           const response = await fetch(`http://localhost:5000/api/projects/${projectId}/push`, {
//             method: 'POST',
//             headers: {
//               'Authorization': `Bearer ${jwtToken}`
//             },
//             body: formData
//           });

//           const data = await response.json();

//           if (response.ok) {
//             alert('Changes pushed successfully to GitHub!');
//             // Refresh both project lists
//             getProjects();
//             getCollaboratedProjects();
//           } else {
//             alert(`Error: ${data.error || 'Failed to push changes'}`);
//           }
//         } catch (err) {
//           console.error('Error pushing changes:', err);
//           alert('Failed to push changes. Please try again.');
//         }
//       };

//       input.click();
//     } catch (err) {
//       console.error('Error in handlePushChanges:', err);
//       alert('Failed to push changes');
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
//         setCollaboratedProjects(collaboratedProjects.filter(p => p.id !== projectId));
//         alert("Project deleted successfully");
//       }
//     } catch (err) {
//       alert("Error deleting project");
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
//                 <StatsCard
//                   icon={<Users className="w-8 h-8" />}
//                   title="Collaborated Projects"
//                   value={collaboratedProjects.length}
//                   color="blue"
//                 />
//               </div>

//               {/* New Buttons for Create and Join Project */}
//               <div className="mb-6 flex items-center justify-between">
//                 <button
//                   onClick={toggleModal}
//                   className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
//                 >
//                   <Plus className="w-5 h-5" />
//                   Create New Project
//                 </button>
                
//                 <button
//                   onClick={() => setIsJoinModalOpen(true)}
//                   className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
//                 >
//                   <Users className="w-5 h-5" />
//                   Join Project
//                 </button>
//               </div>

//               {/* Your Projects Section */}
//               <div className="mb-8">
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
//                         jwtToken={jwtToken}
//                       />
//                     ))}
//                   </div>
//                 )}
//               </div>

//               {/* Collaborated Projects Section */}
//               {collaboratedProjects.length > 0 && (
//                 <div className="mb-8">
//                   <h3 className="text-xl font-bold text-white mb-4">Collaborated Projects</h3>
//                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                     {collaboratedProjects.map((project) => (
//                       <ProjectCard
//                         key={project.id}
//                         project={project}
//                         hasUnpushedChanges={project.hasUnpushedChanges}
//                         onDelete={() => handleDeleteProject(project.id)}
//                         onPushChanges={() => handlePushChanges(project.id)}
//                         onCheckChanges={handleCheckChanges}
//                         jwtToken={jwtToken}
//                         isCollaborator={true}
//                       />
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </>
//           )}
//         </div>

//         {isJoinModalOpen && (
//           <JoinProjectModal 
//             toggleModal={() => setIsJoinModalOpen(false)} 
//             jwtToken={jwtToken}
//           />
//         )}

//         {isModalOpen && <Modal toggleModal={toggleModal} />}
//       </div>
//     </div>
//   );
// }

// export default Dashboard;


///ui redesign 
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import StatsCard from '../components/StatsCard';
import ProjectCard from '../components/ProjectCard';
import { Plus, Users } from 'lucide-react';
import Modal from '../components/Modal';
import JoinProjectModal from '../components/JoinProjectModal';

function Dashboard({ onLogout, jwtToken }) {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [collaboratedProjects, setCollaboratedProjects] = useState([]);
  
  useEffect(() => {
    getUserData();
    getProjects();
    getCollaboratedProjects();
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

  const getCollaboratedProjects = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/projects/collaborated", {
        headers: { "Authorization": `Bearer ${jwtToken}` }
      });
      const data = await response.json();
      if (!data.error) {
        setCollaboratedProjects(data.projects || []);
      }
    } catch (err) {
      console.error("Error fetching collaborated projects:", err);
    }
  };

  const handleCheckChanges = async (projectId) => {
    try {
      const project = projects.find(p => p.id === projectId) || 
                      collaboratedProjects.find(p => p.id === projectId);
      
      if (!project) {
        alert('Project not found');
        return;
      }

      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.webkitdirectory = true;
      
      input.onchange = async (e) => {
        const target = e.target;
        const selectedFiles = Array.from(target.files || []);
        
        if (selectedFiles.length === 0) {
          alert('No files selected');
          return;
        }

        const filteredFiles = selectedFiles.filter((file) => {
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

        const currentFileStructure = {
          individualFiles: [],
          folders: []
        };

        const folderGroups = {};
        filteredFiles.forEach((file) => {
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
          getCollaboratedProjects();
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

  // const handlePushChanges = async (projectId) => {
  //   try {
  //     const project = projects.find(p => p.id === projectId) || 
  //                     collaboratedProjects.find(p => p.id === projectId);
      
  //     if (!project) {
  //       alert('Project not found');
  //       return;
  //     }

  //     if (!project.hasUnpushedChanges) {
  //       alert('No changes to push');
  //       return;
  //     }

  //     const input = document.createElement('input');
  //     input.type = 'file';
  //     input.multiple = true;
  //     input.webkitdirectory = true;
      
  //     input.onchange = async (e) => {
  //       const target = e.target;
  //       const selectedFiles = Array.from(target.files || []);
        
  //       if (selectedFiles.length === 0) {
  //         alert('No files selected');
  //         return;
  //       }

        // const filteredFiles = selectedFiles.filter((file) => {
        //   const name = file.name.toLowerCase();
        //   const path = file.webkitRelativePath || file.name;
          
        //   if (name.startsWith('.')) return false;
        //   if (path.includes('/.git/') || path.includes('\\.git\\')) return false;
          
        //   const systemFiles = ['thumbs.db', 'desktop.ini', '.ds_store'];
        //   if (systemFiles.includes(name)) return false;
          
        //   const allowedExtensions = [
        //     '.wav', '.mp3', '.mp4', '.flac', '.aiff', '.ogg', 
        //     '.m4a', '.mpeg', '.avi', '.mov', '.flv', '.midi', '.mid'
        //   ];
        //   const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
          
        //   return allowedExtensions.includes(ext);
        // });

  //       const fileStructure = {
  //         individualFiles: [],
  //         folders: []
  //       };

  //       const folderGroups = {};
  //       filteredFiles.forEach((file) => {
  //         const relativePath = file.webkitRelativePath || file.name;
  //         const pathParts = relativePath.split('/');
          
  //         if (pathParts.length > 1) {
  //           const folderPath = pathParts.slice(0, -1).join('/');
  //           if (!folderGroups[folderPath]) {
  //             folderGroups[folderPath] = [];
  //           }
  //           folderGroups[folderPath].push({
  //             name: file.name,
  //             size: file.size,
  //             lastModified: new Date(file.lastModified).toISOString(),
  //             relativePath: relativePath
  //           });
  //         } else {
  //           fileStructure.individualFiles.push({
  //             name: file.name,
  //             size: file.size,
  //             lastModified: new Date(file.lastModified).toISOString(),
  //             relativePath: relativePath
  //           });
  //         }
  //       });

  //       Object.keys(folderGroups).forEach(folderPath => {
  //         fileStructure.folders.push({
  //           name: folderPath,
  //           files: folderGroups[folderPath]
  //         });
  //       });

  //       const formData = new FormData();
  //       formData.append('fileStructure', JSON.stringify(fileStructure));
        
  //       filteredFiles.forEach((file) => {
  //         formData.append('files', file);
  //       });

  //       console.log('📤 Pushing changes...');

  //       try {
  //         const response = await fetch(`http://localhost:5000/api/projects/${projectId}/push`, {
  //           method: 'POST',
  //           headers: {
  //             'Authorization': `Bearer ${jwtToken}`
  //           },
  //           body: formData
  //         });

  //         const data = await response.json();

  //         if (response.ok) {
  //           alert('Changes pushed successfully to GitHub!');
  //           getProjects();
  //           getCollaboratedProjects();
  //         } else {
  //           alert(`Error: ${data.error || 'Failed to push changes'}`);
  //         }
  //       } catch (err) {
  //         console.error('Error pushing changes:', err);
  //         alert('Failed to push changes. Please try again.');
  //       }
  //     };

  //     input.click();
  //   } catch (err) {
  //     console.error('Error in handlePushChanges:', err);
  //     alert('Failed to push changes');
  //   }
  // };

//   const handlePushChanges = async (projectId) => {
//   try {
//     const project = projects.find(p => p.id === projectId) ||
//     collaboratedProjects.find(p => p.id === projectId);

//     if (!project) {
//       alert('Project not found');
//       return;
//     }

//     if (!project.hasUnpushedChanges) {
//       alert('No changes to push');
//       return;
//     }

//     const storedPathKey = `folder_path_${projectId}`;
//     let folderPath = localStorage.getItem(storedPathKey);

//     // If no saved path, prompt once
//     if (!folderPath) {
//       const input = document.createElement('input');
//       input.type = 'file';
//       input.webkitdirectory = true;
//       input.directory = true;
//       input.multiple = true;

//       input.onchange = async (e) => {
//         const selectedFiles = Array.from(e.target.files || []);

//         if (selectedFiles.length === 0) {
//           alert('No folder selected');
//           return;
//         }

//         // Try to detect root folder name from first file
//         const firstRelative = selectedFiles[0]?.webkitRelativePath;
//         if (firstRelative) {
//           const rootFolder = firstRelative.split('/')[0];
//           localStorage.setItem(storedPathKey, rootFolder);
//           console.log(`Saved root folder for push: ${rootFolder}`);
//         }

//         // Proceed with your existing push logic...
//         const filteredFiles = selectedFiles.filter(file => {
//           // ... your filter logic here ...
//         });

//         // ... rest of your file structure + formData + fetch logic ...
//         // (keep exactly the same as before)
//       };

//       input.click();
//     } else {
//       // If we have saved path, we still need files → so prompt again but remember path
//       // Alternative (recommended): Use Electron selectFolder() here too
//       if (window.electron?.selectFolder) {
//         folderPath = await window.electron.selectFolder();
//         if (folderPath) {
//           localStorage.setItem(storedPathKey, folderPath);
//         } else {
//           alert('Folder selection cancelled');
//           return;
//         }
//       }

//       alert(`Using saved folder: ${folderPath}\n\nSelect the project files from this folder to push.`);

//       // Show file input again (but user knows which folder to pick)
//       const input = document.createElement('input');
//       input.type = 'file';
//       input.multiple = true;
//       input.webkitdirectory = true;

//       // ... same onchange logic as above ...
//     }
//   } catch (err) {
//     console.error('Push error:', err);
//     alert('Failed to push changes');
//   }
// };
const handlePushChanges = async (projectId) => {
  try {
    const project =
      projects.find((p) => p.id === projectId) ||
      collaboratedProjects.find((p) => p.id === projectId);

    if (!project) return alert('Project not found');
    if (!project.hasUnpushedChanges) return alert('No changes to push');

    const storedPathKey = `folder_path_${projectId}`;

    // Get saved folder path
    let folderPath = localStorage.getItem(storedPathKey);

    // First time → ask user to pick
    if (!folderPath) {
      if (!window.electronAPI?.selectFolder) {
        return alert('Folder selection not available in this environment');
      }

      folderPath = await window.electronAPI.selectFolder();
      if (!folderPath) return alert('Folder selection cancelled');

      localStorage.setItem(storedPathKey, folderPath);
      await window.electronAPI.saveFolderPath(projectId, folderPath);

      alert(`Project folder saved!\n\n${folderPath}\n\nFuture pushes will be automatic.`);
    }

    // Get current stored file structure from backend
    const res = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    });

    if (!res.ok) throw new Error('Failed to load project structure');

    const projectData = await res.json();
    const fileStructure = projectData.file_paths; // { individualFiles, folders }

    // Ask Electron to read files from disk
    const filesFromDisk = await window.electronAPI.readProjectFiles(projectId, fileStructure);

    if (filesFromDisk.length === 0) {
      return alert(
        'No matching files found in the saved folder.\n' +
          'Please make sure the folder contains your project files.'
      );
    }

    // Build FormData
    const formData = new FormData();
    formData.append('fileStructure', JSON.stringify(fileStructure));

    // Convert base64 → File objects
    for (const f of filesFromDisk) {
      const binary = atob(f.content);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([array]);
      const fileObj = new File([blob], f.name, {
        lastModified: new Date(f.lastModified).getTime(),
      });
      formData.append('files', fileObj);
    }

    // Send to backend
    const pushRes = await fetch(`http://localhost:5000/api/projects/${projectId}/push`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwtToken}` },
      body: formData,
    });

    const pushData = await pushRes.json();

    if (pushRes.ok) {
      alert('Changes pushed successfully to GitHub!');
      getProjects();
      getCollaboratedProjects();
    } else {
      alert(`Push failed: ${pushData.error || pushData.message || 'Unknown error'}`);
    }
  } catch (err) {
    console.error('Push failed:', err);
    alert('Failed to push changes: ' + (err.message || 'Unknown error'));
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
        setCollaboratedProjects(collaboratedProjects.filter(p => p.id !== projectId));
        alert("Project deleted successfully");
      }
    } catch (err) {
      alert("Error deleting project");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-foreground text-lg animate-pulse">⏳ Loading...</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar onLogout={onLogout} user={user} />
      
      <div className="flex-1 overflow-y-auto">
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
                          onCheckChanges={handleCheckChanges}
                          jwtToken={jwtToken}
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
                          onCheckChanges={handleCheckChanges}
                          jwtToken={jwtToken}
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
            jwtToken={jwtToken}
          />
        )}

        {isModalOpen && <Modal toggleModal={toggleModal} />}
      </div>
    </div>
  );
}

export default Dashboard;


