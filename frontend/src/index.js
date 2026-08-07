
if (require('electron-squirrel-startup')) app.quit();

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const chokidar = require('chokidar');
const Store = require('electron-store').default;
const { spawn } = require('child_process');
const simpleGit = require('simple-git');
let serverProcess = null; 

// Initialize persistent storage for folder paths
const store = new Store({ name: 'project-folders' });
global.projectStore = store;

console.log('[MAIN] Store initialized →', store.path);

const windows = [];
const watchers = new Map(); // projectId -> watcher instance
// ──────────────────────────────────────────────────────────────────────────────
// OAUTH PROTOCOL HANDLER (for production)
// ── Phase 4.16: removed — GitHub OAuth replaced by email/password auth. ──
// ──────────────────────────────────────────────────────────────────────────────
// if (process.defaultApp) {
//   if (process.argv.length >= 2) {
//     app.setAsDefaultProtocolClient('prodcollab', process.execPath, [path.resolve(process.argv[1])]);
//   }
// } else {
//   app.setAsDefaultProtocolClient('prodcollab');
// }

// Handle the protocol URL when app is already running (macOS)
// app.on('open-url', (event, url) => {
//   event.preventDefault();
//   console.log('[OAUTH] Protocol URL received:', url);
//
//   if (url.startsWith('prodcollab://')) {
//     try {
//       const urlObj = new URL(url);
//       const code = urlObj.searchParams.get('code');
//
//       if (code) {
//         console.log('[OAUTH]   Code from protocol:', code);
//
//         // Send to all windows
//         windows.forEach(win => {
//           if (!win.isDestroyed()) {
//             win.webContents.send('oauth-code', code);
//           }
//         });
//       }
//     } catch (err) {
//       console.error('[OAUTH] Protocol parsing error:', err);
//     }
//   }
// });

