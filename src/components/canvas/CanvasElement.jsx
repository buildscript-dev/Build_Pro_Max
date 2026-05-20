import React, { useRef, useCallback, useState, useEffect } from 'react';

const HANDLE_SIZE = 10;
const MIN_SIZE = 40;

function ContainerInner({ layout, content, width, height }) {
  const pad = 14;
  const innerW = width - pad * 2;
  const imgW = 80;
  switch (layout) {
    case 'hero':
      return (
        <div style={{ display: 'flex', gap: 12, height: '100%', padding: pad }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2, marginBottom: 6, color: 'var(--ink-1)' }}>
              {content.header || 'Big Idea'}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--ink-2)' }}>
              {content.paragraph || ''}
            </div>
          </div>
          {content.imageUrl && (
            <div style={{ width: imgW, height: imgW, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
              <img src={content.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
        </div>
      );
    case 'heading-only':
      return (
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: pad }}>
          <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15, color: 'var(--ink-1)', letterSpacing: '-0.02em' }}>
            {content.header || 'Section Title'}
          </div>
        </div>
      );
    case 'text-only':
      return (
        <div style={{ padding: pad, height: '100%' }}>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--ink-2)' }}>
            {content.paragraph || 'Start writing here...'}
          </div>
        </div>
      );
    case 'two-column':
      return (
        <div style={{ display: 'flex', gap: 12, height: '100%', padding: pad }}>
          <div style={{ flex: 1, background: 'rgba(99,102,241,.04)', borderRadius: 6, padding: 10, fontSize: 12, lineHeight: 1.6, color: 'var(--ink-2)' }}>
            {content.left || 'Left column'}
          </div>
          <div style={{ flex: 1, background: 'rgba(245,165,36,.04)', borderRadius: 6, padding: 10, fontSize: 12, lineHeight: 1.6, color: 'var(--ink-2)' }}>
            {content.right || 'Right column'}
          </div>
        </div>
      );
    case 'card':
      return (
        <div style={{ padding: pad, height: '100%' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2, marginBottom: 8, color: 'var(--ink-1)' }}>
                {content.header || 'Card'}
              </div>
              {(content.items || []).map((item, i) => (
                <div key={i} style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--ink-2)', paddingLeft: 12, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0 }}>•</span> {item}
                </div>
              ))}
            </div>
            {content.imageUrl && (
              <div style={{ width: 60, height: 60, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                <img src={content.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>
        </div>
      );
    case 'quote':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: pad, paddingLeft: pad + 16, borderLeft: '3px solid var(--accent-orange)', margin: pad }}>
          <div style={{ fontSize: 14, fontStyle: 'italic', lineHeight: 1.5, color: 'var(--ink-1)', marginBottom: 6 }}>
            "{content.text || 'Quote'}"
          </div>
          {content.attribution && (
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>
              {content.attribution}
            </div>
          )}
        </div>
      );
    default:
      return (
        <div style={{ padding: pad, fontSize: 12, color: 'var(--ink-2)' }}>
          {content.header || content.paragraph || 'Container'}
        </div>
      );
  }
}

