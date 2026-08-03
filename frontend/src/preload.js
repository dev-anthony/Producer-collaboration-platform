
// const { contextBridge, ipcRenderer, webUtils } = require('electron');
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
//   writeFiles: (data) => ipcRenderer.invoke('write-files', data),
//   // Logout / clear OAuth session
//   clearOAuthSession: () => ipcRenderer.invoke('clear-oauth-session'),
//   // OAuth code listener (for production protocol handler)
//   onOAuthCode: (callback) => {
//     const handler = (event, code) => callback(code);
//     ipcRenderer.on('oauth-code', handler);
//     return () => ipcRenderer.removeListener('oauth-code', handler);
//   },
// });
const { contextBridge, ipcRenderer, webUtils } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  // Folder selection
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // NEW — replaces removed File.path (Electron 32+)
  getPathForFile: (file) => webUtils.getPathForFile(file),

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
  
  hasFolderPath: (projectId) =>
    ipcRenderer.invoke('has-folder-path', projectId),
  
  readProjectFiles: (payload) => 
    ipcRenderer.invoke('read-project-files', payload),
  
  startWatching: (projectId, folderPath) => 
    ipcRenderer.invoke('start-watching', { projectId, folderPath }),
  
  stopWatching: (projectId) => 
    ipcRenderer.invoke('stop-watching', projectId),
  
  onFileChanged: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('file-changed', handler);
    return () => ipcRenderer.removeListener('file-changed', handler);
  },
  
  removeFileChangedListener: () => {
    ipcRenderer.removeAllListeners('file-changed');
  },
  
  writeFiles: (data) => ipcRenderer.invoke('write-files', data),
  clearOAuthSession: () => ipcRenderer.invoke('clear-oauth-session'),
  onOAuthCode: (callback) => {
    const handler = (event, code) => callback(code);
    ipcRenderer.on('oauth-code', handler);
    return () => ipcRenderer.removeListener('oauth-code', handler);
  },
});