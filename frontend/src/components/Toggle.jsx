import React from 'react';

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 flex-none rounded-full border-2 p-0.5 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 ${checked ? 'border-primary bg-primary' : 'border-border bg-muted/70'}`}
    >
      <span className={`block h-5 w-5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.55)] transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

export default Toggle;
