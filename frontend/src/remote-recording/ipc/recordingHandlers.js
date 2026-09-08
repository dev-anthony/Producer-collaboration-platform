const { ipcMain, BrowserWindow, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const ClockSync = require('../sync/clockSync');
const ReconciliationEngine = require('../recording/reconciliation');
const TakeManager = require('../recording/takeManager');
const TestCapture = require('../audio/testCapture');

const takes = new TakeManager();
const clockSync = new ClockSync();
const reconciliation = new ReconciliationEngine();
let registered = false;
let nativeCapture = null;
let testCapture = null;
let capture = null;
let wavWriter = null;
let streamOutputPath = null;
let nativeCaptureError = null;

const send = (channel, payload) => BrowserWindow.getAllWindows().forEach((window) => {
  if (!window.isDestroyed()) window.webContents.send(channel, payload);
});

const registerRecordingHandlers = () => {
  if (registered) return;
  registered = true;
  try {
    nativeCapture = new (require('../audio/captureEngine'))();
  } catch (error) {
    nativeCaptureError = error;
    console.error('[RR] Native microphone capture is unavailable:', error.message);
  }
  testCapture = new TestCapture();
  capture = nativeCapture;

  ipcMain.handle('rr-native-status', () => ({ success: true, nativeCapture: Boolean(nativeCapture), testCapture: true, nativeCaptureError: nativeCaptureError?.message || null }));
  ipcMain.handle('rr-list-input-devices', () => {
    if (!nativeCapture) return [];
    try { return require('../audio/deviceManager').listInputDevices(); } catch { return []; }
  });
  ipcMain.handle('rr-list-output-devices', () => {
    if (!nativeCapture) return [];
    try { return require('../audio/deviceManager').listOutputDevices(); } catch { return []; }
  });
  ipcMain.handle('rr-enable-test-capture', (_, enabled) => {
    capture = enabled ? testCapture : nativeCapture;
    if (!capture) throw new Error('NATIVE_CAPTURE_UNAVAILABLE');
    return { success: true, mode: enabled ? 'test' : 'native' };
  });
  ipcMain.handle('rr-set-test-wav', (_, sourcePath) => { testCapture.setSource(sourcePath); return { success: true, path: sourcePath }; });
  ipcMain.handle('rr-select-test-wav', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'WAV audio', extensions: ['wav'] }] });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle('rr-set-device', (_, deviceId) => { capture?.setDevice(deviceId); return { success: true }; });
  ipcMain.handle('rr-start-recording', (_, { takeNumber = 1 }) => {
    if (!capture) throw new Error('CAPTURE_ENGINE_UNAVAILABLE');
    const outputPath = takes.nextPath(takeNumber);
    capture.setChunkCallback((chunk) => send('rr-audio-chunk', new Uint8Array(chunk)));
    capture.startRecording(outputPath);
    return { success: true, path: outputPath, sampleRate: 48000, bitDepth: 24 };
  });
  ipcMain.handle('rr-stop-recording', async () => ({ success: true, path: await capture?.stopRecording() }));

  ipcMain.handle('rr-start-stream-recording', (_, { takeNumber = 1 } = {}) => {
    const WavWriter = require('../audio/wavWriter');
    streamOutputPath = takes.nextPath(takeNumber, 'stream_backup');
    wavWriter = new WavWriter(streamOutputPath, { sampleRate: 48000, bitDepth: 16, channels: 1 });
    wavWriter.start();
    return { success: true, path: streamOutputPath };
  });
  ipcMain.handle('rr-write-stream-chunk', (_, chunk) => {
    if (!wavWriter || !chunk) return { success: false };
    wavWriter.write(Buffer.from(chunk));
    return { success: true };
  });
  ipcMain.handle('rr-stop-stream-recording', async () => {
    if (!wavWriter) return { success: false, path: null };
    const writer = wavWriter;
    wavWriter = null;
    return { success: true, path: await writer.stop() };
  });
  ipcMain.handle('rr-leave-session', async () => {
    if (wavWriter) {
      await wavWriter.stop().catch(() => {});
      wavWriter = null;
    }
    capture?.setChunkCallback(null);
    return { success: true };
  });
  ipcMain.handle('rr-reconcile', (_, { streamPath, masterPath, outputPath }) => {
    const stream = fs.readFileSync(streamPath);
    const master = fs.readFileSync(masterPath);
    const streamPcm = stream.slice(44);
    const dropouts = reconciliation.findDropouts(streamPcm);
    const master24 = master.slice(44);
    const master16 = Buffer.alloc(Math.floor(master24.length / 3) * 2);
    for (let source = 0, target = 0; source + 2 < master24.length; source += 3, target += 2) master16.writeInt16LE(master24.readIntLE(source, 3) >> 8, target);
    const pcm = reconciliation.reconcile(streamPcm, master16, dropouts);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, Buffer.concat([stream.slice(0, 44), pcm]));
    return { success: true, dropouts: dropouts.length, outputPath };
  });
  ipcMain.handle('rr-get-clock-stats', () => ({ latency: clockSync.getAverageLatency(), offset: clockSync.offset }));
};

module.exports = { registerRecordingHandlers };
