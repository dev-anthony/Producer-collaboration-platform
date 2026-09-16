const fs = require('fs');
const path = require('path');
const os = require('os');

// Where a take lives, and why it moves through three different places.
//
// STAGING — while a take is rolling, it writes here, completely outside any
// watched folder. A WAV being appended to for minutes would otherwise fire a
// chokidar change event every few milliseconds and hand auto-push a file
// that is not finished yet.
//
// VAULT — the moment a take is closed it moves to a per-project vault,
// still outside the watched project folder. This is deliberate: finishing a
// take does not mean it belongs in the project. A take is something you
// listen back to and choose between — landing every one of them in the
// synced folder the instant recording stops would take that choice away.
// The vault is where a take waits to be judged.
//
// PROJECT — the take's real home, inside the linked project folder's
// takes/ subfolder, and only once someone has explicitly pushed it there.
// Arriving here is what puts it in front of the file watcher and the
// ordinary ProdCollab push pipeline — nothing about this module talks to
// Git directly; placing the file where ProdCollab already knows to look is
// the whole job.
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

  // The control-room capture stays local always. It is a safety copy of what
  // came down the line, not a take a producer picks between, so it never
  // enters the vault-to-project flow.
  monitorPath(takeNumber) {
    this.ensure(this.root);
    return path.join(this.root, `monitor_${String(takeNumber).padStart(3, '0')}_${Date.now()}.wav`);
  }

  vaultDir(projectId) {
    return this.ensure(path.join(this.vaultRoot, String(projectId || 'unassigned')));
  }

  // Staging → vault. The take is finished and playable but not yet in the
  // project; it is waiting on a decision.
  async toVault(stagedPath, projectId, takeNumber) {
    const destination = path.join(this.vaultDir(projectId), `take_${String(takeNumber).padStart(3, '0')}_${Date.now()}.wav`);
    await this._move(stagedPath, destination);
    return destination;
  }

  // Vault → project. This is "push": placing the chosen take inside the
  // linked project folder so the existing watcher and push pipeline pick it
  // up exactly like any other project file.
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
      // rename fails across drives, which is normal here — the vault and the
      // project folder are not guaranteed to sit on the same one.
      await fs.promises.copyFile(from, to);
      await fs.promises.rm(from, { force: true });
    }
  }

  // Takes are numbered the way a session numbers them, not stamped with
  // epoch milliseconds — a producer opening the folder should see
  // take_001.wav. Collisions only happen across sessions, and the suffix
  // keeps both rather than overwriting.
  _uniqueName(takesDir, takeNumber) {
    const base = `take_${String(takeNumber).padStart(3, '0')}`;
    if (!fs.existsSync(path.join(takesDir, `${base}.wav`))) return `${base}.wav`;
    let suffix = 2;
    while (fs.existsSync(path.join(takesDir, `${base}_${suffix}.wav`))) suffix += 1;
    return `${base}_${suffix}.wav`;
  }
}

module.exports = TakeManager;
