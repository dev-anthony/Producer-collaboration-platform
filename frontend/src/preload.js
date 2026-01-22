
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Folder selection
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  
  // Scan folder contents
  scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
  
  // Read all files from folder (for Modal)
  readFolderFiles: (folderPath) => ipcRenderer.invoke('read-folder-files', folderPath),
  
  // Project folder path management
  saveFolderPath: (projectId, folderPath) => 
    ipcRenderer.invoke('save-folder-path', { projectId, folderPath }),
  
  getFolderPath: (projectId) => 
    ipcRenderer.invoke('get-folder-path', projectId),
  
  deleteFolderPath: (projectId) =>
    ipcRenderer.invoke('delete-folder-path', projectId),
  
  // Check if folder path exists (ADDED)
  hasFolderPath: (projectId) =>
    ipcRenderer.invoke('has-folder-path', projectId),
  
  // Read project files → only needs projectId
  readProjectFiles: (payload) => 
    ipcRenderer.invoke('read-project-files', payload),
  
  // File watching
  startWatching: (projectId, folderPath) => 
    ipcRenderer.invoke('start-watching', { projectId, folderPath }),
  
  stopWatching: (projectId) => 
    ipcRenderer.invoke('stop-watching', projectId),
  
  // File change listener
  onFileChanged: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('file-changed', handler);
    return () => ipcRenderer.removeListener('file-changed', handler);
  },
  
  removeFileChangedListener: () => {
    ipcRenderer.removeAllListeners('file-changed');
  },
  
  // // Write files (for pull)
  // writeFiles: (folderPath, files) => 
  //   ipcRenderer.invoke('write-files', { folderPath, files }),
   writeFiles: (data) => ipcRenderer.invoke('write-files', data),

  //logout / clear OAuth session
  clearOAuthSession: () => ipcRenderer.invoke('clear-oauth-session'),
});

// console.log('✅ Preload script loaded with folder management support');


// const { contextBridge, ipcRenderer } = require('electron');

// contextBridge.exposeInMainWorld('electronAPI', {
//   // Folder selection
//   selectFolder: () => ipcRenderer.invoke('select-folder'),
  
//   // Scan folder contents
//   scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
  
//   // Read all files from folder (for Modal)
//   readFolderFiles: (folderPath) => ipcRenderer.invoke('read-folder-files', folderPath),
  
//   // Project folder path management
//   saveFolderPath: (projectId, folderPath) => 
//     ipcRenderer.invoke('save-folder-path', { projectId, folderPath }),
  
//   getFolderPath: (projectId) => 
//     ipcRenderer.invoke('get-folder-path', projectId),
  
//   deleteFolderPath: (projectId) =>
//     ipcRenderer.invoke('delete-folder-path', projectId),
  
//   // Check if folder path exists
//   hasFolderPath: (projectId) =>
//     ipcRenderer.invoke('has-folder-path', projectId),
  
//   // Read project files → only needs projectId
//   readProjectFiles: (payload) => 
//     ipcRenderer.invoke('read-project-files', payload),
  
//   // File watching
//   startWatching: (projectId, folderPath) => 
//     ipcRenderer.invoke('start-watching', { projectId, folderPath }),
  
//   stopWatching: (projectId) => 
//     ipcRenderer.invoke('stop-watching', projectId),
  
//   // File change listener
//   onFileChanged: (callback) => {
//     const handler = (event, data) => callback(data);
//     ipcRenderer.on('file-changed', handler);
//     return () => ipcRenderer.removeListener('file-changed', handler);
//   },
  
//   removeFileChangedListener: () => {
//     ipcRenderer.removeAllListeners('file-changed');
//   },
  
//   // Write files (for pull)
//   writeFiles: (folderPath, files) => 
//     ipcRenderer.invoke('write-files', { folderPath, files }),
  
//   // ⭐ NEW: Clear OAuth session (for logout)
//   clearOAuthSession: () => ipcRenderer.invoke('clear-oauth-session')
// });

// console.log('✅ Preload script loaded with OAuth session clearing support');