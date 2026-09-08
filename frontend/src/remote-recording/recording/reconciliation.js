class ReconciliationEngine {
  constructor() { this.SILENCE_THRESHOLD = 100; this.CHUNK_SIZE = 4800; }
  findDropouts(buffer, sampleRate = 48000) {
    const result = [];
    for (let i = 0; i < buffer.length; i += this.CHUNK_SIZE * 2) {
      const chunk = buffer.slice(i, i + this.CHUNK_SIZE * 2);
      let sum = 0;
      for (let j = 0; j + 1 < chunk.length; j += 2) { const sample = chunk.readInt16LE(j); sum += sample * sample; }
      const rms = chunk.length ? Math.sqrt(sum / (chunk.length / 2)) : 0;
      if (rms < this.SILENCE_THRESHOLD) result.push({ startMs: (i / 2 / sampleRate) * 1000, durationMs: (chunk.length / 2 / sampleRate) * 1000 });
    }
    return this._mergeDropouts(result);
  }
  reconcile(streamBuffer, masterBuffer, dropouts, sampleRate = 48000, bytesPerSample = 2) {
    const result = Buffer.from(streamBuffer);
    for (const dropout of dropouts) {
      const start = Math.floor((dropout.startMs / 1000) * sampleRate) * bytesPerSample;
      const end = Math.min(result.length, Math.floor(((dropout.startMs + dropout.durationMs) / 1000) * sampleRate) * bytesPerSample);
      masterBuffer.copy(result, start, start, Math.min(end, masterBuffer.length));
    }
    return result;
  }
  _mergeDropouts(dropouts, gapMs = 50) {
    if (!dropouts.length) return [];
    const merged = [dropouts[0]];
    for (const current of dropouts.slice(1)) {
      const last = merged[merged.length - 1];
      if (current.startMs <= last.startMs + last.durationMs + gapMs) last.durationMs = Math.max(last.durationMs, current.startMs + current.durationMs - last.startMs);
      else merged.push(current);
    }
    return merged;
  }
}
module.exports = ReconciliationEngine;
