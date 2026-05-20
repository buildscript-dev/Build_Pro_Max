import React, { useState, useRef, useCallback, useEffect } from 'react';

function genId() { return Math.random().toString(36).slice(2, 9); }

// Renders a single draggable block in the embedded canvas
function MiniBlock({ el, isSelected, onSelect, onDrag, onResize, onContent, isConnecting, startConnection, completeConnection, drawingConn }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(el.content || '');
  const dragRef = useRef(null);
  const isDragging = useRef(false);
  const resizeRef = useRef(null);

  // Drag handler
  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    
    if (isConnecting) {
      startConnection(el.id);
      return;
    }
    
    if (editing) return;
    onSelect();
    isDragging.current = true;
    dragRef.current = { sx: e.clientX, sy: e.clientY, ex: el.x, ey: el.y };

    const onMove = (ev) => {
      if (!isDragging.current) return;
      onDrag(el.id, dragRef.current.ex + (ev.clientX - dragRef.current.sx), dragRef.current.ey + (ev.clientY - dragRef.current.sy));
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [el, onSelect, onDrag, editing, isConnecting, startConnection]);

  // Handle drag-to-connect release
  const onMouseUp = useCallback((e) => {
    if (isConnecting && drawingConn) {
      e.stopPropagation();
      if (drawingConn.from !== el.id) {
        completeConnection(el.id);
      }
    }
  }, [isConnecting, drawingConn, completeConnection, el.id]);

  // Resize handler
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
      if (dir.includes('s')) nh = Math.max(40, r.h + dy);
      if (dir.includes('n')) { nh = Math.max(40, r.h - dy); ny = r.y + (r.h - nh); }
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

  return (
    <div
      onPointerDown={onPointerDown}
      onMouseUp={onMouseUp}
      onDoubleClick={() => setEditing(true)}
      style={{
        position: 'absolute', left: el.x, top: el.y, width: el.width, minHeight: el.height,
        background: 'rgba(255,254,250,0.95)', border: isSelected ? '1.5px solid var(--accent-orange)' : '1px solid var(--ink-line)',
        borderRadius: 8, padding: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        cursor: isConnecting ? 'crosshair' : isDragging.current ? 'grabbing' : 'grab',
        zIndex: isSelected ? 10 : 1, userSelect: 'none',
      }}
    >
      {editing ? (
        <textarea
          autoFocus
          value={val}
          onChange={e => {
            setVal(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onFocus={e => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onBlur={() => { setEditing(false); onContent(el.id, val); }}
          onKeyDown={e => { if (e.key === 'Escape') { setEditing(false); onContent(el.id, val); } }}
          style={{
            width: '100%', minHeight: el.height - 24, all: 'unset', display: 'block',
            fontSize: 13, lineHeight: 1.5, color: 'var(--ink-1)', resize: 'none', overflow: 'hidden'
          }}
        />
      ) : (
        <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink-1)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', cursor: isConnecting ? 'crosshair' : 'text' }}>
          {el.content || <span style={{ color: 'var(--ink-4)' }}>Double-click to type</span>}
        </div>
      )}
      
      {isConnecting && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(245,165,36,0.1)', borderRadius: 8, pointerEvents: 'none' }} />
      )}

      {isSelected && !isConnecting && (
        <>
          {['se', 'sw', 'ne', 'nw'].map(dir => (
            <div
              key={dir}
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
}

// Arrow overlay renderer
function ArrowLayer({ blocks, connections, drawingConn, boardRef, onDeleteConnection }) {
  // Get edge points for a connection
  const getEdgePoints = (b1, b2) => {
    if (!b1 || !b2) return null;
    const c1 = { x: b1.x + b1.width/2, y: b1.y + b1.height/2 };
    const c2 = { x: b2.x + (b2.width || 0)/2, y: b2.y + (b2.height || 0)/2 };
    
    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;
    const isHorizontal = Math.abs(dx) > Math.abs(dy);
    
    let p1, p2;
    if (isHorizontal) {
      if (dx > 0) { p1 = { x: b1.x + b1.width + 4, y: c1.y }; p2 = { x: b2.x - 4, y: c2.y }; }
      else { p1 = { x: b1.x - 4, y: c1.y }; p2 = { x: b2.x + (b2.width || 0) + 4, y: c2.y }; }
    } else {
      if (dy > 0) { p1 = { x: c1.x, y: b1.y + b1.height + 4 }; p2 = { x: c2.x, y: b2.y - 4 }; }
      else { p1 = { x: c1.x, y: b1.y - 4 }; p2 = { x: c2.x, y: b2.y + (b2.height || 0) + 4 }; }
    }
    
    // For drawing lines to the mouse, b2 width/height is 0, so p2 is just the mouse pos
    if (!b2.id) p2 = c2;
    
    return { p1, p2, isHorizontal };
  };

  const drawCurve = (p1, p2, isHoriz) => {
    if (!p1 || !p2) return '';
    if (isHoriz) {
      const dx = Math.max(Math.abs(p2.x - p1.x) * 0.5, 40);
      return `M ${p1.x} ${p1.y} C ${p1.x + (p2.x>p1.x?dx:-dx)} ${p1.y}, ${p2.x - (p2.x>p1.x?dx:-dx)} ${p2.y}, ${p2.x} ${p2.y}`;
    } else {
      const dy = Math.max(Math.abs(p2.y - p1.y) * 0.5, 40);
      return `M ${p1.x} ${p1.y} C ${p1.x} ${p1.y + (p2.y>p1.y?dy:-dy)}, ${p2.x} ${p2.y - (p2.y>p1.y?dy:-dy)}, ${p2.x} ${p2.y}`;
    }
  };

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, overflow: 'visible' }}>
      <defs>
        <marker id="arrowhead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(26,20,16,.4)" />
        </marker>
        <marker id="arrowhead-drawing" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-orange)" />
        </marker>
      </defs>

      {connections.map(c => {
        const fromB = blocks.find(x => x.id === c.from);
        const toB = blocks.find(x => x.id === c.to);
        const pts = getEdgePoints(fromB, toB);
        if (!pts) return null;
        const midX = pts.p1.x + (pts.p2.x - pts.p1.x) / 2;
        const midY = pts.p1.y + (pts.p2.y - pts.p1.y) / 2;
        return (
          <g key={c.id} style={{ pointerEvents: 'auto' }}>
            <path d={drawCurve(pts.p1, pts.p2, pts.isHorizontal)} fill="none" stroke="rgba(26,20,16,.2)" strokeWidth="3" markerEnd="url(#arrowhead)" />
            <path d={drawCurve(pts.p1, pts.p2, pts.isHorizontal)} fill="none" stroke="transparent" strokeWidth="15" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onDeleteConnection(c.id); }} />
            <circle cx={midX} cy={midY} r="9" fill="#fff" stroke="var(--ink-line)" strokeWidth="1" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onDeleteConnection(c.id); }} />
            <text x={midX} y={midY} textAnchor="middle" dy="4" fontSize="13" fontWeight="bold" fill="var(--ink-3)" style={{ pointerEvents: 'none', userSelect: 'none' }}>×</text>
          </g>
        );
      })}
      
      {drawingConn && (() => {
        const fromB = blocks.find(x => x.id === drawingConn.from);
        const toB = { x: drawingConn.mouseX, y: drawingConn.mouseY, width: 0, height: 0 };
        const pts = getEdgePoints(fromB, toB);
        if (!pts) return null;
        return <path d={drawCurve(pts.p1, pts.p2, pts.isHorizontal)} fill="none" stroke="var(--accent-orange)" strokeWidth="2.5" strokeDasharray="5 5" markerEnd="url(#arrowhead-drawing)" />;
      })()}
    </svg>
  );
}

