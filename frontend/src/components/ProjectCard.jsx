
// import React, { useState } from 'react';
// import {
//   Github,
//   Trash2,
//   UploadCloud,
//   X,
//   AlertTriangle,
//   Lock,
//   Globe,
//   RefreshCw,
//   Share2,
//   Copy,
//   Check
// } from 'lucide-react';

// function ProjectCard({
//   project,
//   hasUnpushedChanges = false,
//   onDelete,
//   onPushChanges,
//   onCheckChanges,
//   jwtToken,
//   isCollaborator = false
// }) {
//   const [isChecking, setIsChecking] = useState(false);
//   const [showShareModal, setShowShareModal] = useState(false);
//   const [shareLink, setShareLink] = useState('');
//   const [copied, setCopied] = useState(false);
//   const [loadingShare, setLoadingShare] = useState(false);

//   const handleCheckForChanges = async () => {
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
//         headers: {
//           'Authorization': `Bearer ${jwtToken}`
//         }
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

//   return (
//     <>
//       <div
//         className={`relative bg-gray-800 border rounded-xl p-5 transition-all
//           ${
//             hasUnpushedChanges
//               ? 'border-yellow-400 shadow-yellow-400/20 shadow-lg'
//               : 'border-gray-700 hover:border-purple-500'
//           }`}
//       >
//         {/* Change Indicator */}
//         {hasUnpushedChanges && (
//           <div className="absolute -top-3 -right-3 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
//             <AlertTriangle className="w-4 h-4" />
//             Changes detected
//           </div>
//         )}

//         {/* Collaborator Badge */}
//         {isCollaborator && (
//           <div className="absolute -top-3 -left-3 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
//             <Share2 className="w-3 h-3" />
//             Collaborator
//           </div>
//         )}

//         {/* Header */}
//         <div className="flex items-start justify-between mb-4">
//           <div className="flex items-center gap-3">
//             <div className={`${isCollaborator ? 'bg-blue-600' : 'bg-purple-600'} p-2 rounded-lg`}>
//               <Github className="w-5 h-5 text-white" />
//             </div>

//             <div>
//               <h3 className="text-lg font-semibold text-white truncate">
//                 {project.name}
//               </h3>
//               <p className="text-sm text-gray-400 line-clamp-1">
//                 {project.description || 'No description'}
//               </p>
//               {isCollaborator && project.owner && (
//                 <p className="text-xs text-gray-500 mt-1">
//                   Owner: {project.owner.username}
//                 </p>
//               )}
//             </div>
//           </div>

//           {/* Visibility */}
//           <div className="flex items-center gap-1 text-xs text-gray-300">
//             {project.visibility === 'private' ? (
//               <>
//                 <Lock className="w-4 h-4" /> Private
//               </>
//             ) : (
//               <>
//                 <Globe className="w-4 h-4" /> Public
//               </>
//             )}
//           </div>
//         </div>

//         {/* Meta */}
//         <div className="text-xs text-gray-400 mb-4">
//           <span>{project.fileCount ?? 0} files</span>
//           <span className="mx-2">•</span>
//           <span>Last updated: {project.updatedAt || 'Just now'}</span>
//           {isCollaborator && project.localPath && (
//             <>
//               <span className="mx-2">•</span>
//               <span className="text-blue-400">Synced to: {project.localPath}</span>
//             </>
//           )}
//         </div>

//         {/* Actions */}
//         <div className="flex gap-2 mb-2">
//           <button
//             onClick={handleCheckForChanges}
//             disabled={isChecking}
//             className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
//           >
//             <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
//             {isChecking ? 'Checking...' : 'Check Changes'}
//           </button>

//           <button
//             onClick={onPushChanges}
//             disabled={!hasUnpushedChanges}
//             className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
//               ${
//                 hasUnpushedChanges
//                   ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
//                   : 'bg-gray-700 text-gray-400 cursor-not-allowed'
//               }`}
//           >
//             <UploadCloud className="w-4 h-4" />
//             Push Changes
//           </button>
//         </div>

//         {/* Secondary Actions */}
//         <div className="flex gap-2">
//           {!isCollaborator && (
//             <button
//               onClick={handleGenerateShareLink}
//               disabled={loadingShare}
//               className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
//             >
//               <Share2 className="w-4 h-4" />
//               Share
//             </button>
//           )}

//           <button
//             onClick={onDelete}
//             className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-lg transition"
//           >
//             <Trash2 className="w-4 h-4" />
//           </button>
//         </div>
//       </div>

//       {/* Share Link Modal */}
//       {showShareModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
//           <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
//             <div className="p-6">
//               <div className="flex items-center justify-between mb-4">
//                 <h3 className="text-xl font-bold text-white">Share Project</h3>
//                 <button
//                   onClick={() => setShowShareModal(false)}
//                   className="text-gray-400 hover:text-white"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>

//               <p className="text-gray-400 text-sm mb-4">
//                 Share this link with collaborators to let them join your project
//               </p>

//               <div className="bg-gray-700 rounded-lg p-3 mb-4">
//                 <div className="flex items-center gap-2">
//                   <input
//                     type="text"
//                     value={shareLink}
//                     readOnly
//                     className="flex-1 bg-transparent text-white text-sm focus:outline-none"
//                   />
//                   <button
//                     onClick={handleCopyLink}
//                     className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
//                   >
//                     {copied ? (
//                       <>
//                         <Check className="w-4 h-4" />
//                         Copied!
//                       </>
//                     ) : (
//                       <>
//                         <Copy className="w-4 h-4" />
//                         Copy
//                       </>
//                     )}
//                   </button>
//                 </div>
//               </div>

