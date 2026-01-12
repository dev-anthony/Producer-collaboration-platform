
// // const { app, BrowserWindow, ipcMain, dialog } = require('electron');

// // if (require('electron-squirrel-startup')) {
// //   app.quit();
// // }

// // const createWindow = () => {
// //   const mainWindow = new BrowserWindow({
// //     width: 800,
// //     height: 600,
// //     webPreferences: {
// //       sandbox: false,
// //       contextIsolation: false,
// //       nodeIntegration: false,
// //       webSecurity: true,
// //     },
// //   });

// //   mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
// //   mainWindow.webContents.openDevTools();

// //   // Handle OAuth callback redirect
// //   mainWindow.webContents.on('will-redirect', (event, url) => {
// //     console.log('🔀 Will redirect to:', url);
    
// //     // Only intercept OAuth callbacks, not HMR reloads
// //     if (url.startsWith('http://localhost:3000/?code=') && !url.includes('main_window')) {
// //       console.log('🔥 OAuth callback detected in will-redirect!');
// //       event.preventDefault();
      
// //       const urlObj = new URL(url);
// //       const code = urlObj.searchParams.get('code');
// //       console.log('📝 OAuth code:', code);
      
// //       const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
// //       console.log('🔄 Loading:', newURL);
// //       mainWindow.loadURL(newURL);
// //     }
// //   });

// //   mainWindow.webContents.on('will-navigate', (event, url) => {
// //     console.log('➡️ Will navigate to:', url);
    
// //     // Only intercept OAuth callbacks, not HMR reloads
// //     if (url.startsWith('http://localhost:3000/?code=') && !url.includes('main_window')) {
// //       console.log('🔥 OAuth callback detected in will-navigate!');
// //       event.preventDefault();
      
// //       const urlObj = new URL(url);
// //       const code = urlObj.searchParams.get('code');
// //       console.log('📝 OAuth code:', code);
      
// //       const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
// //       console.log('🔄 Loading:', newURL);
// //       mainWindow.loadURL(newURL);
// //     }
// //   });

// //   mainWindow.webContents.on('did-start-navigation', (event, url, isInPlace, isMainFrame) => {
// //     if (!isMainFrame) return;
    
// //     console.log('🚀 Did start navigation to:', url);
    
// //     // Only intercept OAuth callbacks, not HMR or normal navigation
// //     if (url.startsWith('http://localhost:3000/?code=') && !url.includes('main_window')) {
// //       console.log('🔥 OAuth callback detected in did-start-navigation!');
      
// //       const urlObj = new URL(url);
// //       const code = urlObj.searchParams.get('code');
      
// //       if (code) {
// //         console.log('📝 OAuth code:', code);
// //         const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
// //         console.log('🔄 Loading:', newURL);
        
// //         mainWindow.webContents.stop();
// //         mainWindow.loadURL(newURL);
// //       }
// //     }
// //   });

// //   mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
// //     // Ignore HMR-related 404s during development
// //     if (errorCode === -6 && validatedURL === 'http://localhost:3000/') {
// //       console.log('⚠️ Ignoring HMR 404, not reloading');
// //       return;
// //     }

// //     console.error('❌ Failed to load:', validatedURL);
// //     console.error('❌ Error:', errorDescription, 'Code:', errorCode);
    
// //     // Only handle OAuth callback 404s
// //     if (validatedURL.includes('?code=') && errorCode === -6) {
// //       const urlObj = new URL(validatedURL);
// //       const code = urlObj.searchParams.get('code');
      
// //       if (code) {
// //         console.log('🔄 Recovering from 404, code:', code);
// //         const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
// //         console.log('🔄 Reloading as:', newURL);
// //         mainWindow.loadURL(newURL);
// //       }
// //     }
// //   });

// //   mainWindow.webContents.on('did-navigate', (event, url) => {
// //     console.log('✅ Did navigate to:', url);
// //   });
// // };
// // ipcMain.handle('select-folder', async () => {
// //   const result = await dialog.showOpenDialog({
// //     properties: ['openDirectory'],
// //     title: 'Select folder to save files'
// //   });
// //   return result.canceled ? null : result.filePaths[0];
// // });

// // ipcMain.handle('write-files', async (event, { folderPath, files }) => {
// //   let successCount = 0;
// //   let failCount = 0;
// //   let lastError = null;