// Handle second instance (Windows/Linux) — keep single-instance focus behavior,
// OAuth protocol URL handling removed (Phase 4.16).
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (windows.length > 0) {
      const win = windows[0];
      if (win.isMinimized()) win.restore();
      win.focus();
    }

    // ── Phase 4.16: OAuth protocol URL handling removed ──
    // const url = commandLine.find(arg => arg.startsWith('prodcollab://'));
    // if (url) {
    //   console.log('[OAUTH] Second instance protocol URL:', url);
    //   try {
    //     const urlObj = new URL(url);
    //     const code = urlObj.searchParams.get('code');
    //     if (code) {
    //       windows.forEach(win => {
    //         if (!win.isDestroyed()) {
    //           win.webContents.send('oauth-code', code);
    //         }
    //       });
    //     }
    //   } catch (err) {
    //     console.error('[OAUTH] Second instance parsing error:', err);
    //   }
    // }
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Window Creation
// ──────────────────────────────────────────────────────────────────────────────
function createWindow(sessionName = 'default', xOffset = 0) {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../assets/icon.ico'),
    x: xOffset,
    y: 100,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: true,
    },
  });

  // CSP for security
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      const isGitHub = details.url.includes('github.com') ||
                   details.url.includes('githubusercontent.com');
    // callback({
    //   responseHeaders: {
    //     ...details.responseHeaders,
    //     'Content-Security-Policy': [
    //       process.env.NODE_ENV === 'development'
    //         ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:5000 ws://localhost:9000 wss://localhost:9000; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:;"
    //         : "default-src 'self'; script-src 'self'; connect-src 'self' http://localhost:5000; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:;"
    //     ]
    //   }
    // });
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': isGitHub ? [
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"
      ] : [
        process.env.NODE_ENV === 'development'
          ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:5000 ws://localhost:9000 wss://localhost:9000; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:;"
          : "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:5000; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:;"
      ]
    }
  });
  });

  // ============================================================================
  // OAUTH HANDLING — Phase 4.16: removed (GitHub OAuth replaced by email/password)
  // The will-navigate / did-navigate OAuth interceptors are no longer needed.
  // ============================================================================

  // win.webContents.on('will-navigate', (event, url) => {
  //   console.log('[OAUTH] will-navigate →', url);
  //
  //   if (url.startsWith('prodcollab://')) {
  //     event.preventDefault();
  //     try {
  //       const urlObj = new URL(url);
  //       const code = urlObj.searchParams.get('code');
  //       if (code) {
  //         console.log('[OAUTH] Code captured (production):', code);
  //         const targetUrl = `${MAIN_WINDOW_WEBPACK_ENTRY}?code=${code}`;
  //         win.loadURL(targetUrl);
  //       } else {
  //         win.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  //       }
  //     } catch (err) {
  //       console.error('[OAUTH] URL parsing error:', err);
  //       win.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  //     }
  //     return;
  //   }
  //
  //   // Handle localhost OAuth callback (development)
  //   if (url.includes('localhost') && url.includes('?code=')) {
  //     event.preventDefault();
  //     try {
  //       const urlObj = new URL(url);
  //       const code = urlObj.searchParams.get('code');
  //       if (code) {
  //         const targetUrl = `${MAIN_WINDOW_WEBPACK_ENTRY}?code=${code}`;
  //         win.loadURL(targetUrl);
  //       } else {
  //         win.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  //       }
  //     } catch (err) {
  //       console.error('[OAUTH] URL parsing error:', err);
  //       win.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  //     }
  //   }
  // });

  // Backup: Handle navigation after it happens (safety net) — OAuth only, removed.
  // win.webContents.on('did-navigate', (event, url) => {
  //   console.log('[OAUTH] did-navigate →', url);
  //   if (url.includes('?code=') && url.includes('localhost') && !url.includes(MAIN_WINDOW_WEBPACK_ENTRY)) {
  //     try {
  //       const urlObj = new URL(url);
  //       const code = urlObj.searchParams.get('code');
  //       if (code) {
  //         win.loadURL(`${MAIN_WINDOW_WEBPACK_ENTRY}?code=${code}`);
  //       }
  //     } catch (err) {
  //       console.error('[OAUTH] Navigation handling error:', err);
  //     }
  //   }
  // });

  // Handle failed loads (404 recovery) — OAuth recovery branch removed (Phase 4.16)
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.log('[LOAD] Failed:', errorCode, errorDescription, validatedURL);
  });

  // ============================================================================
  // END OAUTH HANDLING
  // ============================================================================

  // Initial load
  win.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  win.setTitle(`ProdCollab - ${sessionName}`);

  win.on('closed', () => {
    const idx = windows.indexOf(win);
    if (idx !== -1) windows.splice(idx, 1);
  });

  windows.push(win);
  return win;
}

// ──────────────────────────────────────────────────────────────────────────────
// File Watching System
// ──────────────────────────────────────────────────────────────────────────────
// function startWatching(projectId, folderPath) {
//   const pid = String(projectId);

//   // Stop existing watcher if any
//   if (watchers.has(pid)) {
//     watchers.get(pid).close();
//     watchers.delete(pid);
//     console.log(`[WATCHER] Stopped existing watcher for ${pid}`);
//   }

//   const watcher = chokidar.watch(folderPath, {
//    ignored: [
//     /(^|[\/\\])\../,                    // keep ignoring dotfiles at root
//     /(^|[\/\\])\.git($|[\/\\])/,       // ← NEW: ignore everything inside .git folder
//     /(^|[\/\\])\.git$/                 // ← also ignore the .git folder itself
//   ],
//     ignoreInitial: true, // Don't trigger for existing files
//     persistent: true,
//     awaitWriteFinish: {
//       stabilityThreshold: 2000, // Wait 2s after last change
//       pollInterval: 100
//     },
//     depth: 99, // Watch all subdirectories
//   });

