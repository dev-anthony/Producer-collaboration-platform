
if (require('electron-squirrel-startup')) app.quit();

const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, clipboard, Notification } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const chokidar = require('chokidar');
const Store = require('electron-store').default;
const { spawn } = require('child_process');
const simpleGit = require('simple-git');
const crypto = require('crypto');
let serverProcess = null; 

// Initialize persistent storage for folder paths
const store = new Store({ name: 'project-folders' });
global.projectStore = store;

console.log('[MAIN] Store initialized →', store.path);

const windows = [];
const watchers = new Map(); // projectId -> watcher instance
// ── Phase 6.1: debounced auto-push timers (projectId -> timeout handle) ──
const pushTimers = new Map();
const PUSH_DELAY = 10 * 60 * 1000; // 10 minutes

// Schedule (or reschedule) an auto-push for a project after PUSH_DELAY of quiet.
function scheduleAutoPush(pid) {
  if (pushTimers.has(pid)) clearTimeout(pushTimers.get(pid));
  const timer = setTimeout(() => {
    pushTimers.delete(pid);
    notifyAll('auto-push-ready', { projectId: pid });
  }, PUSH_DELAY);
  pushTimers.set(pid, timer);
}
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

  // Phase 6.11 — on window close, ask the user: keep running in the background
  // (so auto-push keeps working) or quit entirely. Only quit fully when the user
  // explicitly chooses to, either here or via the tray "Quit" item.
  win.on('close', (e) => {
    if (app.isQuitting) return; // explicit quit already in progress → allow close

    e.preventDefault();
    const choice = dialog.showMessageBoxSync(win, {
      type: 'question',
      buttons: ['Keep running in background', 'Quit entirely'],
      defaultId: 0,
      cancelId: 0,
      title: 'Close ProdCollab',
      message: 'Keep ProdCollab running in the background?',
      detail: 'Running in the background keeps auto-push and file watching active. Choose "Quit entirely" to close the app completely.',
    });

    if (choice === 1) {
      app.isQuitting = true;
      app.quit();
    } else {
      win.hide(); // keep process alive in the tray
    }
  });

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
      scheduleAutoPush(pid); // Phase 6.1
    })
    .on('change', (filePath) => {
      console.log(`[WATCHER] File changed: ${filePath}`);
      notifyAll('file-changed', { projectId: pid, event: 'change', path: filePath });
      scheduleAutoPush(pid); // Phase 6.1
    })
    .on('unlink', (filePath) => {
      console.log(`[WATCHER] File deleted: ${filePath}`);
      notifyAll('file-changed', { projectId: pid, event: 'unlink', path: filePath });
      scheduleAutoPush(pid); // Phase 6.1
    })
    .on('addDir', (dirPath) => {
      console.log(`[WATCHER] Folder added: ${dirPath}`);
      notifyAll('file-changed', { projectId: pid, event: 'addDir', path: dirPath });
      scheduleAutoPush(pid); // Phase 6.1
    })
    .on('unlinkDir', (dirPath) => {
      console.log(`[WATCHER] Folder deleted: ${dirPath}`);
      notifyAll('file-changed', { projectId: pid, event: 'unlinkDir', path: dirPath });
      scheduleAutoPush(pid); // Phase 6.1
    })
    .on('error', (error) => {
      console.error(`[WATCHER] Error for ${pid}:`, error);
    });

  watchers.set(pid, watcher);
  console.log(`[WATCHER] Started watching ${pid} → ${folderPath}`);
  refreshTray(); // Phase 6.11: keep tray "Push now" list in sync
}

  function stopWatching(projectId) {
    const pid = String(projectId);
    if (watchers.has(pid)) {
      watchers.get(pid).close();
      watchers.delete(pid);
      console.log(`[WATCHER] Stopped watching ${pid}`);
    }
    refreshTray(); // Phase 6.11
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
// Phase 6.2 / 6.11 — shared "push now" trigger + system tray
// ──────────────────────────────────────────────────────────────────────────────

// Clear any pending debounce timer and signal the renderer to push immediately.
function triggerPushNow(projectId) {
  const pid = String(projectId);
  if (pushTimers.has(pid)) {
    clearTimeout(pushTimers.get(pid));
    pushTimers.delete(pid);
  }
  notifyAll('auto-push-ready', { projectId: pid });
}

let tray = null;

// Bring the app window to the front.
function focusMainWindow() {
  if (windows.length > 0) {
    const win = windows[0];
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  } else {
    createWindow('Account-A', 0);
  }
}

// 6.11 — Build the tray context menu with a "Push now" entry per watched project.
function refreshTray() {
  if (!tray) return;

  const watched = store.get('watchedFolders', {}); // { projectId: folderPath }
  const projectItems = Object.entries(watched).map(([pid, folderPath]) => ({
    label: `Push now — ${folderPath ? path.basename(folderPath) : pid}`,
    click: () => triggerPushNow(pid),
  }));

  const template = [
    { label: 'ProdCollab', enabled: false },
    { type: 'separator' },
    ...(projectItems.length > 0
      ? projectItems
      : [{ label: 'No watched projects', enabled: false }]),
    { type: 'separator' },
    { label: 'Open ProdCollab', click: () => focusMainWindow() },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ];

  tray.setContextMenu(Menu.buildFromTemplate(template));
}

function buildTray() {
  if (tray) return;
  try {
    // Try to reuse the app icon; fall back to an empty image if missing.
    let icon;
    try {
      icon = nativeImage.createFromPath(path.join(__dirname, '../assets/icon.ico'));
      if (icon.isEmpty()) icon = nativeImage.createEmpty();
    } catch {
      icon = nativeImage.createEmpty();
    }
    tray = new Tray(icon);
    tray.setToolTip('ProdCollab');
    tray.on('click', () => focusMainWindow());
    refreshTray();
  } catch (err) {
    console.error('[TRAY] Failed to build tray:', err);
  }
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

// Preflight folder validation used before create/join mutates server state.
// projectId is optional for new projects; when present, relinking the same
// project's existing folder remains valid.
ipcMain.handle('validate-folder-link', async (_, { folderPath, projectId }) => {
  if (!folderPath) {
    return { valid: false, error: 'NO_FOLDER_SELECTED' };
  }

  const pid = projectId == null ? null : String(projectId);
  const current = store.get('watchedFolders', {});
  const normalize = (p) => path.resolve(p).replace(/[\\/]+$/, '').toLowerCase();
  const target = normalize(folderPath);
  const conflict = Object.entries(current).find(
    ([otherPid, otherPath]) => otherPid !== pid && otherPath && normalize(otherPath) === target
  );

  if (conflict) {
    return {
      valid: false,
      error: 'FOLDER_ALREADY_LINKED',
      projectId: conflict[0]
    };
  }

  return { valid: true };
});
//Save folder path (persistent)
ipcMain.handle('save-folder-path', async (_, { projectId, folderPath }) => {
  if (!projectId || !folderPath) {
    throw new Error('Missing projectId or folderPath');
  }

  const pid = String(projectId);
  const current = store.get('watchedFolders', {});

  // ── Guard: a local folder may only be linked to ONE project. ──
  // Linking the same folder to multiple projects makes a single file change fire
  // pushes for every project sharing it (race → non-fast-forward conflicts).
  const normalize = (p) => path.resolve(p).replace(/[\\/]+$/, '').toLowerCase();
  const target = normalize(folderPath);
  const conflict = Object.entries(current).find(
    ([otherPid, otherPath]) => otherPid !== pid && otherPath && normalize(otherPath) === target
  );
  if (conflict) {
    throw new Error(
      `FOLDER_ALREADY_LINKED: This folder is already linked to another project (id ${conflict[0]}). ` +
      `Please choose a different folder for each project.`
    );
  }

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

const sanitizeGitError = (error, token) => {
  const message = error?.message || String(error);
  return token ? message.split(token).join('[REDACTED]') : message;
};

function attachGitProgress(git, event, operation) {
  git.outputHandler((command, stdout, stderr) => {
    const report = (chunk) => {
      const text = chunk.toString();
      const match = text.match(/(?:Receiving objects|Resolving deltas|Writing objects|Compressing objects):\s*(\d+)%/i);
      if (!match) return;
      if (event.sender.isDestroyed()) return;
      event.sender.send('git-progress', {
        operation,
        stage: match[0].split(':')[0],
        percent: Number(match[1])
      });
    };
    stdout.on('data', report);
    stderr.on('data', report);
  });
  return git;
}

async function findDuplicateFiles(folderPath, candidatePaths) {
  const filesBySize = new Map();
  async function walk(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      const relativePath = path.relative(folderPath, fullPath);
      const { size } = await fs.stat(fullPath);
      const files = filesBySize.get(size) || [];
      files.push({ fullPath, relativePath });
      filesBySize.set(size, files);
    }
  }
  await walk(folderPath);
  const duplicates = [];
  for (const files of filesBySize.values()) {
    if (files.length < 2 || !files.some(({ relativePath }) => candidatePaths.has(relativePath.replace(/\\/g, '/')))) continue;
    const hashes = new Map();
    for (const file of files) {
      const hash = crypto.createHash('sha256').update(await fs.readFile(file.fullPath)).digest('hex');
      const matches = hashes.get(hash) || [];
      matches.push(file.relativePath);
      hashes.set(hash, matches);
    }
    for (const paths of hashes.values()) {
      if (paths.length < 2) continue;
      duplicates.push(...paths
        .filter((filePath) => candidatePaths.has(filePath.replace(/\\/g, '/')))
        .map((filePath) => ({ path: filePath, duplicateOf: paths.find((other) => other !== filePath) })));
    }
  }
  return duplicates;
}

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
    console.error('[GIT] init-git failed:', sanitizeGitError(err, token));
    return { success: false, error: sanitizeGitError(err, token) };
  }
});

