const FLOOR_DB = -60;

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

export function toDbfs(amplitude) {
  if (!amplitude) return FLOOR_DB;
  return Math.max(FLOOR_DB, 20 * Math.log10(amplitude));
}

export function meterPosition(dbfs) {
  return Math.min(1, Math.max(0, (dbfs - FLOOR_DB) / -FLOOR_DB));
}

export { FLOOR_DB };
