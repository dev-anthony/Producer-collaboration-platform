const { ipcMain, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const ReconciliationEngine = require('../recording/reconciliation');
const TakeManager = require('../recording/takeManager');
const WavWriter = require('../audio/wavWriter');

const takes = new TakeManager();
const reconciliation = new ReconciliationEngine();
const masterWriters = new Map();
const streamWavWriters = new Map();
// Files this module created, and therefore the only files it is allowed to
// touch from rr-delete-audio-file / rr-push-take-to-folder. Takes now live
// inside a per-project vault and eventually the project folder itself, so a
// path-prefix rule alone is no longer a safe guard — this module has to know
// exactly which files are its own.
const ownedTakes = new Set();
let registered = false;

// A chunk is 128 samples — about 2.7ms at 48k — so a line per chunk is
// roughly 375 lines a second, per writer. That buries every other log in the
// app and makes the console itself a load on the audio path. Progress is
// reported on a clock instead: what matters is that bytes are still landing,
// not each individual one.
const PROGRESS_INTERVAL_MS = 5000;
const SECONDS_OF_AUDIO = (bytes) => (bytes / (48000 * 2)).toFixed(1);

const reportProgress = (tag, record) => {
  const now = Date.now();
  if (now - record.lastReport < PROGRESS_INTERVAL_MS) return;
  record.lastReport = now;
  console.log(`${tag} ${SECONDS_OF_AUDIO(record.bytesWritten)}s written (${record.chunkCount} chunks, ${record.bytesWritten} bytes)`);
};

const getMasterWriter = (senderId) => masterWriters.get(senderId);

const registerRecordingHandlers = () => {
  if (registered) return;
  registered = true;

  ipcMain.handle('rr-native-status', () => ({ success: true, ready: true }));
  ipcMain.handle('rr-start-master-recording', (event, { takeNumber = 1, projectId = null } = {}) => {
    if (masterWriters.has(event.sender.id)) throw new Error('MASTER_RECORDING_IN_PROGRESS');
    // Staged outside any watched folder while it rolls; moved to the
    // project's vault on stop. See TakeManager for why the watcher must
    // never see this file growing.
    const outputPath = takes.stagingPath(takeNumber, 'take');
    const writer = new WavWriter(outputPath, { sampleRate: 48000, bitDepth: 16, channels: 1 });
    writer.start();
    masterWriters.set(event.sender.id, { writer, outputPath, projectId, takeNumber, bytesWritten: 0, chunkCount: 0, lastReport: Date.now() });
    console.log(`[RR-MASTER] Started ${outputPath}`);
    return { success: true, path: outputPath, sampleRate: 48000, bitDepth: 16 };
  });

  ipcMain.handle('rr-write-master-chunk', (event, chunk) => {
    const record = getMasterWriter(event.sender.id);
    if (!record || !chunk) return { success: false };
    const bytes = Buffer.from(chunk);
    record.writer.write(bytes);
    record.bytesWritten += bytes.length;
    record.chunkCount += 1;
    reportProgress('[RR-MASTER]', record);
    return { success: true };
  });

  ipcMain.handle('rr-stop-master-recording', async (event) => {
    const record = masterWriters.get(event.sender.id);
    if (!record) return { success: false, path: null };
    masterWriters.delete(event.sender.id);
    const stagedPath = await record.writer.stop();
    const vaultPath = await takes.toVault(stagedPath, record.projectId, record.takeNumber);
    ownedTakes.add(path.resolve(vaultPath));
    console.log(`[RR-MASTER] Finished ${vaultPath}: ${record.bytesWritten} bytes (in vault, not yet pushed)`);
    return {
      success: true,
      path: vaultPath,
      fileName: path.basename(vaultPath),
      keptWithProject: false,
      bytesWritten: record.bytesWritten,
    };
  });

  ipcMain.handle('rr-start-stream-recording', (event, { takeNumber = 1 } = {}) => {
    if (streamWavWriters.has(event.sender.id)) throw new Error('STREAM_RECORDING_IN_PROGRESS');
    // The control-room capture stays local. It is a safety copy of what came
    // down the line, not the take, so it never joins the project sync.
    const outputPath = takes.monitorPath(takeNumber);
    const streamWavWriter = { writer: new WavWriter(outputPath, { sampleRate: 48000, bitDepth: 16, channels: 1 }), outputPath, bytesWritten: 0, chunkCount: 0, lastReport: Date.now() };
    streamWavWriters.set(event.sender.id, streamWavWriter);
    streamWavWriter.writer.start();
    console.log(`[RR-STREAM] Started ${outputPath}`);
    return { success: true, path: outputPath };
  });

  ipcMain.handle('rr-write-stream-chunk', (event, chunk) => {
    const streamWavWriter = streamWavWriters.get(event.sender.id);
    if (!streamWavWriter || !chunk) return { success: false };
    const bytes = Buffer.from(chunk);
    streamWavWriter.writer.write(bytes);
    streamWavWriter.bytesWritten += bytes.length;
    streamWavWriter.chunkCount += 1;
    reportProgress('[RR-STREAM]', streamWavWriter);
    return { success: true };
  });

  ipcMain.handle('rr-stop-stream-recording', async (event) => {
    const streamWavWriter = streamWavWriters.get(event.sender.id);
    if (!streamWavWriter) return { success: false, path: null };
    streamWavWriters.delete(event.sender.id);
    const outputPath = await streamWavWriter.writer.stop();
    ownedTakes.add(path.resolve(outputPath));
    console.log(`[RR-STREAM] Finished ${outputPath}: ${streamWavWriter.bytesWritten} bytes`);
    return {
      success: true,
      path: outputPath,
      fileName: path.basename(outputPath),
      keptWithProject: false,
      bytesWritten: streamWavWriter.bytesWritten,
    };
  });

  // The push: move a vaulted take into the linked project's takes/ folder.
  // This is a file-system move only — it puts the take where the ordinary
  // file watcher and push pipeline will find it. The renderer drives the
  // actual git commit + push immediately after, through the same IPC calls
  // every other push in the app already uses.
  ipcMain.handle('rr-push-take-to-folder', async (_, { vaultPath, folderPath, takeNumber }) => {
    if (!vaultPath || !path.isAbsolute(vaultPath)) throw new Error('INVALID_AUDIO_PATH');
    const resolvedVaultPath = path.resolve(vaultPath);
    if (!ownedTakes.has(resolvedVaultPath)) throw new Error('AUDIO_PATH_NOT_ALLOWED');
    const projectPath = await takes.toProject(vaultPath, folderPath, takeNumber);
    ownedTakes.delete(resolvedVaultPath);
    ownedTakes.add(path.resolve(projectPath));
    console.log(`[RR-PUSH] ${vaultPath} → ${projectPath}`);
    return { success: true, path: projectPath, fileName: path.basename(projectPath) };
  });

  ipcMain.handle('rr-read-audio-file', async (_, filePath) => {
    if (!filePath || !path.isAbsolute(filePath)) throw new Error('INVALID_AUDIO_PATH');
    const stats = await fs.promises.stat(filePath);
    if (stats.size > 100 * 1024 * 1024) throw new Error('AUDIO_FILE_TOO_LARGE');
    // A plain base64 string, sent as-is. A string is the one payload shape
    // IPC handles without any ambiguity — a raw Buffer crossing both the
    // main-to-renderer boundary and then the isolated-world-to-page boundary
    // has more room for a byte-level mismatch than this is worth risking.
    // The renderer decodes it itself and builds a Blob from that — see
    // SessionProvider for why a Blob, not a data: URI, is what actually
    // gets handed to the <audio> element.
    return (await fs.promises.readFile(filePath)).toString('base64');
  });
  ipcMain.handle('rr-delete-audio-file', async (_, filePath) => {
    if (!filePath || !path.isAbsolute(filePath)) throw new Error('INVALID_AUDIO_PATH');
    const target = path.resolve(filePath);
    // Only takes this module actually produced can be discarded. Now that
    // takes can end up in the project's own takes/ folder, nothing else in
    // there is ours to delete — a producer's other session files must never
    // be reachable from here.
    if (!ownedTakes.has(target)) throw new Error('AUDIO_PATH_NOT_ALLOWED');
    await fs.promises.rm(target, { force: true });
    ownedTakes.delete(target);
    return { success: true };
  });

  ipcMain.handle('rr-leave-session', async (event) => {
    const record = masterWriters.get(event.sender.id);
    if (record) {
      masterWriters.delete(event.sender.id);
      // A session that ends mid-take still owes a vaulted copy of it — close
      // the file and file it rather than leaving it orphaned in staging.
      const stagedPath = await record.writer.stop().catch(() => null);
      if (stagedPath) {
        const vaultPath = await takes.toVault(stagedPath, record.projectId, record.takeNumber).catch(() => null);
        if (vaultPath) ownedTakes.add(path.resolve(vaultPath));
      }
    }
    const stream = streamWavWriters.get(event.sender.id);
    if (stream) { streamWavWriters.delete(event.sender.id); await stream.writer.stop().catch(() => {}); }
    return { success: true };
  });

  ipcMain.handle('rr-reconcile', (_, { streamPath, masterPath, outputPath }) => {
    const stream = fs.readFileSync(streamPath);
    const master = fs.readFileSync(masterPath);
    const streamPcm = stream.slice(44);
    const masterPcm = master.slice(44);
    const dropouts = reconciliation.findDropouts(streamPcm);
    const pcm = reconciliation.reconcile(streamPcm, masterPcm, dropouts, 48000, 2);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, Buffer.concat([stream.slice(0, 44), pcm]));
    return { success: true, dropouts: dropouts.length, outputPath };
  });
};

module.exports = { registerRecordingHandlers };
