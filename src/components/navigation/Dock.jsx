import React, { useState, useRef, useEffect } from 'react';
import { Icon, AiOrb, Avatar } from '../ui/Icons';
import { DOCK_ITEMS, accentColor } from '../../data';
import { FocusToggle } from '../focus/FocusToggle';
import { MacOSDock } from '../ui/MacOSDock';

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isMobile;
}

export const Dock = ({ active, onSelect, variant = "dock", onOpenCmdK, onOpenFocus, focusMode = "off", hasNotifications = false }) => {
  const isMobile = useIsMobile(768);

  if (variant === "rail") return <SideRail active={active} onSelect={onSelect} onOpenCmdK={onOpenCmdK} onOpenFocus={onOpenFocus} focusMode={focusMode} hasNotifications={hasNotifications} />;
  if (variant === "top" || isMobile) return null;

  return (
    <MacOSDock
      active={active}
      onSelect={onSelect}
      onOpenCmdK={onOpenCmdK}
      onOpenFocus={onOpenFocus}
      focusMode={focusMode}
      hasNotifications={hasNotifications}
    />
  );
};

const SideRail = ({ active, onSelect, onOpenCmdK, onOpenFocus, focusMode, hasNotifications }) => (
  <div style={{
    position: "fixed", left: 16, top: "50%", transform: "translateY(-50%)",
    zIndex: 50, display: "flex", flexDirection: "column", gap: 4,
    padding: 8,
    background: "rgba(255, 252, 244, 0.55)",
    backdropFilter: "blur(28px) saturate(180%)",
    WebkitBackdropFilter: "blur(28px) saturate(180%)",
    border: "0.5px solid rgba(255,255,255,.7)",
    borderRadius: 18,
    boxShadow: "0 2px 1px rgba(255,255,255,.9) inset, 0 12px 40px -10px rgba(46,30,12,.25)",
  }}>
    {DOCK_ITEMS.map((item) => {
      const isActive = active === item.id;
      return (
        <button key={item.id}
          onClick={() => onSelect(item.id)}
          aria-label={item.label}
          aria-current={isActive ? "page" : undefined}
          style={{
            width: 40, height: 40, borderRadius: 10,
            background: isActive ? `${accentColor[item.accent]}15` : "transparent",
            boxShadow: isActive ? `inset 0 0 0 1px ${accentColor[item.accent]}33` : "none",
            color: isActive ? accentColor[item.accent] : "var(--ink-2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
          }}>
          {item.isAi ? <AiOrb size={20} /> : <Icon name={item.icon} size={20} stroke={1.6} />}
          {hasNotifications && item.id === 'dashboard' && (
            <div style={{
              position: "absolute", top: 2, right: 2,
              width: 6, height: 6, borderRadius: "50%",
              background: "var(--accent-coral)",
            }} />
          )}
        </button>
      );
    })}
    <div style={{ height: 1, background: "rgba(26,20,16,.10)", margin: "4px 6px" }} />
    <FocusToggle focusMode={focusMode} onClick={onOpenFocus} />
    <button onClick={onOpenCmdK} aria-label="Open AI command bar" style={{
      width: 40, height: 40, borderRadius: 10,
      background: "rgba(26,20,16,.86)", color: "#fff8e8",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500,
    }}>⌘K</button>
  </div>
);