// Stage everything, commit, and push
ipcMain.handle('git-push', async (event, { folderPath, message, username, email, repoUrl, token }) => {
  try {
    const git = attachGitProgress(simpleGit(folderPath), event, 'push');

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

    const statusBeforeCommit = await git.status();
    const changedPaths = statusBeforeCommit.files.map(({ path: filePath }) => filePath);
    const candidatePaths = new Set([
      ...statusBeforeCommit.staged,
      ...statusBeforeCommit.not_added,
      ...statusBeforeCommit.created,
      ...statusBeforeCommit.modified,
      ...statusBeforeCommit.renamed.map((item) => item.to)
    ].map((filePath) => filePath.replace(/\\/g, '/')));
    const duplicateFiles = await findDuplicateFiles(folderPath, candidatePaths);
    if (duplicateFiles.length > 0) {
      const duplicate = duplicateFiles[0];
      return {
        success: false,
        duplicateFiles,
        error: `Push blocked: "${duplicate.path}" has the same content as "${duplicate.duplicateOf}". Remove one copy or change its content before pushing.`
      };
    }

    if (changedPaths.length > 0) await git.add(changedPaths);

    // Only commit if there is something staged
    const status = await git.status();
    if (status.staged.length === 0 && status.created.length === 0 &&
        status.modified.length === 0 && status.deleted.length === 0 &&
        status.renamed.length === 0) {
      return { success: true, nothingToCommit: true };
    }

    await git.commit(message || `Update by ${username || 'ProdCollab'}`);

    // Ensure branch is main
    await git.branch(['-M', 'main']).catch(() => {});

    // Try to push. If the remote is ahead (e.g. GitHub's auto-init README, or a
    // concurrent push), git rejects with "fetch first" / non-fast-forward.
    // Recover by rebasing onto the remote and retrying once.
    try {
      await git.push('origin', 'main', ['--set-upstream']);
    } catch (pushErr) {
      const msg = String(pushErr && pushErr.message);
      const nonFastForward =
        msg.includes('fetch first') ||
        msg.includes('non-fast-forward') ||
        msg.includes('Updates were rejected') ||
        msg.includes('[rejected]');

      if (!nonFastForward) throw pushErr;

      console.warn('[GIT] push rejected (remote ahead) — rebasing onto origin/main and retrying');

      // Allow reconciling two independent histories (local git init vs remote auto-init).
      try {
        await git.raw(['-c', 'http.version=HTTP/1.1', 'fetch', 'origin', 'main']);
        await git.rebase(['origin/main']);
      } catch (rebaseErr) {
        // Fallback: merge unrelated histories, preferring both sets of files.
        console.warn('[GIT] rebase failed, trying merge --allow-unrelated-histories');
        await git.rebase(['--abort']).catch(() => {});
        await git.merge(['origin/main', '--allow-unrelated-histories', '--no-edit'])
          .catch((mergeErr) => { throw mergeErr; });
      }

      await git.push('origin', 'main', ['--set-upstream']);
    }

    return { success: true, filesStaged: changedPaths.length };
  } catch (err) {
    console.error('[GIT] git-push failed:', sanitizeGitError(err, token));
    return { success: false, error: sanitizeGitError(err, token) };
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
    console.error('[GIT] git-pull failed:', sanitizeGitError(err, token));
    return { success: false, error: sanitizeGitError(err, token) };
  }
});

