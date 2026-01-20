
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const chokidar = require('chokidar');
const Store = require('electron-store').default;

// Initialize persistent storage for folder paths
const store = new Store({ name: 'project-folders' });
global.projectStore = store;

console.log('[MAIN] Store initialized →', store.path);

const windows = [];
const watchers = new Map(); // projectId -> watcher instance

// ──────────────────────────────────────────────────────────────────────────────
// Window Creation
// ──────────────────────────────────────────────────────────────────────────────
function createWindow(sessionName = 'default', xOffset = 0) {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
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
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          process.env.NODE_ENV === 'development'
            ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:5000 ws://localhost:9000 wss://localhost:9000; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:;"
            : "default-src 'self'; script-src 'self'; connect-src 'self' http://localhost:5000; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:;"
        ]
      }
    });
  });

  // ============================================================================
  // OAUTH HANDLING - Intercept GitHub OAuth Callback
  // ============================================================================
  
  win.webContents.on('will-navigate', (event, url) => {
    console.log('[OAUTH] will-navigate →', url);
    
    // If this is the OAuth callback with code parameter
    if (url.includes('?code=')) {
      event.preventDefault(); // CRITICAL: Stop default navigation
      
      try {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        
        if (code) {
          console.log('[OAUTH] ✅ Code captured:', code);
          // Redirect to webpack dev server with the code
          const targetUrl = `${MAIN_WINDOW_WEBPACK_ENTRY}?code=${code}`;
          console.log('[OAUTH] Loading app with code:', targetUrl);
          win.loadURL(targetUrl);
        } else {
          console.log('[OAUTH] No code found, loading main app');
          win.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
        }
      } catch (err) {
        console.error('[OAUTH] URL parsing error:', err);
        win.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
      }
    }
  });

  // Backup: Handle navigation after it happens (safety net)
  win.webContents.on('did-navigate', (event, url) => {
    console.log('[OAUTH] did-navigate →', url);
    
    // If we somehow navigated to a URL with code that isn't our webpack server
    if (url.includes('?code=') && !url.includes(MAIN_WINDOW_WEBPACK_ENTRY)) {
      try {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        if (code) {
          console.log('[OAUTH] ✅ Late capture - redirecting with code');
          win.loadURL(`${MAIN_WINDOW_WEBPACK_ENTRY}?code=${code}`);
        }
      } catch (err) {
        console.error('[OAUTH] Navigation handling error:', err);
      }
    }
  });

  // Handle failed loads (404 recovery)
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.log('[LOAD] Failed:', errorCode, errorDescription, validatedURL);
    
    // If load failed but URL contains OAuth code, extract and retry
    if (validatedURL.includes('?code=')) {
      try {
        const urlObj = new URL(validatedURL);
        const code = urlObj.searchParams.get('code');
        if (code) {
          console.log('[OAUTH] ✅ Recovery - loading with code from failed URL');
          win.loadURL(`${MAIN_WINDOW_WEBPACK_ENTRY}?code=${code}`);
        }
      } catch (err) {
        console.error('[OAUTH] Recovery error:', err);
        win.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
      }
    }
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
function startWatching(projectId, folderPath) {
  const pid = String(projectId);

  // Stop existing watcher if any
  if (watchers.has(pid)) {
    watchers.get(pid).close();
    watchers.delete(pid);
    console.log(`[WATCHER] Stopped existing watcher for ${pid}`);
  }

  const watcher = chokidar.watch(folderPath, {
    ignored: /(^|[\/\\])\../, // Ignore dotfiles
    ignoreInitial: true, // Don't trigger for existing files
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000, // Wait 2s after last change
      pollInterval: 100
    },
    depth: 99, // Watch all subdirectories
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
  const allowed = [
    '.wav', '.mp3', '.mp4', '.flac', '.aiff', '.ogg', '.txt',
    '.m4a', '.mpeg', '.avi', '.mov', '.flv', '.midi', '.mid'
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

// Save folder path (persistent)
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
ipcMain.handle('write-files', async (_, { folderPath, files }) => {
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
      console.error(`[WRITE] Failed to write ${file.path}:`, err);
    }
  }

  return { 
    success: failCount === 0, 
    successCount, 
    failCount, 
    error: lastError 
  };
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
// App Lifecycle
// ──────────────────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow('Account-A', 0);
  createWindow('Account-B', 850);

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
  // Clean up watchers before quitting
  watchers.forEach(w => w.close());
  watchers.clear();
  console.log('[MAIN] Application shutting down cleanly');
});