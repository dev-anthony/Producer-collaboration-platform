// import React, { useState } from 'react';
// import { X, Upload, FolderOpen, Github, Music, Film, FileAudio } from 'lucide-react';

// function Modal({ toggleModal }) {
//   const [formData, setFormData] = useState({
//     projectName: '',
//     description: '',
//     visibility: 'private'
//   });
  
//   const [files, setFiles] = useState([]);
//   const [isDragging, setIsDragging] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: value
//     }));
//   };

//   const handleFileSelect = (e) => {
//     const selectedFiles = Array.from(e.target.files);
//     addFiles(selectedFiles);
//   };

//   const addFiles = (newFiles) => {
//     const filesWithMetadata = newFiles.map(file => ({
//       file,
//       name: file.name,
//       size: file.size,
//       type: file.type,
//       path: file.path || file.webkitRelativePath || 'Unknown path',
//       id: Math.random().toString(36).substr(2, 9)
//     }));
//     setFiles(prev => [...prev, ...filesWithMetadata]);
//   };

//   const handleDragOver = (e) => {
//     e.preventDefault();
//     setIsDragging(true);
//   };

//   const handleDragLeave = (e) => {
//     e.preventDefault();
//     setIsDragging(false);
//   };

//   const handleDrop = (e) => {
//     e.preventDefault();
//     setIsDragging(false);
//     const droppedFiles = Array.from(e.dataTransfer.files);
//     addFiles(droppedFiles);
//   };

//   const removeFile = (id) => {
//     setFiles(prev => prev.filter(f => f.id !== id));
//   };

//   const formatFileSize = (bytes) => {
//     if (bytes === 0) return '0 Bytes';
//     const k = 1024;
//     const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//     const i = Math.floor(Math.log(bytes) / Math.log(k));
//     return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
//   };

//   const getFileIcon = (type) => {
//     if (type.startsWith('audio/')) return <Music className="w-5 h-5 text-purple-400" />;
//     if (type.startsWith('video/')) return <Film className="w-5 h-5 text-blue-400" />;
//     return <FileAudio className="w-5 h-5 text-gray-400" />;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
    
//     if (!formData.projectName.trim()) {
//       alert('Please enter a project name');
//       return;
//     }

//     if (files.length === 0) {
//       alert('Please upload at least one file');
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       // Prepare form data for API
//       const apiFormData = new FormData();
//       apiFormData.append('projectName', formData.projectName);
//       apiFormData.append('description', formData.description);
//       apiFormData.append('visibility', formData.visibility);
      

//       const filePaths = files.map(f => f.path);
//       apiFormData.append('filePaths', JSON.stringify(filePaths));
      
//       files.forEach((fileData) => {
//         apiFormData.append('files', fileData.file);
//       });

//       const response = await fetch('http://localhost:5000/api/projects/create', {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
//         },
//         body: apiFormData
//       });

//       const data = await response.json();

//       if (response.ok) {
//         alert(`Project "${formData.projectName}" created successfully on GitHub!`);
//         toggleModal();
//       } else {
//         alert(`Error: ${data.error || 'Failed to create project'}`);
//       }
//     } catch (error) {
//       console.error('Error creating project:', error);
//       alert('Failed to create project. Please try again.');
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
//       <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
//         {/* Header */}
//         <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <div className="bg-purple-600 p-2 rounded-lg">
//               <Github className="w-6 h-6 text-white" />
//             </div>
//             <div>
//               <h2 className="text-xl font-bold text-white">Create New Project</h2>
//               <p className="text-sm text-gray-400">Create a GitHub repository for your project</p>
//             </div>
//           </div>
//           <button
//             onClick={toggleModal}
//             className="text-gray-400 hover:text-white transition-colors"
//           >
//             <X className="w-6 h-6" />
//           </button>
//         </div>

