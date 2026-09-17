const fs = require('fs');
const path = require('path');
const os = require('os');

class TakeManager {
  constructor(root = path.join(os.homedir(), 'ProdCollab-Takes')) {
    this.root = root;
    this.staging = path.join(root, '.in-progress');
    this.vaultRoot = path.join(root, 'vault');
  }

  ensure(dir) {
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  stagingPath(takeNumber, prefix = 'take') {
    this.ensure(this.staging);
    return path.join(this.staging, `${prefix}_${String(takeNumber).padStart(3, '0')}_${Date.now()}.wav`);
  }

  monitorPath(takeNumber) {
    this.ensure(this.root);
    return path.join(this.root, `monitor_${String(takeNumber).padStart(3, '0')}_${Date.now()}.wav`);
  }

  vaultDir(projectId) {
    return this.ensure(path.join(this.vaultRoot, String(projectId || 'unassigned')));
  }

  async toVault(stagedPath, projectId, takeNumber) {
    const destination = path.join(this.vaultDir(projectId), `take_${String(takeNumber).padStart(3, '0')}_${Date.now()}.wav`);
    await this._move(stagedPath, destination);
    return destination;
  }

  async toProject(vaultPath, folderPath, takeNumber) {
    if (!folderPath || !fs.existsSync(folderPath)) throw new Error('PROJECT_FOLDER_NOT_LINKED');
    const takesDir = this.ensure(path.join(folderPath, 'takes'));
    const destination = path.join(takesDir, this._uniqueName(takesDir, takeNumber));
    await this._move(vaultPath, destination);
    return destination;
  }

  async _move(from, to) {
    try {
      await fs.promises.rename(from, to);
    } catch {
      await fs.promises.copyFile(from, to);
      await fs.promises.rm(from, { force: true });
    }
  }

  _uniqueName(takesDir, takeNumber) {
    const base = `take_${String(takeNumber).padStart(3, '0')}`;
    if (!fs.existsSync(path.join(takesDir, `${base}.wav`))) return `${base}.wav`;
    let suffix = 2;
    while (fs.existsSync(path.join(takesDir, `${base}_${suffix}.wav`))) suffix += 1;
    return `${base}_${suffix}.wav`;
  }
}

module.exports = TakeManager;
