import { createClient } from '@supabase/supabase-js';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// Connection lifecycle logging, on everywhere except a packaged production
// build. It earned its keep tracking down the WAV, talkback and CSP issues
// during development, but a per-ICE-candidate line has no business in a
// producer's console once the studio is finished, not still being debugged.
// Actual failures (console.error) stay on regardless — those are worth
// seeing in the field, not just during development.
const DEBUG = process.env.NODE_ENV !== 'production';
const log = (...args) => { if (DEBUG) console.log(...args); };

export default class RendererTransport {
  constructor({ sessionId, role, supabaseUrl, supabaseAnonKey, onAudio, onControl, onTalkback, onStatus }) {
    this.sessionId = sessionId;
    this.role = role;
    this.otherRole = role === 'producer' ? 'performer' : 'producer';
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('SIGNALING_CONFIG_MISSING');
    this.supabase = createClient(supabaseUrl.trim(), supabaseAnonKey.trim(), {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 100 } },
    });
    this.channel = null;
    this.peer = null;
    this.audioChannel = null;
    this.talkbackSenders = [];
    this.pendingCandidates = [];
    this.pendingSignals = [];
    this.performerPresent = false;
    this.onAudio = onAudio;
    this.onControl = onControl;
    this.onTalkback = onTalkback;
    this.onStatus = onStatus;
    // Guards against duplicate offer/negotiation cycles caused by a stray
    // second 'peer-joined' broadcast (e.g. a double-mounted session or a
    // duplicate join click). Without this, a second offer can orphan the
    // first data channel mid-negotiation, which showed up as the producer's
    // channel opening then immediately erroring/closing while the performer
    // never saw ondatachannel fire at all.
    this.hasOffered = false;
    this.closed = false;
    this.negotiating = false;
    this.offerPending = false;
  }

  async start() {
    this.channel = this.supabase.channel(`rr-session-${this.sessionId}`)
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        if (payload.to !== this.role) return;
        if (this.peer) this.signal(payload.data);
        else this.pendingSignals.push(payload.data);
      })
      .on('broadcast', { event: 'peer-joined' }, ({ payload }) => {
        if (this.role === 'producer' && payload.role === 'performer') {
          this.performerPresent = true;
          if (this.peer) this.makeOffer();
        }
      })
      .on('broadcast', { event: 'control' }, ({ payload }) => payload.to === this.role && this.onControl?.(payload));
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('SIGNALING_TIMEOUT')), 15000);
      this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        await this.channel.send({ type: 'broadcast', event: 'peer-joined', payload: { role: this.role } });
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timeout);
        console.error('[RR-SIGNALING] Channel subscription failed:', { status, sessionId: this.sessionId, supabaseUrl: this.supabase.supabaseUrl });
        reject(new Error(`SIGNALING_${status}`));
      }
      });
    });
    this.peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peer.onicecandidate = ({ candidate }) => {
      log(`[RR-ICE] candidate ${new Date().toISOString()}`);
      if (candidate) this.sendSignal({ type: 'candidate', candidate });
    };
    this.peer.oniceconnectionstatechange = () => log(`[RR-ICE] state ${new Date().toISOString()}: ${this.peer.iceConnectionState}`);
    this.peer.onconnectionstatechange = () => {
      log(`[RR-PEER] connectionState ${new Date().toISOString()}: ${this.peer.connectionState}`);
      if (this.peer.connectionState === 'connected') this.onStatus?.('connected');
      if (['failed', 'closed', 'disconnected'].includes(this.peer.connectionState)) this.onStatus?.('disconnected');
    };
    this.peer.ondatachannel = ({ channel }) => {
      log(`[RR-DATA] ondatachannel fired ${new Date().toISOString()} label=${channel.label}`);
      this.attachAudio(channel);
    };
    this.peer.ontrack = ({ streams, track }) => {
      log(`[RR-TALKBACK] ontrack fired ${new Date().toISOString()} kind=${track.kind} readyState=${track.readyState} streams=${streams.length}`);
      if (streams[0]) this.onTalkback?.(streams[0]);
    };
    if (this.role === 'producer') {
      this.attachAudio(this.peer.createDataChannel('rr-pcm', { ordered: false, maxRetransmits: 0 }));
    }
    for (const signal of this.pendingSignals.splice(0)) await this.signal(signal);
    if (this.role === 'producer' && this.performerPresent) await this.makeOffer();
  }

  async makeOffer() {
    if (!this.peer || this.hasOffered) return;
    if (this.negotiating || this.peer.signalingState !== 'stable') {
      this.offerPending = true;
      return;
    }
    // Set the flag before awaiting anything, so a second synchronous call
    // (e.g. a duplicate broadcast arriving before this promise resolves)
    // can't slip through and start a second negotiation.
    this.hasOffered = true;
    this.negotiating = true;
    try {
      const offer = await this.peer.createOffer();
      await this.peer.setLocalDescription(offer);
      await this.sendSignal({ type: 'description', description: this.peer.localDescription });
    } catch (error) {
      this.hasOffered = false;
      throw error;
    } finally {
      this.negotiating = false;
      if (this.offerPending && this.peer?.signalingState === 'stable') {
        this.offerPending = false;
        await this.makeOffer();
      }
    }
  }

  attachAudio(channel) {
    this.audioChannel = channel;
    channel.binaryType = 'arraybuffer';
    channel.onopen = () => { log(`[RR-DATA] open ${new Date().toISOString()}`); this.onStatus?.('connected'); };
    channel.onmessage = ({ data }) => this.onAudio?.(data instanceof ArrayBuffer ? data : data.buffer || data);
    channel.onerror = (error) => {
      console.error(`[RR-DATA] error ${new Date().toISOString()}`, error);
      this.onStatus?.(`audio channel error: ${error.message || 'unknown error'}`);
      // Don't leave a dead channel referenced — sendAudio() checks
      // readyState, but keeping the stale object around masks the failure
      // in logs (bufferedAmount would still read a stale number instead of
      // undefined, hiding that nothing is actually being sent anymore).
      if (this.audioChannel === channel) this.audioChannel = null;
    };
    channel.onclose = () => {
      log(`[RR-DATA] close ${new Date().toISOString()}`);
      if (this.audioChannel === channel) this.audioChannel = null;
    };
  }

  async addTalkbackStream(stream) {
    if (!this.peer) throw new Error('RECORDING_SESSION_NOT_READY');
    // A leftover sender from a previous talkback toggle would otherwise sit
    // on the connection with a dead track, and addTrack() cannot reuse it —
    // it always opens a new transceiver, growing the SDP with a dead m-line
    // on every re-toggle. Clear stale senders first so toggling talkback
    // on/off/on stays a clean single audio line.
    if (this.talkbackSenders.length) this._clearTalkbackSenders();
    log(`[RR-TALKBACK] adding ${stream.getTracks().length} local track(s) ${new Date().toISOString()}`);
    this.talkbackSenders = stream.getTracks().map((track) => this.peer.addTrack(track, stream));
    this.hasOffered = false;
    await this.makeOffer();
    log(`[RR-TALKBACK] renegotiation offer sent ${new Date().toISOString()} signalingState=${this.peer.signalingState}`);
  }

  // Turning talkback off removes the sender and renegotiates, rather than
  // just stopping the local track — otherwise the dead sender lingers on the
  // connection and the next addTrack() opens a second, competing audio line
  // instead of reusing a clean one.
  async removeTalkbackStream() {
    if (!this.peer || !this.talkbackSenders.length) return;
    this._clearTalkbackSenders();
    this.hasOffered = false;
    await this.makeOffer();
  }

  _clearTalkbackSenders() {
    this.talkbackSenders.forEach((sender) => {
      try { this.peer.removeTrack(sender); } catch { /* connection may already be gone */ }
    });
    this.talkbackSenders = [];
  }

  async signal(message) {
    if (!this.peer) return;
    if (message.type === 'description') {
      await this.peer.setRemoteDescription(message.description);
      for (const candidate of this.pendingCandidates.splice(0)) await this.peer.addIceCandidate(candidate);
      if (message.description.type === 'offer') {
        const answer = await this.peer.createAnswer();
        await this.peer.setLocalDescription(answer);
        await this.sendSignal({ type: 'description', description: this.peer.localDescription });
      }
    } else if (message.type === 'candidate') {
      if (this.peer.remoteDescription) await this.peer.addIceCandidate(message.candidate);
      else this.pendingCandidates.push(message.candidate);
    }
  }

  sendAudio(bytes) {
    if (this.audioChannel?.readyState !== 'open' || this.audioChannel.bufferedAmount > 256 * 1024) return;
    this.audioChannel.send(bytes);
  }

  sendSignal(data) { return this.channel.send({ type: 'broadcast', event: 'signal', payload: { to: this.otherRole, data } }); }
  sendControl(data) { return this.channel.send({ type: 'broadcast', event: 'control', payload: { to: this.otherRole, ...data } }); }

  leave() {
    this.closed = true;
    this.audioChannel?.close();
    if (this.peer) this._clearTalkbackSenders();
    this.peer?.close();
    if (this.channel) this.supabase.removeChannel(this.channel);
    this.audioChannel = null;
    this.peer = null;
    this.channel = null;
  }
}
