
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

  // Validate before create/join so the server is not mutated on conflicts.
  validateFolderLink: (folderPath, projectId) =>
    ipcRenderer.invoke('validate-folder-link', { folderPath, projectId }),
  
  // Project folder path management
  saveFolderPath: (projectId, folderPath) => 
    ipcRenderer.invoke('save-folder-path', { projectId, folderPath }),
  
  getFolderPath: (projectId) => 
    ipcRenderer.invoke('get-folder-path', projectId),

  findProjectFolder: (data) => ipcRenderer.invoke('find-project-folder', data),
  
  deleteFolderPath: (projectId) =>
    ipcRenderer.invoke('delete-folder-path', projectId),
  
  hasFolderPath: (projectId) =>
    ipcRenderer.invoke('has-folder-path', projectId),
  
  readProjectFiles: (payload) => 
    ipcRenderer.invoke('read-project-files', payload),
  
  startWatching: (projectId, folderPath) => 
    ipcRenderer.invoke('start-watching', { projectId, folderPath }),
  restoreSessionWatchers: (projectIds) => ipcRenderer.invoke('restore-session-watchers', { projectIds }),
  
  stopWatching: (projectId) => 
    ipcRenderer.invoke('stop-watching', projectId),
  
  onFileChanged: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('file-changed', handler);
    return () => ipcRenderer.removeListener('file-changed', handler);
  },

  onFileDeleted: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('file-deleted', handler);
    return () => ipcRenderer.removeListener('file-deleted', handler);
  },
  
  removeFileChangedListener: () => {
    ipcRenderer.removeAllListeners('file-changed');
  },

  removeFileDeletedListener: () => {
    ipcRenderer.removeAllListeners('file-deleted');
  },
  
  writeFiles: (data) => ipcRenderer.invoke('write-files', data),
  copyText: (text) => ipcRenderer.invoke('copy-text', text),
  showNotification: (data) => ipcRenderer.invoke('show-notification', data),
  clearOAuthSession: () => ipcRenderer.invoke('clear-oauth-session'),
  onOAuthCode: (callback) => {
    const handler = (event, code) => callback(code);
    ipcRenderer.on('oauth-code', handler);
    return () => ipcRenderer.removeListener('oauth-code', handler);
  },

  // Git (simple-git) — Phase 5
  initGit: (data) => ipcRenderer.invoke('init-git', data),
  setGitIdentity: (data) => ipcRenderer.invoke('set-git-identity', data),
  gitPush: (data) => ipcRenderer.invoke('git-push', data),
  gitPull: (data) => ipcRenderer.invoke('git-pull', data),
  gitClone: (data) => ipcRenderer.invoke('git-clone', data),
  gitLog: (data) => ipcRenderer.invoke('git-log', data),
  gitRestore: (data) => ipcRenderer.invoke('git-restore', data),
  getProjectConflicts: (folderPath) => ipcRenderer.invoke('get-project-conflicts', { folderPath }),
  resolveProjectConflict: (data) => ipcRenderer.invoke('resolve-project-conflict', data),
  onGitProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('git-progress', handler);
    return () => ipcRenderer.removeListener('git-progress', handler);
  },
  onAuthUrl: (callback) => {
    const handler = (event, url) => callback(url);
    ipcRenderer.on('auth-url', handler);
    return () => ipcRenderer.removeListener('auth-url', handler);
  },
  onGitProgressEnd: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('git-progress-end', handler);
    return () => ipcRenderer.removeListener('git-progress-end', handler);
  },

  // Auto-push / silent sync — Phase 6
  pushNow: (projectId) => ipcRenderer.invoke('push-now', { projectId }),
  setupProjectFolder: (folderPath) => ipcRenderer.invoke('setup-project-folder', { folderPath }),
  setAutoPushDelay: (delay) => ipcRenderer.invoke('set-auto-push-delay', { delay }),
  onAutoPushReady: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('auto-push-ready', handler);
    return () => ipcRenderer.removeListener('auto-push-ready', handler);
  },
  onAutoPushScheduled: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('auto-push-scheduled', handler);
    return () => ipcRenderer.removeListener('auto-push-scheduled', handler);
  },
  removeAutoPushReadyListener: () => {
    ipcRenderer.removeAllListeners('auto-push-ready');
  },
});