//   watcher
//     .on('add', (filePath) => {
//       console.log(`[WATCHER] File added: ${filePath}`);
//       notifyAll('file-changed', { projectId: pid, event: 'add', path: filePath });
//     })
//     .on('change', (filePath) => {
//       console.log(`[WATCHER] File changed: ${filePath}`);
//       notifyAll('file-changed', { projectId: pid, event: 'change', path: filePath });
//     })
//     .on('unlink', (filePath) => {
//       console.log(`[WATCHER] File deleted: ${filePath}`);
//       notifyAll('file-changed', { projectId: pid, event: 'unlink', path: filePath });
//     })
//     .on('addDir', (dirPath) => {
//       console.log(`[WATCHER] Folder added: ${dirPath}`);
//       notifyAll('file-changed', { projectId: pid, event: 'addDir', path: dirPath });
//     })
//     .on('unlinkDir', (dirPath) => {
//       console.log(`[WATCHER] Folder deleted: ${dirPath}`);
//       notifyAll('file-changed', { projectId: pid, event: 'unlinkDir', path: dirPath });
//     })
//     .on('error', (error) => {
//       console.error(`[WATCHER] Error for ${pid}:`, error);
//     });

//   watchers.set(pid, watcher);
//   console.log(`[WATCHER] Started watching ${pid} → ${folderPath}`);
// }
function startWatching(projectId, folderPath) {
  const pid = String(projectId);

  // Stop existing watcher if any
  if (watchers.has(pid)) {
    watchers.get(pid).close();
    watchers.delete(pid);
    console.log(`[WATCHER] Stopped existing watcher for ${pid}`);
  }

  const watcher = chokidar.watch(folderPath, {
  ignored: [
    /(^|[\/\\])\../,                          // dotfiles at root
    /(^|[\/\\])\.git($|[\/\\])/,              // entire .git folder
    /(^|[\/\\])\.gitignore$/,                 // ← add: .gitignore file
    /(^|[\/\\])COMMIT_EDITMSG$/,              // ← git temp commit message
    /(^|[\/\\])index.lock$/,                  // ← git lock file during operations
    /\.(tmp|temp|bak|~)$/                     // ← common temp/backup files
  ],
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 4000,
      pollInterval: 100
    },
    depth: 99,
  });

  watcher
    .on('add', (filePath) => {
      console.log(`[WATCHER] File added: ${filePath}`);
      notifyAll('file-changed', { projectId: pid, event: 'add', path: filePath });
    })
    .on('change', (filePath) => {
      console.log(`[WATCHER] File changed: ${filePath}`);
      notifyAll('file-changed', { projectId: pid, event: 'change', path: filePath });
    })
    .on('unlink', (filePath) => {
      console.log(`[WATCHER] File deleted: ${filePath}`);
      notifyAll('file-changed', { projectId: pid, event: 'unlink', path: filePath });
    })
    .on('addDir', (dirPath) => {
      console.log(`[WATCHER] Folder added: ${dirPath}`);
      notifyAll('file-changed', { projectId: pid, event: 'addDir', path: dirPath });
    })
    .on('unlinkDir', (dirPath) => {
      console.log(`[WATCHER] Folder deleted: ${dirPath}`);
      notifyAll('file-changed', { projectId: pid, event: 'unlinkDir', path: dirPath });
    })
    .on('error', (error) => {
      console.error(`[WATCHER] Error for ${pid}:`, error);
    });

  watchers.set(pid, watcher);
  console.log(`[WATCHER] Started watching ${pid} → ${folderPath}`);
}

  function stopWatching(projectId) {
    const pid = String(projectId);
    if (watchers.has(pid)) {
      watchers.get(pid).close();
      watchers.delete(pid);
      console.log(`[WATCHER] Stopped watching ${pid}`);
    }
  }


