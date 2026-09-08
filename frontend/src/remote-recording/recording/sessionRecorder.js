class SessionRecorder {
  constructor(captureEngine, takeManager) { this.capture = captureEngine; this.takes = takeManager; }
  start(takeNumber) { const outputPath = this.takes.nextPath(takeNumber); this.capture.startRecording(outputPath); return outputPath; }
  stop() { return this.capture.stopRecording(); }
}
module.exports = SessionRecorder;
