import React from 'react';

export const FocusToggle = ({ focusMode, onClick }) => {
  const isActive = focusMode !== 'off';
  const colors = { learner: 'var(--info)', execution: 'var(--accent-coral)', custom: 'var(--accent-orange)' };
  const labels = { learner: 'L', execution: 'F', custom: 'C' };

  return (
    <button
      onClick={onClick}
      aria-label={`Focus mode: ${focusMode}`}
      title={`Focus: ${focusMode}`}
      style={{
        width: 36, height: 36, borderRadius: 10,
        background: isActive ? `${colors[focusMode]}22` : 'rgba(26,20,16,.04)',
        border: isActive ? `0.5px solid ${colors[focusMode]}44` : '0.5px solid transparent',
        color: isActive ? colors[focusMode] : 'var(--ink-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)',
        position: 'relative',
        transition: 'all 200ms ease',
      }}
    >
      {isActive ? labels[focusMode] : '⊝'}
      {isActive && (
        <div style={{
          position: 'absolute', top: -1, right: -1, width: 6, height: 6, borderRadius: '50%',
          background: colors[focusMode],
          boxShadow: `0 0 6px ${colors[focusMode]}`,
        }} />
      )}
    </button>
  );
};