export function CanvasElement({ element, isSelected, onSelect, onDrag, onResize, onRotate, onContentChange }) {
  const dragRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, elX: 0, elY: 0 });
  const resizeDir = useRef(null);
  const resizeStart = useRef({ x: 0, y: 0, elW: 0, elH: 0, elX: 0, elY: 0 });
  const rotateStart = useRef(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [wobble, setWobble] = useState({ scale: 1, rotate: 0 });
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect();

    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, elX: element.x, elY: element.y };
    setWobble({ scale: 1.05, rotate: -1.5 });

    const handleMouseMove = (ev) => {
      if (!isDragging.current) return;
      const dx = (ev.clientX - dragStart.current.x) / (element.parentZoom || 1);
      const dy = (ev.clientY - dragStart.current.y) / (element.parentZoom || 1);
      onDrag(dx, dy);
      dragStart.current.elX = element.x + dx;
      dragStart.current.elY = element.y + dy;
      dragStart.current.x = ev.clientX;
      dragStart.current.y = ev.clientY;
      const wobbleX = Math.sin((element.x + dx) * 0.05) * 1.5;
      setWobble({ scale: 1.05 + Math.sin((element.x + dx) * 0.1) * 0.03, rotate: wobbleX });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      setWobble({ scale: 1, rotate: 0 });
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [element, onSelect, onDrag]);

  const handleResizeStart = useCallback((dir, e) => {
    e.stopPropagation();
    e.preventDefault();
    resizeDir.current = dir;
    resizeStart.current = { x: e.clientX, y: e.clientY, elW: element.width, elH: element.height, elX: element.x, elY: element.y };

    const handleMouseMove = (ev) => {
      const dx = (ev.clientX - resizeStart.current.x) / (element.parentZoom || 1);
      const dy = (ev.clientY - resizeStart.current.y) / (element.parentZoom || 1);
      let newW = resizeStart.current.elW;
      let newH = resizeStart.current.elH;
      let newX = resizeStart.current.elX;
      let newY = resizeStart.current.elY;

      if (dir.includes('e')) newW = Math.max(MIN_SIZE, resizeStart.current.elW + dx);
      if (dir.includes('w')) { newW = Math.max(MIN_SIZE, resizeStart.current.elW - dx); newX = resizeStart.current.elX + (resizeStart.current.elW - newW); }
      if (dir.includes('s')) newH = Math.max(MIN_SIZE, resizeStart.current.elH + dy);
      if (dir.includes('n')) { newH = Math.max(MIN_SIZE, resizeStart.current.elH - dy); newY = resizeStart.current.elY + (resizeStart.current.elH - newH); }

      onResize(newW, newH);
    };

    const handleMouseUp = () => {
      resizeDir.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [element, onResize]);

  const handleRotateStart = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;
    rotateStart.current = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) - element.rotation;

    const handleMouseMove = (ev) => {
      const angle = Math.atan2(ev.clientY - (element.y + element.height / 2), ev.clientX - (element.x + element.width / 2)) * (180 / Math.PI) - rotateStart.current;
      onRotate(angle);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [element, onRotate]);

  const handleDoubleClick = useCallback((e) => {
    if (element.type === 'text' || element.type === 'sticky') {
      e.stopPropagation();
      setEditContent(element.content || '');
      setIsEditing(true);
    }
  }, [element]);

  const saveEdit = useCallback(() => {
    setIsEditing(false);
    if (editContent !== element.content) {
      onContentChange(editContent);
    }
  }, [editContent, element.content, onContentChange]);

  const wobblyStyle = isDragging.current || resizeDir.current ? {
    transform: `scale(${wobble.scale}) rotate(${wobble.rotate}deg)`,
    transition: 'none',
  } : {
    transition: 'transform 80ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 80ms ease',
  };

  const content = () => {
    switch (element.type) {
      case 'image':
        return (
          <img
            src={element.url}
            alt={element.alt || ''}
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 4, pointerEvents: 'none' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        );
      case 'text':
        return isEditing ? (
          <textarea
            ref={inputRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => { if (e.key === 'Escape') saveEdit(); }}
            style={{
              all: 'unset', width: '100%', height: '100%', fontSize: element.fontSize || 15,
              color: element.color || 'var(--ink-1)', lineHeight: 1.5, resize: 'none',
              wordWrap: 'break-word', overflow: 'hidden',
            }}
          />
        ) : (
          <div style={{
            fontSize: element.fontSize || 15, color: element.color || 'var(--ink-1)',
            lineHeight: 1.5, wordWrap: 'break-word', pointerEvents: 'none',
            whiteSpace: 'pre-wrap', width: '100%', height: '100%', overflow: 'hidden',
          }}>
            {element.content || 'Double-click to edit'}
          </div>
        );
      case 'sticky':
        return (
          <div style={{
            width: '100%', height: '100%', background: element.color || '#fef3c7',
            borderRadius: 4, padding: 8, display: 'flex', flexDirection: 'column',
            boxShadow: '0 1px 3px rgba(0,0,0,.08)',
          }}>
            {isEditing ? (
              <textarea
                ref={inputRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={(e) => { if (e.key === 'Escape') saveEdit(); }}
                style={{
                  all: 'unset', width: '100%', height: '100%', fontSize: 14,
                  lineHeight: 1.5, resize: 'none', wordWrap: 'break-word',
                }}
              />
            ) : (
              <div
                onDoubleClick={handleDoubleClick}
                style={{
                  fontSize: 14, lineHeight: 1.5, wordWrap: 'break-word',
                  width: '100%', height: '100%', overflow: 'hidden', cursor: 'pointer',
                }}
              >
                {element.content || 'Double-click to edit'}
              </div>
            )}
          </div>
        );
      case 'shape':
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${element.width} ${element.height}`}>
            {element.shape === 'circle' ? (
              <circle cx={element.width / 2} cy={element.height / 2} r={Math.min(element.width, element.height) / 2 - 2}
                fill="none" stroke={element.color || 'var(--ink-line)'} strokeWidth={2} />
            ) : element.shape === 'diamond' ? (
              <polygon points={`${element.width / 2},2 ${element.width - 2},${element.height / 2} ${element.width / 2},${element.height - 2} 2,${element.height / 2}`}
                fill="none" stroke={element.color || 'var(--ink-line)'} strokeWidth={2} />
            ) : (
              <rect x={2} y={2} width={element.width - 4} height={element.height - 4} rx={4}
                fill="none" stroke={element.color || 'var(--ink-line)'} strokeWidth={2} />
            )}
          </svg>
        );
      case 'container':
        return (
          <ContainerInner
            layout={element.layout}
            content={element.content || {}}
            width={element.width}
            height={element.height}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex || 1,
        cursor: isDragging.current ? 'grabbing' : 'grab',
        ...wobblyStyle,
        boxShadow: isDragging.current
          ? '0 12px 40px rgba(0,0,0,.15), 0 4px 12px rgba(0,0,0,.1)'
          : isSelected
          ? '0 2px 8px rgba(0,0,0,.08), 0 0 0 2px rgba(99,102,241,.3)'
          : '0 1px 4px rgba(0,0,0,.06)',
        borderRadius: element.type === 'sticky' ? 2 : element.type === 'shape' ? 0 : element.type === 'container' ? 10 : 6,
        background: element.type === 'sticky' ? 'transparent' : element.type === 'text' ? 'rgba(255,255,255,.8)' : element.type === 'container' ? '#fff' : 'transparent',
        backdropFilter: element.type === 'text' ? 'blur(4px)' : 'none',
        border: element.type === 'container' ? '0.5px solid var(--ink-line)' : 'none',
        overflow: 'hidden',
        userSelect: 'none',
        willChange: isDragging.current ? 'transform' : 'auto',
      }}
    >
      {content()}
      {isSelected && (
        <>
          {['nw', 'ne', 'sw', 'se'].map(dir => (
            <div key={dir}
              onMouseDown={(e) => handleResizeStart(dir, e)}
              style={{
                position: 'absolute',
                [dir.includes('n') ? 'top' : 'bottom']: -HANDLE_SIZE / 2,
                [dir.includes('w') ? 'left' : 'right']: -HANDLE_SIZE / 2,
                width: HANDLE_SIZE, height: HANDLE_SIZE,
                background: '#fff', border: '2px solid #6366f1',
                borderRadius: 2, cursor: `${dir}-resize`, zIndex: 10,
              }}
            />
          ))}
          {['n', 's', 'e', 'w'].map(dir => (
            <div key={dir}
              onMouseDown={(e) => handleResizeStart(dir, e)}
              style={{
                position: 'absolute',
                [dir === 'n' ? 'top' : dir === 's' ? 'bottom' : 'top']: dir === 'n' || dir === 's' ? -HANDLE_SIZE / 2 : '50%',
                [dir === 'w' ? 'left' : dir === 'e' ? 'right' : 'left']: dir === 'w' || dir === 'e' ? -HANDLE_SIZE / 2 : '50%',
                transform: dir === 'n' || dir === 's' ? 'translateX(-50%)' : 'translateY(-50%)',
                width: dir === 'n' || dir === 's' ? 20 : HANDLE_SIZE,
                height: dir === 'e' || dir === 'w' ? 20 : HANDLE_SIZE,
                background: '#fff', border: '2px solid #6366f1',
                borderRadius: 2, cursor: `${dir}-resize`, zIndex: 10,
                marginTop: dir === 'n' ? -5 : dir === 's' ? 5 : 0,
              }}
            />
          ))}
          <div
            onMouseDown={handleRotateStart}
            style={{
              position: 'absolute', bottom: -28, left: '50%', transform: 'translateX(-50%)',
              width: 20, height: 20, borderRadius: '50%',
              background: '#6366f1', cursor: 'grab', zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
