import React from 'react';

const MODE_STYLES = {
  learning:  { icon: '🧠', label: 'Learning',  bg: 'rgba(74,158,255,.12)', color: '#4a9eff' },
  rest:      { icon: '🌙', label: 'Rest',      bg: 'rgba(106,106,255,.12)', color: '#6a6aff' },
  focus:     { icon: '🎯', label: 'Focus',     bg: 'rgba(232,160,32,.12)', color: '#e8a020' },
  sickness:  { icon: '🤒', label: 'Sick',      bg: 'rgba(232,80,80,.12)', color: '#e85050' },
  shelter:   { icon: '🛡️', label: 'Shelter',   bg: 'rgba(200,200,200,.12)', color: 'var(--ink-2)' },
  redirect:  { icon: '🔄', label: 'Redirect',  bg: 'rgba(200,200,200,.12)', color: 'var(--ink-2)' },
  offline:   { icon: '🔕', label: 'Away',      bg: 'rgba(200,200,200,.12)', color: 'var(--ink-2)' },
};

export function EnvironmentBadge({ mode, style, className }) {
  const m = MODE_STYLES[mode];
  if (!m || mode === 'normal') return null;

  return (
    <span className={className} style={{
      fontSize: 10.5,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      padding: '3px 10px',
      borderRadius: 99,
      background: m.bg,
      color: m.color,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {m.icon} {m.label}
    </span>
  );
}