function restoreAllWatchers() {
  console.log('[MAIN] Restoring watchers from persistent storage...');
  const watched = store.get('watchedFolders', {});
  console.log('[MAIN] Found saved projects:', Object.keys(watched));

  for (const [pid, folderPath] of Object.entries(watched)) {
    if (folderPath) {
      startWatching(pid, folderPath);
    }
  }
}

function notifyAll(channel, data) {
  windows.forEach(w => {
    if (!w.isDestroyed()) {
      w.webContents.send(channel, data);
    }
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// File System Helpers
// ──────────────────────────────────────────────────────────────────────────────
async function scanFolderRecursive(dirPath, basePath = dirPath) {
  // const allowed = [
  //   '.wav', '.mp3', '.mp4', '.flac', '.aiff', '.ogg', '.txt',
  //   '.m4a', '.mpeg', '.avi', '.mov', '.flv', '.midi', '.mid'
  // ];
  const allowed = [
  // Audio - Lossless & High Quality
  '.wav', '.flac', '.aiff', '.aif', '.aifc', '.w64', '.rf64', '.caf',
  '.dsd', '.dsf', '.dff', '.mqa',

  // Audio - Compressed
  '.mp3', '.mp4', '.m4a', '.aac', '.ogg', '.oga', '.opus',
  '.wma', '.ape', '.ac3', '.dts', '.amr', '.au', '.snd',

  // Audio - Video Containers
  '.mpeg', '.mpg', '.avi', '.mov', '.flv', '.mkv', '.webm',
  '.mxf', '.m2v', '.m2ts', '.ts',

  // MIDI & Notation
  '.midi', '.mid', '.smf', '.mxl', '.musicxml', '.xml', '.nwc',
  '.sib', '.mus', '.musx', '.mscz', '.mscx', '.capx',

  // Ableton Live
  '.als', '.alp', '.adv', '.adg', '.asd',

  // FL Studio
  '.flp', '.fsc', '.fst', '.fnv',

  // Logic Pro / GarageBand
  '.logicx', '.band', '.aup3',

  // Pro Tools
  '.ptx', '.ptf', '.pts', '.pte', '.ptxt',
  '.sdii', '.sd2',

  // Cubase / Nuendo (Steinberg)
  '.cpr', '.npr', '.bak', '.vstpreset', '.fxb', '.fxp',

  // Bitwig Studio
  '.bwproject', '.bwpreset', '.bwdevice', '.bwmodule', '.bwclip',

  // Studio One (PreSonus)
  '.song', '.multitrack', '.instrument', '.preset',

  // Reaper
  '.rpp', '.rpp-bak', '.rtrack', '.rfx',

  // Reason Studios
  '.reason', '.rns', '.rsb', '.rx2', '.rcy',

  // Cockos / Other DAWs
  '.ptxt', '.session',

  // Plugins & Presets
  '.vst', '.vst3', '.au', '.aax', '.rtas', '.lv2',

  // Samples & Loops
  '.rex', '.rx2', '.rex2', '.acidwav', '.loop',
  '.sf2', '.sfz', '.exs', '.nki', '.nkx', '.nkm',
  '.kontakt', '.gig', '.dls',

  // Stems & Mastering
  '.stem', '.stem.mp4', '.atmos', '.adm',

  // Project Archives / Exchange
  '.omf', '.aaf', '.edl', '.xml', '.dawproject',

  // Text & Docs
  '.txt', '.pdf', '.rtf',
];
  const files = [];
  const folders = new Set();

  async function scan(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      const rel = path.relative(basePath, full);

      // Skip hidden files and .git
      if (entry.name.startsWith('.') || entry.name === '.git') continue;

      if (entry.isDirectory()) {
        folders.add(rel);
        await scan(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (allowed.includes(ext)) {
          const stats = await fs.stat(full);
          files.push({
            name: entry.name,
            size: stats.size,
            relativePath: rel,
            lastModified: stats.mtimeMs
          });
        }
      }
    }
  }

  await scan(dirPath);
  return { files, folders: Array.from(folders) };
}

async function readFolderFiles(folderPath) {
  const contents = await scanFolderRecursive(folderPath);
  const result = [];

  for (const info of contents.files) {
    const fullPath = path.join(folderPath, info.relativePath);
    const buffer = await fs.readFile(fullPath);
    result.push({
      name: info.name,
      relativePath: info.relativePath,
      content: buffer.toString('base64'),
      size: info.size,
      lastModified: info.lastModified,
    });
  }

  return result;
}

// ──────────────────────────────────────────────────────────────────────────────
// IPC Handlers
// ──────────────────────────────────────────────────────────────────────────────

// Folder selection
ipcMain.handle('select-folder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Project Folder',
  });
  return canceled ? null : filePaths[0];
});
// Read all files from an arbitrary folder path (used by Modal's native folder browse)
ipcMain.handle('read-folder-files', async (_, folderPath) => {
  console.log(`[READ-FOLDER] Reading: ${folderPath}`);
  return await readFolderFiles(folderPath);
});
//Save folder path (persistent)
ipcMain.handle('save-folder-path', async (_, { projectId, folderPath }) => {
  if (!projectId || !folderPath) {
    throw new Error('Missing projectId or folderPath');
  }

  const pid = String(projectId);
  const current = store.get('watchedFolders', {});
  current[pid] = folderPath;
  store.set('watchedFolders', current);

  console.log(`[SAVE] Project ${pid} → ${folderPath}`);
  
  // Automatically start watching when folder is saved
  startWatching(pid, folderPath);

  return true;
});


