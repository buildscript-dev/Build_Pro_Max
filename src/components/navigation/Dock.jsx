import React, { useState, useRef } from 'react';
import { Icon, AiOrb, Avatar } from '../ui/Icons';
import { DOCK_ITEMS, accentColor } from '../../data';

function mag(distance, max = 1.5, falloff = 110) {
  const t = Math.max(0, 1 - distance / falloff);
  return 1 + (max - 1) * (1 - Math.pow(1 - t, 3));
}

export const Dock = ({ active, onSelect, variant = "dock", onOpenCmdK, recentActions = [], hasNotifications = false }) => {
  const [mouseX, setMouseX] = useState(null);
  const ref = useRef(null);
  const itemRefs = useRef({});

  if (variant === "rail") return <SideRail active={active} onSelect={onSelect} onOpenCmdK={onOpenCmdK} hasNotifications={hasNotifications} />;
  if (variant === "top") return null;

  return (
    <div
      ref={ref}
      onMouseMove={(e) => setMouseX(e.clientX)}
      onMouseLeave={() => setMouseX(null)}
      style={{
        position: "fixed", left: "50%", bottom: 18, transform: "translateX(-50%)",
        zIndex: 50, display: "flex", alignItems: "flex-end", gap: 4,
        padding: "10px 14px",
        background: "rgba(255, 252, 244, 0.55)",
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
        border: "0.5px solid rgba(255,255,255,.7)",
        borderRadius: 24,
        boxShadow: `
          0 2px 1px rgba(255,255,255,.9) inset,
          0 -1px 1px rgba(0,0,0,.05) inset,
          0 24px 60px -10px rgba(46,30,12,.30),
          0 8px 24px -8px rgba(46,30,12,.18)`
      }}>
      <div style={{
        position: "absolute", left: "20%", right: "20%", bottom: 0, height: 1,
        background: "linear-gradient(90deg, transparent, rgba(245,165,36,.5), rgba(231,64,46,.5), rgba(42,111,219,.5), transparent)",
        filter: "blur(0.5px)", borderRadius: 1, pointerEvents: "none"
      }} />

      {DOCK_ITEMS.map((item, i) => {
        const isActive = active === item.id;
        let scale = 1;
        if (mouseX !== null && itemRefs.current[item.id]) {
          const r = itemRefs.current[item.id].getBoundingClientRect();
          const cx = r.left + r.width / 2;
          scale = mag(Math.abs(mouseX - cx));
        }
        const base = 44;
        const lift = (scale - 1) * 18;
        return (
          <div key={item.id} style={{ position: "relative", width: base, display: "flex", justifyContent: "center", alignItems: "flex-end", height: 60 }}>
            <button
              ref={(el) => {if (el) itemRefs.current[item.id] = el;}}
              onClick={() => onSelect(item.id)}
              title={item.label}
              style={{
                width: base, height: base, borderRadius: 12,
                background: isActive ?
                `linear-gradient(180deg, ${accentColor[item.accent]}22, ${accentColor[item.accent]}10)` :
                "rgba(255, 252, 244, 0.5)",
                border: "0.5px solid rgba(255,255,255,.7)",
                boxShadow: isActive ?
                `0 1px 0 rgba(255,255,255,.9) inset, 0 0 0 1px ${accentColor[item.accent]}33, 0 4px 10px -2px ${accentColor[item.accent]}55` :
                "0 1px 0 rgba(255,255,255,.7) inset, 0 2px 4px -1px rgba(46,30,12,.10)",
                transform: `scale(${scale}) translateY(${-lift}px)`,
                transformOrigin: "bottom center",
                transition: mouseX === null ? "transform 250ms var(--ease-glass)" : "transform 90ms ease-out",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: isActive ? accentColor[item.accent] : "var(--ink-1)",
                position: "relative"
              }}>
              {item.isAi ?
              <AiOrb size={26 * scale} intensity={1.1} /> :
              <Icon name={item.icon} size={22} stroke={1.6} />}
              {recentActions.includes(item.id) &&
              <div style={{
                position: "absolute", top: -4, right: -4,
                width: 10, height: 10, borderRadius: "50%",
                background: accentColor[item.accent],
                boxShadow: `0 0 8px ${accentColor[item.accent]}, 0 0 0 1.5px var(--paper-0)`
              }} />
              }
              {hasNotifications && item.id === 'dashboard' && (
                <div style={{
                  position: "absolute", top: -4, right: -4,
                  width: 8, height: 8, borderRadius: "50%",
                  background: "var(--accent-coral)",
                  boxShadow: "0 0 8px var(--accent-coral), 0 0 0 1.5px var(--paper-0)"
                }} />
              )}
            </button>
            {scale > 1.15 &&
            <div style={{
              position: "absolute", left: "50%", bottom: 60 + lift + 6,
              transform: "translateX(-50%)",
              padding: "4px 10px", borderRadius: 8,
              background: "rgba(26, 20, 16, 0.88)",
              color: "#fff8e8", fontSize: 11, fontWeight: 500,
              whiteSpace: "nowrap", pointerEvents: "none",
              boxShadow: "0 8px 20px -4px rgba(0,0,0,.3)"
            }}>{item.label}</div>
            }
            {isActive &&
            <div style={{
              position: "absolute", bottom: -6, width: 4, height: 4, borderRadius: "50%",
              background: accentColor[item.accent],
              boxShadow: `0 0 8px ${accentColor[item.accent]}`
            }} />
            }
          </div>);
      })}

      <div style={{ width: 1, alignSelf: "stretch", margin: "6px 8px", background: "rgba(26,20,16,.10)" }} />
      <div style={{ position: "relative", width: 44, display: "flex", justifyContent: "center", alignItems: "flex-end", height: 60 }}>
        <button
          onClick={onOpenCmdK}
          title="AI command bar (⌘K)"
          style={{
            width: 44, height: 44, borderRadius: 12,
            background: "rgba(26, 20, 16, 0.86)",
            border: "0.5px solid rgba(255,255,255,.10)",
            boxShadow: "0 1px 0 rgba(255,255,255,.10) inset, 0 4px 10px -2px rgba(0,0,0,.30)",
            color: "#fff8e8",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4
          }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500 }}>⌘K</span>
        </button>
      </div>
    </div>
  );
};