// //   for (const file of files) {
// //     try {
// //       const content = Buffer.from(file.content, 'base64');
// //       const fullPath = path.join(folderPath, file.path);
// //       await fs.mkdir(path.dirname(fullPath), { recursive: true });
// //       await fs.writeFile(fullPath, content);
// //       successCount++;
// //     } catch (err) {
// //       failCount++;
// //       lastError = err.message;
// //     }
// //   }

// //   return { success: failCount === 0, successCount, failCount, error: lastError };
// // });

// // app.whenReady().then(() => {
// //   createWindow();

// //   app.on('activate', () => {
// //     if (BrowserWindow.getAllWindows().length === 0) {
// //       createWindow();
      
// //     }
// //   });
// // });

// // app.on('window-all-closed', () => {
// //   if (process.platform !== 'darwin') {
// //     app.quit();
// //   }
// // });





// // const { app, BrowserWindow } = require('electron');

// // if (require('electron-squirrel-startup')) {
// //   app.quit();
// // }

// // // Store windows in array
// // const windows = [];

// // const createWindow = (sessionName = 'default', xOffset = 0) => {
// //   const mainWindow = new BrowserWindow({
// //     width: 800,
// //     height: 600,
// //     x: xOffset, // Offset windows so they don't overlap
// //     y: 100,
// //     webPreferences: {
// //       sandbox: false,
// //       contextIsolation: false,
// //       nodeIntegration: false,
// //       webSecurity: true,
// //       // IMPORTANT: Different partition for each window = separate storage
// //       partition: `persist:${sessionName}`,
// //     },
// //   });

// //   // Add title to distinguish windows
// //   mainWindow.setTitle(`GitSyncr - ${sessionName}`);

// //   mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
// //   mainWindow.webContents.openDevTools();

// //   // Handle OAuth callback redirect
// //   mainWindow.webContents.on('will-redirect', (event, url) => {
// //     console.log(`[${sessionName}] 🔀 Will redirect to:`, url);
    
// //     if (url.startsWith('http://localhost:3000/?code=') && !url.includes('main_window')) {
// //       console.log(`[${sessionName}] 🔥 OAuth callback detected!`);
// //       event.preventDefault();
      
// //       const urlObj = new URL(url);
// //       const code = urlObj.searchParams.get('code');
// //       console.log(`[${sessionName}] 📝 OAuth code:`, code);
      
// //       const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
// //       console.log(`[${sessionName}] 🔄 Loading:`, newURL);
// //       mainWindow.loadURL(newURL);
// //     }
// //   });

// //   mainWindow.webContents.on('will-navigate', (event, url) => {
// //     console.log(`[${sessionName}] ➡️ Will navigate to:`, url);
    
// //     if (url.startsWith('http://localhost:3000/?code=') && !url.includes('main_window')) {
// //       console.log(`[${sessionName}] 🔥 OAuth callback detected!`);
// //       event.preventDefault();
      
// //       const urlObj = new URL(url);
// //       const code = urlObj.searchParams.get('code');
// //       const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
// //       mainWindow.loadURL(newURL);
// //     }
// //   });

// //   mainWindow.webContents.on('did-start-navigation', (event, url, isInPlace, isMainFrame) => {
// //     if (!isMainFrame) return;
    
// //     if (url.startsWith('http://localhost:3000/?code=') && !url.includes('main_window')) {
// //       const urlObj = new URL(url);
// //       const code = urlObj.searchParams.get('code');
      
// //       if (code) {
// //         const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
// //         mainWindow.webContents.stop();
// //         mainWindow.loadURL(newURL);
// //       }
// //     }
// //   });

// //   mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
// //     if (errorCode === -6 && validatedURL === 'http://localhost:3000/') {
// //       return; // Ignore HMR 404s
// //     }
    
// //     if (validatedURL.includes('?code=') && errorCode === -6) {
// //       const urlObj = new URL(validatedURL);
// //       const code = urlObj.searchParams.get('code');
      
// //       if (code) {
// //         const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
// //         mainWindow.loadURL(newURL);
// //       }
// //     }
// //   });

// //   mainWindow.on('closed', () => {
// //     const index = windows.indexOf(mainWindow);
// //     if (index > -1) {
// //       windows.splice(index, 1);
// //     }
// //   });

// //   windows.push(mainWindow);
// //   return mainWindow;
// // };