// Get folder path
ipcMain.handle('get-folder-path', async (_, projectId) => {
  const pid = String(projectId);
  const watched = store.get('watchedFolders', {});
  const folderPath = watched[pid] || null;
  console.log(`[GET] Project ${pid} → ${folderPath || '(none)'}`);
  return folderPath;
});

// Delete folder path
ipcMain.handle('delete-folder-path', async (_, projectId) => {
  const pid = String(projectId);
  const current = store.get('watchedFolders', {});
  
  if (current[pid]) {
    delete current[pid];
    store.set('watchedFolders', current);
    stopWatching(pid);
    console.log(`[DELETE] Removed folder path for ${pid}`);
  }
  
  return true;
});

// Scan folder
ipcMain.handle('scan-folder', async (_, folderPath) => {
  console.log(`[SCAN] Scanning: ${folderPath}`);
  try {
    const result = await scanFolderRecursive(folderPath);
    console.log(`[SCAN] Found ${result.files.length} files`);
    return result;
  } catch (err) {
    console.error('[SCAN] Error:', err);
    throw err;
  }
});
// Add this to your IPC handlers in main.js (if not already there)
ipcMain.handle('has-folder-path', async (_, projectId) => {
  const pid = String(projectId);
  const watched = store.get('watchedFolders', {});
  const folderPath = watched[pid];
  
  console.log(`[CHECK] Project ${pid} has folder: ${!!folderPath}`);
  return {
    hasPath: !!folderPath,
    path: folderPath || null
  };
});

// Read project files
ipcMain.handle('read-project-files', async (_, { projectId, fileStructure }) => {
  const pid = String(projectId);
  console.log(`[READ] Reading files for project ${pid}`);

  const watched = store.get('watchedFolders', {});
  const folderPath = watched[pid];

  if (!folderPath) {
    console.error(`[READ] No folder path for project ${pid}`);
    throw new Error('No folder path saved for this project');
  }

  console.log(`[READ] Using path: ${folderPath}`);
  return await readFolderFiles(folderPath);
});

// Write files
// ipcMain.handle('write-files', async (_, { folderPath, files }) => {
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
//       console.error(`[WRITE] Failed to write ${file.path}:`, err);
//     }
//   }

