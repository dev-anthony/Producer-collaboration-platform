
if (require('electron-squirrel-startup')) app.quit();

const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, clipboard, Notification, screen } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const chokidar = require('chokidar');
const Store = require('electron-store').default;
const { spawn } = require('child_process');
const http = require('http');
const simpleGit = require('simple-git');
const crypto = require('crypto');
let serverProcess = null; 

const isBackendRunning = () => new Promise((resolve) => {
  const request = http.get('http://localhost:5000/health', { timeout: 1500 }, (response) => {
    response.resume();
    const realtimeReady = response.headers['x-prodcollab-realtime'] === 'websocket';
    resolve(response.statusCode === 200 && realtimeReady);
  });
  request.on('timeout', () => {
    request.destroy();
    resolve(false);
  });
  request.on('error', () => resolve(false));
});

const waitForBackend = async (timeoutMs = 15000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isBackendRunning()) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
};


const store = new Store({ name: 'project-folders' });
global.projectStore = store;

console.log('[MAIN] Store initialized →', store.path);

const windows = [];
const watchers = new Map(); // projectId -> watcher instance
const watcherDetails = new Map(); // watcherKey -> routing details
// auto-push timers (projectId -> timeout handle) ──
const pushTimers = new Map();
const pendingPushPaths = new Map();
const activeGitOperations = new Set();
const syncSuppressedFolders = new Set();
const DEFAULT_PUSH_DELAY = 10 * 60 * 1000;
const autoPushDelays = new Map();
const GITHUB_FILE_LIMIT = 100 * 1024 * 1024;

const normalizeFolderPath = (folderPath) => path.resolve(folderPath).toLowerCase();
const isSyncSuppressed = (folderPath) => syncSuppressedFolders.has(normalizeFolderPath(folderPath));

function getProtectedConflicts(folderPath) {
  const conflicts = store.get('protectedConflicts', {});
  return conflicts[normalizeFolderPath(folderPath)] || [];
}

function setProtectedConflicts(folderPath, records) {
  const conflicts = store.get('protectedConflicts', {});
  const key = normalizeFolderPath(folderPath);
  if (records.length > 0) conflicts[key] = records;
  else delete conflicts[key];
  store.set('protectedConflicts', conflicts);
}

function isProtectedConflict(folderPath, filePath) {
  const relativePath = path.relative(folderPath, filePath).replace(/\\/g, '/');
  return getProtectedConflicts(folderPath).some((conflict) => conflict.preservedPath === relativePath);
}

// Schedule (or reschedule) an auto-push for a project after PUSH_DELAY of quiet.
function scheduleAutoPush(watcherKey, pid, target, filePath) {
  const pending = pendingPushPaths.get(watcherKey) || new Set();
  pending.add(filePath);
  pendingPushPaths.set(watcherKey, pending);
  if (pushTimers.has(watcherKey)) clearTimeout(pushTimers.get(watcherKey));
  const pushDelay = autoPushDelays.get(target?.id) ?? DEFAULT_PUSH_DELAY;
  if (pushDelay === null) {
    console.log(`[AUTO-PUSH] Manual mode; no timer for ${watcherKey}`);
    if (target && !target.isDestroyed()) target.send('auto-push-scheduled', { projectId: pid, dueAt: null, delay: null });
    return;
  }
  const dueAt = Date.now() + pushDelay;
  console.log(`[AUTO-PUSH] Scheduled ${watcherKey} in ${Math.round(pushDelay / 60000)} minute(s)`);
  if (target && !target.isDestroyed()) target.send('auto-push-scheduled', { projectId: pid, dueAt, delay: pushDelay });
  const timer = setTimeout(() => {
    pushTimers.delete(watcherKey);
    pendingPushPaths.delete(watcherKey);
    if (target && !target.isDestroyed()) {
      console.log(`[AUTO-PUSH] Timer ready for ${watcherKey}`);
      target.send('auto-push-ready', { projectId: pid });
    } else {
      console.warn(`[AUTO-PUSH] Renderer unavailable when timer fired for ${watcherKey}`);
    }
  }, pushDelay);
  pushTimers.set(watcherKey, timer);
}

function removePendingPushPath(watcherKey, deletedPath) {
  const pending = pendingPushPaths.get(watcherKey);
  if (!pending) return;
  for (const filePath of pending) {
    if (filePath === deletedPath || filePath.startsWith(`${deletedPath}${path.sep}`)) pending.delete(filePath);
  }
  if (pending.size > 0) return;
  pendingPushPaths.delete(watcherKey);
  if (pushTimers.has(watcherKey)) clearTimeout(pushTimers.get(watcherKey));
  pushTimers.delete(watcherKey);
}

const getSessionScope = (event) => {
  const owner = windows.find((win) => !win.isDestroyed() && win.webContents.id === event.sender.id);
  if (!owner?.devSessionName) return 'default';
  return `persist:prodcollab-dev-${owner.devSessionName.toLowerCase().replace(/\s+/g, '-')}`;
};
const getProjectKey = (scope, projectId) => (
  scope === 'default' ? String(projectId) : `${scope}::${String(projectId)}`
);
const DEV_ACCOUNT_A_SCOPE = 'persist:prodcollab-dev-account-a';

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

  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Window Creation
