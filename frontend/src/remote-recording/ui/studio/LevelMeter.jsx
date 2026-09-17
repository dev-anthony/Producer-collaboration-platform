import React, { useEffect, useRef, useState } from 'react';

const SAFE = 'hsl(145 38% 46%)';
const HOT = 'hsl(38 88% 54%)';
const OVER = 'hsl(0 72% 54%)';

const SEGMENTS = 24;
const SCALE = [0, -6, -12, -18, -24, -36, -48, -60];

const bandFor = (db) => (db >= -3 ? OVER : db >= -12 ? HOT : SAFE);

export default function LevelMeter({ level, orientation = 'vertical', showScale = true, label, responsive = false }) {
  const [peakHold, setPeakHold] = useState(0);
  const [compact, setCompact] = useState(false);
  const holdRef = useRef({ value: 0, setAt: 0 });
  const frame = useRef(null);

  useEffect(() => {
    if (!responsive) return undefined;
    const media = window.matchMedia('(max-width: 1023px)');
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [responsive]);

  useEffect(() => {
    const position = level?.position || 0;
    if (position >= holdRef.current.value) {
      holdRef.current = { value: position, setAt: Date.now() };
      setPeakHold(position);
    }
  }, [level]);

  useEffect(() => {
    const decay = () => {
      const { value, setAt } = holdRef.current;
      if (value > 0 && Date.now() - setAt > 900) {
        const next = Math.max(0, value - 0.012);
        holdRef.current = { value: next, setAt };
        setPeakHold(next);
      }
      frame.current = requestAnimationFrame(decay);
    };
    frame.current = requestAnimationFrame(decay);
    return () => cancelAnimationFrame(frame.current);
  }, []);

  const position = level?.position || 0;
  const db = level?.db ?? -60;
  const lit = Math.round(position * SEGMENTS);
  const vertical = orientation === 'vertical' && !(responsive && compact);

  const segments = Array.from({ length: SEGMENTS }, (_, index) => {
    const ordinal = vertical ? SEGMENTS - 1 - index : index;
    const segmentDb = -60 + ((ordinal + 1) / SEGMENTS) * 60;
    const isLit = ordinal < lit;
    const isPeak = Math.round(peakHold * SEGMENTS) - 1 === ordinal && peakHold > 0;
    const colour = bandFor(segmentDb);
    return (
      <div
        key={ordinal}
        className={vertical ? 'w-full flex-1 rounded-[1px]' : 'h-full flex-1 rounded-[1px]'}
        style={{
          background: isPeak ? colour : isLit ? colour : 'hsl(0 0% 12%)',
          opacity: isPeak ? 1 : isLit ? 0.92 : 1,
          boxShadow: isLit || isPeak ? `0 0 6px ${colour}66` : 'none',
          transition: 'background 40ms linear',
        }}
      />
    );
  });

  return (
    <div className={vertical ? 'flex items-stretch gap-2' : 'w-full'}>
      <div className={vertical ? 'flex flex-col items-center gap-2' : 'flex flex-col gap-1.5'}>
        {label && (
          <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        )}
        <div
          className={
            vertical
              ? 'flex w-7 flex-1 flex-col gap-[2px] rounded-sm border border-border bg-black/60 p-1'
              : 'flex h-4 w-full gap-[2px] rounded-sm border border-border bg-black/60 p-1'
          }
        >
          {segments}
        </div>
        <span
          className="tabular-nums text-[10px] font-medium"
          style={{ color: db >= -3 ? OVER : db >= -12 ? HOT : 'hsl(0 0% 52%)' }}
        >
          {db <= -60 ? '−∞' : `${db.toFixed(1)}`}
        </span>
      </div>

      {vertical && showScale && (
        <div className="flex flex-col justify-between py-1 text-[9px] tabular-nums text-muted-foreground/70">
          {SCALE.map((mark) => (
            <span key={mark}>{mark}</span>
          ))}
        </div>
      )}
    </div>
  );
}
