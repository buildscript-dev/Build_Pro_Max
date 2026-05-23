import React, { useState, useRef, useCallback } from 'react';
import { AiOrb } from './Icons';
import { DOCK_ITEMS } from '../../data';

// ─── Date constants for Calendar icon ────────────────────────────────────────
const _NOW        = new Date();
const TODAY_NUM   = _NOW.getDate();
const MONTH_ABBR  = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][_NOW.getMonth()];
const FIRST_DOW   = new Date(_NOW.getFullYear(), _NOW.getMonth(), 1).getDay();
const DAYS_IN_MO  = new Date(_NOW.getFullYear(), _NOW.getMonth() + 1, 0).getDate();
const CAL_GRID    = Array.from({ length: 6 }, (_, row) =>
  Array.from({ length: 7 }, (_, col) => {
    const n = row * 7 + col - FIRST_DOW + 1;
    return n >= 1 && n <= DAYS_IN_MO ? n : null;
  })
);

// ─── Gear path for Settings icon (8-tooth cog, evenodd center hole) ───────────
const GEAR_PATH = (() => {
  const cx = 50, cy = 50, teeth = 8, outerR = 37, innerR = 27, holeR = 13;
  const outer = Array.from({ length: teeth * 2 }, (_, i) => {
    const a = (i * Math.PI) / teeth - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    return `${i === 0 ? 'M' : 'L'} ${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ') + ' Z';
  const hole = Array.from({ length: 33 }, (_, i) => {
    const a = (-i / 32) * Math.PI * 2;
    return `${i === 0 ? 'M' : 'L'} ${(cx + holeR * Math.cos(a)).toFixed(2)} ${(cy + holeR * Math.sin(a)).toFixed(2)}`;
  }).join(' ') + ' Z';
  return `${outer} ${hole}`;
})();

// ─── macOS icon SVG art ───────────────────────────────────────────────────────

function FinderArt() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="i-finder" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7ED8FF"/>
          <stop offset="100%" stopColor="#1270D6"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#i-finder)"/>
      {/* Left face half — darker blue */}
      <path d="M50 9 C26 9 12 26 12 50 C12 74 26 91 50 91 Z" fill="#1A55A8"/>
      {/* Right face half — lighter blue */}
      <path d="M50 9 C74 9 88 26 88 50 C88 74 74 91 50 91 Z" fill="#3D8CD8"/>
      {/* Center divider */}
      <line x1="50" y1="9" x2="50" y2="91" stroke="rgba(0,0,0,0.12)" strokeWidth="1"/>
      {/* Left eye white */}
      <ellipse cx="33" cy="42" rx="10" ry="12" fill="white"/>
      {/* Right eye white */}
      <ellipse cx="67" cy="42" rx="10" ry="12" fill="white"/>
      {/* Left pupil */}
      <ellipse cx="35" cy="44" rx="6" ry="7" fill="#0D0E25"/>
      {/* Right pupil */}
      <ellipse cx="69" cy="44" rx="6" ry="7" fill="#0D0E25"/>
      {/* Eye shine highlights */}
      <ellipse cx="31" cy="39" rx="2.5" ry="3.5" fill="white" opacity="0.55"/>
      <ellipse cx="65" cy="39" rx="2.5" ry="3.5" fill="white" opacity="0.55"/>
      {/* Smile */}
      <path d="M28 65 Q50 83 72 65" fill="none" stroke="white" strokeWidth="5.5" strokeLinecap="round"/>
    </svg>
  );
}

function PlannerArt() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#F5F5F0"/>
      {/* Completed top item — orange circle with check */}
      <circle cx="24" cy="25" r="11" fill="#FF9F0A"/>
      <path d="M19 25 L22.5 29 L29 21" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="41" y="21" width="44" height="6" rx="3" fill="#2C2C2E" opacity="0.70"/>
      <rect x="41" y="30" width="30" height="4" rx="2" fill="#8E8E93" opacity="0.40"/>
      {/* Divider */}
      <line x1="14" y1="43" x2="88" y2="43" stroke="rgba(0,0,0,0.07)" strokeWidth="1"/>
      {/* Item 2 */}
      <circle cx="24" cy="57" r="9.5" fill="none" stroke="#FF3B30" strokeWidth="2.5"/>
      <rect x="41" y="53" width="44" height="6" rx="3" fill="#2C2C2E" opacity="0.65"/>
      <rect x="41" y="62" width="28" height="4" rx="2" fill="#8E8E93" opacity="0.35"/>
      {/* Item 3 */}
      <circle cx="24" cy="78" r="9.5" fill="none" stroke="#30D158" strokeWidth="2.5"/>
      <rect x="41" y="74" width="38" height="6" rx="3" fill="#2C2C2E" opacity="0.55"/>
      <rect x="41" y="83" width="50" height="4" rx="2" fill="#8E8E93" opacity="0.30"/>
    </svg>
  );
}

function NotesArt() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="i-notes" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE840"/>
          <stop offset="100%" stopColor="#F5A800"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#i-notes)"/>
      {/* Paper drop shadow */}
      <rect x="16" y="17" width="70" height="72" rx="5" fill="rgba(0,0,0,0.10)"/>
      {/* Paper */}
      <rect x="14" y="15" width="70" height="72" rx="5" fill="white" opacity="0.97"/>
      {/* Yellow header strip */}
      <rect x="14" y="15" width="70" height="22" rx="5" fill="#FFD60A"/>
      <rect x="14" y="28" width="70" height="9" fill="#FFD60A"/>
      {/* Header / title text bar */}
      <rect x="22" y="40" width="38" height="5.5" rx="2.5" fill="#3A3A3A" opacity="0.62"/>
      {/* Ruled lines */}
      <line x1="22" y1="50" x2="76" y2="50" stroke="#E8E8E8" strokeWidth="1.5"/>
      <line x1="22" y1="60" x2="76" y2="60" stroke="#E8E8E8" strokeWidth="1.5"/>
      <line x1="22" y1="70" x2="76" y2="70" stroke="#E8E8E8" strokeWidth="1.5"/>
      <line x1="22" y1="80" x2="76" y2="80" stroke="#E8E8E8" strokeWidth="1.5"/>
      {/* Body text bars */}
      <rect x="22" y="53" width="52" height="3.5" rx="1.5" fill="#B0B0B0" opacity="0.50"/>
      <rect x="22" y="63" width="44" height="3.5" rx="1.5" fill="#B0B0B0" opacity="0.42"/>
      <rect x="22" y="73" width="56" height="3.5" rx="1.5" fill="#B0B0B0" opacity="0.42"/>
      <rect x="22" y="83" width="30" height="3.5" rx="1.5" fill="#B0B0B0" opacity="0.35"/>
    </svg>
  );
}

function CalendarArt() {
  const COL_X = [9, 23, 37, 51, 65, 79, 93];
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="white"/>
      {/* Red header */}
      <rect x="0" y="0" width="100" height="34" fill="#FF3B30"/>
      {/* Month label */}
      <text x="50" y="14" textAnchor="middle" fill="rgba(255,255,255,0.82)"
        fontSize="9" fontWeight="600" fontFamily="-apple-system,Helvetica,Arial,sans-serif" letterSpacing="2">
        {MONTH_ABBR}
      </text>
      {/* Date number */}
      <text x="50" y="31" textAnchor="middle" fill="white"
        fontSize="18" fontWeight="200" fontFamily="-apple-system,Helvetica,Arial,sans-serif">
        {TODAY_NUM}
      </text>
      {/* Day-of-week labels */}
      {['S','M','T','W','T','F','S'].map((d, i) => (
        <text key={i} x={COL_X[i]} y="46" textAnchor="middle" fill="#8E8E93"
          fontSize="6.5" fontWeight="600" fontFamily="-apple-system,Helvetica,Arial,sans-serif">{d}</text>
      ))}
      {/* Separator */}
      <line x1="4" y1="49" x2="96" y2="49" stroke="#E5E5EA" strokeWidth="0.8"/>
      {/* Calendar date grid */}
      {CAL_GRID.map((row, ri) =>
        row.map((n, ci) => {
          if (!n) return null;
          const x = COL_X[ci];
          const y = 57 + ri * 9;
          const isToday = n === TODAY_NUM;
          const isWeekend = ci === 0 || ci === 6;
          return isToday ? (
            <g key={`${ri}-${ci}`}>
              <circle cx={x} cy={y - 2.5} r="5" fill="#FF3B30"/>
              <text x={x} y={y + 2} textAnchor="middle" fill="white"
                fontSize="6.5" fontWeight="700" fontFamily="-apple-system,Helvetica,Arial,sans-serif">{n}</text>
            </g>
          ) : (
            <text key={`${ri}-${ci}`} x={x} y={y + 2} textAnchor="middle"
              fill={isWeekend ? '#FF3B30' : '#1C1C1E'}
              fontSize="6.5" fontFamily="-apple-system,Helvetica,Arial,sans-serif">{n}</text>
          );
        })
      )}
    </svg>
  );
}

function TasksArt() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="i-tasks" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFB340"/>
          <stop offset="60%" stopColor="#FF9F0A"/>
          <stop offset="100%" stopColor="#FF6B00"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#i-tasks)"/>
      {/* Rounded frame */}
      <rect x="16" y="18" width="68" height="68" rx="14" fill="rgba(255,255,255,0.16)"/>
      {/* Large checkmark */}
      <path d="M28 52 L43 68 L72 34"
        fill="none" stroke="white" strokeWidth="9"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ContactsArt() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="i-contacts-bg" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E8ECF2"/>
          <stop offset="100%" stopColor="#C8D0DE"/>
        </linearGradient>
        <linearGradient id="i-contacts-av" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5AC8FA"/>
          <stop offset="100%" stopColor="#0A84FF"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#i-contacts-bg)"/>
      {/* Book body */}
      <rect x="16" y="8" width="68" height="84" rx="6" fill="white" opacity="0.95"/>
      {/* Left spine */}
      <rect x="16" y="8" width="14" height="84" rx="4" fill="#CDD3DF"/>
      {/* Spine binding rings */}
      <rect x="23" y="24" width="10" height="7" rx="3.5" fill="#B0B8C8"/>
      <rect x="23" y="46" width="10" height="7" rx="3.5" fill="#B0B8C8"/>
      <rect x="23" y="68" width="10" height="7" rx="3.5" fill="#B0B8C8"/>
      {/* Avatar circle */}
      <circle cx="56" cy="44" r="20" fill="url(#i-contacts-av)"/>
      {/* Person head */}
      <circle cx="56" cy="37" r="9" fill="white" opacity="0.92"/>
      {/* Person body arc */}
      <path d="M37 66 Q37 52 56 52 Q75 52 75 66" fill="white" opacity="0.92"/>
      {/* Name line */}
      <rect x="32" y="74" width="48" height="5.5" rx="2.5" fill="#3A3A3C" opacity="0.45"/>
      <rect x="38" y="83" width="36" height="4" rx="2" fill="#8E8E93" opacity="0.30"/>
    </svg>
  );
}

function FilesArt() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="i-files-bg" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#62AAFF"/>
          <stop offset="100%" stopColor="#0D47C8"/>
        </linearGradient>
        <linearGradient id="i-folder" x1="0" y1="35" x2="0" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF8E1"/>
          <stop offset="100%" stopColor="#FFD54F"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#i-files-bg)"/>
      {/* Folder back panel */}
      <rect x="12" y="36" width="76" height="52" rx="7" fill="url(#i-folder)" opacity="0.88"/>
      {/* Folder tab */}
      <path d="M12 36 L12 29 Q12 24 17 24 L40 24 Q45 24 47 29 L47 36 Z" fill="#FFCA28" opacity="0.85"/>
      {/* Folder front panel */}
      <rect x="12" y="42" width="76" height="46" rx="7" fill="url(#i-folder)"/>
      {/* Top edge highlight */}
      <rect x="12" y="42" width="76" height="11" rx="7" fill="rgba(255,255,255,0.28)"/>
      {/* Stacked files inside */}
      <rect x="22" y="54" width="20" height="26" rx="3" fill="white" opacity="0.78"/>
      <rect x="46" y="54" width="20" height="26" rx="3" fill="white" opacity="0.65"/>
      <rect x="70" y="54" width="14" height="26" rx="3" fill="white" opacity="0.52"/>
    </svg>
  );
}

function SettingsArt() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="i-settings" x1="20" y1="0" x2="80" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#48484A"/>
          <stop offset="100%" stopColor="#1C1C1E"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#i-settings)"/>
      {/* Gear — evenodd punches center hole */}
      <path d={GEAR_PATH} fill="#AEAEB2" fillRule="evenodd"/>
    </svg>
  );
}

// ─── Registry ─────────────────────────────────────────────────────────────────
const MAC_ICON = {
  dashboard: FinderArt,
  planner:   PlannerArt,
  notes:     NotesArt,
  calendar:  CalendarArt,
  tasks:     TasksArt,
  contacts:  ContactsArt,
  files:     FilesArt,
  settings:  SettingsArt,
};

const ICON_GLOW = {
  dashboard: 'rgba(10,132,255,0.65)',
  planner:   'rgba(255,159,10,0.55)',
  notes:     'rgba(255,214,10,0.65)',
  calendar:  'rgba(255,59,48,0.65)',
  tasks:     'rgba(255,159,10,0.65)',
  contacts:  'rgba(10,132,255,0.50)',
  files:     'rgba(10,132,255,0.60)',
  settings:  'rgba(100,100,110,0.55)',
};

// ─── Dock physics ──────────────────────────────────────────────────────────────
const BASE_SIZE     = 68;
const GAP           = 13;
const MAX_SCALE     = 1.75;
const EFFECT_RADIUS = 175;

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

// ─── DockIcon ─────────────────────────────────────────────────────────────────
function DockIcon({ item, size, scale, isActive }) {
  if (item.isAi) {
    return (
      <div style={{ width: size * 0.85, height: size * 0.85, flexShrink: 0 }}>
        <AiOrb size={size * 0.85} intensity={1 + (scale - 1) * 0.7} />
      </div>
    );
  }

  const dim    = size * 0.86;
  const radius = dim * 0.22;
  const glow   = scale > 1.15;
  const shadow = ICON_GLOW[item.id] || 'rgba(100,100,110,0.55)';
  const Art    = MAC_ICON[item.id] || SettingsArt;

  return (
    <div style={{
      width: dim,
      height: dim,
      borderRadius: radius,
      overflow: 'hidden',
      position: 'relative',
      flexShrink: 0,
      boxShadow: [
        `0 ${Math.round(dim * 0.08)}px ${Math.round(dim * 0.28)}px ${shadow}`,
        `0 2px 0 rgba(255,255,255,0.25) inset`,
        `0 -1px 0 rgba(0,0,0,0.20) inset`,
        glow ? `0 0 ${Math.round(dim * 0.3)}px ${shadow}` : '',
        isActive ? `0 0 0 2.5px rgba(255,255,255,0.80)` : '',
      ].filter(Boolean).join(', '),
      transition: 'box-shadow 80ms ease',
    }}>
      {/* Full-bleed macOS icon art */}
      <Art />
      {/* Glass specular top highlight */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '50%',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.07) 60%, transparent 100%)',
        borderRadius: `${radius}px ${radius}px 0 0`,
        pointerEvents: 'none',
      }} />
      {/* Bottom shadow vignette */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '25%',
        background: 'linear-gradient(0deg, rgba(0,0,0,0.14) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

// ─── MacOSDock ────────────────────────────────────────────────────────────────
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
        padding: `12px 22px 12px`,
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
