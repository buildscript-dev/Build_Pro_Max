import React from 'react';
import { getContainerLayouts } from '../../services/canvasEngine';

const CONTAINER_LAYOUTS = getContainerLayouts();

const TOOLS = [
  { id: 'select',      icon: '⬆',  label: 'Select' },
  { id: 'hand',        icon: '✋',  label: 'Pan' },
  null,
  { id: 'pen',         icon: '✏️',  label: 'Pen' },
  { id: 'marker',      icon: '🖍️',  label: 'Marker' },
  { id: 'highlighter', icon: '🖌️',  label: 'Highlighter' },
  null,
  { id: 'text',        icon: 'T',   label: 'Text', style: { fontWeight: 700, fontSize: 16, fontFamily: 'serif' } },
  { id: 'sticky',      icon: '📋',  label: 'Sticky note' },
  { id: 'image',       icon: '🖼',  label: 'Image' },
  { id: 'connector',   icon: '↗',   label: 'Connector', style: { fontSize: 18 } },
  null, // container section header
  ...CONTAINER_LAYOUTS.map(l => ({
    id: `container-${l.id}`,
    icon: l.icon,
    label: l.label,
    title: l.desc,
    containerLayout: true,
  })),
];

const COLORS = ['#374151', '#e85050', '#e8a020', '#4a9eff', '#6a6aff', '#22c55e', '#ec4899', '#000000'];

export function CanvasToolbar({ tool, onToolChange, activeColor, onColorChange, activeWidth, onWidthChange, zoom, onZoomIn, onZoomOut, onResetView, elementCount, connectorCount }) {
  return (
    <>
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 50,
        display: 'flex', flexDirection: 'column', gap: 4,
        padding: 6, borderRadius: 12,
        background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(12px)',
        boxShadow: '0 2px 12px rgba(0,0,0,.1), 0 0 0 0.5px rgba(0,0,0,.05)',
      }}>
        {TOOLS.map((t, i) => t === null ? (
          <div key={`sep-${i}`} style={{ width: '100%', height: 1, background: 'var(--ink-line)', margin: '3px 0' }} />
        ) : (
          <button
            key={t.id}
            onClick={() => onToolChange(t.id)}
            title={t.title || t.label}
            style={{
              width: t.containerLayout ? 34 : 34,
              height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              background: tool === t.id ? 'rgba(99,102,241,.12)' : t.containerLayout ? 'rgba(0,0,0,.02)' : 'transparent',
              color: tool === t.id ? '#6366f1' : 'var(--ink-2)',
              fontSize: t.containerLayout ? 14 : 15, ...(t.style || {}),
              transition: 'all 100ms ease',
              opacity: t.containerLayout && tool !== t.id && !tool.startsWith('container-') ? 0.6 : 1,
            }}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 50,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
        padding: '8px 10px', borderRadius: 12,
        background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(12px)',
        boxShadow: '0 2px 12px rgba(0,0,0,.1), 0 0 0 0.5px rgba(0,0,0,.05)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {Math.round(zoom * 100)}%
        </div>
        <button onClick={onZoomIn} style={{ width: 28, height: 28, borderRadius: 6, border: '0.5px solid var(--ink-line)', cursor: 'pointer', background: '#fff', fontSize: 16, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
        <button onClick={onZoomOut} style={{ width: 28, height: 28, borderRadius: 6, border: '0.5px solid var(--ink-line)', cursor: 'pointer', background: '#fff', fontSize: 16, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
        <button onClick={onResetView} style={{ width: 28, height: 28, borderRadius: 6, border: '0.5px solid var(--ink-line)', cursor: 'pointer', background: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Reset view">
          ⊞
        </button>
      </div>

      {(tool === 'pen' || tool === 'marker' || tool === 'highlighter') && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 16px', borderRadius: 99,
          background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(12px)',
          boxShadow: '0 2px 12px rgba(0,0,0,.1), 0 0 0 0.5px rgba(0,0,0,.05)',
        }}>
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              style={{
                width: activeColor === c ? 22 : 18,
                height: activeColor === c ? 22 : 18,
                borderRadius: '50%', border: activeColor === c ? '2.5px solid #6366f1' : '2px solid transparent',
                background: c, cursor: 'pointer', transition: 'all 100ms ease',
              }}
            />
          ))}
          <div style={{ width: 1, height: 20, background: 'var(--ink-line)' }} />
          {[2, 4, 8, 14].map(w => (
            <button
              key={w}
              onClick={() => onWidthChange(w)}
              style={{
                width: 24, height: 24, borderRadius: 6, border: activeWidth === w ? '1.5px solid #6366f1' : '1px solid var(--ink-line)',
                background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{
                width: Math.min(w, 12), height: Math.min(w, 12),
                borderRadius: '50%', background: activeColor || '#374151',
              }} />
            </button>
          ))}
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: 16, right: 16, zIndex: 50,
        fontSize: 11, color: 'var(--ink-3)', background: 'rgba(255,255,255,.7)',
        padding: '4px 10px', borderRadius: 6, backdropFilter: 'blur(4px)',
      }}>
        {elementCount} element{elementCount !== 1 ? 's' : ''}
        {connectorCount > 0 ? ` · ${connectorCount} connector${connectorCount !== 1 ? 's' : ''}` : ''}
      </div>
    </>
  );
}