//         {/* Form Content */}
//         <div className="p-6 space-y-6">
//           {/* Project Name */}
//           <div>
//             <label className="block text-sm font-medium text-gray-300 mb-2">
//               Project Name <span className="text-red-400">*</span>
//             </label>
//             <input
//               type="text"
//               name="projectName"
//               value={formData.projectName}
//               onChange={handleInputChange}
//               placeholder="my-awesome-beat"
//               className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
//             />
//             <p className="text-xs text-gray-400 mt-1">This will be your GitHub repository name</p>
//           </div>

//           {/* Description */}
//           <div>
//             <label className="block text-sm font-medium text-gray-300 mb-2">
//               Description
//             </label>
//             <textarea
//               name="description"
//               value={formData.description}
//               onChange={handleInputChange}
//               placeholder="Describe your project..."
//               rows="3"
//               className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
//             />
//           </div>

//           {/* Visibility */}
//           <div>
//             <label className="block text-sm font-medium text-gray-300 mb-2">
//               Repository Visibility
//             </label>
//             <div className="flex gap-4">
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input
//                   type="radio"
//                   name="visibility"
//                   value="private"
//                   checked={formData.visibility === 'private'}
//                   onChange={handleInputChange}
//                   className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500"
//                 />
//                 <span className="text-gray-300">Private</span>
//               </label>
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input
//                   type="radio"
//                   name="visibility"
//                   value="public"
//                   checked={formData.visibility === 'public'}
//                   onChange={handleInputChange}
//                   className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500"
//                 />
//                 <span className="text-gray-300">Public</span>
//               </label>
//             </div>
//           </div>

//           {/* File Upload Area */}
//           <div>
//             <label className="block text-sm font-medium text-gray-300 mb-2">
//               Upload Files <span className="text-red-400">*</span>
//             </label>
//             <div
//               onDragOver={handleDragOver}
//               onDragLeave={handleDragLeave}
//               onDrop={handleDrop}
//               className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
//                 isDragging
//                   ? 'border-purple-500 bg-purple-500 bg-opacity-10'
//                   : 'border-gray-600 bg-gray-700'
//               }`}
//             >
//               <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
//               <p className="text-gray-300 mb-2">Drag and drop files here, or</p>
//               <label className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors">
//                 <FolderOpen className="w-5 h-5" />
//                 Browse Files
//                 <input
//                   type="file"
//                   multiple
//                   accept=".wav,.mp3,.mp4,.flac,.aiff,.ogg,.m4a,.mpeg,.avi,.mov,.flv,.midi,.mid"
//                   onChange={handleFileSelect}
//                   className="hidden"
//                 />
//               </label>
//               <p className="text-xs text-gray-400 mt-3">
//                 Supported: WAV, MP3, MP4, FLAC, AIFF, OGG, M4A, MPEG, AVI, MOV, FLV, MIDI
//               </p>
//             </div>
//           </div>

//           {/* Files List */}
//           {files.length > 0 && (
//             <div>
//               <h3 className="text-sm font-medium text-gray-300 mb-3">
//                 Selected Files ({files.length})
//               </h3>
//               <div className="space-y-2 max-h-64 overflow-y-auto">
//                 {files.map((fileData) => (
//                   <div
//                     key={fileData.id}
//                     className="bg-gray-700 rounded-lg p-3 flex items-center justify-between"
//                   >
//                     <div className="flex items-center gap-3 flex-1 min-w-0">
//                       {getFileIcon(fileData.type)}
//                       <div className="flex-1 min-w-0">
//                         <p className="text-white text-sm font-medium truncate">
//                           {fileData.name}
//                         </p>
//                         <p className="text-gray-400 text-xs truncate">
//                           {fileData.path} • {formatFileSize(fileData.size)}
//                         </p>
//                       </div>
//                     </div>
//                     <button
//                       type="button"
//                       onClick={() => removeFile(fileData.id)}
//                       className="text-gray-400 hover:text-red-400 transition-colors ml-2"
//                     >
//                       <X className="w-5 h-5" />
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Action Buttons */}
//           <div className="flex gap-3 pt-4">
//             <button
//               type="button"
//               onClick={toggleModal}
//               className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
//             >
//               Cancel
//             </button>
//             <button
//               type="button"
//               onClick={handleSubmit}
//               disabled={isSubmitting}
//               className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
//             >
//               {isSubmitting ? (
//                 <>
//                   <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                   </svg>
//                   Creating...
//                 </>
//               ) : (
//                 <>
//                   <Github className="w-5 h-5" />
//                   Create Project
//                 </>
//               )}
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Modal;
import React, { useState } from 'react';
import { X, Upload, FolderOpen, Github, Music, Film, FileAudio, Folder } from 'lucide-react';

