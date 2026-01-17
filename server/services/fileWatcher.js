// services/fileWatcher.js
const chokidar = require('chokidar');
const pool = require('../config/db');

class FileWatcherService {
  constructor() {
    this.watchers = new Map(); // projectId -> watcher instance
  }

  async startWatching(projectId, folderPath, userId) {
    // Stop existing watcher if any
    this.stopWatching(projectId);

    const watcher = chokidar.watch(folderPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });

    watcher
      .on('add', path => this.handleChange(projectId, 'added', path))
      .on('change', path => this.handleChange(projectId, 'modified', path))
      .on('unlink', path => this.handleChange(projectId, 'deleted', path));

    this.watchers.set(projectId, watcher);
    console.log(`👀 Watching project ${projectId} at ${folderPath}`);
  }

  async handleChange(projectId, type, filePath) {
    console.log(`📝 ${type}: ${filePath} in project ${projectId}`);
    
    try {
      const connection = await pool.promise().getConnection();
      
      // Mark project as having changes
      await connection.execute(
        'UPDATE projects SET has_changes = 1, updated_at = NOW() WHERE id = ?',
        [projectId]
      );
      
      connection.release();
    } catch (err) {
      console.error('Error marking project changes:', err);
    }
  }

  stopWatching(projectId) {
    const watcher = this.watchers.get(projectId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(projectId);
      console.log(`⏹️ Stopped watching project ${projectId}`);
    }
  }

  stopAll() {
    this.watchers.forEach((watcher, projectId) => {
      this.stopWatching(projectId);
    });
  }
}

module.exports = new FileWatcherService();