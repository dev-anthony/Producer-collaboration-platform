// // // // // // See the Electron documentation for details on how to use preload scripts:
// // // // // // https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
// // // // // const { contextBridge, ipcRenderer } = require('electron');

// // // // // contextBridge.exposeInMainWorld('electronAPI', {
// // // // //   // Add any APIs you want to expose to the renderer
// // // // //   sendMessage: (channel, data) => {
// // // // //     ipcRenderer.send(channel, data);
// // // // //   },
// // // // //   onMessage: (channel, callback) => {
// // // // //     ipcRenderer.on(channel, (event, ...args) => callback(...args));
// // // // //   }
// // // // // });
// // // // const { contextBridge, ipcRenderer } = require('electron');

// // // // // Expose protected methods that allow the renderer process to use
// // // // // the ipcRenderer without exposing the entire object

// // // // contextBridge.exposeInMainWorld('electronAPI', {
// // // //   sendMessage: (channel, data) => {
// // // //     // Whitelist channels
// // // //     const validChannels = ['toMain'];
// // // //     if (validChannels.includes(channel)) {
// // // //       ipcRenderer.send(channel, data);
// // // //     }
// // // //   },
// // // //   onMessage: (channel, callback) => {
// // // //     const validChannels = ['fromMain'];
// // // //     if (validChannels.includes(channel)) {
// // // //       // Deliberately strip event as it includes `sender` 
// // // //       ipcRenderer.on(channel, (event, ...args) => callback(...args));
// // // //     }
// // // //   }
// // // // });
// // // // See the Electron documentation for details on how to use preload scripts:
// // // // https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

// // // const { contextBridge, shell } = require('electron');

// // // // Expose Electron shell API to open external URLs
// // // contextBridge.exposeInMainWorld('electronAPI', {
// // //   openExternal: (url) => shell.openExternal(url)
// // // });
// // const { contextBridge, shell } = require('electron');

// // // Only expose what's needed - no webpack-dev-server stuff
// // contextBridge.exposeInMainWorld('electronAPI', {
// //   openExternal: (url) => shell.openExternal(url)
// // });

// // console.log('Preload script loaded successfully');
// const { contextBridge, shell } = require('electron');

// // Only expose what's needed
// contextBridge.exposeInMainWorld('electronAPI', {
//   openExternal: (url) => shell.openExternal(url)
// });

// console.log('Preload script loaded successfully');
// const { contextBridge  , ipcRenderer} = require('electron');

// contextBridge.exposeInMainWorld('electronAPI', {
//   platform: process.platform,
//    selectFolder: () => ipcRenderer.invoke('select-folder'),
//   writeFiles: (data) => ipcRenderer.invoke('write-files', data)
// });

// console.log('Preload loaded');
// src/preload.js
// const { ipcRenderer } = require('electron');

// window.electron = {
//   selectFolder: () => ipcRenderer.invoke('select-folder'),
//   writeFiles: (data) => ipcRenderer.invoke('write-files', data)
// };
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  saveFolderPath: (projectId, folderPath) =>
    ipcRenderer.invoke('save-folder-path', { projectId, folderPath }),
  getFolderPath: (projectId) => ipcRenderer.invoke('get-folder-path', projectId),
  readProjectFiles: (projectId, fileStructure) =>
    ipcRenderer.invoke('read-project-files', { projectId, fileStructure }),
  writeFiles: (data) => ipcRenderer.invoke('write-files', data),
});
// console.log('Preload script loaded!');