function Modal({ toggleModal }) {
  const [formData, setFormData] = useState({
    projectName: '',
    description: '',
    visibility: 'private'
  });
  
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState([]);
  const [showProgress, setShowProgress] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    addFiles(selectedFiles, false);
  };

  const handleFolderSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    addFiles(selectedFiles, true);
  };

  // const addFiles = (newFiles, isFolder) => {
  //   const filesWithMetadata = newFiles.map(file => {
  //     const relativePath = file.webkitRelativePath || file.name;
  //     const folderPath = isFolder ? relativePath.split('/').slice(0, -1).join('/') : '';
      
  //     return {
  //       file,
  //       name: file.name,
  //       size: file.size,
  //       type: file.type,
  //       relativePath: relativePath,
  //       folderPath: folderPath,
  //       isFromFolder: isFolder,
  //       lastModified: new Date(file.lastModified).toISOString(),
  //       id: Math.random().toString(36).substr(2, 9)
  //     };
  //   });

  //   if (isFolder) {
  //     // Group by folder
  //     const folderGroups = {};
  //     filesWithMetadata.forEach(file => {
  //       if (!folderGroups[file.folderPath]) {
  //         folderGroups[file.folderPath] = [];
  //       }
  //       folderGroups[file.folderPath].push(file);
  //     });

  //     const newFolders = Object.keys(folderGroups).map(folderPath => ({
  //       name: folderPath,
  //       files: folderGroups[folderPath],
  //       fileCount: folderGroups[folderPath].length,
  //       id: Math.random().toString(36).substr(2, 9)
  //     }));

  //     setFolders(prev => [...prev, ...newFolders]);
  //   } else {
  //     setFiles(prev => [...prev, ...filesWithMetadata]);
  //   }
  // };
