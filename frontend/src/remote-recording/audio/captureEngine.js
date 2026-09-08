const { AudioIO, SampleFormat24Bit } = require('naudiodon');
const WavWriter = require('./wavWriter');

class CaptureEngine {
  constructor() {
    this.audioInput = null;
    this.wavWriter = null;
    this.deviceId = -1;
    this.sampleRate = 48000;
    this.channels = 1;
    this.isRecording = false;
    this.onAudioChunk = null;
  }

  setDevice(deviceId) { this.deviceId = Number.isInteger(Number(deviceId)) ? Number(deviceId) : -1; }
  setChunkCallback(callback) { this.onAudioChunk = typeof callback === 'function' ? callback : null; }

  startRecording(outputPath) {
    if (this.isRecording) throw new Error('RECORDING_IN_PROGRESS');
    this.wavWriter = new WavWriter(outputPath, { sampleRate: 48000, bitDepth: 24, channels: 1 });
    this.wavWriter.start();
    try {
      this.audioInput = new AudioIO({
        inOptions: {
          channelCount: 1,
          sampleFormat: SampleFormat24Bit,
          sampleRate: 48000,
          deviceId: this.deviceId,
          closeOnError: false,
        },
      });
      this.audioInput.on('data', (chunk) => {
        this.wavWriter?.write(chunk);
        this.onAudioChunk?.(chunk);
      });
      this.audioInput.on('error', (error) => console.error('[RR-CAPTURE] Audio error:', error));
      this.audioInput.start();
      this.isRecording = true;
    } catch (error) {
      this.wavWriter.stop().catch(() => {});
      this.wavWriter = null;
      this.audioInput = null;
      throw error;
    }
  }

  async stopRecording() {
    if (!this.isRecording) return null;
    this.audioInput?.quit();
    this.audioInput = null;
    this.isRecording = false;
    const result = await this.wavWriter?.stop();
    this.wavWriter = null;
    this.onAudioChunk = null;
    return result;
  }
}

module.exports = CaptureEngine;