//               <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
//                 <p className="text-blue-300 text-xs">
//                   💡 Anyone with this link can join as a collaborator and make changes to the project
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }

// export default ProjectCard;
// import React, { useState } from 'react';
// import {
//   Github,
//   Trash2,
//   UploadCloud,
//   AlertTriangle,
//   Lock,
//   Globe,
//   RefreshCw,
//   Share2,
//   Copy,
//   Check,
//   Download,
//     X
// } from 'lucide-react';

// function ProjectCard({
//   project,
//   hasUnpushedChanges = false,
//   onDelete,
//   onPushChanges,
//   onCheckChanges,
//   jwtToken,
//   isCollaborator = false
// }) {
//   const [isChecking, setIsChecking] = useState(false);
//   const [showShareModal, setShowShareModal] = useState(false);
//   const [shareLink, setShareLink] = useState('');
//   const [copied, setCopied] = useState(false);
//   const [loadingShare, setLoadingShare] = useState(false);
//   const [isPulling, setIsPulling] = useState(false);

//   const handleCheckForChanges = async () => {
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
//         headers: {
//           'Authorization': `Bearer ${jwtToken}`
//         }
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
//     if (!confirm('Pull latest files from GitHub? This will download files to your local folder.')) {
//       return;
//     }

//     setIsPulling(true);

//     try {
//       const response = await fetch(`http://localhost:5000/api/projects/${project.id}/clone`, {
//         headers: {
//           'Authorization': `Bearer ${jwtToken}`
//         }
//       });

//       const data = await response.json();

//       if (response.ok) {
//         // Trigger download of files
//         alert(`Ready to download ${data.files.length} files!\n\nFiles will be saved to your selected folder.`);
        
//         // Download each file
//         for (const file of data.files) {
//           // Decode base64 content
//           const content = atob(file.content);
//           const bytes = new Uint8Array(content.length);
//           for (let i = 0; i < content.length; i++) {
//             bytes[i] = content.charCodeAt(i);
//           }
          
//           // Create blob and download
//           const blob = new Blob([bytes]);
//           const url = window.URL.createObjectURL(blob);
//           const a = document.createElement('a');
//           a.href = url;
//           a.download = file.name;
//           document.body.appendChild(a);
//           a.click();
//           document.body.removeChild(a);
//           window.URL.revokeObjectURL(url);
          
//           // Small delay between downloads
//           await new Promise(resolve => setTimeout(resolve, 100));
//         }
        
//         alert(`Successfully downloaded ${data.files.length} files!`);
//       } else {
//         alert(data.error || 'Failed to pull files');
//       }
//     } catch (error) {
//       console.error('Error pulling files:', error);
//       alert('Failed to pull files. Please try again.');
//     } finally {
//       setIsPulling(false);
//     }
//   };

//   return (
//     <>
//       <div
//         className={` relative bg-gray-800 border rounded-xl p-5 transition-all
//           ${
//             hasUnpushedChanges
//               ? 'border-yellow-400 shadow-yellow-400/20 shadow-lg'
//               : 'border-gray-700 hover:border-purple-500'
//           }`}
//       >
//         {/* Change Indicator */}
//         {hasUnpushedChanges && (
//           <div className="absolute -top-3 -right-3 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
//             <AlertTriangle className="w-4 h-4" />
//             Changes detected
//           </div>
//         )}

//         {/* Collaborator Badge */}
//         {isCollaborator && (
//           <div className="absolute -top-3 -left-3 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
//             <Share2 className="w-3 h-3" />
//             Collaborator
//           </div>
//         )}

//         {/* Header */}
//         <div className="flex items-start justify-between mb-4">
//           <div className="flex items-center gap-3">
//             <div className={`${isCollaborator ? 'bg-blue-600' : 'bg-purple-600'} p-2 rounded-lg`}>
//               <Github className="w-5 h-5 text-white" />
//             </div>

//             <div>
//               <h3 className="text-lg font-semibold text-white truncate">
//                 {project.name}
//               </h3>
//               <p className="text-sm text-gray-400 line-clamp-1">
//                 {project.description || 'No description'}
//               </p>
//               {isCollaborator && project.owner && (
//                 <p className="text-xs text-gray-500 mt-1">
//                   Owner: {project.owner.username}
//                 </p>
//               )}
//             </div>
//           </div>

//           {/* Visibility */}
//           <div className="flex items-center gap-1 text-xs text-gray-300">
//             {project.visibility === 'private' ? (
//               <>
//                 <Lock className="w-4 h-4" /> Private
//               </>
//             ) : (
//               <>
//                 <Globe className="w-4 h-4" /> Public
//               </>
//             )}
//           </div>
//         </div>

//         {/* Meta */}
//         <div className="text-xs text-gray-400 mb-4">
//           <span>{project.fileCount ?? 0} files</span>
//           <span className="mx-2">•</span>
//           <span>Last updated: {project.updatedAt || 'Just now'}</span>
//           {isCollaborator && project.localPath && (
//             <>
//               <span className="mx-2">•</span>
//               <span className="text-blue-400">Synced to: {project.localPath}</span>
//             </>
//           )}
//         </div>

//         {/* Actions */}
//         <div className="flex gap-2 mb-2">
//           <button
//             onClick={handleCheckForChanges}
//             disabled={isChecking}
//             className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
//           >
//             <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
//             {isChecking ? 'Checking...' : 'Check Changes'}
//           </button>

//           <button
//             onClick={onPushChanges}
//             disabled={!hasUnpushedChanges}
//             className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
//               ${
//                 hasUnpushedChanges
//                   ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
//                   : 'bg-gray-700 text-gray-400 cursor-not-allowed'
//               }`}
//           >
//             <UploadCloud className="w-4 h-4" />
//             Push Changes
//           </button>

