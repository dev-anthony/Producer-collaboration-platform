const fs = require('fs');
const wav = require('wav');

// The 'wav' package writes its 44-byte PCM header eagerly, before any audio
// exists, using a ~4GB placeholder for the RIFF and data chunk sizes — it
// cannot know the real length until the stream ends, and it never goes back
// and fixes the file on disk once it does. Left as-is, every take we write
// carries a header claiming ~4GB of audio. Most decoders trust that field:
// they either refuse to open the file or report zero duration, which is
// exactly why finished takes would not play back. We patch the two size
// fields ourselves once the file is fully flushed to disk.
const HEADER_LENGTH = 44;
const RIFF_SIZE_OFFSET = 4;
const DATA_SIZE_OFFSET = 40;

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
    this.bytesWritten = 0;
  }

  start() {
    if (this.writer) throw new Error('WAV writer is already running');
    this.fileStream = fs.createWriteStream(this.filePath);
    this.writer = new wav.Writer(this.options);
    this.writer.on('error', (error) => this.fileStream?.destroy(error));
    this.writer.pipe(this.fileStream);
    this.bytesWritten = 0;
  }

  write(buffer) {
    if (!this.writer) throw new Error('WAV writer has not started');
    this.bytesWritten += buffer.length;
    this.writer.write(buffer);
  }

  stop() {
    if (!this.writer) return Promise.resolve(null);
    const writer = this.writer;
    const fileStream = this.fileStream;
    const dataLength = this.bytesWritten;
    this.writer = null;
    this.fileStream = null;
    return new Promise((resolve, reject) => {
      writer.once('error', reject);
      fileStream.once('error', reject);
      // The file stream's own 'finish' — not the writer's end callback — is
      // the point every byte has actually reached disk. Patching the header
      // any earlier can race the OS write and corrupt the file.
      fileStream.once('finish', async () => {
        try {
          await this._patchHeader(dataLength);
          resolve(this.filePath);
        } catch (error) {
          reject(error);
        }
      });
      writer.end();
    });
  }

  async _patchHeader(dataLength) {
    const handle = await fs.promises.open(this.filePath, 'r+');
    try {
      const riffSize = Buffer.alloc(4);
      riffSize.writeUInt32LE(dataLength + HEADER_LENGTH - 8, 0);
      await handle.write(riffSize, 0, 4, RIFF_SIZE_OFFSET);

      const dataSize = Buffer.alloc(4);
      dataSize.writeUInt32LE(dataLength, 0);
      await handle.write(dataSize, 0, 4, DATA_SIZE_OFFSET);
    } finally {
      await handle.close();
    }
  }
}

module.exports = WavWriter;