// Clone a repo into a folder (used when a collaborator joins)
ipcMain.handle('git-clone', async (event, { repoUrl, folderPath, token }) => {
  try {
    const authedUrl = buildAuthedRemoteUrl(repoUrl, token);
    let lastError;

    const entries = await fs.readdir(folderPath).catch(() => []);
    const hasLocalFiles = entries.some((name) => name !== '.git');

    // A normal `git clone <url> <folder>` rejects a non-empty destination. For
    // an existing project folder, preserve its files in a local commit first,
    // then fetch/merge the remote history. Empty folders use normal clone.
    if (hasLocalFiles) {
      const git = attachGitProgress(simpleGit(folderPath), event, 'clone');
      if (!(await git.checkIsRepo())) await git.init();
      await git.addConfig('user.name', 'ProdCollab');
      await git.addConfig('user.email', 'sync@prodcollab.local');

      const remotes = await git.getRemotes(true);
      if (remotes.find((remote) => remote.name === 'origin')) {
        await git.remote(['set-url', 'origin', authedUrl]);
      } else {
        await git.addRemote('origin', authedUrl);
      }

      await git.add('.');
      const status = await git.status();
      if (!status.isClean()) {
        await git.commit('Preserve local files before joining project');
      }
      await git.branch(['-M', 'main']).catch(() => {});

      try {
        await git.raw(['-c', 'http.version=HTTP/1.1', 'fetch', 'origin', 'main']);
        await git.merge(['origin/main', '--allow-unrelated-histories', '--no-edit']);
      } catch (fetchOrMergeError) {
        const message = String(fetchOrMergeError && fetchOrMergeError.message);
        // An empty remote has no main ref yet; the local project is still valid.
        if (!message.includes("couldn't find remote ref") &&
            !message.includes('Remote branch main not found')) {
          throw fetchOrMergeError;
        }
      }

      return { success: true, mergedExistingFolder: true };
    }

    // GitHub occasionally drops large HTTPS fetches through Windows Schannel.
    // Retry once normally, then retry with HTTP/1.1 to avoid HTTP/2 transport
    // disconnects. A failed clone may leave a partial .git directory behind.
    const attempts = [
      ['-c', 'http.version=HTTP/1.1', 'clone', '--depth', '1', '--single-branch', '--branch', 'main', authedUrl, folderPath],
      ['-c', 'http.version=HTTP/1.1', 'clone', authedUrl, folderPath]
    ];
    for (const cloneArgs of attempts) {
      try {
        await attachGitProgress(simpleGit(), event, 'clone').raw(cloneArgs);
        const clonedGit = simpleGit(folderPath);
        // Reset origin to the token-embedded URL so future pushes/pulls authenticate
        await clonedGit.remote(['set-url', 'origin', authedUrl]);
        return { success: true };
      } catch (cloneError) {
        lastError = cloneError;
        // Remove only the partial .git metadata before retrying. Preserve any
        // files the user may already have in the selected destination folder.
        await fs.rm(path.join(folderPath, '.git'), { recursive: true, force: true }).catch(() => {});
      }
    }

    throw lastError;
  } catch (err) {
    console.error('[GIT] git-clone failed:', sanitizeGitError(err, token));
    return { success: false, error: sanitizeGitError(err, token) };
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
// Phase 6 — Auto-push / silent sync
// ──────────────────────────────────────────────────────────────────────────────

// 6.2 — Immediate manual push override. Clears the pending debounce timer and
// signals the renderer to push right now.
ipcMain.handle('push-now', async (_, { projectId }) => {
  triggerPushNow(projectId);
  return { success: true };
});

// 6.5 — Auto-create the standard stems/ and exports/ subfolders for a project.
ipcMain.handle('setup-project-folder', async (_, { folderPath }) => {
  try {
    await fs.mkdir(path.join(folderPath, 'stems'), { recursive: true });
    await fs.mkdir(path.join(folderPath, 'exports'), { recursive: true });
    return { success: true };
  } catch (err) {
    console.error('[SETUP] setup-project-folder failed:', err);
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

  // Phase 6.11: build the system tray (per-project "Push now")
  buildTray();

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
  // Phase 6.11: only tear down + quit when the user explicitly chose to quit.
  // Otherwise the app keeps running in the background (tray) so auto-push works.
  if (!app.isQuitting) {
    return;
  }

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

ipcMain.handle('copy-text', (_, text) => {
  clipboard.writeText(String(text || ''));
  return { success: true };
});

ipcMain.handle('show-notification', (_, { title, body }) => {
  if (!Notification.isSupported()) return { success: false };
  new Notification({ title, body }).show();
  return { success: true };
});
