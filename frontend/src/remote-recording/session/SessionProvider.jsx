import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import RendererTransport from '../transport/rendererTransport';
import { createPcmContext, createPcmInput, createPcmOutput } from '../transport/pcmAudio';
import { meterPosition, peakFromPcm, rmsFromPcm, toDbfs } from '../audio/levels';
import { ensureProjectFolder, pushTakeToProject } from './pushTake';

// ── Why the session lives here and not in the studio page ───────────────────
// The studio is a route. A route unmounts the moment someone navigates away,
// and a session cannot survive its own view being unmounted — the peer
// connection, the AudioContext and the open mic would all go down with it.
// So the session engine is mounted above the router and the studio page is
// only a window onto it. Walking out of the studio leaves the room running,
// exactly like stepping out of a control room mid-session.
// ────────────────────────────────────────────────────────────────────────────

const SessionContext = createContext(null);

export const useSession = () => {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
};

// Every processing stage a browser normally applies to a microphone is a
// mastering decision made without the producer. Echo cancellation, noise
// suppression and auto gain all rewrite the performance. A studio capture
// chain takes the mic as it is and leaves those calls to the producer.
const MIC_CONSTRAINTS = {
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

// Talkback is speech into someone's headphones, not a recording. Here the
// browser cleanup is wanted: it keeps the control-room monitors out of the
// performer cue mix.
const TALKBACK_CONSTRAINTS = {
  audio: {
    sampleRate: 48000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: false,
};

const EMPTY_LEVEL = { rms: 0, peak: 0, db: -60, position: 0 };

// Internal failures come back as short error codes (SIGNALING_TIMEOUT,
// MASTER_RECORDING_IN_PROGRESS, and so on) — useful in the console, never
// something a producer should see on screen. This maps every known code to
// plain wording, and anything unrecognized falls back to a generic message
// rather than ever showing raw error text in the studio.
const FRIENDLY_ERRORS = {
  SIGNALING_CONFIG_MISSING: 'Could not reach the studio. Check your connection and try again.',
  SIGNALING_TIMEOUT: 'The connection timed out. Check your connection and try again.',
  SIGNALING_TIMED_OUT: 'The connection timed out. Try again in a moment.',
  SIGNALING_CHANNEL_ERROR: 'The connection failed. Try again in a moment.',
  RECORDING_SESSION_NOT_READY: 'The room is not ready yet. Wait a moment and try again.',
  MASTER_RECORDING_IN_PROGRESS: 'A take is already recording.',
  STREAM_RECORDING_IN_PROGRESS: 'A take is already recording.',
  PROJECT_FOLDER_NOT_LINKED: 'Choose a project folder before pushing this take.',
  INVALID_AUDIO_PATH: 'This take could not be found.',
  AUDIO_FILE_TOO_LARGE: 'This take is too large to open.',
  AUDIO_PATH_NOT_ALLOWED: 'This take could not be opened.',
  FOLDER_SELECTION_CANCELLED: 'Choose a project folder to push this take.',
  FOLDER_SELECTION_NOT_AVAILABLE: 'Folder selection is not available right now. Try restarting the app.',
  SYNC_IN_PROGRESS: 'A backup is already in progress. Try again in a moment.',
  PUSH_FAILED: 'Could not back up this take. Check your connection and try again.',
};

const friendlyError = (error, fallback) => {
  const raw = String(error?.message || '');
  const match = Object.keys(FRIENDLY_ERRORS).find((code) => raw.includes(code));
  return match ? FRIENDLY_ERRORS[match] : fallback;
};

// A blob: URL, not a data: URI. rr-read-audio-file hands back a base64
// string; atob() is the plain, standard way to turn that into raw bytes in
// the browser, and a Blob is what a media element wants to play — a
// seekable, first-class resource, not a multi-megabyte string glued into a
// src attribute (which is the known-flaky part this replaces).
const base64ToReplayUrl = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
  console.log(`[RR-PLAYBACK] built replay url from ${bytes.length} bytes`);
  return url;
};

export function SessionProvider({ children }) {
  // ── Room state ────────────────────────────────────────────────────────────
  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [side, setSide] = useState(null);          // 'producer' | 'performer'
  const [sessionKey, setSessionKey] = useState('');
  const [patched, setPatched] = useState(false);   // peer link is up
  const [patching, setPatching] = useState(false);
  const [rolling, setRolling] = useState(false);   // a take is running
  const [takeNumber, setTakeNumber] = useState(1);
  const [takes, setTakes] = useState([]);
  const [status, setStatus] = useState('');
  const [fault, setFault] = useState(null);
  const [ready, setReady] = useState(false);       // recording IPC is available
  const [monitorMuted, setMonitorMuted] = useState(false);
  const [talkbackOpen, setTalkbackOpen] = useState(false);
  const [signalPresent, setSignalPresent] = useState(false);
  const [level, setLevel] = useState(EMPTY_LEVEL);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [busyTake, setBusyTake] = useState(false);
  const [pushingTakeId, setPushingTakeId] = useState(null);

  // ── Live handles (refs, because the audio path must not chase renders) ────
  const sideRef = useRef(null);
  const rollingRef = useRef(false);
  const monitorMutedRef = useRef(false);
  const patchingRef = useRef(false);
  const projectIdRef = useRef(null);
  const folderPathRef = useRef(null);
  const transport = useRef(null);
  const audioContext = useRef(null);
  const inputNode = useRef(null);
  const outputNode = useRef(null);
  const micStream = useRef(null);
  const talkbackStream = useRef(null);
  const talkbackElement = useRef(null);
  const rolledAt = useRef(null);
  const signalTimer = useRef(null);
  const meterFrame = useRef(null);
  const pendingLevel = useRef(EMPTY_LEVEL);
  const rollRef = useRef(null);
  const stopRef = useRef(null);

  useEffect(() => {
    window.electronAPI?.rrNativeStatus?.()
      .then((result) => setReady(Boolean(result?.ready)))
      .catch(() => setFault('Your recording setup could not be reached. Try restarting the app.'));
  }, []);

  // Meters update on animation frames rather than on every audio chunk. Chunks
  // arrive roughly every 2.7ms at 48k/128 frames; re-rendering React that
  // often would starve the audio path it is trying to display.
  const publishLevel = useCallback((bytes) => {
    const rms = rmsFromPcm(bytes);
    const peak = peakFromPcm(bytes);
    const db = toDbfs(peak);
    pendingLevel.current = { rms, peak, db, position: meterPosition(db) };
    if (meterFrame.current) return;
    meterFrame.current = requestAnimationFrame(() => {
      meterFrame.current = null;
      setLevel(pendingLevel.current);
    });
  }, []);

  const markSignal = useCallback(() => {
    setSignalPresent(true);
    clearTimeout(signalTimer.current);
    signalTimer.current = setTimeout(() => setSignalPresent(false), 700);
  }, []);

  // ── Take clock ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!rolling) return undefined;
    const timer = setInterval(() => {
      setElapsedMs(rolledAt.current ? Date.now() - rolledAt.current : 0);
    }, 100);
    return () => clearInterval(timer);
  }, [rolling]);

  // ── Incoming performance (control room) ───────────────────────────────────
  const handleIncomingAudio = useCallback((data) => {
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    // Meters read the arriving signal, not the monitor bus, so dimming the
    // monitors never makes it look like the performer stopped singing.
    publishLevel(bytes);
    markSignal();
    // Playback is continuous the moment the room is patched — a control
    // room hears the booth the whole time, not only once tape is rolling.
    // The safety capture to disk is the part that is actually "the take",
    // so that alone stays gated to when a take is really running.
    if (!monitorMutedRef.current) outputNode.current?.push(bytes);
    if (rollingRef.current) window.electronAPI.rrWriteStreamChunk?.(bytes.slice());
  }, [publishLevel, markSignal]);

  // ── Remote transport control (live room follows the control room) ─────────
  // Routed through refs because roll/stopTake are defined below and the
  // transport is handed this callback while it is being constructed.
  const handleControl = useCallback(async (control) => {
    if (sideRef.current !== 'performer') return;
    if (control.type === 'start' && !rollingRef.current) await rollRef.current?.();
    if (control.type === 'stop' && rollingRef.current) await stopRef.current?.();
  }, []);

  const teardown = useCallback(() => {
    cancelAnimationFrame(meterFrame.current);
    meterFrame.current = null;
    clearTimeout(signalTimer.current);
    inputNode.current?.disconnect();
    inputNode.current = null;
    outputNode.current = null;
    micStream.current?.getTracks().forEach((track) => track.stop());
    micStream.current = null;
    talkbackStream.current?.getTracks().forEach((track) => track.stop());
    talkbackStream.current = null;
    talkbackElement.current?.remove();
    talkbackElement.current = null;
    transport.current?.leave();
    transport.current = null;
    audioContext.current?.close().catch(() => {});
    audioContext.current = null;
    window.electronAPI?.rrLeaveSession?.();
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  // ── Load in ───────────────────────────────────────────────────────────────
  // Walking into the room and patching in are the same move. The producer
  // opens a room and gets a session key to hand out; the performer walks into
  // a room that already exists.
  const loadIn = useCallback(async (nextSide, options = {}) => {
    if (patchingRef.current || sideRef.current || transport.current) return;
    patchingRef.current = true;
    setPatching(true);
    setFault(null);

    const project = options.projectId ?? projectIdRef.current;
    const key = options.sessionKey?.trim() || `${project}-${Date.now()}`;

    try {
      sideRef.current = nextSide;
      projectIdRef.current = project;
      setProjectId(project);
      if (options.projectName) setProjectName(options.projectName);
      setSide(nextSide);
      setSessionKey(key);

      // A take always lands first in a per-project vault, not the project
      // folder itself — see TakeManager. The linked folder only matters once
      // a take is actually pushed, so its absence here is never a blocker.
      folderPathRef.current = null;
      if (project && window.electronAPI?.getFolderPath) {
        folderPathRef.current = await window.electronAPI.getFolderPath(project).catch(() => null);
      }

      // A solo session is one person, alone, self-operating — there is no
      // counterpart to patch into, so it skips signaling and WebRTC
      // entirely and is simply "patched" the moment the mic opens.
      if (nextSide === 'solo') {
        setStatus('Opening the mic…');
        micStream.current = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
        audioContext.current = await createPcmContext();
        await audioContext.current.resume();
        const source = audioContext.current.createMediaStreamSource(micStream.current);
        inputNode.current = createPcmInput(audioContext.current, (chunk) => {
          publishLevel(chunk);
          if (!rollingRef.current) return;
          window.electronAPI.rrWriteMasterChunk(chunk);
        });
        // Never routed back to the speakers — headphones are how a solo
        // producer avoids hearing themselves a beat late while tracking.
        const silent = audioContext.current.createGain();
        silent.gain.value = 0;
        source.connect(inputNode.current).connect(silent).connect(audioContext.current.destination);
        setPatched(true);
        setStatus('Microphone ready. You can start recording.');
        return;
      }

      setStatus(nextSide === 'producer' ? 'Opening the room…' : 'Walking in…');

      const response = await fetch('http://localhost:5000/api/config/remote-recording', { credentials: 'include' });
      if (!response.ok) throw new Error('Could not reach the studio. Check that you are signed in.');
      const config = await response.json();

      if (nextSide === 'performer') {
        setStatus('Opening the mic…');
        micStream.current = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
      }

      const next = new RendererTransport({
        sessionId: key,
        role: nextSide,
        ...config,
        onStatus: (value) => {
          if (value === 'connected') {
            setPatched(true);
            setStatus(nextSide === 'producer' ? 'Performer is in the booth' : 'Patched into the control room');
          } else if (value === 'disconnected') {
            setPatched(false);
            setStatus('Connection lost. Reconnecting…');
          } else {
            setStatus(value);
          }
        },
        onAudio: handleIncomingAudio,
        onControl: handleControl,
        onTalkback: (stream) => {
          talkbackElement.current?.remove();
          const element = new Audio();
          element.autoplay = true;
          element.srcObject = stream;
          // Attached to the document rather than left detached — a detached
          // media element can be reclaimed by the renderer's own cleanup in
          // ways a mounted one is not, and it costs nothing to be sure.
          element.style.display = 'none';
          document.body.appendChild(element);
          talkbackElement.current = element;
          element.play()
            .then(() => console.log('[RR-TALKBACK] remote audio playing'))
            .catch((error) => console.error('[RR-TALKBACK] play() rejected:', error));
        },
      });
      transport.current = next;
      await next.start();

      audioContext.current = await createPcmContext();
      await audioContext.current.resume();

      if (nextSide === 'producer') {
        outputNode.current = createPcmOutput(audioContext.current);
        outputNode.current.node.connect(audioContext.current.destination);
        setStatus('Room is open. Waiting for the performer to join.');
      } else {
        const source = audioContext.current.createMediaStreamSource(micStream.current);
        inputNode.current = createPcmInput(audioContext.current, (chunk) => {
          // Metering runs whether or not tape is rolling. A performer has to be
          // able to ring out the mic and set a level before the take starts.
          publishLevel(chunk);
          // The control room hears the booth continuously once patched — the
          // same way a real control room's monitors are live the whole
          // session, not only once tape rolls. Only the disk write is what
          // actually makes this "the take", so only that stays gated to
          // rolling; sending it onward for monitoring never is.
          transport.current?.sendAudio(chunk);
          if (!rollingRef.current) return;
          window.electronAPI.rrWriteMasterChunk(chunk);
        });
        // The worklet has to be pulled by the graph to run, but the performer
        // must never hear themselves back through the app speakers — that is
        // what the headphones are for, and routing it here would feed the room
        // straight back into the take.
        const silent = audioContext.current.createGain();
        silent.gain.value = 0;
        source.connect(inputNode.current).connect(silent).connect(audioContext.current.destination);
        setStatus('Microphone ready. Waiting for the control room to connect.');
      }
    } catch (error) {
      console.error('[RR] load in failed:', error);
      setFault(friendlyError(error, 'Could not open the session. Try again.'));
      setStatus('');
      teardown();
      sideRef.current = null;
      setSide(null);
      setSessionKey('');
      setPatched(false);
    } finally {
      patchingRef.current = false;
      setPatching(false);
    }
  }, [handleIncomingAudio, handleControl, publishLevel, teardown]);

  // ── Transport ─────────────────────────────────────────────────────────────
  const roll = useCallback(async () => {
    if (rollingRef.current || busyTake) return;
    setBusyTake(true);
    try {
      if (sideRef.current !== 'producer') {
        // Performer and solo both record locally to a master file — the
        // only difference is whether anyone is listening on the other end.
        await window.electronAPI.rrStartMasterRecording({
          takeNumber,
          projectId: projectIdRef.current,
        });
      } else {
        await window.electronAPI.rrStartStreamRecording({ takeNumber });
        await transport.current?.sendControl({ type: 'start', takeNumber });
      }
      rolledAt.current = Date.now();
      setElapsedMs(0);
      rollingRef.current = true;
      setRolling(true);
      setStatus('Rolling');
    } catch (error) {
      console.error('[RR] roll failed:', error);
      setFault(friendlyError(error, 'Could not start the take. Try again.'));
    } finally {
      setBusyTake(false);
    }
  }, [takeNumber, busyTake]);

  const stopTake = useCallback(async () => {
    if (!rollingRef.current) return;
    setBusyTake(true);
    const duration = rolledAt.current ? Date.now() - rolledAt.current : 0;
    // Stop the clock first so the transport reads as stopped while the file is
    // still being closed; a WAV header rewrite on a long take is not instant.
    rollingRef.current = false;
    setRolling(false);
    setStatus('Closing the take…');
    const number = takeNumber;
    try {
      let result;
      if (sideRef.current !== 'producer') {
        result = await window.electronAPI.rrStopMasterRecording();
      } else {
        await transport.current?.sendControl({ type: 'stop' });
        result = await window.electronAPI.rrStopStreamRecording();
      }
      if (result?.path) {
        const base64 = await window.electronAPI.rrReadAudioFile(result.path);
        const replayUrl = base64ToReplayUrl(base64);
        setTakes((current) => [
          {
            id: result.path,
            number,
            path: result.path,
            fileName: result.fileName || result.path.split(/[\\/]/).pop(),
            replayUrl,
            durationMs: duration,
            // Every fresh take starts in the vault, reviewable but not yet
            // in the project — pushing it is a deliberate action, not
            // something that happens automatically on stop.
            keptWithProject: false,
            pushed: false,
            source: sideRef.current === 'producer' ? 'monitor' : 'master',
            createdAt: Date.now(),
          },
          ...current,
        ]);
      }
      setTakeNumber((value) => value + 1);
      setStatus('Take complete');
    } catch (error) {
      console.error('[RR] stop failed:', error);
      setFault(friendlyError(error, 'The take did not save properly. Check your last recording before continuing.'));
    } finally {
      setElapsedMs(0);
      setBusyTake(false);
    }
  }, [takeNumber]);

  rollRef.current = roll;
  stopRef.current = stopTake;

  // Dimming the monitors. The take keeps rolling and the meters keep reading —
  // this is the control-room speakers and nothing else.
  const toggleMonitor = useCallback(() => {
    const next = !monitorMutedRef.current;
    monitorMutedRef.current = next;
    setMonitorMuted(next);
    outputNode.current?.setPaused(next);
  }, []);

  const toggleTalkback = useCallback(async () => {
    if (talkbackOpen) {
      console.log('[RR-TALKBACK] closing local talkback mic');
      await transport.current?.removeTalkbackStream();
      talkbackStream.current?.getTracks().forEach((track) => track.stop());
      talkbackStream.current = null;
      setTalkbackOpen(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(TALKBACK_CONSTRAINTS);
      console.log('[RR-TALKBACK] local mic opened', stream.getAudioTracks().map((track) => track.label));
      talkbackStream.current = stream;
      await transport.current?.addTalkbackStream(stream);
      setTalkbackOpen(true);
    } catch (error) {
      console.error('[RR-TALKBACK] could not open:', error);
      setFault(friendlyError(error, 'Talkback could not connect. Try again.'));
    }
  }, [talkbackOpen]);

  const discardTake = useCallback(async (take) => {
    await window.electronAPI.rrDeleteAudioFile(take.path);
    if (take.replayUrl) URL.revokeObjectURL(take.replayUrl);
    setTakes((current) => current.filter((item) => item.id !== take.id));
  }, []);

  // The deliberate step the vault exists for: move the chosen take out of
  // local review and into the project, then run it through the exact same
  // backup pipeline every other project file already goes through. Every
  // side — control room, live room, solo — pushes a take the same way.
  const pushTake = useCallback(async (take) => {
    if (!take || take.pushed || pushingTakeId) return;
    setPushingTakeId(take.id);
    setFault(null);
    try {
      const folderPath = await ensureProjectFolder(projectIdRef.current);
      folderPathRef.current = folderPath;
      const moved = await window.electronAPI.rrPushTakeToFolder({
        vaultPath: take.path,
        folderPath,
        takeNumber: take.number,
      });
      if (!moved?.success) throw new Error('Could not move the take into the project folder.');
      await pushTakeToProject({ projectId: projectIdRef.current, folderPath });
      setTakes((current) => current.map((item) => (
        item.id === take.id
          ? { ...item, path: moved.path, fileName: moved.fileName, keptWithProject: true, pushed: true }
          : item
      )));
    } catch (error) {
      console.error('[RR] push take failed:', error);
      setFault(friendlyError(error, 'Could not push this take. Try again.'));
    } finally {
      setPushingTakeId(null);
    }
  }, [pushingTakeId]);

  // Leaving the room for good. Walking out of the studio route does not call
  // this — only shutting the session down does.
  const closeSession = useCallback(() => {
    teardown();
    sideRef.current = null;
    rollingRef.current = false;
    monitorMutedRef.current = false;
    setSide(null);
    setSessionKey('');
    setPatched(false);
    setRolling(false);
    // Each take's replay URL is a Blob URL — it holds its bytes in memory
    // until explicitly revoked, so leaving the room has to release the
    // whole rack, not just clear it off screen.
    setTakes((current) => {
      current.forEach((take) => { if (take.replayUrl) URL.revokeObjectURL(take.replayUrl); });
      return [];
    });
    setTakeNumber(1);
    setStatus('');
    setFault(null);
    setMonitorMuted(false);
    setTalkbackOpen(false);
    setLevel(EMPTY_LEVEL);
    setElapsedMs(0);
    setProjectId(null);
    setProjectName('');
    setPushingTakeId(null);
  }, [teardown]);

  const setProject = useCallback((id, name) => {
    projectIdRef.current = id;
    setProjectId(id);
    setProjectName(name || '');
  }, []);

  const value = useMemo(() => ({
    ready,
    projectId,
    projectName,
    side,
    sessionKey,
    patched,
    patching,
    rolling,
    busyTake,
    takeNumber,
    takes,
    status,
    fault,
    monitorMuted,
    talkbackOpen,
    signalPresent,
    level,
    elapsedMs,
    pushingTakeId,
    active: Boolean(side),
    setProject,
    clearFault: () => setFault(null),
    loadIn,
    roll,
    stopTake,
    toggleMonitor,
    toggleTalkback,
    discardTake,
    pushTake,
    closeSession,
  }), [
    ready, projectId, projectName, side, sessionKey, patched, patching, rolling, busyTake,
    takeNumber, takes, status, fault, monitorMuted, talkbackOpen, signalPresent, level,
    elapsedMs, pushingTakeId, setProject, loadIn, roll, stopTake, toggleMonitor, toggleTalkback,
    discardTake, pushTake, closeSession,
  ]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export default SessionProvider;
