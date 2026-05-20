import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, memo } from 'react';

// ─── Utilities ────────────────────────────────────────────────────────────────
function genId() { return Math.random().toString(36).slice(2, 9); }

// ─── Container type registry ──────────────────────────────────────────────────
export const CONTAINER_TYPES = [
  { type: 'title',   icon: 'T',    label: 'Title',   defaultW: 480, defaultH: 90  },
  { type: 'text',    icon: '¶',    label: 'Text',    defaultW: 360, defaultH: 200 },
  { type: 'sticky',  icon: '📌',   label: 'Sticky',  defaultW: 260, defaultH: 220 },
  { type: 'image',   icon: '🖼',   label: 'Image',   defaultW: 320, defaultH: 260 },
  { type: 'code',    icon: '</>',  label: 'Code',    defaultW: 400, defaultH: 220 },
  { type: 'todo',    icon: '☐',    label: 'To-do',   defaultW: 300, defaultH: 210 },
  { type: 'divider', icon: '—',    label: 'Divider', defaultW: 440, defaultH: 36  },
];

// ─── Serialization ────────────────────────────────────────────────────────────
export function parseCanvas(value) {
  try {
    if (typeof value === 'string' && value.trimStart().startsWith('{')) {
      const data = JSON.parse(value);
      if (data.type === 'canvas' && Array.isArray(data.containers)) return data.containers;
    }
  } catch { /* ignore */ }
  if (value && value.trim()) {
    return [{ id: genId(), type: 'text', x: 48, y: 48, w: 440, h: 260, content: value, checked: [] }];
  }
  return [];
}

export function serializeCanvas(containers) {
  return JSON.stringify({ type: 'canvas', containers });
}

// ─── Container background / border styles ─────────────────────────────────────
function containerBg(type) {
  switch (type) {
    case 'title':   return 'transparent';
    case 'sticky':  return '#fffde0';
    case 'code':    return '#1c2333';
    case 'divider': return 'transparent';
    default:        return 'rgba(255,254,252,.97)';
  }
}

function containerBorder(type, selected) {
  if (type === 'title' || type === 'divider') return 'none';
  if (selected) return '1.5px solid var(--accent-orange)';
  return '0.5px solid rgba(26,20,16,.09)';
}

function containerShadow(type, selected) {
  if (type === 'title' || type === 'divider') return 'none';
  if (selected) return '0 0 0 3px rgba(240,107,28,.15), 0 12px 40px -12px rgba(46,30,12,.22), 0 2px 8px -2px rgba(46,30,12,.10)';
  return '0 2px 16px -6px rgba(46,30,12,.14), 0 1px 4px rgba(46,30,12,.06)';
}