//   return { 
//     success: failCount === 0, 
//     successCount, 
//     failCount, 
//     error: lastError 
//   };
// });
// In main.js
// UPDATED write-files handler in main.js
// UPDATED write-files handler in main.js
ipcMain.handle('write-files', async (event, payload) => {
  console.log('[WRITE] Raw payload received:', JSON.stringify(payload, null, 2).substring(0, 500));
  console.log('[WRITE] Payload type:', typeof payload);
  console.log('[WRITE] Payload keys:', payload ? Object.keys(payload) : 'null');
  console.log('[WRITE] Received payload:', {
    hasFolderPath: !!payload?.folderPath,
    hasFiles: !!payload?.files,
    filesType: typeof payload?.files,
    filesIsArray: Array.isArray(payload?.files),
    filesLength: payload?.files?.length,
    folderPath: payload?.folderPath
  });

  // Validate payload
  if (!payload) {
    console.error('[WRITE]   Payload is undefined');
    return { 
      success: false, 
      successCount: 0, 
      failCount: 0, 
      error: 'Payload is undefined' 
    };
  }

  const { folderPath, files } = payload;

  if (!folderPath) {
    console.error('[WRITE]   No folderPath provided');
    return { 
      success: false, 
      successCount: 0, 
      failCount: 0, 
      error: 'No folder path provided' 
    };
  }

  if (!files) {
    console.error('[WRITE]   No files array provided');
    return { 
      success: false, 
      successCount: 0, 
      failCount: 0, 
      error: 'No files array provided' 
    };
  }

  if (!Array.isArray(files)) {
    console.error('[WRITE]   Files is not an array:', typeof files);
    return { 
      success: false, 
      successCount: 0, 
      failCount: 0, 
      error: `Files must be an array, got ${typeof files}` 
    };
  }

  if (files.length === 0) {
    console.warn('[WRITE] ⚠️ Files array is empty');
    return { 
      success: true, 
      successCount: 0, 
      failCount: 0, 
      error: null 
    };
  }

  let successCount = 0;
  let failCount = 0;
  let lastError = null;

  console.log(`[WRITE] 📝 Writing ${files.length} files to: ${folderPath}`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      // Validate file object
      if (!file) {
        console.error(`[WRITE]   File at index ${i} is undefined`);
        failCount++;
        lastError = `File at index ${i} is undefined`;
        continue;
      }

      if (!file.path) {
        console.error(`[WRITE]   File missing path at index ${i}:`, file);
        failCount++;
        lastError = `File at index ${i} missing path`;
        continue;
      }

      if (!file.content) {
        console.error(`[WRITE]   File missing content: ${file.path}`);
        failCount++;
        lastError = `File ${file.path} missing content`;
        continue;
      }

      // Decode base64 content
      let content;
      try {
        content = Buffer.from(file.content, 'base64');
      } catch (decodeError) {
        console.error(`[WRITE]   Failed to decode base64 for ${file.path}:`, decodeError);
        failCount++;
        lastError = `Failed to decode ${file.path}: ${decodeError.message}`;
        continue;
      }

      // Build full path (normalize path separators)
      const normalizedPath = file.path.replace(/\\/g, '/');
      const fullPath = path.join(folderPath, normalizedPath);
      
      console.log(`[WRITE] ${i + 1}/${files.length} Writing: ${fullPath} (${content.length} bytes)`);
      
      // Create directory if it doesn't exist
      const dirPath = path.dirname(fullPath);
      await fs.mkdir(dirPath, { recursive: true });
      
      // Write the file
      await fs.writeFile(fullPath, content);
      
      successCount++;
      console.log(`[WRITE]   Success [${i + 1}/${files.length}]: ${file.path}`);
    } catch (err) {
      failCount++;
      lastError = err.message;
      console.error(`[WRITE]   Failed to write ${file.path}:`, err);
    }
  }

  const result = {
    success: failCount === 0,
    successCount,
    failCount,
    error: lastError
  };

  console.log(`[WRITE] Complete:`, result);

  return result;
});
// Start watching
ipcMain.handle('start-watching', async (_, { projectId, folderPath }) => {
  try {
    startWatching(projectId, folderPath);
    return { success: true };
  } catch (err) {
    console.error('[WATCHER] Start failed:', err);
    return { success: false, error: err.message };
  }
});

