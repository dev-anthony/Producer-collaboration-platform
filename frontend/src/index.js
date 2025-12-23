// // // const { app, BrowserWindow } = require('electron');
// // // const path = require('node:path');

// // // // Handle creating/removing shortcuts on Windows when installing/uninstalling.
// // // if (require('electron-squirrel-startup')) {
// // //   app.quit();
// // // }

// // // const createWindow = () => {
// // //   // Create the browser window.
// // //   const mainWindow = new BrowserWindow({
// // //     width: 800,
// // //     height: 600,
// // //     webPreferences: {
// // //       preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
// // //     },
// // //   });

// // //   // and load the index.html of the app.
// // //   mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

// // //   // Open the DevTools.
// // //   mainWindow.webContents.openDevTools();
// // // };

// // // // This method will be called when Electron has finished
// // // // initialization and is ready to create browser windows.
// // // // Some APIs can only be used after this event occurs.
// // // app.whenReady().then(() => {
// // //   createWindow();

// // //   // On OS X it's common to re-create a window in the app when the
// // //   // dock icon is clicked and there are no other windows open.
// // //   app.on('activate', () => {
// // //     if (BrowserWindow.getAllWindows().length === 0) {
// // //       createWindow();
// // //     }
// // //   });
// // // });

// // // // Quit when all windows are closed, except on macOS. There, it's common
// // // // for applications and their menu bar to stay active until the user quits
// // // // explicitly with Cmd + Q.
// // // app.on('window-all-closed', () => {
// // //   if (process.platform !== 'darwin') {
// // //     app.quit();
// // //   }
// // // });

// // // // In this file you can include the rest of your app's specific main process
// // // // code. You can also put them in separate files and import them here.
// // const { app, BrowserWindow } = require('electron');
// // const path = require('node:path');

// // // Handle creating/removing shortcuts on Windows when installing/uninstalling.
// // if (require('electron-squirrel-startup')) {
// //   app.quit();
// // }

// // const createWindow = () => {
// //   // Create the browser window.
// //   const mainWindow = new BrowserWindow({
// //     width: 800,
// //     height: 600,
// //     webPreferences: {
// //       preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
// //       sandbox: false,  // ADD THIS LINE
// //       contextIsolation: true,
// //       nodeIntegration: false,
// //     },
// //   });

// //   // and load the index.html of the app.
// //   mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

// //   // Open the DevTools.
// //   mainWindow.webContents.openDevTools();
// // };

// // // This method will be called when Electron has finished
// // // initialization and is ready to create browser windows.
// // // Some APIs can only be used after this event occurs.
// // app.whenReady().then(() => {
// //   createWindow();

// //   // On OS X it's common to re-create a window in the app when the
// //   // dock icon is clicked and there are no other windows open.
// //   app.on('activate', () => {
// //     if (BrowserWindow.getAllWindows().length === 0) {
// //       createWindow();
// //     }
// //   });
// // });

// // // Quit when all windows are closed, except on macOS. There, it's common
// // // for applications and their menu bar to stay active until the user quits
// // // explicitly with Cmd + Q.
// // app.on('window-all-closed', () => {
// //   if (process.platform !== 'darwin') {
// //     app.quit();
// //   }
// // });
// // const { app, BrowserWindow } = require('electron');
// // const path = require('node:path');

// // if (require('electron-squirrel-startup')) {
// //   app.quit();
// // }

// // const createWindow = () => {
// //   const mainWindow = new BrowserWindow({
// //     width: 800,
// //     height: 600,
// //     webPreferences: {
// //       preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
// //       sandbox: false,
// //       contextIsolation: true,
// //       nodeIntegration: false,
// //       // Enable web security but allow loading external content
// //       webSecurity: true,
// //     },
// //   });

// //   mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
// //   mainWindow.webContents.openDevTools();

// //   // Handle external navigation (like GitHub OAuth)
// //   mainWindow.webContents.setWindowOpenHandler(({ url }) => {
// //     // Open external links in default browser
// //     if (url.startsWith('https://github.com') || url.startsWith('http://localhost:5000')) {
// //       return { action: 'allow' };
// //     }
// //     return { action: 'deny' };
// //   });

// //   // Handle navigation events
// //   mainWindow.webContents.on('will-navigate', (event, url) => {
// //     // Allow GitHub OAuth and localhost backend
// //     if (url.startsWith('https://github.com') || url.startsWith('http://localhost:5000')) {
// //       // Allow navigation
// //       return;
// //     }
// //     // For your app's internal pages, also allow
// //     if (url.includes('localhost:3000') || url === MAIN_WINDOW_WEBPACK_ENTRY) {
// //       return;
// //     }
// //   });

// //   // Listen for OAuth callback
// //   mainWindow.webContents.on('did-navigate', (event, url) => {
// //     console.log('Navigated to:', url);
// //   });
// // };

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
// const { app, BrowserWindow, session } = require('electron');

// if (require('electron-squirrel-startup')) {
//   app.quit();
// }

// const createWindow = () => {
//   const mainWindow = new BrowserWindow({
//     width: 800,
//     height: 600,
//     webPreferences: {
//       sandbox: false,
//       contextIsolation: false,
//       nodeIntegration: false,
//       webSecurity: true,
//     },
//   });

