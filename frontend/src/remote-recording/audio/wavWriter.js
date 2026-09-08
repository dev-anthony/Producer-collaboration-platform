const fs = require('fs');
const wav = require('wav');

class WavWriter {
  constructor(filePath, options = {}) {
    this.filePath = filePath;
    this.options = {
      sampleRate: options.sampleRate || 48000,
      bitDepth: options.bitDepth || 24,
      channels: options.channels || 1,
    };
    this.writer = null;
    this.fileStream = null;
  }

  start() {
    if (this.writer) throw new Error('WAV writer is already running');
    this.fileStream = fs.createWriteStream(this.filePath);
    this.writer = new wav.Writer(this.options);
    this.writer.on('error', (error) => this.fileStream?.destroy(error));
    this.writer.pipe(this.fileStream);
  }

  write(buffer) {
    if (!this.writer) throw new Error('WAV writer has not started');
    this.writer.write(buffer);
  }

  stop() {
    if (!this.writer) return Promise.resolve(null);
    const writer = this.writer;
    this.writer = null;
    return new Promise((resolve, reject) => {
      writer.once('error', reject);
      writer.end(() => resolve(this.filePath));
    });
  }
}

module.exports = WavWriter;
