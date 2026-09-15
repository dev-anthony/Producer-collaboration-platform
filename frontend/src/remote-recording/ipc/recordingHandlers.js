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
let registered = false;

const getMasterWriter = (senderId) => masterWriters.get(senderId);

const registerRecordingHandlers = () => {
  if (registered) return;
  registered = true;

  ipcMain.handle('rr-native-status', () => ({ success: true, ready: true }));
  ipcMain.handle('rr-start-master-recording', (event, { takeNumber = 1 } = {}) => {
    if (masterWriters.has(event.sender.id)) throw new Error('MASTER_RECORDING_IN_PROGRESS');
    const outputPath = takes.nextPath(takeNumber, 'master');
    const writer = new WavWriter(outputPath, { sampleRate: 48000, bitDepth: 16, channels: 1 });
    writer.start();
    masterWriters.set(event.sender.id, { writer, outputPath, bytesWritten: 0, chunkCount: 0 });
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
    console.log(`[RR-MASTER] Chunk ${record.chunkCount}: ${bytes.length} bytes, total ${record.bytesWritten}`);
    return { success: true };
  });

  ipcMain.handle('rr-stop-master-recording', async (event) => {
    const record = masterWriters.get(event.sender.id);
    if (!record) return { success: false, path: null };
    masterWriters.delete(event.sender.id);
    const outputPath = await record.writer.stop();
    console.log(`[RR-MASTER] Finished ${outputPath}: ${record.bytesWritten} bytes`);
    return { success: true, path: outputPath, bytesWritten: record.bytesWritten };
  });

  ipcMain.handle('rr-start-stream-recording', (event, { takeNumber = 1 } = {}) => {
    if (streamWavWriters.has(event.sender.id)) throw new Error('STREAM_RECORDING_IN_PROGRESS');
    const outputPath = takes.nextPath(takeNumber, 'stream_backup');
    const streamWavWriter = { writer: new WavWriter(outputPath, { sampleRate: 48000, bitDepth: 16, channels: 1 }), outputPath, bytesWritten: 0, chunkCount: 0 };
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
    console.log(`[RR-STREAM] Chunk ${streamWavWriter.chunkCount}: ${bytes.length} bytes`);
    return { success: true };
  });

  ipcMain.handle('rr-stop-stream-recording', async (event) => {
    const streamWavWriter = streamWavWriters.get(event.sender.id);
    if (!streamWavWriter) return { success: false, path: null };
    streamWavWriters.delete(event.sender.id);
    const outputPath = await streamWavWriter.writer.stop();
    console.log(`[RR-STREAM] Finished ${outputPath}: ${streamWavWriter.bytesWritten} bytes`);
    return { success: true, path: outputPath, bytesWritten: streamWavWriter.bytesWritten };
  });

  ipcMain.handle('rr-read-audio-file', async (_, filePath) => {
    if (!filePath || !path.isAbsolute(filePath)) throw new Error('INVALID_AUDIO_PATH');
    const stats = await fs.promises.stat(filePath);
    if (stats.size > 100 * 1024 * 1024) throw new Error('AUDIO_FILE_TOO_LARGE');
    return `data:audio/wav;base64,${(await fs.promises.readFile(filePath)).toString('base64')}`;
  });
  ipcMain.handle('rr-delete-audio-file', async (_, filePath) => {
    if (!filePath || !path.isAbsolute(filePath)) throw new Error('INVALID_AUDIO_PATH');
    const root = path.resolve(takes.root);
    const target = path.resolve(filePath);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error('AUDIO_PATH_NOT_ALLOWED');
    await fs.promises.rm(target, { force: true });
    return { success: true };
  });

  ipcMain.handle('rr-leave-session', async (event) => {
    const record = masterWriters.get(event.sender.id);
    if (record) { masterWriters.delete(event.sender.id); await record.writer.stop().catch(() => {}); }
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
