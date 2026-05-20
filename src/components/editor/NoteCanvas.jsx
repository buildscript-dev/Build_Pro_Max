import React, { useState, useRef, useCallback, useEffect } from 'react';

// ─── ID generator ────────────────────────────────────────────────────────────────
function genId() { return Math.random().toString(36).slice(2, 9); }

// ─── Container type definitions ──────────────────────────────────────────────────
const CONTAINER_TYPES = [
  { type: 'title',   icon: 'T',    label: 'Title',   defaultW: 520, defaultH: 56,  defaultContent: 'Untitled' },
  { type: 'text',    icon: '¶',    label: 'Text',    defaultW: 400, defaultH: 120, defaultContent: 'Start writing…' },
  { type: 'sticky',  icon: '●',    label: 'Sticky',  defaultW: 220, defaultH: 180, defaultContent: 'Note…' },
  { type: 'code',    icon: '<>',   label: 'Code',    defaultW: 420, defaultH: 160, defaultContent: 'const x = 0;' },
  { type: 'todo',    icon: '☐',    label: 'To-do',   defaultW: 300, defaultH: 100, defaultContent: '' },
  { type: 'divider', icon: '—',    label: 'Divider', defaultW: 400, defaultH: 12,  defaultContent: '' },
  { type: 'image',   icon: '🖼',   label: 'Image',   defaultW: 320, defaultH: 220, defaultContent: '' },
  { type: 'quote',   icon: '"',    label: 'Quote',   defaultW: 360, defaultH: 80,  defaultContent: '' },
];

const STICKY_COLORS = ['#fef3c7', '#fce7f3', '#dbeafe', '#d1fae5', '#ede9fe', '#fee2e2'];

