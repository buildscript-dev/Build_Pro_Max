import React from 'react';
import { Icon, AiOrb } from '../ui/Icons';
import { DOCK_ITEMS, accentColor } from '../../data';

const MOBILE_NAV_ITEMS = [
  { id: 'dashboard', icon: 'home', label: 'Home' },
  { id: 'planner', icon: 'planner', label: 'Plan' },
  { id: 'notes', icon: 'notes', label: 'Notes' },
  { id: 'tasks', icon: 'tasks', label: 'Tasks' },
  { id: 'chat', icon: 'orb', label: 'AI', isAi: true },
];

export const BottomNav = ({ active, onSelect, onOpenCmdK, hasNotifications = false }) => {
  return (
    <nav
      aria-label="Mobile navigation"
      className="mobile-bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: 'none',
        background: 'rgba(255, 252, 244, 0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '0.5px solid rgba(26,20,16,.08)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        height: 56,
        paddingLeft: 8,
        paddingRight: 8,
      }}>
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          const cAccent = accentColor[item.isAi ? 'orange' : 'amber'];
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              style={{
                all: 'unset',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                flex: 1,
                height: 56,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {item.isAi ? (
                <AiOrb size={22} intensity={isActive ? 1.3 : 0.8} />
              ) : (
                <Icon
                  name={item.icon}
                  size={22}
                  stroke={isActive ? 2 : 1.5}
                  color={isActive ? cAccent : 'var(--ink-3)'}
                />
              )}
              <span style={{
                fontSize: 9.5,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? cAccent : 'var(--ink-3)',
                letterSpacing: '0.02em',
              }}>
                {item.label}
              </span>
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 24,
                  height: 2,
                  borderRadius: 1,
                  background: cAccent,
                }} />
              )}
              {hasNotifications && item.id === 'dashboard' && (
                <div style={{
                  position: 'absolute',
                  top: 6,
                  right: 'calc(50% - 18px)',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--accent-coral)',
                  boxShadow: '0 0 0 1.5px rgba(255,252,244,.9)',
                }} />
              )}
            </button>
          );
        })}

        {/* CmdK button */}
        <button
          onClick={onOpenCmdK}
          aria-label="Open AI command bar"
          style={{
            all: 'unset',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            flex: 1,
            height: 56,
            cursor: 'pointer',
          }}
        >
          <div style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: 'rgba(26,20,16,.86)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff8e8',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 600,
          }}>
            ⌘
          </div>
          <span style={{
            fontSize: 9.5,
            fontWeight: 500,
            color: 'var(--ink-3)',
          }}>
            Search
          </span>
        </button>
      </div>
    </nav>
  );
};
