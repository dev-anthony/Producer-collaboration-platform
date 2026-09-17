
const { contextBridge, ipcRenderer, webUtils } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  getPathForFile: (file) => webUtils.getPathForFile(file),

  scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
  
  readFolderFiles: (folderPath) => ipcRenderer.invoke('read-folder-files', folderPath),

  validateFolderLink: (folderPath, projectId) =>
    ipcRenderer.invoke('validate-folder-link', { folderPath, projectId }),
  
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

  rrStartMasterRecording: (options) => ipcRenderer.invoke('rr-start-master-recording', options),
  rrWriteMasterChunk: (chunk) => ipcRenderer.invoke('rr-write-master-chunk', chunk),
  rrStopMasterRecording: () => ipcRenderer.invoke('rr-stop-master-recording'),
  rrStartStreamRecording: (options) => ipcRenderer.invoke('rr-start-stream-recording', options),
  rrWriteStreamChunk: (chunk) => ipcRenderer.invoke('rr-write-stream-chunk', chunk),
  rrStopStreamRecording: () => ipcRenderer.invoke('rr-stop-stream-recording'),
  rrReadAudioFile: (filePath) => ipcRenderer.invoke('rr-read-audio-file', filePath),
  rrDeleteAudioFile: (filePath) => ipcRenderer.invoke('rr-delete-audio-file', filePath),
  rrPushTakeToFolder: (data) => ipcRenderer.invoke('rr-push-take-to-folder', data),
  rrLeaveSession: () => ipcRenderer.invoke('rr-leave-session'),
  onRrAudioChunk: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('rr-audio-chunk', handler);
    return () => ipcRenderer.removeListener('rr-audio-chunk', handler);
  },
  rrReconcile: (data) => ipcRenderer.invoke('rr-reconcile', data),
  rrNativeStatus: () => ipcRenderer.invoke('rr-native-status'),
  rrSaveSessionRecord: (data) => ipcRenderer.invoke('rr-save-session-record', data),
  rrListSessionRecords: (data) => ipcRenderer.invoke('rr-list-session-records', data),
  rrDeleteSessionRecord: (data) => ipcRenderer.invoke('rr-delete-session-record', data),
  rrUpdateSessionTake: (data) => ipcRenderer.invoke('rr-update-session-take', data),
});
