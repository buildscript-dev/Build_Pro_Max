import React, { useState, useRef, useCallback } from 'react';
import { Icon, AiOrb } from './Icons';
import { DOCK_ITEMS } from '../../data';

// ─── Vivid macOS-style icon designs ──────────────────────────────────────────
const ICON_DESIGNS = {
  dashboard: {
    bg: 'linear-gradient(150deg, #60D0FF 0%, #0A84FF 45%, #004FD4 100%)',
    shadow: 'rgba(10,132,255,0.70)',
    icon: 'home',
    iconColor: '#fff',
    accent: 'rgba(255,255,255,0.55)',
    shimmer: 'rgba(140,210,255,0.30)',
  },
  planner: {
    bg: 'linear-gradient(150deg, #7AE88A 0%, #30D158 45%, #1A8C3A 100%)',
    shadow: 'rgba(48,209,88,0.70)',
    icon: 'planner',
    iconColor: '#fff',
    accent: 'rgba(255,255,255,0.50)',
    shimmer: 'rgba(180,255,200,0.25)',
  },
  notes: {
    bg: 'linear-gradient(150deg, #FFE566 0%, #FFD60A 40%, #FF9F0A 80%, #FF6B00 100%)',
    shadow: 'rgba(255,214,10,0.70)',
    icon: 'notes',
    iconColor: 'rgba(80,40,0,0.92)',
    accent: 'rgba(255,255,255,0.60)',
    shimmer: 'rgba(255,245,150,0.35)',
  },
  calendar: {
    bg: 'linear-gradient(150deg, #FF6E6E 0%, #FF3B30 45%, #C0160D 100%)',
    shadow: 'rgba(255,59,48,0.70)',
    icon: 'calendar',
    iconColor: '#fff',
    accent: 'rgba(255,255,255,0.50)',
    shimmer: 'rgba(255,180,180,0.25)',
  },
  tasks: {
    bg: 'linear-gradient(150deg, #FFB340 0%, #FF9F0A 40%, #FF6B00 80%, #D4410A 100%)',
    shadow: 'rgba(255,159,10,0.70)',
    icon: 'tasks',
    iconColor: '#fff',
    accent: 'rgba(255,255,255,0.50)',
    shimmer: 'rgba(255,220,130,0.30)',
  },
  contacts: {
    bg: 'linear-gradient(150deg, #9B8FFF 0%, #6E5BFF 40%, #5E5CE6 75%, #3634C7 100%)',
    shadow: 'rgba(110,91,255,0.70)',
    icon: 'contacts',
    iconColor: '#fff',
    accent: 'rgba(255,255,255,0.50)',
    shimmer: 'rgba(200,190,255,0.28)',
  },
  files: {
    bg: 'linear-gradient(150deg, #FFD280 0%, #FFA930 45%, #E07B00 100%)',
    shadow: 'rgba(255,169,48,0.70)',
    icon: 'files',
    iconColor: 'rgba(80,40,0,0.88)',
    accent: 'rgba(255,255,255,0.55)',
    shimmer: 'rgba(255,235,160,0.30)',
  },
  chat: {
    bg: 'linear-gradient(150deg, #5DFDCB 0%, #30D158 40%, #00A884 75%, #007A5E 100%)',
    shadow: 'rgba(48,209,88,0.70)',
    icon: 'chat',
    iconColor: '#fff',
    accent: 'rgba(255,255,255,0.50)',
    shimmer: 'rgba(150,255,220,0.28)',
  },
  settings: {
    bg: 'linear-gradient(150deg, #D0D4DA 0%, #9CA3AF 40%, #6B7280 80%, #374151 100%)',
    shadow: 'rgba(107,114,128,0.65)',
    icon: 'settings',
    iconColor: '#fff',
    accent: 'rgba(255,255,255,0.45)',
    shimmer: 'rgba(210,215,225,0.28)',
  },
};

const BASE_SIZE  = 64;   // bigger base
const GAP        = 12;
const MAX_SCALE  = 1.75;
const EFFECT_RADIUS = 170;

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
    const size  = BASE_SIZE * scale;
    const cx    = x + size / 2;
    x += size + GAP;
    return { item, scale, size, cx };
  });
}

// ─── Self-contained squircle icon — no CDN, always crisp ─────────────────────
function DockIcon({ item, size, scale, isActive }) {
  if (item.isAi) {
    return (
      <div style={{ width: size * 0.85, height: size * 0.85, flexShrink: 0 }}>
        <AiOrb size={size * 0.85} intensity={1 + (scale - 1) * 0.7} />
      </div>
    );
  }

  const d      = ICON_DESIGNS[item.id] || ICON_DESIGNS.settings;
  const dim    = size * 0.86;          // icon square side
  const radius = dim * 0.22;           // squircle ~22%
  const glow   = scale > 1.15;

  return (
    <div style={{
      width: dim,
      height: dim,
      borderRadius: radius,
      background: d.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0,
      boxShadow: [
        `0 ${Math.round(dim * 0.08)}px ${Math.round(dim * 0.28)}px ${d.shadow}`,
        `0 2px 0 rgba(255,255,255,0.28) inset`,
        `0 -1px 0 rgba(0,0,0,0.22) inset`,
        glow ? `0 0 ${Math.round(dim * 0.3)}px ${d.shadow}` : '',
        isActive ? `0 0 0 2.5px rgba(255,255,255,0.75)` : '',
      ].filter(Boolean).join(', '),
      transition: 'box-shadow 80ms ease',
    }}>
      {/* Top specular highlight */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '52%',
        background: `linear-gradient(180deg, ${d.accent} 0%, ${d.shimmer} 60%, transparent 100%)`,
        borderRadius: `${radius}px ${radius}px 0 0`,
        pointerEvents: 'none',
      }} />
      {/* Bottom subtle shadow */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '30%',
        background: 'linear-gradient(0deg, rgba(0,0,0,0.18) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />
      {/* Icon glyph */}
      <Icon
        name={d.icon}
        size={dim * 0.50}
        color={d.iconColor}
        stroke={1.9}
        style={{
          position: 'relative', zIndex: 1,
          filter: 'drop-shadow(0 1.5px 3px rgba(0,0,0,0.30))',
        }}
      />
    </div>
  );
}

