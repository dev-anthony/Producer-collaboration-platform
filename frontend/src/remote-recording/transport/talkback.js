// Talkback is intentionally separate from the raw PCM recording channel.
export default class Talkback {
  constructor() { this.localStream = null; this.sender = null; this.isActive = false; }

  async startTalkback(peer) {
    // Talkback is comfort audio, but Chromium processing is explicitly disabled.
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 48000, channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      video: false,
    });
    this.localStream.getTracks().forEach((track) => peer.addTrack(track, this.localStream));
    this.isActive = true;
    return this.localStream;
  }

  stopTalkback() {
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.isActive = false;
  }
}