// // app.whenReady().then(() => {
// //   // Create TWO windows with different sessions for testing
// //   // Each window has completely separate localStorage, cookies, etc.
  
// //   createWindow('Account-A', 0);     // First window at x=0
// //   createWindow('Account-B', 850);   // Second window at x=850 (offset to right)
  
// //   // Optional: Create a third window for testing
// //   // createWindow('Account-C', 1700);

// //   app.on('activate', () => {
// //     if (BrowserWindow.getAllWindows().length === 0) {
// //       createWindow('Account-A', 0);
// //     }
// //   });
// // });

// // app.on('window-all-closed', () => {
// //   if (process.platform !== 'darwin') {
// //     app.quit();
// //   }
// // });

// // // Optional: Add keyboard shortcut to open new window during development
// // // Press Cmd/Ctrl+N to open additional window
// // app.on('web-contents-created', (event, contents) => {
// //   contents.on('before-input-event', (event, input) => {
// //     if (input.key === 'n' && (input.meta || input.control)) {
// //       const windowCount = windows.length;
// //       const offset = windowCount * 850;
// //       createWindow(`Account-${String.fromCharCode(65 + windowCount)}`, offset);
// //     }
// //   });
// // });




// const { app, BrowserWindow, ipcMain, dialog } = require('electron');
// const path = require('path');
// const fs = require('fs').promises;

// if (require('electron-squirrel-startup')) {
//   app.quit();
// }

// // Store windows in array
// const windows = [];

// const createWindow = (sessionName = 'default', xOffset = 0) => {
//   const mainWindow = new BrowserWindow({
//     width: 800,
//     height: 600,
//     x: xOffset, // Offset windows so they don't overlap
//     y: 100,
//     webPreferences: {
//       sandbox: false,
//       contextIsolation: false,
//       nodeIntegration: false,
//       webSecurity: true,
//       // IMPORTANT: Different partition for each window = separate storage
//       partition: `persist:${sessionName}`,
//     },
//   });

//   // Add title to distinguish windows
//   mainWindow.setTitle(`GitSyncr - ${sessionName}`);

//   mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
//   mainWindow.webContents.openDevTools();

//   // Handle OAuth callback redirect
//   mainWindow.webContents.on('will-redirect', (event, url) => {
//     console.log(`[${sessionName}] 🔀 Will redirect to:`, url);
    
//     // Only intercept OAuth callbacks, not HMR reloads
//     if (url.startsWith('http://localhost:3000/?code=') && !url.includes('main_window')) {
//       console.log(`[${sessionName}] 🔥 OAuth callback detected in will-redirect!`);
//       event.preventDefault();
      
//       const urlObj = new URL(url);
//       const code = urlObj.searchParams.get('code');
//       console.log(`[${sessionName}] 📝 OAuth code:`, code);
      
//       const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
//       console.log(`[${sessionName}] 🔄 Loading:`, newURL);
//       mainWindow.loadURL(newURL);
//     }
//   });

//   mainWindow.webContents.on('will-navigate', (event, url) => {
//     console.log(`[${sessionName}] ➡️ Will navigate to:`, url);
    
//     // Only intercept OAuth callbacks, not HMR reloads
//     if (url.startsWith('http://localhost:3000/?code=') && !url.includes('main_window')) {
//       console.log(`[${sessionName}] 🔥 OAuth callback detected in will-navigate!`);
//       event.preventDefault();
      
//       const urlObj = new URL(url);
//       const code = urlObj.searchParams.get('code');
//       console.log(`[${sessionName}] 📝 OAuth code:`, code);
      
//       const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
//       console.log(`[${sessionName}] 🔄 Loading:`, newURL);
//       mainWindow.loadURL(newURL);
//     }
//   });

//   mainWindow.webContents.on('did-start-navigation', (event, url, isInPlace, isMainFrame) => {
//     if (!isMainFrame) return;
    
//     console.log(`[${sessionName}] 🚀 Did start navigation to:`, url);
    
//     // Only intercept OAuth callbacks, not HMR or normal navigation
//     if (url.startsWith('http://localhost:3000/?code=') && !url.includes('main_window')) {
//       console.log(`[${sessionName}] 🔥 OAuth callback detected in did-start-navigation!`);
      
//       const urlObj = new URL(url);
//       const code = urlObj.searchParams.get('code');
      
