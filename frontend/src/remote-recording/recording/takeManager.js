const fs = require('fs');
const path = require('path');

class TakeManager {
  constructor(root = path.join(require('os').homedir(), 'ProdCollab-Takes')) { this.root = root; }
  ensureRoot() { fs.mkdirSync(this.root, { recursive: true }); return this.root; }
  nextPath(takeNumber, prefix = 'take') { this.ensureRoot(); return path.join(this.root, `${prefix}_${String(takeNumber).padStart(3, '0')}_${Date.now()}.wav`); }
}
module.exports = TakeManager;