//           <button
//             onClick={handlePullFiles}
//             disabled={isPulling}
//             className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
//             title="Pull latest files from GitHub"
//           >
//             <Download className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
//           </button>
//         </div>

//         {/* Secondary Actions */}
//         <div className="flex gap-2">
//           {!isCollaborator && (
//             <button
//               onClick={handleGenerateShareLink}
//               disabled={loadingShare}
//               className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
//             >
//               <Share2 className="w-4 h-4" />
//               Share
//             </button>
//           )}

//           <button
//             onClick={onDelete}
//             className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-lg transition"
//           >
//             <Trash2 className="w-4 h-4" />
//           </button>
//         </div>
//       </div>

//       {/* Share Link Modal */}
//       {showShareModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
//           <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
//             <div className="p-6">
//               <div className="flex items-center justify-between mb-4">
//                 <h3 className="text-xl font-bold text-white">Share Project</h3>
//                 <button
//                   onClick={() => setShowShareModal(false)}
//                   className="text-gray-400 hover:text-white"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>

//               <p className="text-gray-400 text-sm mb-4">
//                 Share this link with collaborators to let them join your project
//               </p>

//               <div className="bg-gray-700 rounded-lg p-3 mb-4">
//                 <div className="flex items-center gap-2">
//                   <input
//                     type="text"
//                     value={shareLink}
//                     readOnly
//                     className="flex-1 bg-transparent text-white text-sm focus:outline-none"
//                   />
//                   <button
//                     onClick={handleCopyLink}
//                     className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
//                   >
//                     {copied ? (
//                       <>
//                         <Check className="w-4 h-4" />
//                         Copied!
//                       </>
//                     ) : (
//                       <>
//                         <Copy className="w-4 h-4" />
//                         Copy
//                       </>
//                     )}
//                   </button>
//                 </div>
//               </div>

//               <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
//                 <p className="text-blue-300 text-xs">
//                   💡 Anyone with this link can join as a collaborator and make changes to the project
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }

// export default ProjectCard;


// import React, { useState } from 'react';
// import {
//   Github,
//   Trash2,
//   UploadCloud,
//   AlertTriangle,
//   Lock,
//   Globe,
//   RefreshCw,
//   Share2,
//   Copy,
//   Check,
//   Download,
//   X,
//   Folder
// } from 'lucide-react';

// function ProjectCard({
//   project,
//   hasUnpushedChanges = false,
//   onDelete,
//   onPushChanges,
//   onCheckChanges,
//   jwtToken,
//   isCollaborator = false
// }) {
//   const [isChecking, setIsChecking] = useState(false);
//   const [showShareModal, setShowShareModal] = useState(false);
//   const [shareLink, setShareLink] = useState('');
//   const [copied, setCopied] = useState(false);
//   const [loadingShare, setLoadingShare] = useState(false);
//   const [isPulling, setIsPulling] = useState(false);

//   // Extract folder name from file_paths structure
//   const getProjectFolderName = () => {
//     if (!project.file_paths) return null;
    
//     const filePaths = typeof project.file_paths === 'string' 
//       ? JSON.parse(project.file_paths) 
//       : project.file_paths;
    
//     // Check if there are folders
//     if (filePaths.folders && filePaths.folders.length > 0) {
//       // Get the root folder name (first part before /)
//       const firstFolder = filePaths.folders[0].name;
//       const rootFolder = firstFolder.split('/')[0];
//       return rootFolder;
//     }
    
//     // Check individual files for webkitRelativePath
//     if (filePaths.individualFiles && filePaths.individualFiles.length > 0) {
//       const firstFile = filePaths.individualFiles[0];
//       if (firstFile.relativePath) {
//         const parts = firstFile.relativePath.split('/');
//         if (parts.length > 1) {
//           return parts[0];
//         }
//       }
//     }
    
//     return null;
//   };

//   const handleCheckForChanges = async () => {
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
//         headers: {
//           'Authorization': `Bearer ${jwtToken}`
//         }
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
//     if (!confirm('Pull latest files from GitHub? This will download files to your local folder.')) {
//       return;
//     }

//     setIsPulling(true);

//     try {
//       const response = await fetch(`http://localhost:5000/api/projects/${project.id}/clone`, {
//         headers: {
//           'Authorization': `Bearer ${jwtToken}`
//         }
//       });

//       const data = await response.json();

//       if (response.ok) {
//         alert(`Ready to download ${data.files.length} files!\n\nFiles will be saved to your selected folder.`);
        
//         for (const file of data.files) {
//           const content = atob(file.content);
//           const bytes = new Uint8Array(content.length);
//           for (let i = 0; i < content.length; i++) {
//             bytes[i] = content.charCodeAt(i);
//           }
          
//           const blob = new Blob([bytes]);
//           const url = window.URL.createObjectURL(blob);
//           const a = document.createElement('a');
//           a.href = url;
//           a.download = file.name;
//           document.body.appendChild(a);
//           a.click();
//           document.body.removeChild(a);
//           window.URL.revokeObjectURL(url);
          
//           await new Promise(resolve => setTimeout(resolve, 100));
//         }
        
//         alert(`Successfully downloaded ${data.files.length} files!`);
//       } else {
//         alert(data.error || 'Failed to pull files');
//       }
//     } catch (error) {
//       console.error('Error pulling files:', error);
//       alert('Failed to pull files. Please try again.');
//     } finally {
//       setIsPulling(false);
//     }
//   };

//   const projectFolderName = getProjectFolderName();

