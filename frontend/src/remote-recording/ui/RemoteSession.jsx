import React, { useEffect, useRef, useState } from 'react';
import ProducerView from './ProducerView';
import PerformerView from './PerformerView';
import RendererTransport from '../transport/rendererTransport';
import { createPcmContext, createPcmInput, createPcmOutput } from '../transport/pcmAudio';

const CAPTURE_CONSTRAINTS = {
  audio: {
    sampleRate: 48000,
    channelCount: 1,
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    latency: 0,
    suppressLocalAudioPlayback: true,
  },
  video: false,
};

export default function RemoteSession({ projectId, onClose }) {
  const [role, setRole] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [joinId, setJoinId] = useState('');
  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [takeNumber, setTakeNumber] = useState(1);
  const [status, setStatus] = useState('Choose a role to begin.');
  const [ready, setReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const roleRef = useRef(null);
  const recordingRef = useRef(false);
  const transport = useRef(null);
  const context = useRef(null);
  const inputNode = useRef(null);
  const outputNode = useRef(null);
  const mediaStream = useRef(null);
  const audioListener = useRef(null);
  // Ref-based lock (not state) so it's checked synchronously — a fast
  // double click on "Start as producer" / "Join as performer" fires two
  // click handlers before the first `setIsConnecting(true)` re-render
  // lands, which was creating two RendererTransport instances (two
  // RTCPeerConnections, two getUserMedia calls, two Supabase clients) all
  // talking on the same signaling channel and racing each other's offers.
  const connecting = useRef(false);

  useEffect(() => {
    window.electronAPI.rrNativeStatus?.().then((result) => { setReady(Boolean(result?.ready)); }).catch(() => setStatus('Recording IPC is unavailable.'));
    return () => {
      audioListener.current?.();
      inputNode.current?.disconnect();
      mediaStream.current?.getTracks().forEach((track) => track.stop());
      transport.current?.leave();
      context.current?.close();
      window.electronAPI.rrLeaveSession?.();
    };
  }, []);

  const handleAudio = (data) => {
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    const backupChunk = bytes.slice();
    console.log(`[RR-RECEIVER] Received PCM chunk: ${bytes.byteLength} bytes`);
    outputNode.current?.push(bytes);
    window.electronAPI.rrWriteStreamChunk?.(backupChunk);
    window.dispatchEvent(new CustomEvent('prodcollab:rr-audio-received', { detail: { bytes: bytes.byteLength } }));
  };

  const handleControl = async (control) => {
    if (roleRef.current !== 'performer') return;
    if (control.type === 'start' && !recordingRef.current) await start();
    if (control.type === 'stop' && recordingRef.current) await stop();
  };

  const create = async (nextRole, requestedId) => {
    // Re-entrancy guard: block a second call while one is already in
    // flight, or once a transport already exists for this session.
    if (connecting.current || transport.current) return;
    connecting.current = true;
    setIsConnecting(true);
    try {
      const nextId = requestedId || `${projectId}-${Date.now()}`;
      const response = await fetch('http://localhost:5000/api/config/remote-recording', { credentials: 'include' });
      if (!response.ok) throw new Error('Could not load recording configuration');
      const config = await response.json();
      const next = new RendererTransport({
        sessionId: nextId,
        role: nextRole,
        ...config,
        onStatus: (value) => { setStatus(value); setConnected(value === 'connected'); console.log(`[RR] Peer status ${new Date().toISOString()}: ${value}`); },
        onAudio: handleAudio,
        onControl: handleControl,
      });
      await next.start();
      transport.current = next;
      context.current = await createPcmContext();
      await context.current.resume();
      if (nextRole === 'producer') {
        outputNode.current = createPcmOutput(context.current);
        outputNode.current.node.connect(context.current.destination);
      } else {
        mediaStream.current = await navigator.mediaDevices.getUserMedia(CAPTURE_CONSTRAINTS);
        const track = mediaStream.current.getAudioTracks()[0];
        console.log('[RR-CAPTURE] getUserMedia resolved', {
          requested: CAPTURE_CONSTRAINTS.audio,
          settings: track.getSettings(),
          constraints: track.getConstraints(),
          capabilities: track.getCapabilities?.(),
        });
        const source = context.current.createMediaStreamSource(mediaStream.current);
        inputNode.current = createPcmInput(context.current, (chunk) => {
          if (!recordingRef.current) return;
          window.electronAPI.rrWriteMasterChunk(chunk);
          transport.current?.sendAudio(chunk);
          inputNode.current.chunkCount = (inputNode.current.chunkCount || 0) + 1;
          if (inputNode.current.chunkCount % 50 === 0) console.log(`[RR-SENDER] Chunk ${inputNode.current.chunkCount}: ${chunk.byteLength} bytes; DataChannel bufferedAmount=${transport.current?.audioChannel?.bufferedAmount}`);
        });
        const silentSink = context.current.createGain();
        silentSink.gain.value = 0;
        source.connect(inputNode.current).connect(silentSink).connect(context.current.destination);
      }
      roleRef.current = nextRole;
      setRole(nextRole); setSessionId(nextId); setStatus(nextRole === 'producer' ? 'Waiting for performer' : 'Connecting');
    } catch (error) {
      console.error('[RR] create() failed:', error);
      setStatus(error?.message || 'Could not start session.');
      // Roll back so a retry is possible after a failed attempt.
      transport.current?.leave();
      transport.current = null;
    } finally {
      connecting.current = false;
      setIsConnecting(false);
    }
  };

  const start = async () => {
    if (roleRef.current === 'performer') {
      await window.electronAPI.rrStartMasterRecording({ takeNumber, projectId });
    } else {
      await window.electronAPI.rrStartStreamRecording({ takeNumber });
      await transport.current?.sendControl({ type: 'start', takeNumber });
    }
    recordingRef.current = true;
    setRecording(true); setStatus('Recording');
  };

  const stop = async () => {
    if (roleRef.current === 'performer') await window.electronAPI.rrStopMasterRecording();
    else { await transport.current?.sendControl({ type: 'stop' }); await window.electronAPI.rrStopStreamRecording(); }
    recordingRef.current = false;
    setRecording(false); setTakeNumber((value) => value + 1); setStatus('Take complete');
  };

  return <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="w-full max-w-md border border-border bg-card p-6"><header className="mb-6 flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[0.2em] text-primary">Remote recording</p><h2 className="mt-1 text-xl font-semibold text-foreground">Studio session</h2></div><button onClick={onClose} aria-label="Close">×</button></header>{!role ? <div className="space-y-3"><button disabled={!ready || isConnecting} onClick={() => create('producer')} className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">{isConnecting ? 'Connecting…' : 'Start as producer'}</button><div className="text-center text-xs text-muted-foreground">or join an existing session</div><input disabled={!ready || isConnecting} value={joinId} onChange={(event) => setJoinId(event.target.value)} placeholder="Paste session ID" className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground" /><button disabled={!ready || isConnecting || !joinId.trim()} onClick={() => create('performer', joinId.trim())} className="w-full border border-primary/40 px-4 py-3 text-sm text-primary disabled:opacity-40">{isConnecting ? 'Connecting…' : 'Join as performer'}</button></div> : <><div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground"><span className={`h-2 w-2 rounded-full ${connected ? 'bg-success' : 'bg-primary'}`} />{status}</div>{role === 'producer' ? <ProducerView sessionId={sessionId} onStart={start} onStop={stop} recording={recording} /> : <PerformerView onStart={start} onStop={stop} recording={recording} />}</>}</section></div>;
}