export function EmbeddedCanvas({ data, onChange }) {
  const [blocks, setBlocks] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [drawingConn, setDrawingConn] = useState(null); // { from, mouseX, mouseY }
  const boardRef = useRef(null);

  useEffect(() => {
    try {
      const parsed = JSON.parse(data || '{"blocks":[],"connections":[]}');
      setBlocks(parsed.blocks || []);
      setConnections(parsed.connections || []);
    } catch { /* ignore empty/invalid */ }
  }, []);

  const persist = useCallback((b, c) => {
    onChange(JSON.stringify({ blocks: b, connections: c }));
  }, [onChange]);

  // Handle block deletion
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedId) {
        if (document.activeElement && (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT')) return;
        setBlocks(prev => {
          const nb = prev.filter(b => b.id !== selectedId);
          const nc = connections.filter(c => c.from !== selectedId && c.to !== selectedId);
          setConnections(nc);
          persist(nb, nc);
          return nb;
        });
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, connections, persist]);

  const deleteConnection = useCallback((connId) => {
    const nc = connections.filter(c => c.id !== connId);
    setConnections(nc);
    persist(blocks, nc);
  }, [connections, blocks, persist]);

  const addBlock = () => {
    const el = { id: genId(), x: 50 + Math.random() * 50, y: 50 + Math.random() * 50, width: 200, height: 60, content: '' };
    const nb = [...blocks, el];
    setBlocks(nb);
    persist(nb, connections);
  };

  const handleDrag = useCallback((id, x, y) => {
    setBlocks(prev => {
      const nb = prev.map(e => e.id === id ? { ...e, x, y } : e);
      persist(nb, connections);
      return nb;
    });
  }, [connections, persist]);

  const handleResize = useCallback((id, x, y, w, h) => {
    setBlocks(prev => {
      const nb = prev.map(e => e.id === id ? { ...e, x, y, width: w, height: h } : e);
      persist(nb, connections);
      return nb;
    });
  }, [connections, persist]);

  const handleContent = useCallback((id, content) => {
    setBlocks(prev => {
      const nb = prev.map(e => e.id === id ? { ...e, content } : e);
      persist(nb, connections);
      return nb;
    });
  }, [connections, persist]);

  const startConnection = (id) => {
    if (drawingConn) {
      // Complete connection (for click-to-connect)
      if (drawingConn.from !== id) {
        completeConnection(id);
      } else {
        // Cancel if clicked on the same block again
        setDrawingConn(null);
        setIsConnecting(false);
      }
    } else {
      setDrawingConn({ from: id, mouseX: 0, mouseY: 0, startedAt: Date.now() });
    }
  };

  const completeConnection = useCallback((id) => {
    if (drawingConn && drawingConn.from !== id) {
      const nc = [...connections, { id: genId(), from: drawingConn.from, to: id }];
      setConnections(nc);
      persist(blocks, nc);
      setDrawingConn(null);
      setIsConnecting(false);
    }
  }, [drawingConn, connections, blocks, persist]);

  const onPointerMove = (e) => {
    if (drawingConn && boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      setDrawingConn(p => ({ ...p, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top }));
    }
  };

  return (
    <div className="embedded-canvas" contentEditable={false} style={{
      position: 'relative', width: '100%', minHeight: 400, background: 'rgba(255,254,250,0.8)',
      borderRadius: 12, border: '1.5px solid var(--ink-line)', overflow: 'hidden', margin: '16px 0',
      backgroundImage: 'radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)', backgroundSize: '20px 20px',
    }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 20, display: 'flex', gap: 6 }}>
        <button onClick={addBlock} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, background: '#fff', border: '1px solid var(--ink-line)', borderRadius: 6, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>+ Add Widget</button>
        <button onClick={() => setIsConnecting(!isConnecting)} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, background: isConnecting ? 'var(--accent-orange)' : '#fff', color: isConnecting ? '#fff' : 'inherit', border: isConnecting ? 'none' : '1px solid var(--ink-line)', borderRadius: 6, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>↗ Bridge</button>
      </div>

      <div
        ref={boardRef}
        onPointerMove={onPointerMove}
        onMouseUp={() => {
          // If released on background after a drag (give a 200ms grace period for click-to-connect)
          if (drawingConn && Date.now() - drawingConn.startedAt > 200) {
            setDrawingConn(null);
            setIsConnecting(false);
          }
        }}
        onClick={() => { setSelectedId(null); if (drawingConn) { setDrawingConn(null); setIsConnecting(false); } }}
        style={{ width: '100%', height: '100%', minHeight: 400, position: 'relative', cursor: isConnecting ? 'crosshair' : 'default' }}
      >
        <ArrowLayer blocks={blocks} connections={connections} drawingConn={drawingConn} boardRef={boardRef} onDeleteConnection={deleteConnection} />
        
        {blocks.map(el => (
          <MiniBlock
            key={el.id}
            el={el}
            isSelected={selectedId === el.id}
            onSelect={() => setSelectedId(el.id)}
            onDrag={handleDrag}
            onResize={handleResize}
            onContent={handleContent}
            isConnecting={isConnecting}
            startConnection={startConnection}
            completeConnection={completeConnection}
            drawingConn={drawingConn}
          />
        ))}
      </div>
    </div>
  );
}