// ─── Dock ─────────────────────────────────────────────────────────────────────
export function MacOSDock({ active, onSelect, onOpenCmdK, onOpenFocus, focusMode = 'off', hasNotifications = false }) {
  const [mouseRelX, setMouseRelX] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [bouncing,  setBouncing]  = useState(null);
  const dockRef      = useRef(null);
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
    setTimeout(() => setBouncing(null), 420);
    onSelect(screenId);
  }, [onSelect]);

  const items      = computeItems(mouseRelX);
  const totalWidth = items.reduce((w, { size }, i) => w + size + (i < items.length - 1 ? GAP : 0), 0);

  return (
    <div
      ref={dockRef}
      className="dock-awards"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-end',
        padding: `12px 16px 12px`,
        borderRadius: `${Math.max(24, BASE_SIZE * 0.38)}px`,
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
          const isActive   = active === item.id;
          const isHovered  = hoveredId === item.id;
          const isBouncing = bouncing === item.id;
          const hasNotif   = hasNotifications && item.id === 'dashboard';
          const lift       = (scale - 1) * 26;

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
                transform: `translateY(${-lift}px) translateY(${isBouncing ? -12 : 0}px)`,
                transition: mouseRelX !== null
                  ? 'left 55ms ease-out, width 55ms ease-out, height 55ms ease-out, transform 55ms ease-out'
                  : 'left 260ms var(--ease-glass), width 260ms var(--ease-glass), height 260ms var(--ease-glass), transform 260ms var(--ease-glass)',
                cursor: 'pointer',
              }}
              onClick={(e) => handleClick(item.id, e)}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Label tooltip */}
              {isHovered && (
                <div style={{
                  position: 'absolute',
                  bottom: size + lift + 12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '5px 12px',
                  borderRadius: 9,
                  background: 'rgba(18,18,18,0.94)',
                  color: 'rgba(255,255,255,0.92)',
                  fontSize: 12,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
                  animation: 'pop-in 120ms var(--ease-genie) both',
                  zIndex: 200,
                  border: '0.5px solid rgba(255,255,255,0.14)',
                  letterSpacing: '0.01em',
                }}>{item.label}</div>
              )}

              <DockIcon item={item} size={size} scale={scale} isActive={isActive} />

              {/* Notification badge */}
              {hasNotif && (
                <div style={{
                  position: 'absolute',
                  top: '7%', right: '7%',
                  width: Math.max(8, size * 0.14),
                  height: Math.max(8, size * 0.14),
                  borderRadius: '50%',
                  background: '#FF3B30',
                  boxShadow: '0 0 8px rgba(255,59,48,0.8), 0 0 0 2px rgba(0,0,0,0.35)',
                }} />
              )}

              {/* Active dot */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  bottom: -7,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: Math.max(4, size * 0.09),
                  height: Math.max(4, size * 0.09),
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.95)',
                  boxShadow: '0 0 6px rgba(255,255,255,0.8)',
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{
        width: 0.5,
        height: BASE_SIZE - 10,
        background: 'rgba(255,255,255,0.16)',
        margin: `0 ${GAP + 2}px`,
        alignSelf: 'center',
        flexShrink: 0,
      }} />

      {/* Focus indicator */}
      {focusMode !== 'off' && (
        <button
          onClick={onOpenFocus}
          title={`Focus: ${focusMode}`}
          style={{
            width: BASE_SIZE * 0.74,
            height: BASE_SIZE * 0.74,
            borderRadius: 14,
            background: focusMode === 'execution' ? 'rgba(255,59,48,0.22)' : 'rgba(10,132,255,0.22)',
            border: `0.5px solid ${focusMode === 'execution' ? 'rgba(255,59,48,0.45)' : 'rgba(10,132,255,0.45)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: focusMode === 'execution' ? '#FF3B30' : '#0A84FF',
            flexShrink: 0,
            fontSize: 17,
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
          width: BASE_SIZE * 0.74,
          height: BASE_SIZE * 0.74,
          borderRadius: 14,
          background: 'linear-gradient(145deg, rgba(255,159,10,0.22), rgba(255,107,0,0.18))',
          border: '0.5px solid rgba(255,159,10,0.38)',
          color: '#FF9F0A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 12.5,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          flexShrink: 0,
          marginLeft: focusMode !== 'off' ? 8 : 0,
          transition: 'background 150ms ease, transform 100ms ease, box-shadow 150ms ease',
          boxShadow: '0 2px 8px rgba(255,159,10,0.25)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255,159,10,0.38), rgba(255,107,0,0.30))';
          e.currentTarget.style.transform = 'scale(1.06)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,159,10,0.45)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255,159,10,0.22), rgba(255,107,0,0.18))';
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(255,159,10,0.25)';
        }}
      >
        ⌘K
      </button>
    </div>
  );
}