// ─── ContainerBlock ───────────────────────────────────────────────────────────
const ContainerBlock = memo(function ContainerBlock({
  container, isSelected, readOnly,
  onSelect, onDragStart, onResizeStart,
  onContentChange, onCheckedChange, onDelete,
}) {
  const { id, type, x, y, w, h, content = '', checked = [] } = container;
  const contentRef = useRef(null);

  // Set initial content imperatively — prevents React from clobbering cursor
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (type === 'code' || type === 'title' || type === 'sticky') {
      el.textContent = content;
    } else if (type === 'text') {
      el.innerHTML = content;
    }
  }, [id]); // Only on mount / container ID change

  const handleInput = (e) => onContentChange(
    type === 'text' ? e.currentTarget.innerHTML : e.currentTarget.textContent
  );

  const typeInfo = CONTAINER_TYPES.find(t => t.type === type) || CONTAINER_TYPES[1];

  // Drag handle: entire top bar for most types
  const DragBar = () => (
    <div
      className="nc-drag-bar"
      onPointerDown={(e) => { onSelect(); onDragStart(e); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
        padding: type === 'title' ? '4px 0' : '5px 10px 5px 8px',
        cursor: 'grab', userSelect: 'none',
        background: type === 'code' ? 'rgba(255,255,255,.05)'
          : type === 'title' ? 'transparent'
          : type === 'sticky' ? 'rgba(0,0,0,.04)'
          : 'rgba(26,20,16,.025)',
        borderBottom: (type === 'title' || type === 'sticky' || type === 'divider')
          ? 'none'
          : '0.5px solid rgba(26,20,16,.06)',
      }}
    >
      {type !== 'title' && type !== 'divider' && (
        <svg width="8" height="12" viewBox="0 0 8 12" style={{ flexShrink: 0, opacity: .4 }}>
          {[0, 4, 8].map(cy => (
            <g key={cy}>
              <circle cx="2" cy={cy + 2} r="1.2" fill={type === 'code' ? '#fff' : 'currentColor'} />
              <circle cx="6" cy={cy + 2} r="1.2" fill={type === 'code' ? '#fff' : 'currentColor'} />
            </g>
          ))}
        </svg>
      )}
      <span style={{
        fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
        color: type === 'code' ? 'rgba(255,255,255,.3)'
          : type === 'sticky' ? 'rgba(100,80,0,.45)'
          : 'var(--ink-4)',
      }}>
        {typeInfo.icon} {typeInfo.label}
      </span>
      {isSelected && !readOnly && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{
            marginLeft: 'auto', background: 'rgba(231,64,46,.1)', border: 'none', borderRadius: 4,
            cursor: 'pointer', padding: '1px 7px', fontSize: 10.5, color: 'var(--accent-coral)', lineHeight: '16px',
          }}
        >✕</button>
      )}
    </div>
  );

  // ── Resize handles ──────────────────────────────────────────────────────────
  const ResizeHandles = () => (
    <>
      {['nw','n','ne','e','se','s','sw','w'].map(handle => {
        const isCorner = handle.length === 2;
        const pos = {
          nw: { top: -4, left: -4 }, n: { top: -4, left: '50%', transform: 'translateX(-50%)' },
          ne: { top: -4, right: -4 }, e: { top: '50%', right: -4, transform: 'translateY(-50%)' },
          se: { bottom: -4, right: -4 }, s: { bottom: -4, left: '50%', transform: 'translateX(-50%)' },
          sw: { bottom: -4, left: -4 }, w: { top: '50%', left: -4, transform: 'translateY(-50%)' },
        }[handle];
        const cursor = `${handle}-resize`;
        return (
          <div
            key={handle}
            onPointerDown={e => { e.stopPropagation(); e.preventDefault(); onResizeStart(e, handle); }}
            style={{
              position: 'absolute', ...pos, zIndex: 20,
              width: isCorner ? 10 : 6, height: isCorner ? 10 : 6,
              borderRadius: isCorner ? 3 : 2,
              background: isCorner ? 'var(--accent-orange)' : 'rgba(240,107,28,.45)',
              cursor, boxShadow: '0 1px 4px rgba(0,0,0,.15)',
            }}
          />
        );
      })}
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      onPointerDown={e => { if (e.target === e.currentTarget) onSelect(); }}
      style={{
        position: 'absolute', left: x, top: y, width: w, height: h,
        display: 'flex', flexDirection: 'column',
        borderRadius: (type === 'title' || type === 'divider') ? 0 : 14,
        background: containerBg(type),
        border: containerBorder(type, isSelected),
        boxShadow: containerShadow(type, isSelected),
        overflow: 'hidden',
        zIndex: isSelected ? 20 : 1,
        transition: 'box-shadow 120ms ease, border-color 120ms ease',
      }}
    >
      {/* Drag bar (shown for all types except divider which has its own) */}
      {type !== 'divider' && <DragBar />}

      {/* ── Content area ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>

        {/* TITLE */}
        {type === 'title' && (
          <div
            ref={contentRef}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            data-ph="Untitled"
            onInput={handleInput}
            onPointerDown={e => { onSelect(); if (!isSelected) e.preventDefault(); }}
            style={{
              outline: 'none', flex: 1,
              fontSize: Math.max(22, Math.min(40, w / 12)),
              fontFamily: 'var(--font-display)', fontWeight: 700,
              letterSpacing: '-0.025em', lineHeight: 1.15, color: 'var(--ink-1)',
              wordBreak: 'break-word', padding: 0,
            }}
          />
        )}

        {/* TEXT */}
        {type === 'text' && (
          <div
            ref={contentRef}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            data-ph="Start typing…"
            onInput={handleInput}
            onPointerDown={e => { onSelect(); }}
            style={{
              outline: 'none', flex: 1, overflow: 'auto',
              fontSize: 14, lineHeight: 1.7, color: 'var(--ink-1)',
              padding: '10px 14px', wordBreak: 'break-word',
            }}
          />
        )}

        {/* STICKY */}
        {type === 'sticky' && (
          <div
            ref={contentRef}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            data-ph="Quick thought…"
            onInput={handleInput}
            onPointerDown={e => { onSelect(); }}
            style={{
              outline: 'none', flex: 1, overflow: 'auto',
              fontSize: 13.5, lineHeight: 1.65, color: '#4a3800',
              padding: '8px 12px', wordBreak: 'break-word',
              fontFamily: 'var(--font-sans)',
            }}
          />
        )}

        {/* IMAGE */}
        {type === 'image' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
            {content ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <img
                  src={content}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, display: 'block' }}
                  onError={e => { e.currentTarget.style.opacity = '0.25'; }}
                />
                {!readOnly && isSelected && (
                  <button
                    onClick={() => onContentChange('')}
                    onPointerDown={e => e.stopPropagation()}
                    style={{
                      position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.55)',
                      border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer',
                      padding: '2px 8px', fontSize: 10.5, fontWeight: 600,
                    }}
                  >Change</button>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', width: '90%' }}>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: .4 }}>🖼</div>
                <input
                  placeholder="Paste image URL, press Enter"
                  onKeyDown={e => { if (e.key === 'Enter') { onContentChange(e.currentTarget.value.trim()); } }}
                  onPointerDown={e => e.stopPropagation()}
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: 8,
                    border: '0.5px solid var(--ink-line)', outline: 'none',
                    fontSize: 12, background: 'rgba(255,252,244,.9)', color: 'var(--ink-1)',
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* CODE */}
        {type === 'code' && (
          <pre
            ref={contentRef}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            data-ph="// Enter code here…"
            onInput={handleInput}
            onPointerDown={e => { onSelect(); }}
            style={{
              outline: 'none', flex: 1, overflow: 'auto', margin: 0,
              padding: '10px 14px', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              fontFamily: '"Fira Code","JetBrains Mono","Cascadia Code",monospace',
              fontSize: 12.5, lineHeight: 1.7, color: '#8ecdef',
              background: 'transparent',
            }}
          />
        )}

        {/* TODO */}
        {type === 'todo' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column' }}>
            {(content ? content.split('\n').filter(l => l.trim()) : []).map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7 }}>
                <input
                  type="checkbox"
                  checked={!!checked[idx]}
                  onChange={() => {
                    const next = [...checked];
                    next[idx] = !next[idx];
                    onCheckedChange(next);
                  }}
                  onPointerDown={e => e.stopPropagation()}
                  style={{ marginTop: 3, flexShrink: 0, accentColor: 'var(--accent-orange)', cursor: 'pointer', width: 14, height: 14 }}
                />
                <span style={{
                  fontSize: 13, lineHeight: 1.55, flex: 1, wordBreak: 'break-word',
                  color: checked[idx] ? 'var(--ink-4)' : 'var(--ink-1)',
                  textDecoration: checked[idx] ? 'line-through' : 'none',
                }}>{item}</span>
              </div>
            ))}
            {!readOnly && (
              <input
                placeholder="Add item, press Enter…"
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const lines = content ? content.split('\n').filter(l => l.trim()) : [];
                    onContentChange([...lines, e.currentTarget.value.trim()].join('\n'));
                    e.currentTarget.value = '';
                  }
                }}
                onPointerDown={e => e.stopPropagation()}
                style={{
                  all: 'unset', display: 'block', width: '100%', fontSize: 12,
                  color: 'var(--ink-3)', borderTop: '0.5px solid var(--ink-line)',
                  paddingTop: 7, marginTop: 4,
                }}
              />
            )}
          </div>
        )}

        {/* DIVIDER */}
        {type === 'divider' && (
          <div
            onPointerDown={(e) => { onSelect(); onDragStart(e); }}
            style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 10, padding: '0 8px', cursor: 'grab' }}
          >
            <svg width="10" height="12" viewBox="0 0 8 12" style={{ opacity: .3, flexShrink: 0 }}>
              {[0, 4, 8].map(cy => (
                <g key={cy}>
                  <circle cx="2" cy={cy + 2} r="1.2" fill="currentColor" />
                  <circle cx="6" cy={cy + 2} r="1.2" fill="currentColor" />
                </g>
              ))}
            </svg>
            <hr style={{ flex: 1, border: 'none', borderTop: '1.5px solid var(--ink-line)', margin: 0 }} />
          </div>
        )}
      </div>

      {/* Resize handles (only when selected) */}
      {isSelected && !readOnly && <ResizeHandles />}
    </div>
  );
}, (prev, next) =>
  prev.container === next.container &&
  prev.isSelected === next.isSelected &&
  prev.readOnly === next.readOnly
);