const SideRail = ({ active, onSelect, onOpenCmdK, hasNotifications }) => {
  return (
    <div style={{
      position: "fixed", left: 16, top: "50%", transform: "translateY(-50%)",
      zIndex: 50, display: "flex", flexDirection: "column", gap: 4,
      padding: 8,
      background: "rgba(255, 252, 244, 0.55)",
      backdropFilter: "blur(28px) saturate(180%)",
      WebkitBackdropFilter: "blur(28px) saturate(180%)",
      border: "0.5px solid rgba(255,255,255,.7)",
      borderRadius: 18,
      boxShadow: "0 2px 1px rgba(255,255,255,.9) inset, 0 12px 40px -10px rgba(46,30,12,.25)"
    }}>
      {DOCK_ITEMS.map((item) => {
        const isActive = active === item.id;
        return (
          <button key={item.id}
          onClick={() => onSelect(item.id)}
          title={item.label}
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
          </button>);
      })}
      <div style={{ height: 1, background: "rgba(26,20,16,.10)", margin: "4px 6px" }} />
      <button onClick={onOpenCmdK} style={{
        width: 40, height: 40, borderRadius: 10,
        background: "rgba(26,20,16,.86)", color: "#fff8e8",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500
      }}>⌘K</button>
    </div>
  );
};

export const TopBar = ({ user, today, onOpenCmdK, variant = "dock", active, onSelect, hasNotifications, notifications = [], onClearNotifications, onMarkAllRead }) => {
  const showInlineNav = variant === "top";
  const [showNotif, setShowNotif] = useState(false);

  return (
    <div style={{
      position: "fixed", top: 14, left: 14, right: 14, zIndex: 40,
      display: "flex", alignItems: "center", gap: 12,
      height: 52, paddingLeft: 18, paddingRight: 8,
      background: "rgba(255, 252, 244, 0.45)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      border: "0.5px solid rgba(255,255,255,.6)",
      boxShadow: "0 1px 0 rgba(255,255,255,.7) inset, 0 6px 24px -8px rgba(46,30,12,.18)", borderRadius: "10px"
    }}>
      <button
        onClick={() => onSelect('files')}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "none", border: "none", padding: 0, margin: 0,
          cursor: "pointer", transition: "transform 150ms ease, opacity 150ms ease",
          textAlign: "left"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.02) translateY(-0.5px)";
          e.currentTarget.style.opacity = "0.9";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1) translateY(0)";
          e.currentTarget.style.opacity = "1";
        }}
      >
        <div style={{
          width: 26, height: 26, borderRadius: 8,
          background: "radial-gradient(circle at 30% 30%, #fff, #f5a524 35%, #e7402e 80%)",
          boxShadow: "0 0 0 1px rgba(0,0,0,.06), 0 2px 4px rgba(231,64,46,.3)"
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

      {showInlineNav &&
      <div style={{ display: "flex", gap: 2, marginLeft: 16 }}>
          {DOCK_ITEMS.filter((d) => !d.isAi).slice(0, 6).map((item) =>
        <button key={item.id} onClick={() => onSelect(item.id)} style={{
          padding: "6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 500,
          color: active === item.id ? "var(--ink-1)" : "var(--ink-3)",
          background: active === item.id ? "rgba(255,252,244,.7)" : "transparent",
          boxShadow: active === item.id ? "0 1px 2px rgba(46,30,12,.08), 0 1px 0 rgba(255,255,255,.7) inset" : "none"
        }}>{item.label}</button>
        )}
        </div>
      }

      <div style={{ flex: 1 }} />

      <button onClick={onOpenCmdK} style={{
        height: 36, padding: "0 14px 0 12px", borderRadius: 999,
        background: "rgba(26, 20, 16, 0.05)",
        border: "0.5px solid rgba(26,20,16,.08)",
        gap: 8, color: "var(--ink-3)", fontSize: 12.5
      }}>
        <Icon name="search" size={14} />
        <span>Ask AI · search · jump</span>
        <span style={{ marginLeft: 8, fontFamily: "var(--font-mono)", fontSize: 11, padding: "2px 6px", borderRadius: 5, background: "rgba(26,20,16,.06)" }}>⌘K</span>
      </button>

      <div className="chip" style={{ height: 30 }}>
        <Icon name="calendar" size={12} />
        <span style={{ fontWeight: 500 }}>{today.date}</span>
      </div>

      <div style={{ position: "relative" }}>
        <button
          onClick={() => setShowNotif(!showNotif)}
          title="Notifications"
          style={{ width: 36, height: 36, borderRadius: 999, position: "relative" }}>
          <Icon name="bell" size={16} />
          {hasNotifications && (
            <span style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: "50%", background: "var(--accent-coral)", boxShadow: "0 0 0 2px rgba(255,252,244,.9)" }} />
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

      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 6 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.1 }}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>{user.name}</span>
          <span style={{ fontSize: 10, color: "var(--ink-3)" }}>{user.role}</span>
        </div>
        <Avatar initials={user.avatar} color="orange" size={36} online />
      </div>
    </div>
  );
};
