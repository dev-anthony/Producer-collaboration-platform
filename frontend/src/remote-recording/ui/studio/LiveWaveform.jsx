import React, { useEffect, useRef } from 'react';

// The "tape is actually moving" strip. DAW integration — watching a take
// write straight into a timeline — is the next phase; this is what stands
// in for it until then. It draws a scrolling history of the real incoming
// level (the same RMS the meters already read, not a decorative animation),
// so a take rolling in the rack looks like something is genuinely being
// captured, the way it would look arriving in a DAW.
const HISTORY = 160;

export default function LiveWaveform({ level, height = 40 }) {
  const canvasRef = useRef(null);
  const historyRef = useRef(new Array(HISTORY).fill(0));

  useEffect(() => {
    historyRef.current.push(Math.min(1, level?.rms ? level.rms * 3.2 : 0));
    if (historyRef.current.length > HISTORY) historyRef.current.shift();
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  useEffect(() => { draw(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 1;
    const cssHeight = canvas.clientHeight || height;
    if (canvas.width !== width * ratio) canvas.width = width * ratio;
    if (canvas.height !== cssHeight * ratio) canvas.height = cssHeight * ratio;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, cssHeight);

    const history = historyRef.current;
    const step = width / HISTORY;
    const mid = cssHeight / 2;
    ctx.fillStyle = 'hsl(0 72% 58%)';
    history.forEach((value, index) => {
      const amplitude = Math.max(1.5, value * (cssHeight * 0.46));
      const x = index * step;
      ctx.fillRect(x, mid - amplitude, Math.max(1, step - 1), amplitude * 2);
    });
  };

  return <canvas ref={canvasRef} className="block w-full" style={{ height }} />;
}
