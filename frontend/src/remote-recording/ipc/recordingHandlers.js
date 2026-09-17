const { ipcMain, BrowserWindow } = require('electron');
const Store = require('electron-store').default;
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ReconciliationEngine = require('../recording/reconciliation');
const TakeManager = require('../recording/takeManager');
const WavWriter = require('../audio/wavWriter');

const takes = new TakeManager();
const reconciliation = new ReconciliationEngine();
const masterWriters = new Map();
const streamWavWriters = new Map();
let registered = false;

const projectFolders = new Store({ name: 'project-folders' });

const sessionHistory = new Store({ name: 'session-history' });

const isUnderDir = (target, dir) => {
  const resolvedDir = path.resolve(dir);
  const resolvedTarget = path.resolve(target);
  return resolvedTarget === resolvedDir || resolvedTarget.startsWith(resolvedDir + path.sep);
};

const isOwnedTakePath = (target) => {
  if (isUnderDir(target, takes.root)) return true;
  const linkedFolders = Object.values(projectFolders.get('watchedFolders', {}));
  return linkedFolders.some((folderPath) => folderPath && isUnderDir(target, path.join(folderPath, 'takes')));
};

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
    console.log(`[RR-STREAM] Finished ${outputPath}: ${streamWavWriter.bytesWritten} bytes`);
    return {
      success: true,
      path: outputPath,
      fileName: path.basename(outputPath),
      keptWithProject: false,
      bytesWritten: streamWavWriter.bytesWritten,
    };
  });

  ipcMain.handle('rr-push-take-to-folder', async (_, { vaultPath, folderPath, takeNumber }) => {
    if (!vaultPath || !path.isAbsolute(vaultPath)) throw new Error('INVALID_AUDIO_PATH');
    if (!isOwnedTakePath(vaultPath)) throw new Error('AUDIO_PATH_NOT_ALLOWED');
    const projectPath = await takes.toProject(vaultPath, folderPath, takeNumber);
    console.log(`[RR-PUSH] ${vaultPath} → ${projectPath}`);
    return { success: true, path: projectPath, fileName: path.basename(projectPath) };
  });

  ipcMain.handle('rr-read-audio-file', async (_, filePath) => {
    if (!filePath || !path.isAbsolute(filePath)) throw new Error('INVALID_AUDIO_PATH');
    const stats = await fs.promises.stat(filePath);
    if (stats.size > 100 * 1024 * 1024) throw new Error('AUDIO_FILE_TOO_LARGE');
    return (await fs.promises.readFile(filePath)).toString('base64');
  });
  ipcMain.handle('rr-delete-audio-file', async (_, filePath) => {
    if (!filePath || !path.isAbsolute(filePath)) throw new Error('INVALID_AUDIO_PATH');
    const target = path.resolve(filePath);
    if (!isOwnedTakePath(target)) throw new Error('AUDIO_PATH_NOT_ALLOWED');
    await fs.promises.rm(target, { force: true });
    return { success: true };
  });

  ipcMain.handle('rr-leave-session', async (event) => {
    const record = masterWriters.get(event.sender.id);
    if (record) {
      masterWriters.delete(event.sender.id);
      const stagedPath = await record.writer.stop().catch(() => null);
      if (stagedPath) await takes.toVault(stagedPath, record.projectId, record.takeNumber).catch(() => null);
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

  ipcMain.handle('rr-save-session-record', (_, { projectId, projectName, side, startedAt, endedAt, takes: sessionTakes }) => {
    if (!projectId) throw new Error('INVALID_AUDIO_PATH');
    const all = sessionHistory.get('sessions', {});
    const forProject = all[projectId] || [];
    const record = {
      id: crypto.randomUUID(),
      projectId,
      projectName: projectName || null,
      side,
      startedAt,
      endedAt,
      takes: (sessionTakes || []).map((take) => ({
        number: take.number,
        path: take.path,
        fileName: take.fileName,
        durationMs: take.durationMs,
        pushed: Boolean(take.pushed),
        source: take.source,
      })),
    };
    all[projectId] = [record, ...forProject].slice(0, 200);
    sessionHistory.set('sessions', all);
    console.log(`[RR-HISTORY] Saved session ${record.id} for project ${projectId} (${record.takes.length} takes)`);
    return { success: true, id: record.id };
  });

  ipcMain.handle('rr-list-session-records', (_, { projectId } = {}) => {
    const all = sessionHistory.get('sessions', {});
    if (projectId) return all[projectId] || [];
    return all;
  });

  ipcMain.handle('rr-delete-session-record', (_, { projectId, sessionId, deleteFiles = false }) => {
    const all = sessionHistory.get('sessions', {});
    const forProject = all[projectId] || [];
    const record = forProject.find((entry) => entry.id === sessionId);
    if (!record) return { success: false };
    if (deleteFiles) {
      for (const take of record.takes) {
        if (take.path && isOwnedTakePath(take.path)) {
          fs.promises.rm(take.path, { force: true }).catch(() => {});
        }
      }
    }
    all[projectId] = forProject.filter((entry) => entry.id !== sessionId);
    sessionHistory.set('sessions', all);
    return { success: true };
  });

  ipcMain.handle('rr-update-session-take', (_, { projectId, sessionId, takeNumber, patch, remove }) => {
    const all = sessionHistory.get('sessions', {});
    const forProject = all[projectId] || [];
    const recordIndex = forProject.findIndex((entry) => entry.id === sessionId);
    if (recordIndex === -1) return { success: false };
    const record = forProject[recordIndex];
    const nextTakes = remove
      ? record.takes.filter((take) => take.number !== takeNumber)
      : record.takes.map((take) => (take.number === takeNumber ? { ...take, ...patch } : take));
    forProject[recordIndex] = { ...record, takes: nextTakes };
    all[projectId] = forProject;
    sessionHistory.set('sessions', all);
    return { success: true };
  });
};

module.exports = { registerRecordingHandlers };