// Placeholder CSS
const CANVAS_CSS = `
  @keyframes ncContainerIn { from { opacity: 0; transform: scale(.94) translateY(8px); } to { opacity: 1; transform: none; } }
  .nc-container-new { animation: ncContainerIn 200ms var(--ease-glass,cubic-bezier(.22,1,.36,1)) backwards; }
  .nc-drag-bar:active { cursor: grabbing !important; }
  [data-ph]:empty::before { content: attr(data-ph); color: rgba(26,20,16,.22); pointer-events: none; }
  .nc-root [contenteditable]:focus { outline: none; }
  @media (max-width: 768px) { .nc-type-toolbar span.nc-label { display: none; } }
`;

// ─── NoteCanvas ───────────────────────────────────────────────────────────────
export function NoteCanvas({ value = '', onChange, readOnly = false }) {
  const [containers, setContainers] = useState(() => parseCanvas(value));
  const [selectedId, setSelectedId] = useState(null);
  const [newIds, setNewIds] = useState(new Set());
  const serializedRef = useRef(value);
  const canvasRef = useRef(null);

  // Sync incoming value → containers (note switches / voice update)
  useEffect(() => {
    if (value !== serializedRef.current) {
      setContainers(parseCanvas(value));
      serializedRef.current = value;
    }
  }, [value]);

  const serialize = useCallback((next) => {
    const s = serializeCanvas(next);
    if (s !== serializedRef.current) {
      serializedRef.current = s;
      onChange?.(s);
    }
  }, [onChange]);

  // ── Add container ──────────────────────────────────────────────────────────
  const addContainer = useCallback((type) => {
    const cfg = CONTAINER_TYPES.find(t => t.type === type) || CONTAINER_TYPES[1];
    const canvas = canvasRef.current;
    const scrollLeft = canvas?.scrollLeft || 0;
    const scrollTop = canvas?.scrollTop || 0;
    const cw = canvas?.clientWidth || 800;
    const offset = (containers.length % 6) * 24;
    const newC = {
      id: genId(), type,
      x: Math.round(scrollLeft + (cw - cfg.defaultW) / 2 + offset),
      y: Math.round(scrollTop + 80 + offset),
      w: cfg.defaultW, h: cfg.defaultH,
      content: '', checked: [],
    };
    const next = [...containers, newC];
    setContainers(next);
    setSelectedId(newC.id);
    setNewIds(s => new Set([...s, newC.id]));
    serialize(next);
    setTimeout(() => setNewIds(s => { const n = new Set(s); n.delete(newC.id); return n; }), 400);
  }, [containers, serialize]);

  // ── Drag ───────────────────────────────────────────────────────────────────
  const startDrag = useCallback((e, id) => {
    if (readOnly) return;
    e.preventDefault();
    const c = containers.find(c => c.id === id);
    if (!c) return;
    const startX = e.clientX, startY = e.clientY;
    const origX = c.x, origY = c.y;

    const onMove = (me) => {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      setContainers(prev => prev.map(p => p.id === id ? { ...p, x: Math.max(0, origX + dx), y: Math.max(0, origY + dy) } : p));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setContainers(prev => { serialize(prev); return prev; });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [containers, readOnly, serialize]);

  // ── Resize ─────────────────────────────────────────────────────────────────
  const startResize = useCallback((e, id, handle) => {
    if (readOnly) return;
    e.preventDefault();
    const c = containers.find(c => c.id === id);
    if (!c) return;
    const startX = e.clientX, startY = e.clientY;
    const origW = c.w, origH = c.h, origX = c.x, origY = c.y;

    const onMove = (me) => {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      setContainers(prev => prev.map(p => {
        if (p.id !== id) return p;
        let w = origW, h = origH, x = origX, y = origY;
        if (handle.includes('e')) w = Math.max(120, origW + dx);
        if (handle.includes('s')) h = Math.max(56, origH + dy);
        if (handle.includes('w')) { w = Math.max(120, origW - dx); x = origX + (origW - w); }
        if (handle.includes('n')) { h = Math.max(56, origH - dy); y = origY + (origH - h); }
        return { ...p, w, h, x: Math.max(0, x), y: Math.max(0, y) };
      }));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setContainers(prev => { serialize(prev); return prev; });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [containers, readOnly, serialize]);

  // ── Content / checked updates ──────────────────────────────────────────────
  const updateContent = useCallback((id, content) => {
    setContainers(prev => {
      const next = prev.map(c => c.id === id ? { ...c, content } : c);
      serialize(next);
      return next;
    });
  }, [serialize]);

  const updateChecked = useCallback((id, checked) => {
    setContainers(prev => {
      const next = prev.map(c => c.id === id ? { ...c, checked } : c);
      serialize(next);
      return next;
    });
  }, [serialize]);

  const deleteContainer = useCallback((id) => {
    const next = containers.filter(c => c.id !== id);
    setSelectedId(null);
    setContainers(next);
    serialize(next);
  }, [containers, serialize]);

  // keyboard delete
  useEffect(() => {
    const onKey = (e) => {
      if (!selectedId || readOnly) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && document.activeElement?.contentEditable !== 'true' && document.activeElement?.tagName !== 'INPUT') {
        deleteContainer(selectedId);
      }
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, readOnly, deleteContainer]);

  // Canvas size (scrollable area)
  const canvasW = Math.max(1200, ...containers.map(c => c.x + c.w + 80));
  const canvasH = Math.max(800, ...containers.map(c => c.y + c.h + 80));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} className="nc-root">
      <style>{CANVAS_CSS}</style>

      {/* ── Type toolbar ──────────────────────────────────────────────────── */}
      {!readOnly && (
        <div className="nc-type-toolbar" style={{
          display: 'flex', alignItems: 'center', gap: 3, padding: '6px 12px',
          borderBottom: '0.5px solid var(--ink-line)', flexShrink: 0,
          background: 'rgba(255,252,244,.96)', backdropFilter: 'blur(12px)',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-4)', marginRight: 2 }}>Insert</span>

          {CONTAINER_TYPES.map(({ type, icon, label }) => (
            <button
              key={type}
              onClick={() => addContainer(type)}
              title={`Add ${label}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 9px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                background: 'rgba(26,20,16,.04)', border: '0.5px solid transparent',
                cursor: 'pointer', color: 'var(--ink-2)',
                transition: 'all 120ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,165,36,.14)'; e.currentTarget.style.borderColor = 'rgba(245,165,36,.3)'; e.currentTarget.style.color = 'var(--accent-orange)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(26,20,16,.04)'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--ink-2)'; }}
            >
              <span style={{ fontSize: 13 }}>{icon}</span>
              <span className="nc-label">{label}</span>
            </button>
          ))}

          {selectedId && (
            <>
              <div style={{ width: 1, height: 16, background: 'var(--ink-line)', margin: '0 3px' }} />
              <button
                onClick={() => deleteContainer(selectedId)}
                style={{
                  padding: '4px 9px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                  background: 'rgba(231,64,46,.08)', border: 'none', cursor: 'pointer', color: 'var(--accent-coral)',
                }}
              >✕ Delete</button>
            </>
          )}

          <span style={{ marginLeft: 'auto', fontSize: 9.5, color: 'var(--ink-4)' }}>
            Drag grip to move · corner dot to resize · Del to remove
          </span>
        </div>
      )}

      {/* ── Canvas area ─────────────────────────────────────────────────────── */}
      <div
        ref={canvasRef}
        onClick={e => { if (e.target === canvasRef.current) setSelectedId(null); }}
        style={{
          flex: 1, overflow: 'auto', position: 'relative',
          backgroundImage: 'radial-gradient(circle, rgba(26,20,16,.07) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
          backgroundColor: '#f4f1ea',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Inner scrollable canvas */}
        <div
          style={{ position: 'relative', width: canvasW, height: canvasH }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedId(null); }}
        >
          {containers.length === 0 && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -60%)',
              textAlign: 'center', color: 'var(--ink-4)', pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: .5 }}>✦</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Empty board</div>
              <div style={{ fontSize: 12 }}>Click a container type above to start</div>
            </div>
          )}

          {containers.map(c => (
            <ContainerBlock
              key={c.id}
              container={c}
              isSelected={selectedId === c.id}
              readOnly={readOnly}
              onSelect={() => setSelectedId(c.id)}
              onDragStart={(e) => startDrag(e, c.id)}
              onResizeStart={(e, handle) => startResize(e, c.id, handle)}
              onContentChange={(content) => updateContent(c.id, content)}
              onCheckedChange={(checked) => updateChecked(c.id, checked)}
              onDelete={() => deleteContainer(c.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
