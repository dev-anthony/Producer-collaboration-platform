const workletSource = `
class PcmInput extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (input) {
      const bytes = new Uint8Array(input.length * 2);
      for (let i = 0; i < input.length; i++) {
        const sample = Math.max(-1, Math.min(1, input[i]));
        const value = sample < 0 ? sample * 32768 : sample * 32767;
        bytes[i * 2] = value & 255;
        bytes[i * 2 + 1] = (value >> 8) & 255;
      }
      this.port.postMessage(bytes, [bytes.buffer]);
    }
    return true;
  }
}

class PcmOutput extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.port.onmessage = ({ data }) => {
      if (data instanceof ArrayBuffer) this.queue.push(new Uint8Array(data));
      else if (data?.buffer) this.queue.push(new Uint8Array(data.buffer, data.byteOffset || 0, data.byteLength));
      if (this.queue.length > 12) this.queue.splice(0, this.queue.length - 12);
    };
  }
  process(_, outputs) {
    const output = outputs[0] && outputs[0][0];
    if (!output) return true;
    for (let i = 0; i < output.length; i++) {
      const chunk = this.queue[0];
      if (!chunk || chunk.length < 2) { output[i] = 0; continue; }
      const value = chunk[0] | (chunk[1] << 8);
      output[i] = (value & 0x8000) ? (value - 0x10000) / 32768 : value / 32767;
      this.queue[0] = chunk.subarray(2);
      if (!this.queue[0].length) this.queue.shift();
    }
    return true;
  }
}
registerProcessor('rr-pcm-input', PcmInput);
registerProcessor('rr-pcm-output', PcmOutput);`;

export async function createPcmContext() {
  const context = new AudioContext({ sampleRate: 48000 });
  const url = URL.createObjectURL(new Blob([workletSource], { type: 'application/javascript' }));
  await context.audioWorklet.addModule(url);
  URL.revokeObjectURL(url);
  return context;
}

export function createPcmInput(context, onChunk) {
  const node = new AudioWorkletNode(context, 'rr-pcm-input', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
  node.port.onmessage = ({ data }) => onChunk(data);
  return node;
}

export function createPcmOutput(context) {
  const node = new AudioWorkletNode(context, 'rr-pcm-output', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] });
  let paused = false;
  node.port.onmessage = () => {};
  return {
    node,
    setPaused(value) { paused = value; node.port.postMessage({ type: 'pause', paused }); },
    push(chunk) {
      const buffer = chunk instanceof ArrayBuffer
        ? chunk
        : chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
      node.port.postMessage(buffer, [buffer]);
    },
  };
}
