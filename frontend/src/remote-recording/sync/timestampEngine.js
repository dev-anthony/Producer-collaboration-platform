class TimestampEngine {
  constructor(clockSync) { this.clockSync = clockSync; this.recordingStartTime = null; }
  markRecordingStart() { this.recordingStartTime = this.clockSync.getAdjustedTime(); return this.recordingStartTime; }
  getTimelinePosition(producerTimelinePosition) { return producerTimelinePosition - this.clockSync.getAverageLatency(); }
}
module.exports = TimestampEngine;