//   return (
//     <>
//       <div
//         className={`relative bg-gray-800 border rounded-xl p-5 transition-all
//           ${
//             hasUnpushedChanges
//               ? 'border-yellow-400 shadow-yellow-400/20 shadow-lg'
//               : 'border-gray-700 hover:border-purple-500'
//           }`}
//       >
//         {/* Change Indicator */}
//         {hasUnpushedChanges && (
//           <div className="absolute -top-3 -right-3 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
//             <AlertTriangle className="w-4 h-4" />
//             Changes detected
//           </div>
//         )}

//         {/* Collaborator Badge */}
//         {isCollaborator && (
//           <div className="absolute -top-3 -left-3 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
//             <Share2 className="w-3 h-3" />
//             Collaborator
//           </div>
//         )}

//         {/* Header */}
//         <div className="flex items-start justify-between mb-4">
//           <div className="flex items-center gap-3">
//             <div className={`${isCollaborator ? 'bg-blue-600' : 'bg-purple-600'} p-2 rounded-lg`}>
//               <Github className="w-5 h-5 text-white" />
//             </div>

//             <div>
//               <h3 className="text-lg font-semibold text-white truncate">
//                 {project.name}
//               </h3>
//               <p className="text-sm text-gray-400 line-clamp-1">
//                 {project.description || 'No description'}
//               </p>
//               {isCollaborator && project.owner && (
//                 <p className="text-xs text-gray-500 mt-1">
//                   Owner: {project.owner.username}
//                 </p>
//               )}
//             </div>
//           </div>

//           {/* Visibility */}
//           <div className="flex items-center gap-1 text-xs text-gray-300">
//             {project.visibility === 'private' ? (
//               <>
//                 <Lock className="w-4 h-4" /> Private
//               </>
//             ) : (
//               <>
//                 <Globe className="w-4 h-4" /> Public
//               </>
//             )}
//           </div>
//         </div>

//         {/* Meta */}
//         <div className="text-xs text-gray-400 mb-4">
//           <span>{project.fileCount ?? 0} files</span>
//           <span className="mx-2">•</span>
//           <span>Last updated: {project.updatedAt || 'Just now'}</span>
//           {isCollaborator && project.localPath && (
//             <>
//               <span className="mx-2">•</span>
//               <span className="text-blue-400">Synced to: {project.localPath}</span>
//             </>
//           )}
//         </div>

//         {/* Project Folder Name Display */}
//         {projectFolderName && (
//           <div className="bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 mb-4">
//             <div className="flex items-center gap-2 text-sm">
//               <Folder className="w-4 h-4 text-purple-400" />
//               <span className="text-gray-400">Project folder:</span>
//               <span className="text-white font-medium">{projectFolderName}</span>
//             </div>
//             <p className="text-xs text-gray-500 mt-1 ml-6">
//               ⚠️ Use this exact folder name when pushing changes
//             </p>
//           </div>
//         )}

//         {/* Actions */}
//         <div className="flex gap-2 mb-2">
//           <button
//             onClick={handleCheckForChanges}
//             disabled={isChecking}
//             className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
//           >
//             <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
//             {isChecking ? 'Checking...' : 'Check Changes'}
//           </button>

//           <button
//             onClick={onPushChanges}
//             disabled={!hasUnpushedChanges}
//             className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
//               ${
//                 hasUnpushedChanges
//                   ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
//                   : 'bg-gray-700 text-gray-400 cursor-not-allowed'
//               }`}
//           >
//             <UploadCloud className="w-4 h-4" />
//             Push Changes
//           </button>

//           <button
//             onClick={handlePullFiles}
//             disabled={isPulling}
//             className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
//             title="Pull latest files from GitHub"
//           >
//             <Download className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
//           </button>
//         </div>

//         {/* Secondary Actions */}
//         <div className="flex gap-2">
//           {!isCollaborator && (
//             <button
//               onClick={handleGenerateShareLink}
//               disabled={loadingShare}
//               className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
//             >
//               <Share2 className="w-4 h-4" />
//               Share
//             </button>
//           )}

//           <button
//             onClick={onDelete}
//             className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-lg transition"
//           >
//             <Trash2 className="w-4 h-4" />
//           </button>
//         </div>
//       </div>

//       {/* Share Link Modal */}
//       {showShareModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
//           <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
//             <div className="p-6">
//               <div className="flex items-center justify-between mb-4">
//                 <h3 className="text-xl font-bold text-white">Share Project</h3>
//                 <button
//                   onClick={() => setShowShareModal(false)}
//                   className="text-gray-400 hover:text-white"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>

//               <p className="text-gray-400 text-sm mb-4">
//                 Share this link with collaborators to let them join your project
//               </p>

//               <div className="bg-gray-700 rounded-lg p-3 mb-4">
//                 <div className="flex items-center gap-2">
//                   <input
//                     type="text"
//                     value={shareLink}
//                     readOnly
//                     className="flex-1 bg-transparent text-white text-sm focus:outline-none"
//                   />
//                   <button
//                     onClick={handleCopyLink}
//                     className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
//                   >
//                     {copied ? (
//                       <>
//                         <Check className="w-4 h-4" />
//                         Copied!
//                       </>
//                     ) : (
//                       <>
//                         <Copy className="w-4 h-4" />
//                         Copy
//                       </>
//                     )}
//                   </button>
//                 </div>
//               </div>

//               <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
//                 <p className="text-blue-300 text-xs">
//                   💡 Anyone with this link can join as a collaborator and make changes to the project
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }

// export default ProjectCard;

// import React, { useState } from 'react';
// import {
//   Github,
//   Trash2,
//   UploadCloud,
//   AlertTriangle,
//   Lock,
//   Globe,
//   RefreshCw,
//   Share2,
//   Copy,
//   Check,
//   Download,
//   X,
//   Folder
// } from 'lucide-react';

