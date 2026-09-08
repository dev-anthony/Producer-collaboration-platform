const fs = require('fs');
const WavWriter = require('./wavWriter');

// WAV-backed capture used only when explicitly enabled for local pipeline tests.
class TestCapture {
  constructor() {
    this.deviceId = -1;
    this.onAudioChunk = null;
    this.wavWriter = null;
    this.timer = null;
    this.isRecording = false;
    this.sourcePath = null;
    this.pcm = null;
    this.position = 0;
    this.chunkBytes = 4800 * 3; // 100ms of mono 48kHz, 24-bit PCM
    this.stopPromise = null;
  }

  setDevice(deviceId) { this.deviceId = deviceId; }
  setChunkCallback(callback) { this.onAudioChunk = typeof callback === 'function' ? callback : null; }
  setSource(sourcePath) { this.sourcePath = sourcePath; }

  startRecording(outputPath) {
    if (this.isRecording) throw new Error('RECORDING_IN_PROGRESS');
    if (!this.sourcePath) throw new Error('TEST_WAV_NOT_SELECTED');
    const wav = fs.readFileSync(this.sourcePath);
    const format = parseWavHeader(wav);
    if (format.audioFormat !== 1 || format.channels !== 1 || format.sampleRate !== 48000 || format.bitsPerSample !== 24) {
      throw new Error('TEST_WAV_MUST_BE_MONO_48KHZ_24BIT_PCM');
    }
    this.pcm = wav.slice(format.dataOffset, format.dataOffset + format.dataSize);
    this.position = 0;
    this.wavWriter = new WavWriter(outputPath, { sampleRate: 48000, bitDepth: 24, channels: 1 });
    this.wavWriter.start();
    this.isRecording = true;
    this.stopPromise = null;
    this.timer = setInterval(() => this.emitChunk(), 100);
    this.emitChunk();
  }

  emitChunk() {
    if (!this.isRecording) return;
    const chunk = this.pcm.slice(this.position, this.position + this.chunkBytes);
    if (!chunk.length) { this.stopRecording().catch((error) => console.error('[TEST-CAPTURE]', error)); return; }
    this.position += chunk.length;
    this.wavWriter.write(chunk);
    this.onAudioChunk?.(chunk);
  }

  async stopRecording() {
    if (!this.isRecording) return this.stopPromise || null;
    clearInterval(this.timer);
    this.timer = null;
    this.isRecording = false;
    this.stopPromise = this.wavWriter.stop().then((output) => {
      this.wavWriter = null;
      this.pcm = null;
      this.onAudioChunk = null;
      return output;
    });
    return this.stopPromise;
  }
}

function parseWavHeader(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') throw new Error('INVALID_TEST_WAV');
  let offset = 12;
  let format = null;
  let dataOffset = null;
  let dataSize = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === 'fmt ') format = { audioFormat: buffer.readUInt16LE(offset + 8), channels: buffer.readUInt16LE(offset + 10), sampleRate: buffer.readUInt32LE(offset + 12), bitsPerSample: buffer.readUInt16LE(offset + 22) };
    if (id === 'data') { dataOffset = offset + 8; dataSize = size; break; }
    offset += 8 + size + (size % 2);
  }
  if (!format || dataOffset == null) throw new Error('INVALID_TEST_WAV');
  return { ...format, dataOffset, dataSize };
}

module.exports = TestCapture;