//   // Intercept navigation BEFORE it happens
//   mainWindow.webContents.on('will-redirect', (event, url) => {
//     console.log('🔀 Will redirect to:', url);
    
//     // Check if this is an OAuth callback
//     if (url.startsWith('http://localhost:3000/?code=')) {
//       console.log('🔥 OAuth callback detected in will-redirect!');
//       event.preventDefault();
      
//       // Extract the code
//       const urlObj = new URL(url);
//       const code = urlObj.searchParams.get('code');
//       console.log('📝 OAuth code:', code);
      
//       // Load the correct webpack page with the code
//       const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
//       console.log('🔄 Loading:', newURL);
//       mainWindow.loadURL(newURL);
//     }
//   });

//   mainWindow.webContents.on('will-navigate', (event, url) => {
//     console.log('➡️ Will navigate to:', url);
    
//     // Check if this is an OAuth callback
//     if (url.startsWith('http://localhost:3000/?code=')) {
//       console.log('🔥 OAuth callback detected in will-navigate!');
//       event.preventDefault();
      
//       // Extract the code
//       const urlObj = new URL(url);
//       const code = urlObj.searchParams.get('code');
//       console.log('📝 OAuth code:', code);
      
//       // Load the correct webpack page with the code
//       const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
//       console.log('🔄 Loading:', newURL);
//       mainWindow.loadURL(newURL);
//     }
//   });

//   // Also catch it if navigation happens
//   mainWindow.webContents.on('did-start-navigation', (event, url, isInPlace, isMainFrame) => {
//     if (!isMainFrame) return;
    
//     console.log('🚀 Did start navigation to:', url);
    
//     // If it's navigating to the OAuth callback
//     if (url.startsWith('http://localhost:3000/?code=')) {
//       console.log('🔥 OAuth callback detected in did-start-navigation!');
      
//       // Stop and reload with correct URL
//       const urlObj = new URL(url);
//       const code = urlObj.searchParams.get('code');
      
//       if (code) {
//         console.log('📝 OAuth code:', code);
//         const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
//         console.log('🔄 Loading:', newURL);
        
//         // Stop current navigation and load correct one
//         mainWindow.webContents.stop();
//         mainWindow.loadURL(newURL);
//       }
//     }
//   });

//   mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
//     console.error('❌ Failed to load:', validatedURL);
//     console.error('❌ Error:', errorDescription, 'Code:', errorCode);
    
//     // If it's a 404 on OAuth callback, reload properly
//     if (validatedURL.includes('?code=') && errorCode === -6) {
//       const urlObj = new URL(validatedURL);
//       const code = urlObj.searchParams.get('code');
      
//       if (code) {
//         console.log('🔄 Recovering from 404, code:', code);
//         const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
//         console.log('🔄 Reloading as:', newURL);
//         mainWindow.loadURL(newURL);
//       }
//     }
//   });

//   mainWindow.webContents.on('did-navigate', (event, url) => {
//     console.log('✅ Did navigate to:', url);
//   });

//   // Initial load
//   mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
//   mainWindow.webContents.openDevTools();
// };

// app.whenReady().then(() => {
//   createWindow();

//   app.on('activate', () => {
//     if (BrowserWindow.getAllWindows().length === 0) {
//       createWindow();
//     }
//   });
// });

// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') {
//     app.quit();
//   }
// });


const { app, BrowserWindow } = require('electron');
const path = require('path');

if (require('electron-squirrel-startup')) {
  app.quit();
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // In production, use preload and proper isolation
      preload: isDev ? undefined : path.join(__dirname, 'preload-production.js'),
      sandbox: false,
      contextIsolation: !isDev, // true in production, false in dev
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  // Development navigation handlers
  if (isDev) {
    mainWindow.webContents.on('will-redirect', (event, url) => {
      console.log('🔀 Will redirect to:', url);
      
      if (url.startsWith('http://localhost:3000/?code=')) {
        console.log('🔥 OAuth callback detected!');
        event.preventDefault();
        
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
        mainWindow.loadURL(newURL);
      }
    });

    mainWindow.webContents.on('did-start-navigation', (event, url, isInPlace, isMainFrame) => {
      if (!isMainFrame) return;
      
      if (url.startsWith('http://localhost:3000/?code=')) {
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
      if (validatedURL.includes('?code=') && errorCode === -6) {
        const urlObj = new URL(validatedURL);
        const code = urlObj.searchParams.get('code');
        
        if (code) {
          const newURL = MAIN_WINDOW_WEBPACK_ENTRY + '?code=' + code;
          mainWindow.loadURL(newURL);
        }
      }
    });
  }

  // Production: Handle OAuth callback differently
  if (!isDev) {
    mainWindow.webContents.on('will-redirect', (event, url) => {
      // In production, your OAuth redirect should go to a custom protocol
      // or you handle it server-side
      if (url.includes('?code=')) {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        
        // Send code to renderer via query params
        mainWindow.loadURL(`file://${__dirname}/renderer/main_window/index.html?code=${code}`);
      }
    });
  }

  // Load app
  if (isDev) {
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer/main_window/index.html'));
  }
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});