// function ProjectCard({
//   project,
//   hasUnpushedChanges = false,
//   onDelete,
//   onPushChanges,
//   onCheckChanges,
//   jwtToken,
//   isCollaborator = false
// }) {
//   const [isChecking, setIsChecking] = useState(false);
//   const [showShareModal, setShowShareModal] = useState(false);
//   const [shareLink, setShareLink] = useState('');
//   const [copied, setCopied] = useState(false);
//   const [loadingShare, setLoadingShare] = useState(false);
//   const [isPulling, setIsPulling] = useState(false);

//   // Extract folder name from file_paths structure
//   const getProjectFolderName = () => {
//     if (!project.file_paths) return null;
    
//     const filePaths = typeof project.file_paths === 'string' 
//       ? JSON.parse(project.file_paths) 
//       : project.file_paths;
    
//     // Check if there are folders
//     if (filePaths.folders && filePaths.folders.length > 0) {
//       // Get the root folder name (first part before /)
//       const firstFolder = filePaths.folders[0].name;
//       const rootFolder = firstFolder.split('/')[0];
//       return rootFolder;
//     }
    
//     // Check individual files for webkitRelativePath
//     if (filePaths.individualFiles && filePaths.individualFiles.length > 0) {
//       const firstFile = filePaths.individualFiles[0];
//       if (firstFile.relativePath) {
//         const parts = firstFile.relativePath.split('/');
//         if (parts.length > 1) {
//           return parts[0];
//         }
//       }
//     }
    
//     return null;
//   };

//   const handleCheckForChanges = async () => {
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
//         headers: {
//           'Authorization': `Bearer ${jwtToken}`
//         }
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
//     if (!confirm('Pull latest changes from GitHub?')) {
//       return;
//     }

//     setIsPulling(true);

//     try {
//       // First, check if there are any changes
//       const changesResponse = await fetch(`http://localhost:5000/api/projects/${project.id}/check-remote-changes`, {
//         headers: {
//           'Authorization': `Bearer ${jwtToken}`
//         }
//       });

//       const changesData = await changesResponse.json();

//       if (!changesResponse.ok) {
//         alert(changesData.error || 'Failed to check for changes');
//         return;
//       }

//       if (!changesData.hasChanges) {
//         alert('No new changes to pull. Your local folder is up to date!');
//         return;
//       }

//       // Get only the changed files
//       const response = await fetch(`http://localhost:5000/api/projects/${project.id}/pull-changes`, {
//         headers: {
//           'Authorization': `Bearer ${jwtToken}`
//         }
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         alert(data.error || 'Failed to pull changes');
//         return;
//       }

//       if (data.changedFiles.length === 0) {
//         alert('No files to download.');
//         return;
//       }

//       // Check if we have a stored folder path for this project
//       const storedPathKey = `folder_path_${project.id}`;
//       let folderPath = localStorage.getItem(storedPathKey);

//       // If no stored path or user wants to change, show folder picker
//       if (!folderPath) {
//         // Use Electron's dialog for folder selection
//         if (window.electron && window.electron.selectFolder) {
//           folderPath = await window.electron.selectFolder();
//           if (!folderPath) {
//             alert('Folder selection cancelled');
//             return;
//           }
//           // Store the path for future use
//           localStorage.setItem(storedPathKey, folderPath);
//           console.log('✅ Folder path stored for future use');
//         } else {
//           alert('Folder selection is not available in this environment');
//           return;
//         }
//       } else {
//         console.log('✅ Using stored folder path:', folderPath);
//       }

//       // Send files to main process for writing
//       if (window.electron && window.electron.writeFiles) {
//         const result = await window.electron.writeFiles({
//           folderPath,
//           files: data.changedFiles.map(file => ({
//             path: file.path,
//             content: file.content, // base64
//             size: file.size
//           }))
//         });

//         if (result.success) {
//           alert(`Successfully pulled ${result.successCount} changed file(s)!`);
//         } else {
//           alert(`Downloaded ${result.successCount} file(s).\n${result.failCount} file(s) failed.\n\nError: ${result.error || 'Unknown error'}`);
//         }
//       } else {
//         alert('File writing is not available in this environment');
//       }

//     } catch (error) {
//       console.error('Error pulling files:', error);
//       alert('Failed to pull changes. Please try again.');
//     } finally {
//       setIsPulling(false);
//     }
//   };

//   const projectFolderName = getProjectFolderName();

//   return (
//     <>
//       <div
//         className={`relative bg-gray-800 border rounded-xl p-5 transition-all
//           ${
//             hasUnpushedChanges
//               ? 'border-yellow-400 shadow-yellow-400/20 shadow-lg'
//               : 'border-gray-700 hover:border-purple-500'
//           }`}
//       >
//         {/* Change Indicator */}
//         {hasUnpushedChanges && (
//           <div className="absolute -top-3 -right-3 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
//             <AlertTriangle className="w-4 h-4" />
//             Changes detected
//           </div>
//         )}

//         {/* Collaborator Badge */}
//         {isCollaborator && (
//           <div className="absolute -top-3 -left-3 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
//             <Share2 className="w-3 h-3" />
//             Collaborator
//           </div>
//         )}

//         {/* Header */}
//         <div className="flex items-start justify-between mb-4">
//           <div className="flex items-center gap-3">
//             <div className={`${isCollaborator ? 'bg-blue-600' : 'bg-purple-600'} p-2 rounded-lg`}>
//               <Github className="w-5 h-5 text-white" />
//             </div>