// ─── Single container renderer ──────────────────────────────────────────────────
const ContainerBlock = React.memo(function ContainerBlock({ el, isSelected, onSelect, onDrag, onResize, onContent }) {
  const dragRef = useRef(null);
  const isDragging = useRef(false);
  const resizeRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (el.type === 'text' || el.type === 'title' || el.type === 'code') {
        inputRef.current.select();
      }
    }
  }, [editing]);

  // ── Drag ────────────────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    if (e.target.closest('[data-resize]')) return;
    if (editing) return; // Allow text selection when editing
    e.stopPropagation();
    onSelect();
    isDragging.current = true;
    dragRef.current = { sx: e.clientX, sy: e.clientY, ex: el.x, ey: el.y };

    const onMove = (ev) => {
      if (!isDragging.current) return;
      const dx = ev.clientX - dragRef.current.sx;
      const dy = ev.clientY - dragRef.current.sy;
      onDrag(el.id, dragRef.current.ex + dx, dragRef.current.ey + dy);
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [el, onSelect, onDrag, editing]);

  // ── Resize ──────────────────────────────────────────────────────────────────
  const onResizeDown = useCallback((dir, e) => {
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = { dir, sx: e.clientX, sy: e.clientY, w: el.width, h: el.height, x: el.x, y: el.y };

    const onMove = (ev) => {
      const r = resizeRef.current;
      if (!r) return;
      const dx = ev.clientX - r.sx;
      const dy = ev.clientY - r.sy;
      let nw = r.w, nh = r.h, nx = r.x, ny = r.y;
      if (dir.includes('e')) nw = Math.max(80, r.w + dx);
      if (dir.includes('w')) { nw = Math.max(80, r.w - dx); nx = r.x + (r.w - nw); }
      if (dir.includes('s')) nh = Math.max(30, r.h + dy);
      if (dir.includes('n')) { nh = Math.max(30, r.h - dy); ny = r.y + (r.h - nh); }
      onResize(el.id, nx, ny, nw, nh);
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [el, onResize]);

  // ── Edit ────────────────────────────────────────────────────────────────────
  const startEdit = useCallback(() => {
    if (el.type === 'divider' || el.type === 'image') return;
    setEditVal(el.content || '');
    setEditing(true);
  }, [el]);

  const saveEdit = useCallback(() => {
    setEditing(false);
    onContent(el.id, editVal);
  }, [el.id, editVal, onContent]);

  // ── Render inner content ────────────────────────────────────────────────────
  const renderInner = () => {
    if (editing) {
      const Tag = el.type === 'title' ? 'input' : el.type === 'code' ? 'textarea' : 'textarea';
      return (
        <Tag
          ref={inputRef}
          value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => { if (e.key === 'Escape') saveEdit(); if (e.key === 'Enter' && el.type !== 'code' && !e.shiftKey) saveEdit(); }}
          data-edit="true"
          style={{
            all: 'unset', width: '100%', height: '100%', display: 'block',
            fontSize: el.type === 'title' ? 28 : el.type === 'code' ? 13 : 14,
            fontFamily: el.type === 'code' ? 'ui-monospace, monospace' : 'inherit',
            color: 'var(--ink-1)', lineHeight: 1.5, resize: 'none',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}
        />
      );
    }

    switch (el.type) {
      case 'title':
        return (
          <div
            data-edit="true"
            onDoubleClick={startEdit}
            style={{
              fontSize: 28, fontWeight: 700, lineHeight: 1.2, color: 'var(--ink-1)',
              letterSpacing: '-0.02em', cursor: 'text',
            }}
          >
            {el.content || 'Untitled'}
          </div>
        );

      case 'text':
        return (
          <div
            data-edit="true"
            onDoubleClick={startEdit}
            style={{
              fontSize: 14, lineHeight: 1.65, color: 'var(--ink-2)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', cursor: 'text',
            }}
          >
            {el.content || 'Double-click to edit'}
          </div>
        );

      case 'sticky':
        return (
          <div style={{
            width: '100%', height: '100%', background: el.color || STICKY_COLORS[0],
            borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column',
          }}>
            <div
              data-edit="true"
              onDoubleClick={startEdit}
              style={{
                fontSize: 13, lineHeight: 1.55, color: 'var(--ink-1)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', flex: 1, cursor: 'text',
              }}
            >
              {el.content || 'Double-click to edit'}
            </div>
          </div>
        );

      case 'code':
        return (
          <div style={{
            width: '100%', height: '100%', background: '#1e1e1e', borderRadius: 8,
            padding: 14, display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 6, fontFamily: 'ui-monospace, monospace' }}>code</div>
            <div
              data-edit="true"
              onDoubleClick={startEdit}
              style={{
                fontSize: 13, lineHeight: 1.5, color: '#e5e5e5',
                fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap',
                wordBreak: 'break-word', flex: 1, cursor: 'text',
              }}
            >
              {el.content || '// double-click to edit'}
            </div>
          </div>
        );

      case 'todo': {
        const items = el.content ? el.content.split('\n').filter(Boolean) : ['Task 1', 'Task 2'];
        return (
          <div style={{ width: '100%', height: '100%', padding: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>To-do</div>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 13, color: 'var(--ink-2)' }}>
                <span style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid var(--ink-line)', flexShrink: 0 }} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        );
      }

      case 'divider':
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--ink-line)' }} />
          </div>
        );

      case 'image':
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'rgba(26,20,16,.03)', borderRadius: 8,
            cursor: 'pointer',
          }}
            data-edit="true"
            onClick={() => {
              const url = window.prompt('Paste image URL:');
              if (url) onContent(el.id, url);
            }}
          >
            {el.content ? (
              <img src={el.content} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
            ) : (
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Click to add image</span>
            )}
          </div>
        );

      case 'quote':
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center',
            paddingLeft: 16, borderLeft: '3px solid var(--accent-orange)',
          }}>
            <div
              data-edit="true"
              onDoubleClick={startEdit}
              style={{
                fontSize: 14, fontStyle: 'italic', lineHeight: 1.5, color: 'var(--ink-1)',
                cursor: 'text',
              }}
            >
              {el.content || '"Double-click to edit"' }
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute', left: el.x, top: el.y,
        width: el.width, height: el.height,
        zIndex: isSelected ? 10 : 1,
        cursor: isDragging.current ? 'grabbing' : 'grab',
        transition: isDragging.current || resizeRef.current ? 'none' : 'box-shadow 140ms ease',
        boxShadow: isSelected
          ? '0 4px 16px rgba(0,0,0,.1), 0 0 0 2px var(--accent-orange)'
          : '0 1px 4px rgba(0,0,0,.06)',
        borderRadius: el.type === 'sticky' ? 6 : el.type === 'code' ? 8 : el.type === 'divider' ? 0 : 4,
        background: el.type === 'text' ? 'rgba(255,255,255,.7)' : el.type === 'title' ? 'transparent' : 'transparent',
        backdropFilter: el.type === 'text' ? 'blur(4px)' : 'none',
        border: el.type === 'code' ? 'none' : el.type === 'divider' ? 'none' : '0.5px solid var(--ink-line)',
        overflow: 'hidden', userSelect: 'none',
      }}
    >
      {renderInner()}

      {/* Resize handles */}
      {isSelected && (
        <>
          {['se', 'sw', 'ne', 'nw'].map(dir => (
            <div
              key={dir}
              data-resize="true"
              onPointerDown={(e) => onResizeDown(dir, e)}
              style={{
                position: 'absolute',
                [dir.includes('n') ? 'top' : 'bottom']: -5,
                [dir.includes('w') ? 'left' : 'right']: -5,
                width: 10, height: 10,
                background: '#fff', border: '2px solid var(--accent-orange)',
                borderRadius: 2, cursor: `${dir}-resize`, zIndex: 20,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
});

// ─── Main NoteCanvas ─────────────────────────────────────────────────────────────
export function NoteCanvas({ value = '', onChange, readOnly = false }) {
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const boardRef = useRef(null);

  // ── Parse saved value ───────────────────────────────────────────────────────
  useEffect(() => {
    try {
      if (value && typeof value === 'string') {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setElements(parsed);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const debounceRef = useRef(null);

  const persist = useCallback((els) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange?.(JSON.stringify(els));
    }, 400);
  }, [onChange]);

  // ── Persist changes ─────────────────────────────────────────────────────────
  const sync = useCallback((els) => {
    setElements(els);
    persist(els);
  }, [persist]);

  // ── Add element from toolbar ────────────────────────────────────────────────
  const addElement = useCallback((typeDef) => {
    const rect = boardRef.current?.getBoundingClientRect();
    const cx = rect ? rect.width / 2 - typeDef.defaultW / 2 : 100;
    const cy = rect ? rect.height / 2 - typeDef.defaultH / 2 : 100;

    const el = {
      id: genId(),
      type: typeDef.type,
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + (Math.random() - 0.5) * 40,
      width: typeDef.defaultW,
      height: typeDef.defaultH,
      content: typeDef.defaultContent,
      color: typeDef.type === 'sticky' ? STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)] : undefined,
    };
    const next = [...elements, el];
    sync(next);
    setSelectedId(el.id);
    setActiveTool(null);
  }, [elements, sync]);

  // ── Drag handler ────────────────────────────────────────────────────────────
  const handleDrag = useCallback((id, x, y) => {
    setElements(prev => {
      const next = prev.map(e => e.id === id ? { ...e, x, y } : e);
      persist(next);
      return next;
    });
  }, [persist]);

  // ── Resize handler ──────────────────────────────────────────────────────────
  const handleResize = useCallback((id, x, y, w, h) => {
    setElements(prev => {
      const next = prev.map(e => e.id === id ? { ...e, x, y, width: w, height: h } : e);
      persist(next);
      return next;
    });
  }, [persist]);

  // ── Content change ──────────────────────────────────────────────────────────
  const handleContent = useCallback((id, content) => {
    setElements(prev => {
      const next = prev.map(e => e.id === id ? { ...e, content } : e);
      persist(next);
      return next;
    });
  }, [persist]);

  // ── Delete selected ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        setElements(prev => prev.filter(el => el.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  // ── Click board to deselect ─────────────────────────────────────────────────
  const handleBoardClick = useCallback((e) => {
    if (e.target === boardRef.current || e.target.closest('[data-board]')) {
      setSelectedId(null);
    }
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#faf9f6' }}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px',
        borderBottom: '0.5px solid var(--ink-line)', background: 'rgba(255,252,244,.96)',
        backdropFilter: 'blur(16px)', flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4 }}>
          Add:
        </span>
        {CONTAINER_TYPES.map(t => (
          <button
            key={t.type}
            onClick={() => addElement(t)}
            title={t.label}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              border: 'none', cursor: readOnly ? 'default' : 'pointer',
              background: 'rgba(26,20,16,.04)', color: 'var(--ink-2)',
              transition: 'all 120ms ease',
              opacity: readOnly ? 0.4 : 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245,165,36,.12)'; e.currentTarget.style.color = 'var(--accent-orange)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(26,20,16,.04)'; e.currentTarget.style.color = 'var(--ink-2)'; }}
          >
            <span style={{ fontSize: 13, lineHeight: 1 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}

        {selectedId && (
          <>
            <div style={{ width: 1, height: 16, background: 'var(--ink-line)', margin: '0 6px' }} />
            <button
              onClick={() => { setElements(prev => prev.filter(e => e.id !== selectedId)); setSelectedId(null); }}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: 'none', cursor: 'pointer', background: 'rgba(231,64,46,.08)', color: 'var(--accent-coral)',
              }}
            >
              Delete
            </button>
          </>
        )}

        <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink-4)' }}>
          {elements.length} block{elements.length !== 1 ? 's' : ''} · drag to move · double-click to edit · select + Delete to remove
        </div>
      </div>

      {/* Canvas board */}
      <div
        ref={boardRef}
        data-board="true"
        onClick={handleBoardClick}
        style={{
          flex: 1, position: 'relative', overflow: 'auto',
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,.06) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {elements.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', gap: 8,
          }}>
            <span style={{ fontSize: 32, opacity: 0.3 }}>+</span>
            <span style={{ fontSize: 13 }}>Click a tool above to add a block</span>
          </div>
        )}

        {elements.map(el => (
          <ContainerBlock
            key={el.id}
            el={el}
            isSelected={el.id === selectedId}
            onSelect={() => setSelectedId(el.id)}
            onDrag={handleDrag}
            onResize={handleResize}
            onContent={handleContent}
          />
        ))}
      </div>
    </div>
  );
}