const addFiles = (newFiles, isFolder) => {
  // Filter out hidden files, git files, and system files
  const filteredFiles = newFiles.filter(file => {
    const name = file.name.toLowerCase();
    const path = file.webkitRelativePath || file.name;
    
    // Skip hidden files
    if (name.startsWith('.')) {
      console.log('⚠️ Skipping hidden file:', name);
      return false;
    }
    
    // Skip git folders and files
    if (path.includes('/.git/') || path.includes('\\.git\\')) {
      console.log('⚠️ Skipping git file:', path);
      return false;
    }
    
    // Skip system files
    const systemFiles = ['thumbs.db', 'desktop.ini', '.ds_store'];
    if (systemFiles.includes(name)) {
      console.log('⚠️ Skipping system file:', name);
      return false;
    }
    
    // Check file extension
    const allowedExtensions = [
      '.wav', '.mp3', '.mp4', '.flac', '.aiff', '.ogg', 
      '.m4a', '.mpeg', '.avi', '.mov', '.flv', '.midi', '.mid'
    ];
    const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      console.log('⚠️ Skipping unsupported file type:', name, ext);
      return false;
    }
    
    return true;
  });

  if (filteredFiles.length === 0) {
    alert('No valid media files found. Please select audio/video files.');
    return;
  }

  const filesWithMetadata = filteredFiles.map(file => {
    const relativePath = file.webkitRelativePath || file.name;
    const folderPath = isFolder ? relativePath.split('/').slice(0, -1).join('/') : '';
    
    return {
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      relativePath: relativePath,
      folderPath: folderPath,
      isFromFolder: isFolder,
      lastModified: new Date(file.lastModified).toISOString(),
      id: Math.random().toString(36).substr(2, 9)
    };
  });

  if (isFolder) {
    // Group by folder
    const folderGroups = {};
    filesWithMetadata.forEach(file => {
      if (!folderGroups[file.folderPath]) {
        folderGroups[file.folderPath] = [];
      }
      folderGroups[file.folderPath].push(file);
    });

    const newFolders = Object.keys(folderGroups).map(folderPath => ({
      name: folderPath,
      files: folderGroups[folderPath],
      fileCount: folderGroups[folderPath].length,
      id: Math.random().toString(36).substr(2, 9)
    }));

    setFolders(prev => [...prev, ...newFolders]);
  } else {
    setFiles(prev => [...prev, ...filesWithMetadata]);
  }
};
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedItems = Array.from(e.dataTransfer.items);
    
    droppedItems.forEach(item => {
      const entry = item.webkitGetAsEntry();
      if (entry) {
        if (entry.isDirectory) {
          readDirectory(entry);
        } else {
          item.getAsFile() && addFiles([item.getAsFile()], false);
        }
      }
    });
  };

  const readDirectory = (directoryEntry) => {
    const reader = directoryEntry.createReader();
    reader.readEntries((entries) => {
      const files = [];
      entries.forEach(entry => {
        if (entry.isFile) {
          entry.file(file => {
            files.push(file);
            if (files.length === entries.length) {
              addFiles(files, true);
            }
          });
        }
      });
    });
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const removeFolder = (id) => {
    setFolders(prev => prev.filter(f => f.id !== id));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type.startsWith('audio/')) return <Music className="w-5 h-5 text-purple-400" />;
    if (type.startsWith('video/')) return <Film className="w-5 h-5 text-blue-400" />;
    return <FileAudio className="w-5 h-5 text-gray-400" />;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.projectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    const totalFiles = files.length + folders.reduce((acc, folder) => acc + folder.files.length, 0);
    if (totalFiles === 0) {
      alert('Please upload at least one file or folder');
      return;
    }

    setIsSubmitting(true);
    setShowProgress(true);
    setProgress([{ step: 'Preparing files...', status: 'loading' }]);

    try {
      const apiFormData = new FormData();
      apiFormData.append('projectName', formData.projectName);
      apiFormData.append('description', formData.description);
      apiFormData.append('visibility', formData.visibility);
      
      // Prepare file structure data
      const fileStructure = {
        individualFiles: files.map(f => ({
          name: f.name,
          size: f.size,
          lastModified: f.lastModified,
          relativePath: f.relativePath
        })),
        folders: folders.map(folder => ({
          name: folder.name,
          files: folder.files.map(f => ({
            name: f.name,
            size: f.size,
            lastModified: f.lastModified,
            relativePath: f.relativePath
          }))
        }))
      };

      apiFormData.append('fileStructure', JSON.stringify(fileStructure));
      
      // Add individual files
      files.forEach((fileData) => {
        apiFormData.append('files', fileData.file);
      });

      // Add folder files
      folders.forEach(folder => {
        folder.files.forEach(fileData => {
          apiFormData.append('files', fileData.file);
        });
      });

      setProgress(prev => [
        ...prev,
        { step: 'Creating GitHub repository...', status: 'loading' }
      ]);

      const response = await fetch('http://localhost:5000/api/projects/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
        },
        body: apiFormData
      });

      const data = await response.json();

      if (response.ok) {
        setProgress(prev => [
          ...prev,
          { step: '✅ Repository created successfully!', status: 'success' },
          { step: '✅ Files uploaded to GitHub!', status: 'success' },
          { step: '✅ Project saved to database!', status: 'success' }
        ]);
        
        setTimeout(() => {
          alert(`Project "${formData.projectName}" created successfully on GitHub!`);
          toggleModal();
          window.location.reload();
        }, 1500);
      } else {
        setProgress(prev => [
          ...prev,
          { step: `❌ Error: ${data.message || data.error}`, status: 'error' }
        ]);
        setTimeout(() => {
          alert(`Error: ${data.error || 'Failed to create project'}`);
          setIsSubmitting(false);
          setShowProgress(false);
          setProgress([]);
        }, 2000);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setProgress(prev => [
        ...prev,
        { step: '❌ Failed to create project', status: 'error' }
      ]);
      setTimeout(() => {
        alert('Failed to create project. Please try again.');
        setIsSubmitting(false);
        setShowProgress(false);
        setProgress([]);
      }, 2000);
    }
  };

  const totalFiles = files.length + folders.reduce((acc, folder) => acc + folder.files.length, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2 rounded-lg">
              <Github className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create New Project</h2>
              <p className="text-sm text-gray-400">Create a GitHub repository for your project</p>
            </div>
          </div>
          <button
            onClick={toggleModal}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="projectName"
              value={formData.projectName}
              onChange={handleInputChange}
              placeholder="my-awesome-beat"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">This will be your GitHub repository name</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your project..."
              rows="3"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Repository Visibility
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={formData.visibility === 'private'}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500"
                />
                <span className="text-gray-300">Private</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={formData.visibility === 'public'}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500"
                />
                <span className="text-gray-300">Public</span>
              </label>
            </div>
          </div>

          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Upload Files & Folders <span className="text-red-400">*</span>
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-purple-500 bg-purple-500 bg-opacity-10'
                  : 'border-gray-600 bg-gray-700'
              }`}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 mb-4">Drag and drop files or folders here, or</p>
              <div className="flex gap-3 justify-center">
                <label className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors">
                  <FileAudio className="w-5 h-5" />
                  Browse Files
                  <input
                    type="file"
                    multiple
                    accept=".wav,.mp3,.mp4,.flac,.aiff,.ogg,.m4a,.mpeg,.avi,.mov,.flv,.midi,.mid"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <label className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors">
                  <FolderOpen className="w-5 h-5" />
                  Browse Folders
                  <input
                    type="file"
                    multiple
                    webkitdirectory="true"
                    directory="true"
                    onChange={handleFolderSelect}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Supported: WAV, MP3, MP4, FLAC, AIFF, OGG, M4A, MPEG, AVI, MOV, FLV, MIDI
              </p>
            </div>
          </div>

          {/* Folders List */}
          {folders.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-3">
                Selected Folders ({folders.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="bg-gray-700 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Folder className="w-5 h-5 text-blue-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {folder.name}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {folder.fileCount} files
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFolder(folder.id)}
                      className="text-gray-400 hover:text-red-400 transition-colors ml-2"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Individual Files List */}
          {files.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-3">
                Individual Files ({files.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((fileData) => (
                  <div
                    key={fileData.id}
                    className="bg-gray-700 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getFileIcon(fileData.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {fileData.name}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {formatFileSize(fileData.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(fileData.id)}
                      className="text-gray-400 hover:text-red-400 transition-colors ml-2"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress Display */}
          {showProgress && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Project...
              </h3>
              <div className="space-y-2">
                {progress.map((item, index) => (
                  <div
                    key={index}
                    className={`text-sm flex items-center gap-2 ${
                      item.status === 'success' ? 'text-green-400' :
                      item.status === 'error' ? 'text-red-400' :
                      'text-gray-300'
                    }`}
                  >
                    {item.status === 'loading' && (
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    )}
                    {item.step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {totalFiles > 0 && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
              <p className="text-purple-300 text-sm">
                Total: {totalFiles} file{totalFiles !== 1 ? 's' : ''} ready to upload
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={toggleModal}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <Github className="w-5 h-5" />
                  Create Project ({totalFiles} files)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Modal;