//             <div>
//               <h3 className="text-lg font-semibold text-white truncate">
//                 {project.name}
//               </h3>
//               <p className="text-sm text-gray-400 line-clamp-1">
//                 {project.description || 'No description'}
//               </p>
//               {isCollaborator && project.owner && (
//                 <p className="text-xs text-gray-500 mt-1">
//                   Owner: {project.owner.username}
//                 </p>
//               )}
//             </div>
//           </div>

//           {/* Visibility */}
//           <div className="flex items-center gap-1 text-xs text-gray-300">
//             {project.visibility === 'private' ? (
//               <>
//                 <Lock className="w-4 h-4" /> Private
//               </>
//             ) : (
//               <>
//                 <Globe className="w-4 h-4" /> Public
//               </>
//             )}
//           </div>
//         </div>

//         {/* Meta */}
//         <div className="text-xs text-gray-400 mb-4">
//           <span>{project.fileCount ?? 0} files</span>
//           <span className="mx-2">•</span>
//           <span>Last updated: {project.updatedAt || 'Just now'}</span>
//           {isCollaborator && project.localPath && (
//             <>
//               <span className="mx-2">•</span>
//               <span className="text-blue-400">Synced to: {project.localPath}</span>
//             </>
//           )}
//         </div>

//         {/* Project Folder Name Display */}
//         {projectFolderName && (
//           <div className="bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 mb-4">
//             <div className="flex items-center gap-2 text-sm">
//               <Folder className="w-4 h-4 text-purple-400" />
//               <span className="text-gray-400">Project folder:</span>
//               <span className="text-white font-medium">{projectFolderName}</span>
//             </div>
//             <p className="text-xs text-gray-500 mt-1 ml-6">
//               ⚠️ Use this exact folder name when pushing changes
//             </p>
//           </div>
//         )}

//         {/* Actions */}
//         <div className="flex gap-2 mb-2">
//           <button
//             onClick={handleCheckForChanges}
//             disabled={isChecking}
//             className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
//           >
//             <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
//             {isChecking ? 'Checking...' : 'Check Changes'}
//           </button>

//           <button
//             onClick={onPushChanges}
//             disabled={!hasUnpushedChanges}
//             className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
//               ${
//                 hasUnpushedChanges
//                   ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
//                   : 'bg-gray-700 text-gray-400 cursor-not-allowed'
//               }`}
//           >
//             <UploadCloud className="w-4 h-4" />
//             Push Changes
//           </button>

//           <button
//             onClick={handlePullFiles}
//             disabled={isPulling}
//             className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
//             title="Pull latest files from GitHub"
//           >
//             <Download className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
//           </button>
//         </div>

//         {/* Secondary Actions */}
//         <div className="flex gap-2">
//           {!isCollaborator && (
//             <button
//               onClick={handleGenerateShareLink}
//               disabled={loadingShare}
//               className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
//             >
//               <Share2 className="w-4 h-4" />
//               Share
//             </button>
//           )}

//           <button
//             onClick={onDelete}
//             className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-lg transition"
//           >
//             <Trash2 className="w-4 h-4" />
//           </button>
//         </div>
//       </div>

//       {/* Share Link Modal */}
//       {showShareModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
//           <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
//             <div className="p-6">
//               <div className="flex items-center justify-between mb-4">
//                 <h3 className="text-xl font-bold text-white">Share Project</h3>
//                 <button
//                   onClick={() => setShowShareModal(false)}
//                   className="text-gray-400 hover:text-white"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>

//               <p className="text-gray-400 text-sm mb-4">
//                 Share this link with collaborators to let them join your project
//               </p>

//               <div className="bg-gray-700 rounded-lg p-3 mb-4">
//                 <div className="flex items-center gap-2">
//                   <input
//                     type="text"
//                     value={shareLink}
//                     readOnly
//                     className="flex-1 bg-transparent text-white text-sm focus:outline-none"
//                   />
//                   <button
//                     onClick={handleCopyLink}
//                     className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
//                   >
//                     {copied ? (
//                       <>
//                         <Check className="w-4 h-4" />
//                         Copied!
//                       </>
//                     ) : (
//                       <>
//                         <Copy className="w-4 h-4" />
//                         Copy
//                       </>
//                     )}
//                   </button>
//                 </div>
//               </div>

//               <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
//                 <p className="text-blue-300 text-xs">
//                   💡 Anyone with this link can join as a collaborator and make changes to the project
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }

// export default ProjectCard;


// import React from "react";
// import { Trash2, Upload, RefreshCw, Music2 } from "lucide-react";
// import GlassCard from "./GlassCard";

// const ProjectCard = ({ 
//   project, 
//   hasUnpushedChanges, 
//   onDelete, 
//   onPushChanges, 
//   onCheckChanges,
//   isCollaborator = false 
// }) => {
//   return (
//     <GlassCard className="group" glow="purple">
//       <div className="flex items-start justify-between mb-4">
//         <div className="flex items-center gap-3">
//           <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-neon-pink flex items-center justify-center group-hover:rotate-12 transition-all duration-300">
//             <Music2 className="w-6 h-6 text-primary-foreground" />
//           </div>
//           <div>
//             <h3 className="font-bold text-foreground">{project.name}</h3>
//             {isCollaborator && (
//               <span className="text-xs text-neon-cyan">Collaborator</span>
//             )}
//           </div>
//         </div>
//         {hasUnpushedChanges && (
//           <div className="w-3 h-3 rounded-full bg-neon-pink animate-pulse" />
//         )}
//       </div>

//       <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
//         {project.description || "No description"}
//       </p>

