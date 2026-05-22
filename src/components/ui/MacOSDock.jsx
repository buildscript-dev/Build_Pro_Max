import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Icon, AiOrb } from './Icons';
import { DOCK_ITEMS } from '../../data';

// macOS-style icon images mapped to nav screen IDs
const ICON_URLS = {
  dashboard: 'https://cdn.jim-nielsen.com/macos/1024/finder-2021-09-10.png?rf=1024',
  planner:   'https://cdn.jim-nielsen.com/macos/1024/things-2021-06-11.png?rf=1024',
  notes:     'https://cdn.jim-nielsen.com/macos/1024/notes-2021-05-25.png?rf=1024',
  calendar:  'https://cdn.jim-nielsen.com/macos/1024/calendar-2021-04-29.png?rf=1024',
  tasks:     'https://cdn.jim-nielsen.com/macos/1024/reminders-2021-04-29.png?rf=1024',
  contacts:  'https://cdn.jim-nielsen.com/macos/1024/contacts-2021-04-29.png?rf=1024',
  files:     'https://cdn.jim-nielsen.com/macos/1024/terminal-2021-06-03.png?rf=1024',
  chat:      'https://cdn.jim-nielsen.com/macos/1024/messages-2021-05-25.png?rf=1024',
  settings:  'https://cdn.jim-nielsen.com/macos/1024/system-preferences-2021-05-25.png?rf=1024',
};

const BASE_SIZE = 52;
const GAP = 10;
const MAX_SCALE = 1.8;
const EFFECT_RADIUS = 160;

// Cosine-based magnification — same algorithm as macOS Dock
function getScale(mouseRelX, iconNormalCenterX) {
  if (mouseRelX === null) return 1;
  const dist = Math.abs(mouseRelX - iconNormalCenterX);
  if (dist >= EFFECT_RADIUS) return 1;
  const theta = ((EFFECT_RADIUS - dist) / EFFECT_RADIUS) * Math.PI;
  return 1 + ((1 - Math.cos(theta)) / 2) * (MAX_SCALE - 1);
}

// Compute each icon's rendered size + center X accounting for neighbouring magnification
function computeItems(mouseRelX) {
  const scales = DOCK_ITEMS.map((_, i) => {
    const normalCenter = i * (BASE_SIZE + GAP) + BASE_SIZE / 2;
    return getScale(mouseRelX, normalCenter);
  });

  let x = 0;
  return DOCK_ITEMS.map((item, i) => {
    const scale = scales[i];
    const size = BASE_SIZE * scale;
    const cx = x + size / 2;
    x += size + GAP;
    return { item, scale, size, cx };
  });
}

