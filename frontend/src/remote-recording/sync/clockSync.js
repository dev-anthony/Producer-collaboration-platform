class ClockSync {
  constructor() { this.offset = 0; this.latency = 0; this.samples = []; }
  calculateOffset(t1, t2, t3) {
    const latency = (t3 - t1) / 2;
    this.latency = latency;
    this.offset = t2 - (t1 + latency);
    this.samples.push({ latency, offset: this.offset });
    return { latency, offset: this.offset };
  }
  getAdjustedTime() { return Date.now() + this.offset; }
  getLatency() { return this.latency; }
  getAverageLatency() { return this.samples.length ? this.samples.reduce((sum, item) => sum + item.latency, 0) / this.samples.length : 0; }
}
module.exports = ClockSync;
