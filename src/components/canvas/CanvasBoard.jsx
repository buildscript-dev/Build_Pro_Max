import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CanvasElement } from './CanvasElement';
import { CanvasConnector } from './CanvasConnector';
import { CanvasDraw } from './CanvasDraw';
import { CanvasToolbar } from './CanvasToolbar';
import { createElement, createConnector, createStroke, hitTest, genId } from '../../services/canvasEngine';

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 4;

export function CanvasBoard({ elements: externalElements, onElementsChange }) {
  const [elements, setElements] = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [strokes, setStrokes] = useState([]);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [tool, setTool] = useState('select');
  const [activeColor, setActiveColor] = useState('#374151');
  const [activeWidth, setActiveWidth] = useState(3);
  const [connecting, setConnecting] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (externalElements && externalElements.length > 0) {
      setElements(externalElements);
    }
  }, [externalElements]);

  const syncToParent = useCallback((els) => {
    setElements(els);
    onElementsChange?.(els);
  }, [onElementsChange]);

  const screenToCanvas = useCallback((sx, sy) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: sx, y: sy };
    return {
      x: (sx - rect.left - viewport.x) / viewport.zoom,
      y: (sy - rect.top - viewport.y) / viewport.zoom,
    };
  }, [viewport]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const delta = -e.deltaY * 0.001;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.zoom * (1 + delta)));
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        setViewport(prev => ({
          x: mx - (mx - prev.x) * (newZoom / prev.zoom),
          y: my - (my - prev.y) * (newZoom / prev.zoom),
          zoom: newZoom,
        }));
      }
    } else {
      setViewport(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  }, [viewport]);

  const handleMouseDown = useCallback((e) => {
    if (e.button === 1 || (e.button === 0 && (e.shiftKey || tool === 'hand'))) {
      isPanning.current = true;
      panStart.current = { x: e.clientX - viewport.x, y: e.clientY - viewport.y };
      return;
    }
    if (tool === 'pen' || tool === 'marker' || tool === 'highlighter') {
      const pt = screenToCanvas(e.clientX, e.clientY);
      setIsDrawing(true);
      setStrokes(prev => [...prev, createStroke([pt], tool, activeColor, activeWidth)]);
      return;
    }
    if (tool === 'image') {
      const pt = screenToCanvas(e.clientX, e.clientY);
      const url = window.prompt('Paste image URL:');
      if (url) {
        const el = createElement('image', pt.x - 100, pt.y - 100, { url });
        const next = [...elements, el];
        setSelectedId(el.id);
        syncToParent(next);
      }
      setTool('select');
      return;
    }
    if (tool === 'text') {
      const pt = screenToCanvas(e.clientX, e.clientY);
      const el = createElement('text', pt.x - 80, pt.y - 20, { content: 'New text' });
      const next = [...elements, el];
      setSelectedId(el.id);
      syncToParent(next);
      setTool('select');
      return;
    }
    if (tool === 'sticky') {
      const pt = screenToCanvas(e.clientX, e.clientY);
      const el = createElement('sticky', pt.x - 90, pt.y - 60, { content: '' });
      const next = [...elements, el];
      setSelectedId(el.id);
      syncToParent(next);
      setTool('select');
      return;
    }
    if (tool.startsWith && tool.startsWith('container-')) {
      const layout = tool.replace('container-', '');
      const pt = screenToCanvas(e.clientX, e.clientY);
      const el = createElement('container', pt.x - 150, pt.y - 80, { layout });
      const next = [...elements, el];
      setSelectedId(el.id);
      syncToParent(next);
      setTool('select');
      return;
    }
    if (tool === 'connector') {
      const pt = screenToCanvas(e.clientX, e.clientY);
      const hit = hitTest(pt.x, pt.y, elements);
      if (hit) {
        if (!connecting) {
          setConnecting(hit.id);
        } else if (hit.id !== connecting) {
          const conn = createConnector(connecting, hit.id);
          setConnectors(prev => [...prev, conn]);
          setConnecting(null);
        }
      } else if (connecting) {
        setConnecting(null);
      }
      return;
    }
    setSelectedId(null);
  }, [tool, elements, viewport, connecting, activeColor, activeWidth, screenToCanvas, syncToParent]);

  const handleMouseMove = useCallback((e) => {
    if (isPanning.current) {
      setViewport(prev => ({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
        zoom: prev.zoom,
      }));
      return;
    }
    if (isDrawing && (tool === 'pen' || tool === 'marker' || tool === 'highlighter')) {
      const pt = screenToCanvas(e.clientX, e.clientY);
      setStrokes(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last) last.points = [...last.points, { x: pt.x, y: pt.y }];
        return next;
      });
    }
  }, [isDrawing, tool, screenToCanvas]);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    setIsDrawing(false);
    if (tool === 'connector' && connecting) setConnecting(null);
  }, [tool, connecting]);

  const handleElementDrag = useCallback((id, dx, dy) => {
    setElements(prev => prev.map(e =>
      e.id === id ? { ...e, x: e.x + dx, y: e.y + dy, zIndex: Date.now() } : e
    ));
  }, []);

  const handleElementResize = useCallback((id, w, h) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, width: Math.max(40, w), height: Math.max(40, h) } : e));
  }, []);

  const handleElementRotate = useCallback((id, angle) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, rotation: angle } : e));
  }, []);

  const handleElementContent = useCallback((id, content) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, content } : e));
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setElements(prev => prev.filter(e => e.id !== selectedId));
    setConnectors(prev => prev.filter(c => c.fromId !== selectedId && c.toId !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.contentEditable === 'true') return;
        deleteSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleteSelected]);

  const gridSize = 30;
  const gridLines = [];
  for (let x = -2000; x < 2000; x += gridSize) {
    gridLines.push({ x1: x, y1: -2000, x2: x, y2: 2000 });
  }
  for (let y = -2000; y < 2000; y += gridSize) {
    gridLines.push({ x1: -2000, y1: y, x2: 2000, y2: y });
  }

  const selectedEl = elements.find(e => e.id === selectedId);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#f8f7f4' }}>
      <CanvasToolbar
        tool={tool}
        onToolChange={setTool}
        activeColor={activeColor}
        onColorChange={setActiveColor}
        activeWidth={activeWidth}
        onWidthChange={setActiveWidth}
        zoom={viewport.zoom}
        onZoomIn={() => setViewport(prev => ({ ...prev, zoom: Math.min(MAX_ZOOM, prev.zoom * 1.2) }))}
        onZoomOut={() => setViewport(prev => ({ ...prev, zoom: Math.max(MIN_ZOOM, prev.zoom / 1.2) }))}
        onResetView={() => setViewport({ x: 0, y: 0, zoom: 1 })}
        elementCount={elements.length}
        connectorCount={connectors.length}
      />
      {connecting && (
        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          padding: '6px 16px', borderRadius: 99, background: 'rgba(99,102,241,.12)',
          color: '#6366f1', fontSize: 12, fontWeight: 600, zIndex: 100, pointerEvents: 'none',
        }}>
          Click another element to connect
        </div>
      )}
      <div
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          width: '100%', height: '100%', cursor: tool === 'hand' ? 'grab' : tool === 'pen' || tool === 'marker' || tool === 'highlighter' ? 'crosshair' : 'default',
          position: 'relative', overflow: 'hidden',
        }}
      >
        <svg
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: '0 0', pointerEvents: 'none',
          }}
        >
          {gridLines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="rgba(0,0,0,.04)" strokeWidth={0.5} />
          ))}
          <CanvasConnector connectors={connectors} elements={elements} />
          <CanvasDraw strokes={strokes} />
        </svg>
        <div
          style={{
            position: 'absolute', top: 0, left: 0,
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {elements.map(el => (
            <CanvasElement
              key={el.id}
              element={el}
              isSelected={el.id === selectedId}
              onSelect={() => setSelectedId(el.id)}
              onDrag={(dx, dy) => handleElementDrag(el.id, dx, dy)}
              onResize={(w, h) => handleElementResize(el.id, w, h)}
              onRotate={(angle) => handleElementRotate(el.id, angle)}
              onContentChange={(content) => handleElementContent(el.id, content)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