//       if (code) {
//         console.log(`[${sessionName}] 📝 OAuth code:`, code);
//         const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
//         console.log(`[${sessionName}] 🔄 Loading:`, newURL);
        
//         mainWindow.webContents.stop();
//         mainWindow.loadURL(newURL);
//       }
//     }
//   });

//   mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
//     // Ignore HMR-related 404s during development
//     if (errorCode === -6 && validatedURL === 'http://localhost:3000/') {
//       console.log(`[${sessionName}] ⚠️ Ignoring HMR 404, not reloading`);
//       return;
//     }

//     console.error(`[${sessionName}] ❌ Failed to load:`, validatedURL);
//     console.error(`[${sessionName}] ❌ Error:`, errorDescription, 'Code:', errorCode);
    
//     // Only handle OAuth callback 404s
//     if (validatedURL.includes('?code=') && errorCode === -6) {
//       const urlObj = new URL(validatedURL);
//       const code = urlObj.searchParams.get('code');
      
//       if (code) {
//         console.log(`[${sessionName}] 🔄 Recovering from 404, code:`, code);
//         const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
//         console.log(`[${sessionName}] 🔄 Reloading as:`, newURL);
//         mainWindow.loadURL(newURL);
//       }
//     }
//   });

//   mainWindow.webContents.on('did-navigate', (event, url) => {
//     console.log(`[${sessionName}] ✅ Did navigate to:`, url);
//   });

//   mainWindow.on('closed', () => {
//     const index = windows.indexOf(mainWindow);
//     if (index > -1) {
//       windows.splice(index, 1);
//     }
//   });

//   windows.push(mainWindow);
//   return mainWindow;
// };

// // IPC Handlers (available to ALL windows)
// ipcMain.handle('select-folder', async () => {
//   const result = await dialog.showOpenDialog({
//     properties: ['openDirectory'],
//     title: 'Select folder to save files'
//   });
//   return result.canceled ? null : result.filePaths[0];
// });

// ipcMain.handle('write-files', async (event, { folderPath, files }) => {
//   let successCount = 0;
//   let failCount = 0;
//   let lastError = null;

//   for (const file of files) {
//     try {
//       const content = Buffer.from(file.content, 'base64');
//       const fullPath = path.join(folderPath, file.path);
//       await fs.mkdir(path.dirname(fullPath), { recursive: true });
//       await fs.writeFile(fullPath, content);
//       successCount++;
//     } catch (err) {
//       failCount++;
//       lastError = err.message;
//     }
//   }

//   return { success: failCount === 0, successCount, failCount, error: lastError };
// });

// app.whenReady().then(() => {
//   // Create TWO windows with different sessions for testing
//   // Each window has completely separate localStorage, cookies, etc.
  
//   createWindow('Account-A', 0);     // First window at x=0
//   createWindow('Account-B', 850);   // Second window at x=850 (offset to right)
  
//   // Optional: Create a third window for testing
//   // createWindow('Account-C', 1700);

//   app.on('activate', () => {
//     if (BrowserWindow.getAllWindows().length === 0) {
//       createWindow('Account-A', 0);
//     }
//   });
// });

// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') {
//     app.quit();
//   }
// });

// // Optional: Add keyboard shortcut to open new window during development
// // Press Cmd/Ctrl+N to open additional window
// app.on('web-contents-created', (event, contents) => {
//   contents.on('before-input-event', (event, input) => {
//     if (input.key === 'n' && (input.meta || input.control)) {
//       const windowCount = windows.length;
//       const offset = windowCount * 850;
//       createWindow(`Account-${String.fromCharCode(65 + windowCount)}`, offset);
//     }
//   });
// });


const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

if (require('electron-squirrel-startup')) {
  app.quit();
}

const windows = [];

// Simple in-memory store for folder paths per project (you can use electron-store later)
const projectFolders = {}; // { projectId: absoluteFolderPath }

