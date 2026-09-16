// Input metering for the studio views.
//
// Both sides already hold the raw 16-bit PCM bytes as they pass through
// (performer: straight off the worklet, producer: straight off the data
// channel), so the meters are computed from those bytes rather than from an
// AnalyserNode. That matters for one studio-correct reason: the producer's
// meters must keep moving while the control-room monitors are dimmed. On a
// real desk the input meters read the signal arriving at the channel, not
// whatever is currently going to the speakers.

const FLOOR_DB = -60;

// RMS of a little-endian signed 16-bit PCM buffer, normalised 0..1.
export function rmsFromPcm(bytes) {
  if (!bytes || bytes.byteLength < 2) return 0;
  const view = bytes instanceof Uint8Array
    ? bytes
    : new Uint8Array(bytes.buffer || bytes, bytes.byteOffset || 0, bytes.byteLength);
  const sampleCount = Math.floor(view.byteLength / 2);
  let sum = 0;
  for (let i = 0; i < sampleCount; i += 1) {
    const raw = view[i * 2] | (view[i * 2 + 1] << 8);
    const sample = (raw & 0x8000 ? raw - 0x10000 : raw) / 32768;
    sum += sample * sample;
  }
  return Math.sqrt(sum / sampleCount);
}

// Peak sample of the same buffer, normalised 0..1. Peak is what tells a
// producer they are about to clip; RMS is what tells them the take is sitting
// at a usable level. The meters show both.
export function peakFromPcm(bytes) {
  if (!bytes || bytes.byteLength < 2) return 0;
  const view = bytes instanceof Uint8Array
    ? bytes
    : new Uint8Array(bytes.buffer || bytes, bytes.byteOffset || 0, bytes.byteLength);
  const sampleCount = Math.floor(view.byteLength / 2);
  let peak = 0;
  for (let i = 0; i < sampleCount; i += 1) {
    const raw = view[i * 2] | (view[i * 2 + 1] << 8);
    const sample = Math.abs((raw & 0x8000 ? raw - 0x10000 : raw) / 32768);
    if (sample > peak) peak = sample;
  }
  return peak;
}

// Linear amplitude to dBFS, clamped at a -60 dB floor so the meter has a
// sensible bottom instead of running to -Infinity on digital silence.
export function toDbfs(amplitude) {
  if (!amplitude) return FLOOR_DB;
  return Math.max(FLOOR_DB, 20 * Math.log10(amplitude));
}

// dBFS to a 0..1 meter position. Studio meters are not linear in amplitude —
// they give the top of the scale far more room, which is where a vocal
// actually lives and where clipping decisions get made.
export function meterPosition(dbfs) {
  return Math.min(1, Math.max(0, (dbfs - FLOOR_DB) / -FLOOR_DB));
}

export { FLOOR_DB };
