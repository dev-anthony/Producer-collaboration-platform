import { createClient } from '@supabase/supabase-js';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export default class RendererTransport {
  constructor({ sessionId, role, supabaseUrl, supabaseAnonKey, onAudio, onControl, onStatus }) {
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
    this.onAudio = onAudio;
    this.onControl = onControl;
    this.onStatus = onStatus;
    // Guards against duplicate offer/negotiation cycles caused by a stray
    // second 'peer-joined' broadcast (e.g. a double-mounted session or a
    // duplicate join click). Without this, a second offer can orphan the
    // first data channel mid-negotiation, which showed up as the producer's
    // channel opening then immediately erroring/closing while the performer
    // never saw ondatachannel fire at all.
    this.hasOffered = false;
    this.closed = false;
  }

  async start() {
    this.channel = this.supabase.channel(`rr-session-${this.sessionId}`)
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        if (payload.to !== this.role) return;
        if (this.peer) this.signal(payload.data);
        else this.pendingSignals.push(payload.data);
      })
      .on('broadcast', { event: 'peer-joined' }, ({ payload }) => {
        if (this.role === 'producer' && payload.role === 'performer' && !this.hasOffered) this.makeOffer();
      })
      .on('broadcast', { event: 'control' }, ({ payload }) => payload.to === this.role && this.onControl?.(payload));
    await new Promise((resolve, reject) => this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await this.channel.send({ type: 'broadcast', event: 'peer-joined', payload: { role: this.role } });
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('[RR-SIGNALING] Channel subscription failed:', { status, sessionId: this.sessionId, supabaseUrl: this.supabase.supabaseUrl });
        reject(new Error(`SIGNALING_${status}`));
      }
    }));
    this.peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peer.onicecandidate = ({ candidate }) => {
      console.log(`[RR-ICE] candidate ${new Date().toISOString()}`);
      if (candidate) this.sendSignal({ type: 'candidate', candidate });
    };
    this.peer.oniceconnectionstatechange = () => console.log(`[RR-ICE] state ${new Date().toISOString()}: ${this.peer.iceConnectionState}`);
    this.peer.onconnectionstatechange = () => {
      console.log(`[RR-PEER] connectionState ${new Date().toISOString()}: ${this.peer.connectionState}`);
      if (this.peer.connectionState === 'connected') this.onStatus?.('connected');
      if (['failed', 'closed', 'disconnected'].includes(this.peer.connectionState)) this.onStatus?.('disconnected');
    };
    this.peer.ondatachannel = ({ channel }) => {
      console.log(`[RR-DATA] ondatachannel fired ${new Date().toISOString()} label=${channel.label}`);
      this.attachAudio(channel);
    };
    if (this.role === 'producer') {
      this.attachAudio(this.peer.createDataChannel('rr-pcm', { ordered: false, maxRetransmits: 0 }));
    }
    for (const signal of this.pendingSignals.splice(0)) await this.signal(signal);
  }

  async makeOffer() {
    if (!this.peer || this.peer.signalingState !== 'stable' || this.hasOffered) return;
    // Set the flag before awaiting anything, so a second synchronous call
    // (e.g. a duplicate broadcast arriving before this promise resolves)
    // can't slip through and start a second negotiation.
    this.hasOffered = true;
    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);
    await this.sendSignal({ type: 'description', description: this.peer.localDescription });
  }

  attachAudio(channel) {
    this.audioChannel = channel;
    channel.binaryType = 'arraybuffer';
    channel.onopen = () => { console.log(`[RR-DATA] open ${new Date().toISOString()}`); this.onStatus?.('connected'); };
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
      console.log(`[RR-DATA] close ${new Date().toISOString()}`);
      if (this.audioChannel === channel) this.audioChannel = null;
    };
  }

  async addTalkbackStream(stream) {
    if (!this.peer) throw new Error('RECORDING_SESSION_NOT_READY');
    this.talkbackSenders = stream.getTracks().map((track) => this.peer.addTrack(track, stream));
    this.hasOffered = false;
    await this.makeOffer();
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
    this.talkbackSenders.forEach((sender) => this.peer?.removeTrack(sender));
    this.talkbackSenders = [];
    this.peer?.close();
    if (this.channel) this.supabase.removeChannel(this.channel);
    this.audioChannel = null;
    this.peer = null;
    this.channel = null;
  }
}