export const TopBar = ({ user, today, onOpenCmdK, variant = "dock", active, onSelect, hasNotifications, notifications = [], onClearNotifications, onMarkAllRead, scrolled = false }) => {
  const showInlineNav = variant === "top";
  const [showNotif, setShowNotif] = useState(false);
  const [lastSync, setLastSync] = useState(() => Date.now());
  const notifRef = useRef(null);

  useEffect(() => {
    if (!showNotif) return;
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotif]);

  useEffect(() => {
    const handleSync = () => setLastSync(Date.now());
    window.addEventListener('build_pro_max_state_sync', handleSync);
    return () => window.removeEventListener('build_pro_max_state_sync', handleSync);
  }, []);

  const syncAgo = Math.round((Date.now() - lastSync) / 1000);
  const syncLabel = syncAgo < 5 ? 'Synced' : syncAgo < 60 ? `${syncAgo}s ago` : `${Math.floor(syncAgo / 60)}m ago`;

  return (
    <div className={`top-bar-awards ${scrolled ? 'scrolled' : ''}`}
      style={{
        position: "fixed", top: 12, left: 12, right: 12, zIndex: 40,
        display: "flex", alignItems: "center", gap: 10,
        height: 52, paddingLeft: 16, paddingRight: 8,
        borderRadius: 14,
      }}>
      <button
        onClick={() => onSelect('files')}
        aria-label="Go to Files screen"
        style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "none", border: "none", padding: 0, margin: 0,
          cursor: "pointer", transition: "transform 150ms ease, opacity 150ms ease",
          textAlign: "left",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.02) translateY(-0.5px)"; e.currentTarget.style.opacity = "0.9"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1) translateY(0)"; e.currentTarget.style.opacity = "1"; }}
      >
        <div style={{
          width: 26, height: 26, borderRadius: 8,
          background: "radial-gradient(circle at 30% 30%, #fff, #f5a524 35%, #e7402e 80%)",
          boxShadow: "0 0 0 1px rgba(0,0,0,.06), 0 2px 4px rgba(231,64,46,.3)",
        }} />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--ink-1)" }}>
            Build_PRO_MAX_1
          </span>
          <span style={{ fontSize: 9.5, color: "var(--ink-3)", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            B.0.0.1
          </span>
        </div>
      </button>

      {showInlineNav && (
        <div style={{ display: "flex", gap: 2, marginLeft: 12 }}>
          {DOCK_ITEMS.filter((d) => !d.isAi).slice(0, 6).map((item) => (
            <button key={item.id} onClick={() => onSelect(item.id)} style={{
              padding: "6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 500,
              color: active === item.id ? "var(--ink-1)" : "var(--ink-3)",
              background: active === item.id ? "rgba(255,252,244,.7)" : "transparent",
              boxShadow: active === item.id ? "0 1px 2px rgba(46,30,12,.08), 0 1px 0 rgba(255,255,255,.7) inset" : "none",
            }}>{item.label}</button>
          ))}
        </div>
      )}

      <div style={{ flex: 1 }} />

      <button onClick={onOpenCmdK} aria-label="Search and ask AI" style={{
        height: 34, padding: "0 12px", borderRadius: 999,
        background: "rgba(26, 20, 16, 0.05)",
        border: "0.5px solid rgba(26,20,16,.08)",
        gap: 8, color: "var(--ink-3)", fontSize: 12.5,
        display: "flex", alignItems: "center",
      }}>
        <Icon name="search" size={14} />
        <span className="topbar-search-text">Ask AI · search · jump</span>
        <span style={{ marginLeft: 4, fontFamily: "var(--font-mono)", fontSize: 11, padding: "2px 6px", borderRadius: 5, background: "rgba(26,20,16,.06)" }}>⌘K</span>
      </button>

      <div className="chip topbar-chip" style={{ height: 28 }}>
        <Icon name="calendar" size={12} />
        <span style={{ fontWeight: 500 }}>{today.date}</span>
      </div>

      <div className="chip topbar-chip" style={{ height: 28, display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: syncAgo < 30 ? 'var(--ok)' : 'var(--warn)',
          boxShadow: syncAgo < 30 ? '0 0 4px var(--ok)' : 'none',
        }} />
        <span style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 500 }}>{syncLabel}</span>
      </div>

      <div ref={notifRef} style={{ position: "relative" }}>
        <button
          onClick={() => setShowNotif(!showNotif)}
          title="Notifications"
          aria-label={`${hasNotifications ? 'Unread notifications' : 'Notifications'} — toggle panel`}
          aria-expanded={showNotif}
          style={{ width: 34, height: 34, borderRadius: 999, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="bell" size={16} />
          {hasNotifications && (
            <span style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: "50%", background: "var(--accent-coral)", boxShadow: "0 0 0 2px rgba(255,252,244,.9)" }} />
          )}
        </button>
        {showNotif && (
          <div style={{
            position: "absolute", top: "100%", right: 0, marginTop: 8,
            width: 320, maxHeight: 360,
            background: "rgba(255,252,244,.95)",
            backdropFilter: "blur(24px)",
            border: "0.5px solid rgba(255,255,255,.85)",
            borderRadius: 16,
            boxShadow: "0 24px 60px -12px rgba(46,30,12,.35)",
            overflow: "hidden", zIndex: 60,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "0.5px solid var(--ink-line)" }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Notifications</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={onMarkAllRead} style={{ fontSize: 11, color: "var(--accent-orange)", padding: "4px 8px" }}>Mark all read</button>
                <button onClick={onClearNotifications} style={{ fontSize: 11, color: "var(--ink-3)", padding: "4px 8px" }}>Clear</button>
              </div>
            </div>
            <div style={{ overflowY: "auto", maxHeight: 300 }}>
              {(!notifications || notifications.length === 0) && (
                <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--ink-3)" }}>No notifications</div>
              )}
              {notifications?.map((n, i) => (
                <div key={n.id || i} style={{
                  padding: "10px 16px", borderBottom: "0.5px solid var(--ink-line)",
                  background: n.read ? "transparent" : "rgba(245,165,36,.06)",
                  fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.4,
                }}>
                  {n.text}
                  <div style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4 }}>
                    {n.kind === 'critical' ? '⚠ Critical' : n.kind === 'warning' ? '● Warning' : 'Info'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 4 }} className="topbar-user">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.1 }} className="topbar-user-text">
          <span style={{ fontSize: 12, fontWeight: 500 }}>{user.name}</span>
          <span style={{ fontSize: 10, color: "var(--ink-3)" }}>{user.role}</span>
        </div>
        <Avatar initials={user.avatar} color="orange" size={34} online />
      </div>
    </div>
  );
};
