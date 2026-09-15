import React, { useEffect, useRef, useState } from 'react';
import ProducerView from './ProducerView';
import PerformerView from './PerformerView';
import RendererTransport from '../transport/rendererTransport';
import { createPcmContext, createPcmInput, createPcmOutput } from '../transport/pcmAudio';

const CAPTURE_CONSTRAINTS = {
  audio: { sampleRate: 48000, channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false, latency: 0, suppressLocalAudioPlayback: true },
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
  const [monitorPaused, setMonitorPaused] = useState(false);
  const [takes, setTakes] = useState([]);
  const [minimized, setMinimized] = useState(false);
  const [talkbackActive, setTalkbackActive] = useState(false);
  const roleRef = useRef(null);
  const recordingRef = useRef(false);
  const monitorPausedRef = useRef(false);
  const connecting = useRef(false);
  const transport = useRef(null);
  const context = useRef(null);
  const inputNode = useRef(null);
  const outputNode = useRef(null);
  const mediaStream = useRef(null);
  const talkbackStream = useRef(null);
  const talkbackAudio = useRef(null);

  useEffect(() => {
    window.electronAPI.rrNativeStatus?.().then((result) => setReady(Boolean(result?.ready))).catch(() => setStatus('Recording IPC is unavailable.'));
    return () => {
      inputNode.current?.disconnect();
      mediaStream.current?.getTracks().forEach((track) => track.stop());
      transport.current?.leave();
      context.current?.close();
      talkbackStream.current?.getTracks().forEach((track) => track.stop());
      talkbackAudio.current?.remove();
      window.electronAPI.rrLeaveSession?.();
    };
  }, []);

  const handleAudio = (data) => {
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    if (!monitorPausedRef.current) outputNode.current?.push(bytes);
    window.electronAPI.rrWriteStreamChunk?.(bytes.slice());
    console.log(`[RR-RECEIVER] Received PCM chunk: ${bytes.byteLength} bytes`);
  };

  const handleControl = async (control) => {
    if (roleRef.current !== 'performer') return;
    if (control.type === 'start' && !recordingRef.current) await start();
    if (control.type === 'stop' && recordingRef.current) await stop();
  };

  const create = async (nextRole, requestedId) => {
    if (connecting.current || transport.current) return;
    connecting.current = true;
    setIsConnecting(true);
    try {
      const nextId = requestedId || `${projectId}-${Date.now()}`;
      const response = await fetch('http://localhost:5000/api/config/remote-recording', { credentials: 'include' });
      if (!response.ok) throw new Error('Could not load recording configuration');
      const config = await response.json();
      if (nextRole === 'performer') {
        mediaStream.current = await navigator.mediaDevices.getUserMedia(CAPTURE_CONSTRAINTS);
        const track = mediaStream.current.getAudioTracks()[0];
        console.log('[RR-CAPTURE] getUserMedia resolved', { requested: CAPTURE_CONSTRAINTS.audio, settings: track.getSettings(), constraints: track.getConstraints(), capabilities: track.getCapabilities?.() });
      }
      const next = new RendererTransport({ sessionId: nextId, role: nextRole, ...config, onStatus: (value) => { setStatus(value); setConnected(value === 'connected'); console.log(`[RR] Peer status ${new Date().toISOString()}: ${value}`); }, onAudio: handleAudio, onControl: handleControl, onTalkback: (stream) => { const audio = new Audio(); audio.autoplay = true; audio.srcObject = stream; talkbackAudio.current = audio; audio.play().catch(() => {}); } });
      await next.start();
      transport.current = next;
      context.current = await createPcmContext();
      await context.current.resume();
      if (nextRole === 'producer') {
        outputNode.current = createPcmOutput(context.current);
        outputNode.current.node.connect(context.current.destination);
      } else {
        const source = context.current.createMediaStreamSource(mediaStream.current);
        inputNode.current = createPcmInput(context.current, (chunk) => {
          if (!recordingRef.current) return;
          window.electronAPI.rrWriteMasterChunk(chunk);
          transport.current?.sendAudio(chunk);
          inputNode.current.chunkCount = (inputNode.current.chunkCount || 0) + 1;
          if (inputNode.current.chunkCount % 50 === 0) console.log(`[RR-SENDER] Chunk ${inputNode.current.chunkCount}: ${chunk.byteLength} bytes; DataChannel bufferedAmount=${transport.current?.audioChannel?.bufferedAmount}`);
        });
        const silent = context.current.createGain();
        silent.gain.value = 0;
        source.connect(inputNode.current).connect(silent).connect(context.current.destination);
      }
      roleRef.current = nextRole;
      setRole(nextRole); setSessionId(nextId); setStatus(nextRole === 'producer' ? 'Waiting for performer' : 'Connecting');
    } catch (error) {
      console.error('[RR] create() failed:', error);
      setStatus(error.message || 'Could not start session.');
      transport.current?.leave(); transport.current = null;
    } finally { connecting.current = false; setIsConnecting(false); }
  };

  const start = async () => {
    if (roleRef.current === 'performer') await window.electronAPI.rrStartMasterRecording({ takeNumber, projectId });
    else { await window.electronAPI.rrStartStreamRecording({ takeNumber }); await transport.current?.sendControl({ type: 'start', takeNumber }); }
    recordingRef.current = true; setRecording(true); setStatus('Recording');
  };

  const stop = async () => {
    const result = roleRef.current === 'performer' ? await window.electronAPI.rrStopMasterRecording() : (await transport.current?.sendControl({ type: 'stop' }), await window.electronAPI.rrStopStreamRecording());
    if (result?.path) setTakes((current) => [...current, { path: result.path, replayUrl: `file://${result.path}`, number: takeNumber }]);
    recordingRef.current = false; setRecording(false); setTakeNumber((value) => value + 1); setStatus('Take complete');
  };

  const closeOrMinimize = () => { if (recordingRef.current) setMinimized(true); else onClose(); };
  const toggleTalkback = async () => {
    if (talkbackActive) {
      talkbackStream.current?.getTracks().forEach((track) => track.stop());
      talkbackStream.current = null;
      setTalkbackActive(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 48000, channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
      talkbackStream.current = stream;
      await transport.current?.addTalkbackStream(stream);
      setTalkbackActive(true);
    } catch (error) { setStatus(error.message || 'Talkback unavailable.'); }
  };
  if (minimized) return <div className="fixed bottom-4 right-4 z-[140] flex items-center gap-3 border border-border bg-card px-4 py-3 shadow-xl"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" /><span className="text-xs text-foreground">Recording session active</span><button onClick={() => setMinimized(false)} className="text-xs text-primary">Open studio</button></div>;
  return <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-4" onMouseDown={(event) => event.target === event.currentTarget && closeOrMinimize()}><section className="w-full max-w-md border border-border bg-card p-6"><header className="mb-6 flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[0.2em] text-primary">Remote recording</p><h2 className="mt-1 text-xl font-semibold text-foreground">Studio session</h2></div><div className="flex gap-2"><button onClick={() => setMinimized(true)} aria-label="Minimize" className="text-muted-foreground">−</button><button onClick={closeOrMinimize} aria-label="Close" className="text-muted-foreground">×</button></div></header>{!role ? <div className="space-y-3"><button disabled={!ready || isConnecting} onClick={() => create('producer')} className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">{isConnecting ? 'Connecting…' : 'Start as producer'}</button><div className="text-center text-xs text-muted-foreground">or join an existing session</div><input disabled={!ready || isConnecting} value={joinId} onChange={(event) => setJoinId(event.target.value)} placeholder="Paste session ID" className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground" /><button disabled={!ready || isConnecting || !joinId.trim()} onClick={() => create('performer', joinId.trim())} className="w-full border border-primary/40 px-4 py-3 text-sm text-primary disabled:opacity-40">{isConnecting ? 'Connecting…' : 'Join as performer'}</button></div> : <><div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground"><span className={`h-2 w-2 rounded-full ${connected ? 'bg-success' : 'bg-primary'}`} />{status}</div>{role === 'producer' ? <ProducerView sessionId={sessionId} onStart={start} onStop={stop} recording={recording} /> : <PerformerView onStart={start} onStop={stop} recording={recording} />}{role === 'producer' && <div className="mt-5 space-y-3 border-t border-border pt-4"><button onClick={() => { const next = !monitorPaused; monitorPausedRef.current = next; setMonitorPaused(next); outputNode.current?.setPaused(next); }} className="w-full border border-border px-3 py-2 text-xs text-muted-foreground">{monitorPaused ? 'Resume live monitor' : 'Pause live monitor'}</button>{takes.map((take) => <div key={`${take.number}-${take.path}`} className="flex items-center gap-2"><span className="flex-1 text-xs text-muted-foreground">Take {take.number}</span><audio controls src={`file://${take.path}`} className="max-w-[190px]" /><button onClick={() => window.electronAPI.rrDeleteAudioFile(take.path).then(() => setTakes((current) => current.filter((item) => item.path !== take.path)))} className="text-xs text-destructive">Delete</button></div>)}</div>}</>}</section></div>;
}
