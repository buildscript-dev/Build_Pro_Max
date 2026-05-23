import React, { useState, useRef, useCallback } from 'react';
import { Icon, AiOrb } from './Icons';
import { DOCK_ITEMS } from '../../data';

// ─── Icon design system — gradient squircle icons (no CDN, always renders) ───
const ICON_DESIGNS = {
  dashboard: {
    bg: 'linear-gradient(145deg, #5AC8FA 0%, #007AFF 55%, #0051D5 100%)',
    shadow: 'rgba(0,122,255,0.55)',
    icon: 'home',
    iconColor: '#fff',
    specular: 'rgba(255,255,255,0.45)',
  },
  planner: {
    bg: 'linear-gradient(145deg, #5EDE8A 0%, #25A244 55%, #186B30 100%)',
    shadow: 'rgba(37,162,68,0.55)',
    icon: 'planner',
    iconColor: '#fff',
    specular: 'rgba(255,255,255,0.35)',
  },
  notes: {
    bg: 'linear-gradient(145deg, #FFE259 0%, #FFA751 50%, #E8822C 100%)',
    shadow: 'rgba(255,167,81,0.55)',
    icon: 'notes',
    iconColor: 'rgba(90,50,10,0.9)',
    specular: 'rgba(255,255,255,0.5)',
  },
  calendar: {
    bg: 'linear-gradient(145deg, #FF6B6B 0%, #EE1111 55%, #AA0000 100%)',
    shadow: 'rgba(238,17,17,0.55)',
    icon: 'calendar',
    iconColor: '#fff',
    specular: 'rgba(255,255,255,0.4)',
  },
  tasks: {
    bg: 'linear-gradient(145deg, #FF9F5A 0%, #FF6B00 50%, #D94F00 100%)',
    shadow: 'rgba(255,107,0,0.55)',
    icon: 'tasks',
    iconColor: '#fff',
    specular: 'rgba(255,255,255,0.4)',
  },
  contacts: {
    bg: 'linear-gradient(145deg, #78C1FF 0%, #0A74DA 55%, #0050A0 100%)',
    shadow: 'rgba(10,116,218,0.55)',
    icon: 'contacts',
    iconColor: '#fff',
    specular: 'rgba(255,255,255,0.4)',
  },
  files: {
    bg: 'linear-gradient(145deg, #4CD964 0%, #27AE60 55%, #1A7A40 100%)',
    shadow: 'rgba(39,174,96,0.55)',
    icon: 'files',
    iconColor: '#fff',
    specular: 'rgba(255,255,255,0.35)',
  },
  chat: {
    bg: 'linear-gradient(145deg, #65E06A 0%, #28C840 50%, #1A9930 100%)',
    shadow: 'rgba(40,200,64,0.55)',
    icon: 'chat',
    iconColor: '#fff',
    specular: 'rgba(255,255,255,0.45)',
  },
  settings: {
    bg: 'linear-gradient(145deg, #B0BEC5 0%, #607D8B 55%, #37474F 100%)',
    shadow: 'rgba(96,125,139,0.55)',
    icon: 'settings',
    iconColor: '#fff',
    specular: 'rgba(255,255,255,0.3)',
  },
};

const BASE_SIZE = 52;
const GAP = 10;
const MAX_SCALE = 1.8;
const EFFECT_RADIUS = 160;

function getScale(mouseRelX, iconNormalCenterX) {
  if (mouseRelX === null) return 1;
  const dist = Math.abs(mouseRelX - iconNormalCenterX);
  if (dist >= EFFECT_RADIUS) return 1;
  const theta = ((EFFECT_RADIUS - dist) / EFFECT_RADIUS) * Math.PI;
  return 1 + ((1 - Math.cos(theta)) / 2) * (MAX_SCALE - 1);
}

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

// Squircle icon with gradient + specular highlight + glow
function DockIcon({ item, size, scale, isActive }) {
  if (item.isAi) {
    return (
      <div style={{ width: size * 0.82, height: size * 0.82, flexShrink: 0 }}>
        <AiOrb size={size * 0.82} intensity={1 + (scale - 1) * 0.6} />
      </div>
    );
  }

  const d = ICON_DESIGNS[item.id] || ICON_DESIGNS.settings;
  const r = size * 0.82;
  const radius = r * 0.225; // macOS squircle ~22.5%

  return (
    <div style={{
      width: r,
      height: r,
      borderRadius: radius,
      background: d.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0,
      boxShadow: [
        `0 ${Math.round(r * 0.06)}px ${Math.round(r * 0.22)}px ${d.shadow}`,
        `0 1px 0 rgba(255,255,255,0.25) inset`,
        `0 -1px 0 rgba(0,0,0,0.18) inset`,
        isActive ? `0 0 0 2px rgba(255,255,255,0.7)` : '',
      ].filter(Boolean).join(', '),
      filter: scale > 1.2 ? `brightness(1.08) saturate(1.1)` : 'none',
      transition: 'filter 60ms ease',
    }}>
      {/* Specular rim highlight — top-left corner */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '48%',
        background: `linear-gradient(180deg, ${d.specular} 0%, transparent 100%)`,
        borderRadius: `${radius}px ${radius}px 0 0`,
        pointerEvents: 'none',
      }} />
      {/* Icon glyph */}
      <Icon
        name={d.icon}
        size={r * 0.52}
        color={d.iconColor}
        stroke={1.8}
        style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }}
      />
    </div>
  );
}

export function MacOSDock({ active, onSelect, onOpenCmdK, onOpenFocus, focusMode = 'off', hasNotifications = false }) {
  const [mouseRelX, setMouseRelX] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [bouncing, setBouncing] = useState(null);
  const dockRef = useRef(null);
  const moveThrottle = useRef(0);

  const handleMouseMove = useCallback((e) => {
    const now = performance.now();
    if (now - moveThrottle.current < 14) return;
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
  const totalWidth = items.reduce((w, { size }, i) => w + size + (i < items.length - 1 ? GAP : 0), 0);

  return (
    <div
      ref={dockRef}
      className="dock-awards"
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
        padding: `10px 14px 10px`,
        borderRadius: `${Math.max(20, BASE_SIZE * 0.4)}px`,
      }}
    >
      {/* Magnification strip */}
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

              <DockIcon item={item} size={size} scale={scale} isActive={isActive} />

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

              {/* Active dot */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  bottom: -6,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: Math.max(4, size * 0.08),
                  height: Math.max(4, size * 0.08),
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.9)',
                  boxShadow: '0 0 5px rgba(255,255,255,0.7)',
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
        background: 'rgba(255,255,255,0.14)',
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

      {/* ⌘K */}
      <button
        onClick={onOpenCmdK}
        aria-label="Open AI command bar (⌘K)"
        title="AI command bar (⌘K)"
        style={{
          width: BASE_SIZE * 0.72,
          height: BASE_SIZE * 0.72,
          borderRadius: 12,
          background: 'rgba(240,107,28,0.15)',
          border: '0.5px solid rgba(240,107,28,0.32)',
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
          transition: 'background 150ms ease, transform 100ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(240,107,28,0.28)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(240,107,28,0.15)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        ⌘K
      </button>
    </div>
  );
}