// Stop watching
ipcMain.handle('stop-watching', async (_, projectId) => {
  try {
    stopWatching(projectId);
    return { success: true };
  } catch (err) {
    console.error('[WATCHER] Stop failed:', err);
    return { success: false, error: err.message };
  }
});

//logout
// Add this IPC handler to main.js, near your other ipcMain.handle() calls

ipcMain.handle('clear-oauth-session', async () => {
  console.log('[AUTH] Clearing OAuth session...');
  
  try {
    for (const win of windows) {
      if (!win.isDestroyed()) {
        const session = win.webContents.session;
        
        // Clear ALL storage data
        await session.clearStorageData({
          storages: [
            'cookies',
            'filesystem',
            'indexdb',
            'localstorage',
            'shadercache',
            'websql',
            'serviceworkers',
            'cachestorage'
          ]
        });
        
        // Specifically clear GitHub cookies
        const allCookies = await session.cookies.get({});
        
        for (const cookie of allCookies) {
          if (
            cookie.domain.includes('github.com') ||
            cookie.domain.includes('githubusercontent.com')
          ) {
            const url = `https://${cookie.domain}${cookie.path}`;
            await session.cookies.remove(url, cookie.name);
            console.log(`[AUTH] Cleared cookie: ${cookie.name} from ${cookie.domain}`);
          }
        }
        
        // Clear cache
        await session.clearCache();
        
        console.log('[AUTH] Session cleared for window');
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('[AUTH] Failed to clear session:', error);
    return { success: false, error: error.message };
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Git (simple-git) — Phase 5 file transfer mechanism
// Uses the ProdCollab GitHub account token (currently dev-anthony's token).
// The token is embedded into the remote URL so git can authenticate against
// GitHub without a global credential helper.
// ──────────────────────────────────────────────────────────────────────────────

// Build an authenticated https remote URL: https://<token>@github.com/owner/repo.git
const buildAuthedRemoteUrl = (repoUrl, token) => {
  if (!repoUrl) throw new Error('Missing repoUrl');
  if (!token) return repoUrl; // fall back to unauthenticated (public repos)
  // Normalize to https + ensure .git suffix
  let url = repoUrl.trim();
  if (url.startsWith('git@github.com:')) {
    url = 'https://github.com/' + url.slice('git@github.com:'.length);
  }
  if (!url.endsWith('.git')) url = url + '.git';
  return url.replace('https://github.com/', `https://${token}@github.com/`);
};

// Init a repo in an existing project folder and wire up the remote
ipcMain.handle('init-git', async (_, { folderPath, repoUrl, token }) => {
  try {
    const git = simpleGit(folderPath);
    const isRepo = await git.checkIsRepo();

    if (!isRepo) {
      await git.init();
    }

    const authedUrl = buildAuthedRemoteUrl(repoUrl, token);
    const remotes = await git.getRemotes(true);
    const origin = remotes.find((r) => r.name === 'origin');
    if (!origin) {
      await git.addRemote('origin', authedUrl);
    } else {
      // Keep the token fresh on the existing remote
      await git.remote(['set-url', 'origin', authedUrl]);
    }

    return { success: true };
  } catch (err) {
    console.error('[GIT] init-git failed:', err);
    return { success: false, error: err.message };
  }
});

// Stage everything, commit, and push
ipcMain.handle('git-push', async (_, { folderPath, message, username, email, repoUrl, token }) => {
  try {
    const git = simpleGit(folderPath);

    // Make sure origin has a valid authenticated URL (token can rotate)
    if (repoUrl) {
      const authedUrl = buildAuthedRemoteUrl(repoUrl, token);
      const remotes = await git.getRemotes(true);
      if (remotes.find((r) => r.name === 'origin')) {
        await git.remote(['set-url', 'origin', authedUrl]);
      } else {
        await git.addRemote('origin', authedUrl);
      }
    }

    // Attribute the commit to the acting user
    if (username) await git.addConfig('user.name', username);
    if (email) await git.addConfig('user.email', email);

    await git.add('.');

    // Only commit if there is something staged
    const status = await git.status();
    if (status.staged.length === 0 && status.created.length === 0 &&
        status.modified.length === 0 && status.deleted.length === 0 &&
        status.renamed.length === 0) {
      return { success: true, nothingToCommit: true };
    }

    await git.commit(message || `Update by ${username || 'ProdCollab'}`);

    // Ensure branch is main, then push
    await git.branch(['-M', 'main']).catch(() => {});
    await git.push('origin', 'main', ['--set-upstream']);

    return { success: true };
  } catch (err) {
    console.error('[GIT] git-push failed:', err);
    return { success: false, error: err.message };
  }
});

// Pull latest from origin/main
ipcMain.handle('git-pull', async (_, { folderPath, repoUrl, token }) => {
  try {
    const git = simpleGit(folderPath);
    if (repoUrl && token) {
      const authedUrl = buildAuthedRemoteUrl(repoUrl, token);
      await git.remote(['set-url', 'origin', authedUrl]).catch(() => {});
    }
    await git.pull('origin', 'main');
    return { success: true };
  } catch (err) {
    console.error('[GIT] git-pull failed:', err);
    return { success: false, error: err.message };
  }
});

// Clone a repo into a folder (used when a collaborator joins)
ipcMain.handle('git-clone', async (_, { repoUrl, folderPath, token }) => {
  try {
    const authedUrl = buildAuthedRemoteUrl(repoUrl, token);
    await simpleGit().clone(authedUrl, folderPath);
    // Reset origin to the token-embedded URL so future pushes/pulls authenticate
    await simpleGit(folderPath).remote(['set-url', 'origin', authedUrl]).catch(() => {});
    return { success: true };
  } catch (err) {
    console.error('[GIT] git-clone failed:', err);
    return { success: false, error: err.message };
  }
});

// Commit history (version history)
ipcMain.handle('git-log', async (_, { folderPath }) => {
  try {
    const git = simpleGit(folderPath);
    const log = await git.log({ maxCount: 50 });
    return { success: true, log: log.all };
  } catch (err) {
    console.error('[GIT] git-log failed:', err);
    return { success: false, error: err.message };
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// App Lifecycle
// ──────────────────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
    const serverPath = app.isPackaged
    ? path.join(process.resourcesPath, 'server', 'server.js')
    : path.join(process.cwd(), '..', 'server', 'server.js');

  serverProcess = spawn('node', [serverPath], {
    env: { ...process.env }
  });
  serverProcess.stdout.on('data', d => console.log('[SERVER]', d.toString()));
  serverProcess.stderr.on('data', d => console.error('[SERVER ERROR]', d.toString()));
  
  createWindow('Account-A', 0);
  // createWindow('Account-B', 850);

  // Restore watchers after a brief delay to ensure windows are ready
  setTimeout(() => {
    console.log('[MAIN] Restoring watchers...');
    restoreAllWatchers();
  }, 800);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow('Account-A', 0);
    }
  });
});

app.on('window-all-closed', () => {
  // Clean up all watchers
  watchers.forEach(w => w.close());
  watchers.clear();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
    if (serverProcess) serverProcess.kill();
  // Clean up watchers before quitting
  watchers.forEach(w => w.close());
  watchers.clear();
  console.log('[MAIN] Application shutting down cleanly');
});