//       <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
//         {project.collaborators && (
//           <span>{project.collaborators} collaborators</span>
//         )}
//         {project.lastUpdated && (
//           <span>• Updated {project.lastUpdated}</span>
//         )}
//       </div>

//       <div className="flex gap-2">
//         <button
//           onClick={() => onCheckChanges(project.id)}
//           className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all hover:scale-105 active:scale-95"
//         >
//           <RefreshCw className="w-4 h-4" />
//           Check
//         </button>
//         {hasUnpushedChanges && (
//           <button
//             onClick={onPushChanges}
//             className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 transition-all hover:scale-105 active:scale-95"
//           >
//             <Upload className="w-4 h-4" />
//             Push
//           </button>
//         )}
//         <button
//           onClick={onDelete}
//           className="px-3 py-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-all hover:scale-105 active:scale-95"
//         >
//           <Trash2 className="w-4 h-4" />
//         </button>
//       </div>
//     </GlassCard>
//   );
// };

// export default ProjectCard;
//ui redesigb

// import React, { useState } from 'react';
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
//   Folder
// } from 'lucide-react';

// function ProjectCard({
//   project,
//   hasUnpushedChanges = false,
//   onDelete,
//   onPushChanges,
//   onCheckChanges,
//   jwtToken,
//   isCollaborator = false
// }) {
//   const [isChecking, setIsChecking] = useState(false);
//   const [showShareModal, setShowShareModal] = useState(false);
//   const [shareLink, setShareLink] = useState('');
//   const [copied, setCopied] = useState(false);
//   const [loadingShare, setLoadingShare] = useState(false);
//   const [isPulling, setIsPulling] = useState(false);

//   // Extract folder name from file_paths structure
//   const getProjectFolderName = () => {
//     if (!project.file_paths) return null;
    
//     const filePaths = typeof project.file_paths === 'string' 
//       ? JSON.parse(project.file_paths) 
//       : project.file_paths;
    
//     if (filePaths.folders && filePaths.folders.length > 0) {
//       const firstFolder = filePaths.folders[0].name;
//       const rootFolder = firstFolder.split('/')[0];
//       return rootFolder;
//     }
    
//     if (filePaths.individualFiles && filePaths.individualFiles.length > 0) {
//       const firstFile = filePaths.individualFiles[0];
//       if (firstFile.relativePath) {
//         const parts = firstFile.relativePath.split('/');
//         if (parts.length > 1) {
//           return parts[0];
//         }
//       }
//     }
    
//     return null;
//   };

//   const handleCheckForChanges = async () => {
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
//         headers: {
//           'Authorization': `Bearer ${jwtToken}`
//         }
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
//     if (!confirm('Pull latest changes from GitHub?')) {
//       return;
//     }

//     setIsPulling(true);

//     try {
//       const changesResponse = await fetch(`http://localhost:5000/api/projects/${project.id}/check-remote-changes`, {
//         headers: {
//           'Authorization': `Bearer ${jwtToken}`
//         }
//       });

//       const changesData = await changesResponse.json();

//       if (!changesResponse.ok) {
//         alert(changesData.error || 'Failed to check for changes');
//         return;
//       }

//       if (!changesData.hasChanges) {
//         alert('No new changes to pull. Your local folder is up to date!');
//         return;
//       }

//       const response = await fetch(`http://localhost:5000/api/projects/${project.id}/pull-changes`, {
//         headers: {
//           'Authorization': `Bearer ${jwtToken}`
//         }
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         alert(data.error || 'Failed to pull changes');
//         return;
//       }

//       if (data.changedFiles.length === 0) {
//         alert('No files to download.');
//         return;
//       }

//       const storedPathKey = `folder_path_${project.id}`;
//       let folderPath = localStorage.getItem(storedPathKey);

//       if (!folderPath) {
//         if (window.electron && window.electron.selectFolder) {
//           folderPath = await window.electron.selectFolder();
//           if (!folderPath) {
//             alert('Folder selection cancelled');
//             return;
//           }
//           localStorage.setItem(storedPathKey, folderPath);
//           console.log('✅ Folder path stored for future use');
//         } else {
//           alert('Folder selection is not available in this environment');
//           return;
//         }
//       } else {
//         console.log('✅ Using stored folder path:', folderPath);
//       }

//       if (window.electron && window.electron.writeFiles) {
//         const result = await window.electron.writeFiles({
//           folderPath,
//           files: data.changedFiles.map(file => ({
//             path: file.path,
//             content: file.content,
//             size: file.size
//           }))
//         });

//         if (result.success) {
//           alert(`Successfully pulled ${result.successCount} changed file(s)!`);
//         } else {
//           alert(`Downloaded ${result.successCount} file(s).\n${result.failCount} file(s) failed.\n\nError: ${result.error || 'Unknown error'}`);
//         }
//       } else {
//         alert('File writing is not available in this environment');
//       }

//     } catch (error) {
//       console.error('Error pulling files:', error);
//       alert('Failed to pull changes. Please try again.');
//     } finally {
//       setIsPulling(false);
//     }
//   };
  

//   const projectFolderName = getProjectFolderName();

//   return (
//     <>
//       <div className={`relative glass rounded-2xl p-5 transition-all duration-300 hover:scale-[1.01] border ${
//         hasUnpushedChanges
//           ? 'border-yellow-400/50 shadow-yellow-400/20 shadow-lg'
//           : 'border-border hover:border-primary/30'
//       }`}>
//         {/* Change Indicator */}
//         {hasUnpushedChanges && (
//           <div className="absolute -top-3 -right-3 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
//             <AlertTriangle className="w-4 h-4" />
//             Changes detected
//           </div>
//         )}

