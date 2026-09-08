const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const TestCapture = require('../audio/testCapture');
const ReconciliationEngine = require('../recording/reconciliation');

const SAMPLE_RATE = 48000;
const DURATION_MS = 1000;
const SAMPLE_COUNT = SAMPLE_RATE * DURATION_MS / 1000;

const makeWav = (pcm) => {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 3, 28);
  header.writeUInt16LE(3, 32);
  header.writeUInt16LE(24, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
};

const run = async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prodcollab-rr-'));
  const sourcePath = path.join(root, 'source.wav');
  const outputPath = path.join(root, 'master.wav');
  const pcm = Buffer.alloc(SAMPLE_COUNT * 3);
  for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
    const value = Math.round(Math.sin(2 * Math.PI * 440 * sample / SAMPLE_RATE) * 0x5fffff);
    pcm.writeIntLE(value, sample * 3, 3);
  }
  fs.writeFileSync(sourcePath, makeWav(pcm));

  const capture = new TestCapture();
  const chunks = [];
  capture.setSource(sourcePath);
  capture.setChunkCallback((chunk) => chunks.push(Buffer.from(chunk)));
  const startedAt = Date.now();
  capture.startRecording(outputPath);
  while (capture.isRecording) await new Promise((resolve) => setTimeout(resolve, 20));
  await capture.stopRecording();
  const elapsed = Date.now() - startedAt;

  const output = fs.readFileSync(outputPath);
  assert(elapsed >= 900 && elapsed < 1600, `expected real-time pacing near 1000ms, got ${elapsed}ms`);
  assert.strictEqual(chunks.length, 10, 'expected ten 100ms chunks');
  assert.deepStrictEqual(Buffer.concat(chunks), pcm, 'streamed chunks must match source PCM');
  assert.deepStrictEqual(output.slice(44), pcm, 'local master must match source PCM');

  const recon = new ReconciliationEngine();
  const master16 = Buffer.alloc(SAMPLE_COUNT * 2);
  for (let source = 0, target = 0; source < pcm.length; source += 3, target += 2) master16.writeInt16LE(pcm.readIntLE(source, 3) >> 8, target);
  const stream16 = Buffer.from(master16);
  stream16.fill(0, SAMPLE_RATE * 2 * 0.4, SAMPLE_RATE * 2 * 0.6);
  const dropouts = recon.findDropouts(stream16);
  const restored = recon.reconcile(stream16, master16, dropouts);
  assert(dropouts.some(({ startMs, durationMs }) => startMs <= 400 && startMs + durationMs >= 600), 'expected the simulated dropout to be detected');
  assert.deepStrictEqual(restored, master16, 'reconciliation must restore the simulated dropout');

  fs.rmSync(root, { recursive: true, force: true });
  console.log(`Remote recording test passed: ${chunks.length} chunks in ${elapsed}ms; ${dropouts.length} dropout region(s) reconciled.`);
};

run().catch((error) => { console.error(error); process.exitCode = 1; });
