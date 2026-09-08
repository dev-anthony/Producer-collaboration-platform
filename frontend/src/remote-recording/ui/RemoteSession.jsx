import React, { useEffect, useRef, useState } from 'react';
import ProducerView from './ProducerView';
import PerformerView from './PerformerView';
import RendererTransport from '../transport/rendererTransport';
import { createPcmContext, createPcmOutput, createPcmSender } from '../transport/pcmAudio';

export default function RemoteSession({ projectId, onClose }) {
  const [role, setRole] = useState(null); const [sessionId, setSessionId] = useState(''); const [joinId, setJoinId] = useState('');
  const [connected, setConnected] = useState(false); const [recording, setRecording] = useState(false); const [takeNumber, setTakeNumber] = useState(1);
  const [devices, setDevices] = useState([]); const [selectedDevice, setSelectedDevice] = useState(-1); const [status, setStatus] = useState('Choose a role to begin.');
  const [testMode, setTestMode] = useState(false); const [testWav, setTestWav] = useState(''); const [ready, setReady] = useState(false);
  const transport = useRef(null); const context = useRef(null); const output = useRef(null); const sender = useRef(null); const audioListener = useRef(null);

  useEffect(() => {
    window.electronAPI.rrNativeStatus?.().then((result) => { setReady(Boolean(result?.nativeCapture || result?.testCapture)); if (result?.nativeCapture) window.electronAPI.rrListInputDevices().then(setDevices); }).catch(() => setStatus('Recording IPC is unavailable.'));
    return () => { audioListener.current?.(); transport.current?.leave(); context.current?.close(); window.electronAPI.rrLeaveSession?.(); };
  }, []);

  const handleAudio = (data) => { output.current?.push(data); window.electronAPI.rrWriteStreamChunk?.(data); };
  const handleControl = async (control) => { if (role !== 'performer') return; if (control.type === 'start' && !recording) await start(); if (control.type === 'stop' && recording) await stop(); };
  const create = async (nextRole, requestedId) => {
    const nextId = requestedId || `${projectId}-${Date.now()}`;
    const response = await fetch('http://localhost:5000/api/config/remote-recording', { credentials: 'include' }); if (!response.ok) throw new Error('Could not load recording configuration');
    const config = await response.json();
    if (nextRole === 'performer') { await window.electronAPI.rrEnableTestCapture(testMode); if (testMode) { if (!testWav) throw new Error('Select a test WAV first'); await window.electronAPI.rrSetTestWav(testWav); } }
    const next = new RendererTransport({ sessionId: nextId, role: nextRole, ...config, onStatus: (value) => { setStatus(value); setConnected(value === 'connected'); }, onAudio: handleAudio, onControl: handleControl });
    await next.start(); transport.current = next; context.current = await createPcmContext();
    if (nextRole === 'producer') { output.current = createPcmOutput(context.current); output.current.node.connect(context.current.destination); await window.electronAPI.rrStartStreamRecording({ takeNumber }); }
    else {
      sender.current = createPcmSender(context.current, (chunk) => transport.current?.sendAudio(chunk));
    }
    setRole(nextRole); setSessionId(nextId); setStatus(nextRole === 'producer' ? 'Waiting for performer' : 'Connecting');
  };
  const start = async () => {
    if (role === 'performer') { await window.electronAPI.rrSetDevice(selectedDevice); await window.electronAPI.rrStartRecording({ takeNumber, projectId }); audioListener.current = window.electronAPI.onRrAudioChunk((chunk) => sender.current?.push(chunk)); }
    else await transport.current?.sendControl({ type: 'start', takeNumber });
    setRecording(true); setStatus('Recording');
  };
  const stop = async () => { if (role === 'performer') { await window.electronAPI.rrStopRecording(); audioListener.current?.(); audioListener.current = null; } else { await transport.current?.sendControl({ type: 'stop' }); await window.electronAPI.rrStopStreamRecording(); } setRecording(false); setTakeNumber((value) => value + 1); setStatus('Take complete'); };

  return <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="w-full max-w-md border border-border bg-card p-6"><header className="mb-6 flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[0.2em] text-primary">Remote recording</p><h2 className="mt-1 text-xl font-semibold text-foreground">Studio session</h2></div><button onClick={onClose} aria-label="Close">×</button></header>{!role ? <div className="space-y-3"><label className="flex gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={testMode} onChange={(event) => setTestMode(event.target.checked)} /> Use WAV test capture</label>{testMode && <button onClick={async () => { const selected = await window.electronAPI.rrSelectTestWav(); if (selected) setTestWav(selected); }} className="w-full border border-border px-3 py-2 text-left text-xs text-muted-foreground">{testWav ? testWav.split(/[\\/]/).pop() : 'Select mono 48 kHz / 24-bit WAV'}</button>}<button disabled={!ready} onClick={() => create('producer')} className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">Start as producer</button><div className="text-center text-xs text-muted-foreground">or join an existing session</div><input disabled={!ready} value={joinId} onChange={(event) => setJoinId(event.target.value)} placeholder="Paste session ID" className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground" /><button disabled={!ready || !joinId.trim()} onClick={() => create('performer', joinId.trim())} className="w-full border border-primary/40 px-4 py-3 text-sm text-primary disabled:opacity-40">Join as performer</button></div> : <><div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground"><span className={`h-2 w-2 rounded-full ${connected ? 'bg-success' : 'bg-primary'}`} />{status}</div>{role === 'producer' ? <ProducerView sessionId={sessionId} onStart={start} onStop={stop} recording={recording} /> : <PerformerView devices={devices} selectedDevice={selectedDevice} onDeviceChange={setSelectedDevice} onStart={start} onStop={stop} recording={recording} />}</>}</section></div>;
}