//         {/* Collaborator Badge */}
//         {isCollaborator && (
//           <div className="absolute -top-3 -left-3 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
//             <Share2 className="w-3 h-3" />
//             Collaborator
//           </div>
//         )}

//         {/* Header */}
//         <div className="flex items-start justify-between mb-4">
//           <div className="flex items-center gap-3">
//             <div className={`${isCollaborator ? 'bg-secondary' : 'bg-primary'} p-2 rounded-lg glow-${isCollaborator ? 'secondary' : 'primary'}`}>
//               <Github className="w-5 h-5 text-${isCollaborator ? 'secondary' : 'primary'}-foreground" />
//             </div>

//             <div>
//               <h3 className="text-lg font-semibold text-foreground truncate">
//                 {project.name}
//               </h3>
//               <p className="text-sm text-muted-foreground line-clamp-1">
//                 {project.description || 'No description'}
//               </p>
//               {isCollaborator && project.owner && (
//                 <p className="text-xs text-muted-foreground mt-1">
//                   Owner: {project.owner.username}
//                 </p>
//               )}
//             </div>
//           </div>

//           {/* Visibility */}
//           <div className="flex items-center gap-1 text-xs text-muted-foreground">
//             {project.visibility === 'private' ? (
//               <>
//                 <Lock className="w-4 h-4" /> Private
//               </>
//             ) : (
//               <>
//                 <Globe className="w-4 h-4" /> Public
//               </>
//             )}
//           </div>
//         </div>

//         {/* Meta */}
//         <div className="text-xs text-muted-foreground mb-4">
//           <span>{project.fileCount ?? 0} files</span>
//           <span className="mx-2">•</span>
//           <span>Last updated: {project.updatedAt || 'Just now'}</span>
//           {isCollaborator && project.localPath && (
//             <>
//               <span className="mx-2">•</span>
//               <span className="text-secondary">Synced to: {project.localPath}</span>
//             </>
//           )}
//         </div>

//         {/* Project Folder Name Display */}
//         {projectFolderName && (
//           <div className="glass border border-border/50 rounded-lg px-3 py-2 mb-4">
//             <div className="flex items-center gap-2 text-sm">
//               <Folder className="w-4 h-4 text-primary" />
//               <span className="text-muted-foreground">Project folder:</span>
//               <span className="text-foreground font-medium">{projectFolderName}</span>
//             </div>
//             <p className="text-xs text-muted-foreground mt-1 ml-6">
//               ⚠️ Use this exact folder name when pushing changes
//             </p>
//           </div>
//         )}

//         {/* Actions */}
//         <div className="flex gap-2 mb-2">
//           <button
//             onClick={handleCheckForChanges}
//             disabled={isChecking}
//             className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-secondary hover:bg-secondary/80 text-secondary-foreground disabled:opacity-50 hover:scale-105 active:scale-95"
//           >
//             <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
//             {isChecking ? 'Checking...' : 'Check Changes'}
//           </button>

//           <button
//             onClick={onPushChanges}
//             disabled={!hasUnpushedChanges}
//             className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95
//               ${hasUnpushedChanges
//                 ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
//                 : 'bg-muted text-muted-foreground cursor-not-allowed'
//               }`}
//           >
//             <Upload className="w-4 h-4" />
//             Push Changes
//           </button>

//           <button
//             onClick={handlePullFiles}
//             disabled={isPulling}
//             className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 hover:scale-105 active:scale-95"
//             title="Pull latest files from GitHub"
//           >
//             <Download className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
//           </button>
//         </div>

//         {/* Secondary Actions */}
//         <div className="flex gap-2">
//           {!isCollaborator && (
//             <button
//               onClick={handleGenerateShareLink}
//               disabled={loadingShare}
//               className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
//             >
//               <Share2 className="w-4 h-4" />
//               Share
//             </button>
//           )}

//           <button
//             onClick={onDelete}
//             className="bg-destructive/10 hover:bg-destructive/20 text-destructive px-3 py-2 rounded-lg transition-all hover:scale-105 active:scale-95"
//           >
//             <Trash2 className="w-4 h-4" />
//           </button>
//         </div>
//       </div>

//       {/* Share Link Modal */}
//       {showShareModal && (
//         <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="glass-strong rounded-2xl shadow-2xl w-full max-w-md border border-border">
//             <div className="p-6">
//               <div className="flex items-center justify-between mb-4">
//                 <h3 className="text-xl font-bold text-foreground">Share Project</h3>
//                 <button
//                   onClick={() => setShowShareModal(false)}
//                   className="text-muted-foreground hover:text-foreground transition-colors"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>

//               <p className="text-muted-foreground text-sm mb-4">
//                 Share this link with collaborators to let them join your project
//               </p>

//               <div className="glass rounded-lg p-3 mb-4">
//                 <div className="flex items-center gap-2">
//                   <input
//                     type="text"
//                     value={shareLink}
//                     readOnly
//                     className="flex-1 bg-transparent text-foreground text-sm focus:outline-none"
//                   />
//                   <button
//                     onClick={handleCopyLink}
//                     className="bg-primary hover:bg-primary/80 text-primary-foreground px-3 py-1 rounded text-sm flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
//                   >
//                     {copied ? (
//                       <>
//                         <Check className="w-4 h-4" />
//                         Copied!
//                       </>
//                     ) : (
//                       <>
//                         <Copy className="w-4 h-4" />
//                         Copy
//                       </>
//                     )}
//                   </button>
//                 </div>
//               </div>

//               <div className="glass border border-primary/30 rounded-lg p-3">
//                 <p className="text-primary text-xs">
//                   💡 Anyone with this link can join as a collaborator and make changes to the project
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }

// export default ProjectCard;

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