export function MacOSDock({ active, onSelect, onOpenCmdK, onOpenFocus, focusMode = 'off', hasNotifications = false }) {
  const [mouseRelX, setMouseRelX] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [bouncing, setBouncing] = useState(null);
  const dockRef = useRef(null);
  const moveThrottle = useRef(0);

  const handleMouseMove = useCallback((e) => {
    const now = performance.now();
    if (now - moveThrottle.current < 14) return; // ~70fps cap
    moveThrottle.current = now;
    if (dockRef.current) {
      const rect = dockRef.current.getBoundingClientRect();
      setMouseRelX(e.clientX - rect.left);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMouseRelX(null);
    setHoveredId(null);
  }, []);

  const handleClick = useCallback((screenId, e) => {
    e.stopPropagation();
    setBouncing(screenId);
    setTimeout(() => setBouncing(null), 400);
    onSelect(screenId);
  }, [onSelect]);

  const items = computeItems(mouseRelX);

  // Total dock content width (shrinks/grows with magnification)
  const totalWidth = items.reduce((w, { size }, i) => w + size + (i < items.length - 1 ? GAP : 0), 0);
  const paddingH = 14;

  return (
    <div
      ref={dockRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'fixed',
        bottom: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 0,
        padding: `10px ${paddingH}px 10px`,
        background: 'rgba(30, 30, 30, 0.72)',
        backdropFilter: 'blur(28px) saturate(160%)',
        WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        borderRadius: `${Math.max(20, BASE_SIZE * 0.4)}px`,
        border: '0.5px solid rgba(255,255,255,0.14)',
        boxShadow: `
          0 8px 32px rgba(0,0,0,0.5),
          0 2px 8px rgba(0,0,0,0.3),
          inset 0 1px 0 rgba(255,255,255,0.12),
          inset 0 -1px 0 rgba(0,0,0,0.2)
        `,
        willChange: 'width',
        transition: 'width 80ms ease-out',
      }}
    >
      {/* Icon strip — positioned relative for absolute tooltips */}
      <div style={{
        position: 'relative',
        height: BASE_SIZE,
        width: totalWidth,
        transition: 'width 60ms ease-out',
        flexShrink: 0,
      }}>
        {items.map(({ item, scale, size, cx }) => {
          const isActive = active === item.id;
          const isHovered = hoveredId === item.id;
          const isBouncing = bouncing === item.id;
          const hasNotif = hasNotifications && item.id === 'dashboard';
          const lift = (scale - 1) * 22;
          const iconUrl = ICON_URLS[item.id];

          return (
            <div
              key={item.id}
              style={{
                position: 'absolute',
                bottom: 0,
                left: cx - size / 2,
                width: size,
                height: size,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                zIndex: Math.round(scale * 10),
                transform: `translateY(${-lift}px) translateY(${isBouncing ? -10 : 0}px)`,
                transition: mouseRelX !== null
                  ? 'left 60ms ease-out, width 60ms ease-out, height 60ms ease-out, transform 60ms ease-out'
                  : 'left 250ms var(--ease-glass), width 250ms var(--ease-glass), height 250ms var(--ease-glass), transform 250ms var(--ease-glass)',
                cursor: 'pointer',
              }}
              onClick={(e) => handleClick(item.id, e)}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              title={item.label}
            >
              {/* Tooltip */}
              {isHovered && (
                <div style={{
                  position: 'absolute',
                  bottom: size + lift + 10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'rgba(20,20,20,0.92)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  animation: 'pop-in 140ms var(--ease-genie) both',
                  zIndex: 200,
                  border: '0.5px solid rgba(255,255,255,0.12)',
                }}>{item.label}</div>
              )}

              {/* Icon image */}
              {item.isAi ? (
                <div style={{ width: size * 0.78, height: size * 0.78 }}>
                  <AiOrb size={size * 0.78} intensity={1.3} />
                </div>
              ) : (
                <img
                  src={iconUrl}
                  alt={item.label}
                  draggable={false}
                  style={{
                    width: size * 0.82,
                    height: size * 0.82,
                    objectFit: 'contain',
                    filter: `drop-shadow(0 ${scale > 1.2 ? 4 : 2}px ${scale > 1.2 ? 10 : 4}px rgba(0,0,0,${0.25 + (scale - 1) * 0.15}))`,
                    userSelect: 'none',
                    borderRadius: size * 0.18,
                  }}
                  onError={(e) => {
                    // Fallback to Icon if image fails
                    e.target.style.display = 'none';
                    e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
                  }}
                />
              )}

              {/* Notification badge */}
              {hasNotif && (
                <div style={{
                  position: 'absolute',
                  top: '8%',
                  right: '8%',
                  width: Math.max(7, size * 0.13),
                  height: Math.max(7, size * 0.13),
                  borderRadius: '50%',
                  background: 'var(--accent-coral)',
                  boxShadow: '0 0 6px var(--accent-coral), 0 0 0 1.5px rgba(0,0,0,0.3)',
                }} />
              )}

              {/* Active indicator dot */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  bottom: -6,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: Math.max(4, size * 0.08),
                  height: Math.max(4, size * 0.08),
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.85)',
                  boxShadow: '0 0 4px rgba(255,255,255,0.6)',
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{
        width: 0.5,
        height: BASE_SIZE - 12,
        background: 'rgba(255,255,255,0.12)',
        margin: `0 ${GAP + 2}px`,
        alignSelf: 'center',
        flexShrink: 0,
      }} />

      {/* Focus mode indicator */}
      {focusMode !== 'off' && (
        <button
          onClick={onOpenFocus}
          title={`Focus: ${focusMode}`}
          style={{
            width: BASE_SIZE * 0.72,
            height: BASE_SIZE * 0.72,
            borderRadius: 12,
            background: focusMode === 'execution' ? 'rgba(231,64,46,0.2)' : 'rgba(59,130,246,0.2)',
            border: `0.5px solid ${focusMode === 'execution' ? 'rgba(231,64,46,0.4)' : 'rgba(59,130,246,0.4)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: focusMode === 'execution' ? 'var(--accent-coral)' : 'var(--info)',
            flexShrink: 0,
            fontSize: 15,
          }}
        >
          {focusMode === 'execution' ? '⚡' : '🎯'}
        </button>
      )}

      {/* ⌘K command button */}
      <button
        onClick={onOpenCmdK}
        title="AI command bar (⌘K)"
        aria-label="Open AI command bar"
        style={{
          width: BASE_SIZE * 0.72,
          height: BASE_SIZE * 0.72,
          borderRadius: 12,
          background: 'rgba(240,107,28,0.15)',
          border: '0.5px solid rgba(240,107,28,0.3)',
          color: 'var(--accent-orange)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          flexShrink: 0,
          marginLeft: focusMode !== 'off' ? 6 : 0,
          transition: 'background 150ms ease, border-color 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(240,107,28,0.28)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(240,107,28,0.15)';
        }}
      >
        ⌘K
      </button>
    </div>
  );
}