const createWindow = (sessionName = 'default', xOffset = 0) => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    x: xOffset,
    y: 100,
    webPreferences: {
      sandbox: false,
      contextIsolation: false, // for simplicity (you can secure it later)
      nodeIntegration: false,
      webSecurity: true,
      partition: `persist:${sessionName}`,
    },
  });

  mainWindow.setTitle(`GitSyncr - ${sessionName}`);
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  // mainWindow.webContents.openDevTools();

  // Your existing OAuth handling code...
  // (keeping it unchanged for brevity)
   mainWindow.webContents.on('will-redirect', (event, url) => {
    console.log(`[${sessionName}] 🔀 Will redirect to:`, url);
    
    if (url.startsWith('http://localhost:3000/?code=') && !url.includes('main_window')) {
      console.log(`[${sessionName}] 🔥 OAuth callback detected!`);
      event.preventDefault();
      
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      console.log(`[${sessionName}] 📝 OAuth code:`, code);
      
      const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
      console.log(`[${sessionName}] 🔄 Loading:`, newURL);
      mainWindow.loadURL(newURL);
    }
  });
    mainWindow.webContents.on('did-start-navigation', (event, url, isInPlace, isMainFrame) => {
    if (!isMainFrame) return;
    
    if (url.startsWith('http://localhost:3000/?code=') && !url.includes('main_window')) {
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      
      if (code) {
        const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
        mainWindow.webContents.stop();
        mainWindow.loadURL(newURL);
      }
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -6 && validatedURL === 'http://localhost:3000/') {
      return; // Ignore HMR 404s
    }
    
    if (validatedURL.includes('?code=') && errorCode === -6) {
      const urlObj = new URL(validatedURL);
      const code = urlObj.searchParams.get('code');
      
      if (code) {
        const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
        mainWindow.loadURL(newURL);
      }
    }
  });


  mainWindow.on('closed', () => {
    const index = windows.indexOf(mainWindow);
    if (index > -1) windows.splice(index, 1);
  });

  windows.push(mainWindow);
  return mainWindow;
};

// ────────────────────────────────────────────────────────────────
// IPC Handlers
// ────────────────────────────────────────────────────────────────

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select your project folder',
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('save-folder-path', async (event, { projectId, folderPath }) => {
  projectFolders[projectId] = folderPath;
  return true;
});

ipcMain.handle('get-folder-path', async (event, projectId) => {
  return projectFolders[projectId] || null;
});

// NEW: Read files from saved folder for push
ipcMain.handle('read-project-files', async (event, { projectId, fileStructure }) => {
  const folderPath = projectFolders[projectId];
  if (!folderPath) {
    throw new Error('No folder path saved for this project');
  }

  const filesToUpload = [];

  try {
    // Helper to read file as base64
    const readBase64 = async (filePath) => {
      const buffer = await fs.readFile(filePath);
      return buffer.toString('base64');
    };

    // 1. Individual (root-level) files
    for (const file of fileStructure.individualFiles || []) {
      const fullPath = path.join(folderPath, file.relativePath || file.name);
      try {
        const stats = await fs.stat(fullPath);
        if (stats.isFile()) {
          filesToUpload.push({
            name: file.name,
            relativePath: file.relativePath || file.name,
            content: await readBase64(fullPath),
            size: stats.size,
            lastModified: stats.mtimeMs,
          });
        }
      } catch (err) {
        console.warn(`Missing root file: ${fullPath}`);
      }
    }

    // 2. Files inside folders
    for (const folder of fileStructure.folders || []) {
      for (const file of folder.files || []) {
        const fullPath = path.join(folderPath, file.relativePath);
        try {
          const stats = await fs.stat(fullPath);
          if (stats.isFile()) {
            filesToUpload.push({
              name: file.name,
              relativePath: file.relativePath,
              content: await readBase64(fullPath),
              size: stats.size,
              lastModified: stats.mtimeMs,
            });
          }
        } catch (err) {
          console.warn(`Missing file: ${fullPath}`);
        }
      }
    }

    return filesToUpload;
  } catch (err) {
    console.error('Error reading project files:', err);
    throw err;
  }
});

// Your existing write-files handler
ipcMain.handle('write-files', async (event, { folderPath, files }) => {
  let successCount = 0;
  let failCount = 0;
  let lastError = null;

  for (const file of files) {
    try {
      const content = Buffer.from(file.content, 'base64');
      const fullPath = path.join(folderPath, file.path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content);
      successCount++;
    } catch (err) {
      failCount++;
      lastError = err.message;
    }
  }

  return { success: failCount === 0, successCount, failCount, error: lastError };
});

app.whenReady().then(() => {
  createWindow('Account-A', 0);
  createWindow('Account-B', 850);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow('Account-A', 0);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});