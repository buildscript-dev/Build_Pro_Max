import React from 'react';
import { Icon, AiOrb } from '../ui/Icons';
import { accentColor } from '../../data';

const MOBILE_NAV_ITEMS = [
  { id: 'dashboard', icon: 'home', label: 'Home', accent: 'amber' },
  { id: 'planner', icon: 'planner', label: 'Plan', accent: 'orange' },
  { id: 'notes', icon: 'notes', label: 'Notes', accent: 'amber' },
  { id: 'tasks', icon: 'tasks', label: 'Tasks', accent: 'orange' },
  { id: 'chat', icon: 'orb', label: 'Hermes', accent: 'coral', isAi: true },
];

export const BottomNav = ({ active, onSelect, onOpenCmdK, hasNotifications = false }) => {
  return (
    <nav
      aria-label="Mobile navigation"
      className="mobile-bottom-nav"
    >
      {MOBILE_NAV_ITEMS.map((item) => {
        const isActive = active === item.id;
        const c = accentColor[item.accent];
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className="mobile-dock-btn"
            style={{
              background: isActive
                ? `linear-gradient(180deg, ${c}22, ${c}10)`
                : 'transparent',
              boxShadow: isActive
                ? `0 1px 0 rgba(255,255,255,.9) inset, 0 0 0 1px ${c}33`
                : 'none',
              color: isActive ? c : 'var(--ink-2)',
            }}
          >
            {item.isAi
              ? <AiOrb size={22} intensity={isActive ? 1.3 : 0.9} />
              : <Icon name={item.icon} size={20} stroke={isActive ? 2 : 1.6} color={isActive ? c : 'var(--ink-2)'} />
            }
            {hasNotifications && item.id === 'dashboard' && (
              <span className="mobile-dock-badge" />
            )}
          </button>
        );
      })}

      <div className="mobile-dock-divider" />

      <button
        onClick={onOpenCmdK}
        aria-label="Open AI command bar"
        className="mobile-dock-btn mobile-dock-cmdk"
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>⌘K</span>
      </button>
    </nav>
  );
};