// ──────────────────────────────────────────────────────────────────────────────
function createWindow(sessionName = 'default', bounds = {}) {
  const isDevTestWindow = !app.isPackaged && sessionName !== 'default';
  const win = new BrowserWindow({
    width: bounds.width || 1200,
    height: bounds.height || 800,
    icon: path.join(__dirname, '../assets/icon.ico'),
    ...(Number.isInteger(bounds.x) ? { x: bounds.x } : {}),
    ...(Number.isInteger(bounds.y) ? { y: bounds.y } : {}),
    title: isDevTestWindow ? `ProdCollab [DEV ${sessionName}]` : 'ProdCollab',
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      ...(isDevTestWindow ? { partition: `persist:prodcollab-dev-${sessionName.toLowerCase().replace(/\s+/g, '-')}` } : {}),
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
          ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:5000 ws://localhost:5000 ws://localhost:9000 wss://localhost:5000 wss://localhost:9000; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:;"
          : "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:5000 ws://localhost:5000 wss://localhost:5000; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:;"
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
  const windowUrl = isDevTestWindow
    ? `${MAIN_WINDOW_WEBPACK_ENTRY}?devAccount=${encodeURIComponent(sessionName)}`
    : MAIN_WINDOW_WEBPACK_ENTRY;
  win.loadURL(windowUrl);
  win.webContents.on('page-title-updated', (event) => {
    if (!isDevTestWindow) return;
    event.preventDefault();
    win.setTitle(`ProdCollab [DEV ${sessionName}]`);
  });

  if (!app.isPackaged) {
    win.webContents.session.clearCache().catch((error) => {
      console.warn(`[CACHE] Could not clear development cache for ${sessionName}:`, error.message);
    });
  }
  win.devSessionName = sessionName;

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
function startWatching(projectId, folderPath, scope = 'default', target = null) {
  const pid = String(projectId);
  const watcherKey = getProjectKey(scope, pid);
  const notifyTarget = (channel, data) => {
    if (target && !target.isDestroyed()) target.send(channel, data);
    else notifyAll(channel, data);
  };

  const existingDetails = watcherDetails.get(watcherKey);
  if (
    watchers.has(watcherKey) &&
    existingDetails &&
    normalizeFolderPath(existingDetails.folderPath) === normalizeFolderPath(folderPath) &&
    existingDetails.target === target
  ) {
    return;
  }

  // Stop an existing watcher only when its folder or renderer target changed.
  if (watchers.has(watcherKey)) {
    watchers.get(watcherKey).close();
    watchers.delete(watcherKey);
    console.log(`[WATCHER] Stopped existing watcher for ${watcherKey}`);
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
    atomic: true,
    depth: 99,
  });

  watcher
    .on('add', (filePath) => {
      if (isSyncSuppressed(folderPath) || isProtectedConflict(folderPath, filePath)) return;
      console.log(`[WATCHER] File added: ${filePath}`);
      notifyTarget('file-changed', { projectId: pid, event: 'add', path: filePath });
      scheduleAutoPush(watcherKey, pid, target, filePath); // Phase 6.1
    })
    .on('change', (filePath) => {
      if (isSyncSuppressed(folderPath) || isProtectedConflict(folderPath, filePath)) return;
      console.log(`[WATCHER] File changed: ${filePath}`);
      notifyTarget('file-changed', { projectId: pid, event: 'change', path: filePath });
      scheduleAutoPush(watcherKey, pid, target, filePath); // Phase 6.1
    })
    .on('unlink', (filePath) => {
      if (isSyncSuppressed(folderPath) || isProtectedConflict(folderPath, filePath)) return;
      console.log(`[WATCHER] File deleted: ${filePath}`);
      removePendingPushPath(watcherKey, filePath);
      notifyTarget('file-deleted', { projectId: pid, event: 'unlink', path: filePath });
    })
    .on('addDir', (dirPath) => {
      if (isSyncSuppressed(folderPath)) return;
      console.log(`[WATCHER] Folder added: ${dirPath}`);
      // Git does not track empty directories. Added files inside it emit `add`.
    })
    .on('unlinkDir', (dirPath) => {
      if (isSyncSuppressed(folderPath)) return;
      console.log(`[WATCHER] Folder deleted: ${dirPath}`);
      removePendingPushPath(watcherKey, dirPath);
      notifyTarget('file-deleted', { projectId: pid, event: 'unlinkDir', path: dirPath });
    })
    .on('error', (error) => {
      console.error(`[WATCHER] Error for ${pid}:`, error);
    })
    .on('ready', () => {
      console.log(`[WATCHER] Ready ${watcherKey} → ${folderPath}`);
      // ignoreInitial prevents a startup scan from flooding the renderer, but
      // Git still knows about changes made before the app restarted. Schedule
      // those changes so the selected backup delay applies immediately.
      simpleGit(folderPath).status().then((status) => {
        const existingChanges = (status.files || [])
          .map(({ path: changedPath }) => changedPath)
          .filter(Boolean);
        if (existingChanges.length > 0) {
          const pending = new Set(existingChanges.map((changedPath) => path.join(folderPath, changedPath)));
          pendingPushPaths.set(watcherKey, pending);
          scheduleAutoPush(watcherKey, pid, target, [...pending][0]);
        }
      }).catch((error) => console.warn(`[AUTO-PUSH] Could not inspect existing changes for ${watcherKey}:`, error.message));
    });

  watchers.set(watcherKey, watcher);
  watcherDetails.set(watcherKey, { projectId: pid, folderPath, scope, target });
  console.log(`[WATCHER] Started watching ${watcherKey} → ${folderPath}`);
  refreshTray(); // Phase 6.11: keep tray "Push now" list in sync
}

  function stopWatching(projectId, scope = 'default') {
    const pid = String(projectId);
    const watcherKey = getProjectKey(scope, pid);
    if (watchers.has(watcherKey)) {
      watchers.get(watcherKey).close();
      watchers.delete(watcherKey);
      watcherDetails.delete(watcherKey);
      console.log(`[WATCHER] Stopped watching ${watcherKey}`);
    }
    refreshTray(); // Phase 6.11
  }


async function restoreAllWatchers() {
  console.log('[MAIN] Restoring watchers from persistent storage...');
  const watched = store.get('watchedFolders', {});
  if (!app.isPackaged) {
    let migrated = false;
    for (const [storedKey, folderPath] of Object.entries({ ...watched })) {
      if (storedKey.includes('::')) continue;
      const scopedKey = getProjectKey(DEV_ACCOUNT_A_SCOPE, storedKey);
      if (!watched[scopedKey]) watched[scopedKey] = folderPath;
      delete watched[storedKey];
      migrated = true;
    }
    if (migrated) store.set('watchedFolders', watched);
  }
  console.log('[MAIN] Found saved projects:', Object.keys(watched));

  for (const [pid, folderPath] of Object.entries(watched)) {
    if (folderPath) {
      const separator = pid.indexOf('::');
      if (separator === -1) {
        if (app.isPackaged) {
          startWatching(pid, folderPath);
        } else {
          const accountA = windows.find((win) => getWindowScope(win) === DEV_ACCOUNT_A_SCOPE);
          startWatching(pid, folderPath, DEV_ACCOUNT_A_SCOPE, accountA?.webContents || null);
        }
        continue;
      }
      const scope = pid.slice(0, separator);
      const projectId = pid.slice(separator + 2);
      const targetWindow = windows.find((win) => getWindowScope(win) === scope);
      startWatching(projectId, folderPath, scope, targetWindow?.webContents || null);
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
function triggerPushNow(projectId, scope = null, target = null) {
  const pid = String(projectId);
  const timerKey = scope ? getProjectKey(scope, pid) : pid;
  if (pushTimers.has(timerKey)) {
    clearTimeout(pushTimers.get(timerKey));
    pushTimers.delete(timerKey);
  }
  pendingPushPaths.delete(timerKey);
  if (target && !target.isDestroyed()) target.send('auto-push-ready', { projectId: pid });
  else notifyAll('auto-push-ready', { projectId: pid });
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
    createWindow(app.isPackaged ? 'default' : 'ACCOUNT A');
  }
}

// 6.11 — Build the tray context menu with a "Push now" entry per watched project.
function refreshTray() {
  if (!tray) return;

  const watched = store.get('watchedFolders', {}); // { projectId: folderPath }
  const projectItems = Object.entries(watched).map(([storedKey, folderPath]) => {
    const separator = storedKey.indexOf('::');
    const scope = separator === -1 ? null : storedKey.slice(0, separator);
    const pid = separator === -1 ? storedKey : storedKey.slice(separator + 2);
    const targetWindow = scope
      ? windows.find((win) => getWindowScope(win) === scope)
      : null;
    const accountLabel = targetWindow?.devSessionName ? ` [${targetWindow.devSessionName}]` : '';
    return {
       label: `Sync now${accountLabel} · ${folderPath ? path.basename(folderPath) : pid}`,
      click: () => triggerPushNow(pid, scope, targetWindow?.webContents || null),
    };
  });

  const template = [
    { label: 'ProdCollab · Studio sync', enabled: false },
    { type: 'separator' },
    ...(projectItems.length > 0
      ? projectItems
      : [{ label: 'No watched projects', enabled: false }]),
    { type: 'separator' },
    { label: 'Open ProdCollab', click: () => focusMainWindow() },
    ...(!app.isPackaged ? [
      { label: 'Open DEV Account A', click: () => openDevTestWindow('ACCOUNT A', 0) },
      { label: 'Open DEV Account B', click: () => openDevTestWindow('ACCOUNT B', 1) },
    ] : []),
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
    tray.setToolTip('ProdCollab · Projects protected');
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
  store.set('watchedFolders', watched);
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
ipcMain.handle('validate-folder-link', async (event, { folderPath, projectId }) => {
  if (!folderPath) {
    return { valid: false, error: 'NO_FOLDER_SELECTED' };
  }

  const scope = getSessionScope(event);
  const projectPid = projectId == null ? null : String(projectId);
  const pid = projectPid == null ? null : getProjectKey(scope, projectPid);
  const current = store.get('watchedFolders', {});
  const normalize = (p) => path.resolve(p).replace(/[\\/]+$/, '').toLowerCase();
  const target = normalize(folderPath);
  const conflict = Object.entries(current).find(
    ([otherPid, otherPath]) => {
      const sameProject = otherPid === pid || (scope === DEV_ACCOUNT_A_SCOPE && otherPid === projectPid);
      return !sameProject && otherPath && normalize(otherPath) === target;
    }
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
ipcMain.handle('save-folder-path', async (event, { projectId, folderPath }) => {
  if (!projectId || !folderPath) {
    throw new Error('Missing projectId or folderPath');
  }

  const projectPid = String(projectId);
  const scope = getSessionScope(event);
  const pid = getProjectKey(scope, projectPid);
  const current = store.get('watchedFolders', {});

  // ── Guard: a local folder may only be linked to ONE project. ──
  // Linking the same folder to multiple projects makes a single file change fire
  // pushes for every project sharing it (race → non-fast-forward conflicts).
  const normalize = (p) => path.resolve(p).replace(/[\\/]+$/, '').toLowerCase();
  const target = normalize(folderPath);
  const conflict = Object.entries(current).find(
    ([otherPid, otherPath]) => {
      const sameProject = otherPid === pid || (scope === DEV_ACCOUNT_A_SCOPE && otherPid === projectPid);
      return !sameProject && otherPath && normalize(otherPath) === target;
    }
  );
  if (conflict) {
    const [conflictKey, conflictPath] = conflict;
    const conflictProjectId = conflictKey.includes('::')
      ? conflictKey.slice(conflictKey.indexOf('::') + 2)
      : conflictKey;
    // Only migrate the old unscoped development key. Never transfer a mapping
    // between Account A and Account B: doing so stops the other account's
    // watcher and makes local edits appear invisible.
    const canTransferDevMapping = !app.isPackaged &&
      !conflictKey.includes('::') &&
      conflictProjectId === projectPid &&
      normalize(conflictPath) === target;
    if (canTransferDevMapping) {
      const conflictScope = conflictKey.includes('::') ? conflictKey.slice(0, conflictKey.indexOf('::')) : 'default';
      stopWatching(projectPid, conflictScope);
      delete current[conflictKey];
    } else {
    throw new Error(
      `FOLDER_ALREADY_LINKED: This folder is already linked to another project (id ${conflict[0]}). ` +
      `Please choose a different folder for each project.`
    );
    }
  }

  current[pid] = folderPath;
  store.set('watchedFolders', current);

  console.log(`[SAVE] Project ${pid} → ${folderPath}`);
  
  // Automatically start watching when folder is saved
  startWatching(projectPid, folderPath, scope, event.sender);

  return true;
});


// Get folder path
ipcMain.handle('get-folder-path', async (event, projectId) => {
  const scope = getSessionScope(event);
  const pid = getProjectKey(scope, projectId);
  const watched = store.get('watchedFolders', {});
  const folderPath = watched[pid] || (scope === DEV_ACCOUNT_A_SCOPE ? watched[String(projectId)] : null) || null;
  console.log(`[GET] Project ${pid} → ${folderPath || '(none)'}`);
  return folderPath;
});

ipcMain.handle('find-project-folder', async (event, { projectId, repoUrl }) => {
  const scope = getSessionScope(event);
  const watched = store.get('watchedFolders', {});
  const expectedRemote = normalizeRemoteUrl(repoUrl);
  if (!expectedRemote) return null;

  const scopedEntries = Object.entries(watched).filter(([storedKey]) => {
    if (scope === 'default') return !storedKey.includes('::');
    return storedKey.startsWith(`${scope}::`);
  });

  for (const [storedKey, folderPath] of scopedEntries) {
    try {
      const git = simpleGit(folderPath);
      if (!(await git.checkIsRepo())) continue;
      const remotes = await git.getRemotes(true);
      const origin = remotes.find((remote) => remote.name === 'origin');
      if (normalizeRemoteUrl(origin?.refs?.fetch || origin?.refs?.push) !== expectedRemote) continue;

      const newKey = getProjectKey(scope, projectId);
      for (const [otherKey, otherPath] of scopedEntries) {
        if (path.resolve(otherPath).toLowerCase() !== path.resolve(folderPath).toLowerCase()) continue;
        const otherProjectId = otherKey.includes('::') ? otherKey.slice(otherKey.indexOf('::') + 2) : otherKey;
        stopWatching(otherProjectId, scope);
        delete watched[otherKey];
      }
      watched[newKey] = folderPath;
      store.set('watchedFolders', watched);
      startWatching(projectId, folderPath, scope, event.sender);
      console.log(`[RECOVER] Project ${newKey} matched Git origin → ${folderPath}`);
      return folderPath;
    } catch (error) {
      console.warn(`[RECOVER] Could not inspect ${folderPath}: ${error.message}`);
    }
  }

  return null;
});

// Delete folder path
ipcMain.handle('delete-folder-path', async (event, projectId) => {
  const scope = getSessionScope(event);
  const pid = getProjectKey(scope, projectId);
  const current = store.get('watchedFolders', {});
  const legacyPid = String(projectId);
  const storedPid = current[pid] ? pid : (scope === DEV_ACCOUNT_A_SCOPE && current[legacyPid] ? legacyPid : null);

  if (storedPid) {
    delete current[storedPid];
    store.set('watchedFolders', current);
    stopWatching(projectId, scope);
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
ipcMain.handle('has-folder-path', async (event, projectId) => {
  const scope = getSessionScope(event);
  const pid = getProjectKey(scope, projectId);
  const watched = store.get('watchedFolders', {});
  const folderPath = watched[pid] || (scope === DEV_ACCOUNT_A_SCOPE ? watched[String(projectId)] : null);
  
  console.log(`[CHECK] Project ${pid} has folder: ${!!folderPath}`);
  return {
    hasPath: !!folderPath,
    path: folderPath || null
  };
});

// Read project files
ipcMain.handle('read-project-files', async (event, { projectId, fileStructure }) => {
  const scope = getSessionScope(event);
  const pid = getProjectKey(scope, projectId);
  console.log(`[READ] Reading files for project ${pid}`);

  const watched = store.get('watchedFolders', {});
  const folderPath = watched[pid] || (scope === DEV_ACCOUNT_A_SCOPE ? watched[String(projectId)] : null);

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
ipcMain.handle('start-watching', async (event, { projectId, folderPath }) => {
  try {
    startWatching(projectId, folderPath, getSessionScope(event), event.sender);
    return { success: true };
  } catch (err) {
    console.error('[WATCHER] Start failed:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('restore-session-watchers', async (event, { projectIds = [] } = {}) => {
  try {
    const allowedProjects = new Set(projectIds.map(String));
    const scope = getSessionScope(event);
    const watched = store.get('watchedFolders', {});
    for (const storedKey of Object.keys(watched)) {
      const separator = storedKey.indexOf('::');
      const storedScope = separator === -1 ? 'default' : storedKey.slice(0, separator);
      const projectId = separator === -1 ? storedKey : storedKey.slice(separator + 2);
      if (storedScope === scope && !allowedProjects.has(String(projectId))) {
        stopWatching(projectId, scope);
        delete watched[storedKey];
        console.log(`[WATCHER] Removed stale session mapping ${storedKey}`);
      }
    }
    store.set('watchedFolders', watched);
    restoreWatchersForSender(event);
    return { success: true };
  } catch (error) {
    console.error('[WATCHER] Session restore failed:', error);
    return { success: false, error: error.message };
  }
});

// Stop watching
ipcMain.handle('stop-watching', async (event, projectId) => {
  try {
    stopWatching(projectId, getSessionScope(event));
    return { success: true };
  } catch (err) {
    console.error('[WATCHER] Stop failed:', err);
    return { success: false, error: err.message };
  }
});

//logout
// Add this IPC handler to main.js, near your other ipcMain.handle() calls

ipcMain.handle('clear-oauth-session', async (event) => {
  console.log('[AUTH] Clearing OAuth session...');
  
  try {
    for (const win of windows) {
      if (!win.isDestroyed() && win.webContents.id === event.sender.id) {
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

const normalizeRemoteUrl = (repoUrl) => {
  if (!repoUrl) return '';
  return repoUrl
    .trim()
    .replace(/^https:\/\/[^@/]+@github\.com\//i, 'https://github.com/')
    .replace(/^git@github\.com:/i, 'https://github.com/')
    .replace(/\.git$/i, '')
    .replace(/\/$/, '')
    .toLowerCase();
};

const sendGitProgress = (event, operation, stage, percent = null) => {
  if (event.sender.isDestroyed()) return;
  event.sender.send('git-progress', { operation, stage, percent });
};

const endGitProgress = (event, operation) => {
  if (!event.sender.isDestroyed()) event.sender.send('git-progress-end', { operation });
};

async function reconcileUntrackedPullConflicts(git, folderPath) {
  const status = await git.status();
  const untrackedPaths = status.not_added || [];
  if (untrackedPaths.length === 0) return { conflicts: [], backups: [], backupRoot: null };

  let remoteTree;
  try {
    remoteTree = await git.raw(['ls-tree', '-r', 'origin/main']);
  } catch {
    return { conflicts: [], backups: [], backupRoot: null };
  }
  const remoteBlobs = new Map();
  for (const line of remoteTree.split(/\r?\n/)) {
    const match = line.match(/^\d+ blob ([0-9a-f]+)\t(.+)$/);
    if (match) remoteBlobs.set(match[2], match[1]);
  }
  const conflicts = [];
  const backups = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupRoot = path.join(folderPath, '.git', 'prodcollab-pull-backup', timestamp);

  for (const relativePath of untrackedPaths) {
    const normalizedPath = relativePath.replace(/\\/g, '/');
    const remoteHash = remoteBlobs.get(normalizedPath);
    if (!remoteHash) continue;

    const localPath = path.join(folderPath, relativePath);
    const localHash = (await git.raw(['hash-object', localPath])).trim();
    const parsed = path.parse(localPath);
    const conflictPath = localHash === remoteHash
      ? null
      : path.join(parsed.dir, `${parsed.name} (local conflict ${timestamp})${parsed.ext}`);
    const backupPath = path.join(backupRoot, normalizedPath);
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.rename(localPath, backupPath);
    backups.push({ localPath, backupPath, conflictPath });
    if (conflictPath) {
      conflicts.push({
        originalPath: normalizedPath,
        preservedPath: path.relative(folderPath, conflictPath).replace(/\\/g, '/')
      });
    }
  }

  return { conflicts, backups, backupRoot };
}

async function pauseWatchersForFolder(folderPath) {
  const normalizedFolder = normalizeFolderPath(folderPath);
  const paused = [];
  for (const [watcherKey, details] of watcherDetails) {
    if (normalizeFolderPath(details.folderPath) !== normalizedFolder) continue;
    paused.push(details);
    await watchers.get(watcherKey)?.close();
    watchers.delete(watcherKey);
    watcherDetails.delete(watcherKey);
    console.log(`[WATCHER] Paused ${watcherKey} during pull`);
  }
  return paused;
}

function resumePausedWatchers(pausedWatchers) {
  for (const details of pausedWatchers) {
    startWatching(details.projectId, details.folderPath, details.scope, details.target);
  }
}

function restoreWatchersForSender(event) {
  const scope = getSessionScope(event);
  const watched = store.get('watchedFolders', {});
  for (const [storedKey, folderPath] of Object.entries(watched)) {
    if (!folderPath) continue;
    const separator = storedKey.indexOf('::');
    const storedScope = separator === -1 ? 'default' : storedKey.slice(0, separator);
    if (storedScope !== scope) continue;
    const projectId = separator === -1 ? storedKey : storedKey.slice(separator + 2);
    startWatching(projectId, folderPath, scope, event.sender);
  }
}

async function finishPullReconciliation(reconciliation, mergeSucceeded) {
  for (const { localPath, backupPath, conflictPath } of reconciliation.backups) {
    if (!mergeSucceeded) {
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.rename(backupPath, localPath).catch(() => {});
    } else if (conflictPath) {
      await fs.mkdir(path.dirname(conflictPath), { recursive: true });
      await fs.rename(backupPath, conflictPath);
    } else {
      await fs.rm(backupPath, { force: true });
    }
  }
  if (reconciliation.backupRoot) {
    await fs.rm(reconciliation.backupRoot, { recursive: true, force: true }).catch(() => {});
  }
}

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

function getWindowScope(win) {
  if (!win?.devSessionName) return 'default';
  return `persist:prodcollab-dev-${win.devSessionName.toLowerCase().replace(/\s+/g, '-')}`;
}

function openDevTestWindow(sessionName, column) {
  const existing = windows.find((win) => !win.isDestroyed() && win.devSessionName === sessionName);
  if (existing) {
    if (existing.isMinimized()) existing.restore();
    existing.show();
    existing.focus();
    return existing;
  }
  const { x, y, width, height } = screen.getPrimaryDisplay().workArea;
  const windowWidth = Math.floor(width / 2);
  return createWindow(sessionName, {
    x: x + (column * windowWidth),
    y,
    width: windowWidth,
    height
  });
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

async function findRemoteContentDuplicates(git, folderPath, candidatePaths) {
  const isRepo = await git.checkIsRepo();
  if (!isRepo) return [];
  let tree;
  try {
    tree = await git.raw(['ls-tree', '-r', 'HEAD']);
  } catch {
    return [];
  }
  const remoteByHash = new Map();
  for (const line of tree.split(/\r?\n/)) {
    const match = line.match(/^\d+ blob ([0-9a-f]+)\t(.+)$/);
    if (match) remoteByHash.set(match[1], match[2]);
  }

  const duplicates = [];
  for (const candidatePath of candidatePaths) {
    const normalizedPath = candidatePath.replace(/\\/g, '/');
    const fullPath = path.join(folderPath, candidatePath);
    try {
      const hash = (await git.raw(['hash-object', fullPath])).trim();
      const remotePath = remoteByHash.get(hash);
      if (remotePath && remotePath !== normalizedPath) {
        duplicates.push({ path: normalizedPath, duplicateOf: remotePath });
      }
    } catch {
      // Deleted paths and transient files have no local content to compare.
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
  const operationKey = normalizeFolderPath(folderPath);
  if (activeGitOperations.has(operationKey)) {
    return { success: false, code: 'SYNC_IN_PROGRESS' };
  }
  activeGitOperations.add(operationKey);
  try {
    const git = attachGitProgress(simpleGit(folderPath), event, 'push');
    sendGitProgress(event, 'push', 'Checking local changes');

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
    const protectedPaths = new Set(
      getProtectedConflicts(folderPath).map((conflict) => conflict.preservedPath.replace(/\\/g, '/'))
    );
    if (protectedPaths.size > 0) {
      await git.reset(['--', ...protectedPaths]).catch(() => {});
    }
    const deletedPaths = new Set(statusBeforeCommit.deleted.map((filePath) => filePath.replace(/\\/g, '/')));
    if (deletedPaths.size > 0) {
      await git.reset(['--', ...deletedPaths]);
    }
    const changedPaths = statusBeforeCommit.files
      .map(({ path: filePath }) => filePath)
      .filter((filePath) => {
        const normalizedPath = filePath.replace(/\\/g, '/');
        return !deletedPaths.has(normalizedPath) && !protectedPaths.has(normalizedPath);
      });
    const oversizedFiles = [];
    for (const filePath of changedPaths) {
      try {
        const stats = await fs.stat(path.join(folderPath, filePath));
        if (stats.size > GITHUB_FILE_LIMIT) oversizedFiles.push({ path: filePath, size: stats.size });
      } catch {
        // Deleted paths are already excluded from changedPaths.
      }
    }
    if (oversizedFiles.length > 0) {
      return { success: false, code: 'FILE_TOO_LARGE', files: oversizedFiles };
    }
    const candidatePaths = new Set([
      ...statusBeforeCommit.staged,
      ...statusBeforeCommit.not_added,
      ...statusBeforeCommit.created,
      ...statusBeforeCommit.modified,
      ...statusBeforeCommit.renamed.map((item) => item.to)
    ].map((filePath) => filePath.replace(/\\/g, '/')).filter((filePath) => !protectedPaths.has(filePath)));
    const duplicateFiles = [
      ...await findDuplicateFiles(folderPath, candidatePaths),
      ...await findRemoteContentDuplicates(git, folderPath, candidatePaths)
    ];
    if (duplicateFiles.length > 0) {
      const duplicate = duplicateFiles[0];
      return {
        success: false,
        code: 'DUPLICATE_CONTENT',
        duplicateFiles,
        error: `Push blocked: "${duplicate.path}" has the same content as "${duplicate.duplicateOf}". Remove one copy or change its content before pushing.`
      };
    }

    sendGitProgress(event, 'push', 'Staging changed files');
    if (changedPaths.length > 0) await git.add(changedPaths);

    // Local deletions are intentionally not staged. Only commit indexed changes.
    const stagedPaths = (await git.diff(['--cached', '--name-only']))
      .split(/\r?\n/)
      .filter(Boolean);
    if (stagedPaths.length > 0) {
      sendGitProgress(event, 'push', 'Creating commit');
      await git.commit(message || `Update by ${username || 'ProdCollab'}`);
    } else {
      let commitsAhead = 0;
      try {
        commitsAhead = Number((await git.raw(['rev-list', '--count', 'origin/main..HEAD'])).trim());
      } catch {
        commitsAhead = 0;
      }
      if (commitsAhead === 0) return { success: true, nothingToCommit: true };
      sendGitProgress(event, 'push', `Uploading ${commitsAhead} local commit${commitsAhead === 1 ? '' : 's'}`);
    }

    // Ensure branch is main
    await git.branch(['-M', 'main']).catch(() => {});

    // Try to push. If the remote is ahead (e.g. GitHub's auto-init README, or a
    // concurrent push), git rejects with "fetch first" / non-fast-forward.
    // Recover by rebasing onto the remote and retrying once.
    try {
      sendGitProgress(event, 'push', 'Uploading changes');
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

    sendGitProgress(event, 'push', 'Push complete', 100);
    return { success: true, filesStaged: stagedPaths.length };
  } catch (err) {
    console.error('[GIT] git-push failed:', sanitizeGitError(err, token));
    return { success: false, code: 'PUSH_FAILED' };
  } finally {
    activeGitOperations.delete(operationKey);
    endGitProgress(event, 'push');
  }
});

ipcMain.handle('set-git-identity', async (_, { folderPath, username, email }) => {
  try {
    const git = simpleGit(folderPath);
    if (username) await git.addConfig('user.name', username);
    if (email) await git.addConfig('user.email', email);
    return { success: true };
  } catch (error) {
    console.error('[GIT] Could not set commit identity:', error);
    return { success: false, code: 'IDENTITY_UPDATE_FAILED' };
  }
});

// Pull latest from origin/main
ipcMain.handle('git-pull', async (event, { folderPath, repoUrl, token }) => {
  const operationKey = normalizeFolderPath(folderPath);
  if (activeGitOperations.has(operationKey)) {
    return { success: false, code: 'SYNC_IN_PROGRESS' };
  }
  activeGitOperations.add(operationKey);
  syncSuppressedFolders.add(operationKey);
  const pausedWatchers = await pauseWatchersForFolder(folderPath);
  let reconciliation = { conflicts: [], backups: [], backupRoot: null };
  try {
    const git = simpleGit(folderPath);
    sendGitProgress(event, 'pull', 'Checking remote changes');
    if (repoUrl && token) {
      const authedUrl = buildAuthedRemoteUrl(repoUrl, token);
      await git.remote(['set-url', 'origin', authedUrl]).catch(() => {});
    }
    sendGitProgress(event, 'pull', 'Downloading latest changes');
    try {
      await git.raw(['-c', 'http.version=HTTP/1.1', 'fetch', '--prune', '--no-tags', 'origin', 'main']);
    } catch (fetchError) {
      const fetchMessage = sanitizeGitError(fetchError, token);
      console.warn('[GIT] Pull fetch retry after first failure:', fetchMessage);
      await git.raw([
        '-c', 'http.version=HTTP/1.1',
        '-c', 'core.compression=0',
        'fetch', '--prune', '--no-tags', 'origin', 'main'
      ]);
    }
    reconciliation = await reconcileUntrackedPullConflicts(git, folderPath);
    sendGitProgress(event, 'pull', 'Applying latest changes');
    await git.merge(['--ff-only', 'origin/main']);
    await finishPullReconciliation(reconciliation, true);
    if (reconciliation.conflicts.length > 0) {
      const protectedConflicts = [...getProtectedConflicts(folderPath)];
      for (const conflict of reconciliation.conflicts) {
        if (!protectedConflicts.some((item) => item.preservedPath === conflict.preservedPath)) {
          protectedConflicts.push(conflict);
        }
      }
      setProtectedConflicts(folderPath, protectedConflicts);
    }
    sendGitProgress(event, 'pull', 'Pull complete', 100);
    return { success: true, conflicts: reconciliation.conflicts };
  } catch (err) {
    await finishPullReconciliation(reconciliation, false);
    console.error('[GIT] git-pull failed:', sanitizeGitError(err, token));
    const message = String(err?.message || '').toLowerCase();
    return {
      success: false,
      code: message.includes('unpack-objects') ? 'PULL_OBJECTS_FAILED' : 'PULL_FAILED'
    };
  } finally {
    activeGitOperations.delete(operationKey);
    syncSuppressedFolders.delete(operationKey);
    resumePausedWatchers(pausedWatchers);
    endGitProgress(event, 'pull');
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
  } finally {
    endGitProgress(event, 'clone');
  }
});

ipcMain.handle('get-project-conflicts', async (_, { folderPath }) => {
  const records = [...getProtectedConflicts(folderPath)];
  try {
    const git = simpleGit(folderPath);
    if (await git.checkIsRepo()) {
      const status = await git.status();
      for (const untrackedPath of status.not_added || []) {
        const normalizedPath = untrackedPath.replace(/\\/g, '/');
        const parsed = path.posix.parse(normalizedPath);
        const originalName = parsed.name.replace(/ \(local conflict \d{4}-\d{2}-\d{2}T.+\)$/, '');
        if (originalName === parsed.name) continue;
        const originalPath = path.posix.join(parsed.dir, `${originalName}${parsed.ext}`);
        if (!records.some((item) => item.preservedPath === normalizedPath)) {
          records.push({ originalPath, preservedPath: normalizedPath });
        }
      }
      setProtectedConflicts(folderPath, records);
    }
  } catch (error) {
    console.warn('[CONFLICT] Could not discover existing conflict files:', error.message);
  }
  return records;
});

ipcMain.handle('resolve-project-conflict', async (event, { projectId, folderPath, preservedPath, action }) => {
  const records = getProtectedConflicts(folderPath);
  const conflict = records.find((item) => item.preservedPath === preservedPath);
  if (!conflict) return { success: false, code: 'CONFLICT_NOT_FOUND' };

  const preservedFullPath = path.join(folderPath, conflict.preservedPath);
  const originalFullPath = path.join(folderPath, conflict.originalPath);
  const pausedWatchers = await pauseWatchersForFolder(folderPath);
  try {
    if (action === 'use-remote') {
      await fs.rm(preservedFullPath, { force: true });
    } else if (action === 'use-local') {
      await fs.mkdir(path.dirname(originalFullPath), { recursive: true });
      await fs.copyFile(preservedFullPath, originalFullPath);
      await fs.rm(preservedFullPath, { force: true });
    } else if (action !== 'keep-both') {
      return { success: false, code: 'INVALID_ACTION' };
    }

    setProtectedConflicts(
      folderPath,
      records.filter((item) => item.preservedPath !== preservedPath)
    );
    if (action === 'keep-both' || action === 'use-local') {
      const changedPath = action === 'keep-both' ? preservedFullPath : originalFullPath;
      event.sender.send('file-changed', {
        projectId: String(projectId),
        event: action === 'keep-both' ? 'add' : 'change',
        path: changedPath
      });
      scheduleAutoPush(
        getProjectKey(getSessionScope(event), projectId),
        String(projectId),
        event.sender,
        changedPath
      );
    }
    return { success: true, action, originalPath: conflict.originalPath, preservedPath: conflict.preservedPath };
  } catch (error) {
    console.error('[CONFLICT] Resolution failed:', error);
    return { success: false, code: 'RESOLUTION_FAILED' };
  } finally {
    resumePausedWatchers(pausedWatchers);
  }
});

// Commit history (version history)
ipcMain.handle('git-log', async (_, { folderPath }) => {
  try {
    const git = simpleGit(folderPath);
    const log = await git.log({ maxCount: 50 });
    const enrichedLog = await Promise.all(log.all.map(async (commit) => {
      const changedFiles = (await git.raw(['show', '--format=', '--name-only', commit.hash]))
        .split(/\r?\n/)
        .map((filePath) => filePath.trim())
        .filter(Boolean);
      return { ...commit, changedFiles };
    }));
    return { success: true, log: enrichedLog };
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
ipcMain.handle('push-now', async (event, { projectId }) => {
  triggerPushNow(projectId, getSessionScope(event), event.sender);
  return { success: true };
});

ipcMain.handle('set-auto-push-delay', async (event, { delay }) => {
  const pushDelay = delay === 'manual' ? null : Number(delay) * 60 * 1000;
  autoPushDelays.set(event.sender.id, pushDelay);
  const scope = getSessionScope(event);
  for (const [watcherKey, details] of watcherDetails) {
    if (details.target !== event.sender || !watcherKey.startsWith(`${scope}::`)) continue;
    const pending = pendingPushPaths.get(watcherKey);
    if (!pending || pending.size === 0) continue;
    if (pushTimers.has(watcherKey)) clearTimeout(pushTimers.get(watcherKey));
    pushTimers.delete(watcherKey);
    scheduleAutoPush(watcherKey, details.projectId, details.target, [...pending][0]);
  }
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
app.whenReady().then(async () => {
  // Windows requires an explicit AppUserModelID for toast/desktop
  // notifications to appear (especially when unpackaged). Without this,
  // `new Notification().show()` silently no-ops.
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.prodcollab.app');
  }
    const serverPath = app.isPackaged
    ? path.join(process.resourcesPath, 'server', 'server.js')
    : path.join(process.cwd(), '..', 'server', 'server.js');

  const backendRunning = !app.isPackaged && await isBackendRunning();
  if (backendRunning) {
    console.log('[SERVER] Reusing development backend at http://localhost:5000');
  } else {
    serverProcess = spawn('node', [serverPath], {
      cwd: path.dirname(serverPath),
      env: { ...process.env }
    });
    serverProcess.stdout.on('data', d => console.log('[SERVER]', d.toString()));
    serverProcess.stderr.on('data', d => console.error('[SERVER ERROR]', d.toString()));
    if (!(await waitForBackend())) {
      console.error('[SERVER] Backend did not become ready within 15 seconds');
    }
  }
  
  if (app.isPackaged) {
    createWindow();
  } else {
    openDevTestWindow('ACCOUNT A', 0);
    openDevTestWindow('ACCOUNT B', 1);
  }

  // Phase 6.11: build the system tray (per-project "Push now")
  buildTray();

  // Watchers are restored only after an authenticated renderer supplies its current projects.

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (app.isPackaged) createWindow();
      else openDevTestWindow('ACCOUNT A', 0);
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

ipcMain.handle('git-restore', async (_, { folderPath, commitSha, username, email }) => {
  try {
    const git = simpleGit(folderPath);
    const status = await git.status();
    if (!status.isClean()) return { success: false, code: 'LOCAL_CHANGES_PENDING' };
    await git.raw(['restore', '--source', commitSha, '--staged', '--worktree', '.']);
    const restored = await git.status();
    if (!restored.files.length) return { success: true, nothingToRestore: true };
    if (username) await git.addConfig('user.name', username);
    if (email) await git.addConfig('user.email', email);
    await git.commit(`Restore project to ${commitSha.slice(0, 7)}`);
    return { success: true };
  } catch (error) {
    console.error('[GIT] git-restore failed:', error);
    return { success: false, code: 'RESTORE_FAILED' };
  }
});

ipcMain.handle('copy-text', (_, text) => {
  clipboard.writeText(String(text || ''));
  return { success: true };
});

ipcMain.handle('show-notification', (_, { title, body }) => {
  try {
    if (!Notification.isSupported()) {
      console.warn('[NOTIFY] Desktop notifications are not supported on this system');
      return { success: false };
    }
    const iconPath = path.join(__dirname, '../assets/icon.ico');
    const notification = new Notification({
      title: title || 'ProdCollab',
      body: body || '',
      icon: nativeImage.createFromPath(iconPath),
      silent: false
    });
    notification.show();
    console.log(`[NOTIFY] Shown: ${title || 'ProdCollab'} — ${body || ''}`);
    return { success: true };
  } catch (error) {
    console.error('[NOTIFY] Failed to show notification:', error);
    return { success: false, error: error.message };
  }
});
