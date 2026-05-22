import React from 'react';

// ─── Icons (custom line-drawn, 24px viewbox) ────────────────────────────────
export const Icon = ({ name, size = 18, stroke = 1.5, color = "currentColor", style }) => {
  const props = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: color, strokeWidth: stroke,
    strokeLinecap: "round", strokeLinejoin: "round",
    style: { display: "block", flexShrink: 0, ...style },
  };
  const paths = {
    home:        <><path d="M3 11 12 4l9 7"/><path d="M5 10v9h4v-5h6v5h4v-9"/></>,
    planner:     <><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><circle cx="8" cy="14" r="1" fill={color}/><path d="M11 14h5"/></>,
    notes:       <><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h7M9 16h7M9 8h3"/></>,
    calendar:    <><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></>,
    tasks:       <><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 12l3 3 5-6"/></>,
    contacts:    <><circle cx="12" cy="9" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/></>,
    files:       <><path d="M4 7c0-1.1.9-2 2-2h4l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"/><path d="M12 11v6M9 14h6"/></>,
    chat:        <><path d="M4 12c0-4 3.5-7 8-7s8 3 8 7-3.5 7-8 7c-1 0-2-.1-3-.4L4 20l1.2-3.4C4.4 15.4 4 13.8 4 12z"/></>,
    settings:    <><circle cx="12" cy="12" r="3"/><path d="M19.4 13.6a7.6 7.6 0 0 0 0-3.2l2-1.5-2-3.4-2.3.9a7.7 7.7 0 0 0-2.8-1.6L13.8 2h-3.6l-.5 2.8a7.7 7.7 0 0 0-2.8 1.6l-2.3-.9-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3.2l-2 1.5 2 3.4 2.3-.9a7.7 7.7 0 0 0 2.8 1.6l.5 2.8h3.6l.5-2.8a7.7 7.7 0 0 0 2.8-1.6l2.3.9 2-3.4-2-1.5z"/></>,
    onboard:     <><path d="M3 12l9-8 9 8"/><path d="M5 11v9h14v-9"/><circle cx="12" cy="14" r="2"/></>,
    sparkle:     <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></>,
    plus:        <path d="M12 5v14M5 12h14"/>,
    search:      <><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></>,
    bell:        <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2H4.5L6 16z"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
    arrow:       <path d="M5 12h14M13 6l6 6-6 6"/>,
    arrowDown:   <path d="M6 9l6 6 6-6"/>,
    arrowLeft:   <path d="M19 12H5M11 6l-6 6 6 6"/>,
    check:       <path d="M5 12l5 5 9-11"/>,
    circle:      <circle cx="12" cy="12" r="7"/>,
    circleDot:   <><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill={color}/></>,
    laptop:      <><rect x="3" y="5" width="18" height="11" rx="1.5"/><path d="M2 19h20"/></>,
    phone:       <><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/></>,
    tablet:      <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M11 18h2"/></>,
    desktop:     <><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/></>,
    pdf:         <><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><text x="8.5" y="17" fontSize="5.2" fontWeight="700" fontFamily="Geist, sans-serif" stroke="none" fill={color}>PDF</text></>,
    fig:         <><circle cx="9" cy="6" r="3"/><circle cx="15" cy="6" r="3"/><circle cx="9" cy="12" r="3"/><circle cx="15" cy="12" r="3"/><circle cx="9" cy="18" r="3"/></>,
    sheet:       <><rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 9h16M4 14h16M10 4v16M16 4v16"/></>,
    img:         <><rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><circle cx="9" cy="10" r="1.7" fill={color} stroke="none"/><path d="M4 17l5-5 4 4 3-3 4 4"/></>,
    audio:       <><path d="M4 9h3l5-4v14L7 15H4z"/><path d="M16 8a5 5 0 0 1 0 8"/></>,
    drag:        <><circle cx="9" cy="6" r="1.2" fill={color} stroke="none"/><circle cx="15" cy="6" r="1.2" fill={color} stroke="none"/><circle cx="9" cy="12" r="1.2" fill={color} stroke="none"/><circle cx="15" cy="12" r="1.2" fill={color} stroke="none"/><circle cx="9" cy="18" r="1.2" fill={color} stroke="none"/><circle cx="15" cy="18" r="1.2" fill={color} stroke="none"/></>,
    expand:      <><path d="M4 10V4h6M20 14v6h-6M4 14v6h6M20 10V4h-6"/></>,
    close:       <path d="M6 6l12 12M18 6l-12 12"/>,
    flame:       <path d="M12 3s-1 4 1 6c3 3 4 5 4 8a5 5 0 0 1-10 0c0-2 1-3 2-4 0 1 .5 2 1.5 2 0-4 1.5-7 1.5-12z"/>,
    target:      <><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill={color}/></>,
    sync:        <><path d="M4 11a8 8 0 0 1 14-5l2-1v5h-5"/><path d="M20 13a8 8 0 0 1-14 5l-2 1v-5h5"/></>,
    moon:        <path d="M20 14a8 8 0 1 1-9-11 6 6 0 0 0 9 11z"/>,
    sun:         <><circle cx="12" cy="12" r="3.5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4"/></>,
    cmd:         <path d="M6 6h12v12H6z M9 6V4 M15 6V4 M9 20v-2 M15 20v-2 M4 9h2 M4 15h2 M20 9h-2 M20 15h-2"/>,
    orb:         <><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="3" fill={color} stroke="none" opacity="0.5"/></>,
  };
  return <svg {...props}>{paths[name] || null}</svg>;
};

// ─── AI Orb (animated, used in chat / dock / dashboard) ────────────────────
export const AiOrb = ({ size = 36, intensity = 1, paused = false }) => {
  return (
    <div style={{
      position: "relative", width: size, height: size, borderRadius: "50%",
      background: "radial-gradient(circle at 30% 30%, #fff, #f7d99a 35%, #f06b1c 65%, #c2185b 100%)",
      boxShadow: `0 0 ${10*intensity}px rgba(231,64,46,.5), 0 0 ${24*intensity}px rgba(245,165,36,.35) inset, 0 2px 6px rgba(255,255,255,.6) inset`,
      flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", inset: 1, borderRadius: "50%",
        background: "conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,.4) 30%, transparent 60%, rgba(255,255,255,.25) 80%, transparent 100%)",
        animation: paused ? "none" : `orb-pulse ${5/intensity}s ease-in-out infinite`,
        mixBlendMode: "overlay",
      }}/>
    </div>
  );
};

// ─── Glass card (with optional draggable + centralize behavior) ─────────────
export const GlassCard = ({
  children, className = "", style = {}, strong = false, flat = false,
  onClick, padding = 20, radius, paneStyle = {},
}) => {
  const cls = `glass ${strong ? "glass--strong" : ""} ${flat ? "glass--flat" : ""} ${className}`.trim();
  // Extract padding from style so it goes on the inner pane, not the outer frame
  const { padding: stylePadding, ...outerStyle } = style;
  const effectivePadding = stylePadding !== undefined ? stylePadding : padding;
  return (
    <div className={cls} onClick={onClick} style={{ borderRadius: radius, ...outerStyle }}>
      <div className="glass-pane" style={{ padding: effectivePadding, ...paneStyle }}>
        {children}
      </div>
    </div>
  );
};

// ─── Layered button (paper inset + glass top) ───────────────────────────────
export const PaperButton = ({ children, accent = false, primary = false, small = false, onClick, icon, style = {}, disabled = false, type = "button", "aria-label": ariaLabel }) => {
  const h = small ? 30 : 38;
  const bg = primary
    ? "linear-gradient(180deg, #f5a524 0%, #f06b1c 100%)"
    : accent
    ? "rgba(245, 165, 36, 0.14)"
    : "rgba(255, 255, 255, 0.08)";
  const color = primary ? "#fff" : "var(--ink-1)";
  const border = primary ? "0.5px solid rgba(0,0,0,.18)" : "0.5px solid rgba(255,255,255,.12)";
  const shadow = primary
    ? "0 1px 0 rgba(255,255,255,.45) inset, 0 -1px 0 rgba(0,0,0,.10) inset, 0 4px 10px -2px rgba(240,107,28,.35)"
    : "0 1px 0 rgba(255,255,255,.08) inset, 0 2px 6px rgba(0,0,0,.25)";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        height: h, padding: small ? "0 12px" : "0 16px", borderRadius: 999,
        background: bg, color, border, boxShadow: shadow,
        fontSize: small ? 12 : 13, fontWeight: 500, gap: 8,
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        transition: "transform var(--motion-quick) var(--ease-snap), box-shadow var(--motion-quick) var(--ease-snap)",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
    >
      {icon && <Icon name={icon} size={small ? 14 : 16} />}
      {children}
    </button>
  );
};

// ─── Avatar with warm-tinted initials ──────────────────────────────────────
export const Avatar = ({ initials, color = "amber", size = 32, online = false }) => {
  const palette = {
    amber:  ["#fef3c7", "#f59e0b", "#92400e"],
    orange: ["#fed7aa", "#f06b1c", "#7c2d12"],
    coral:  ["#fecaca", "#e7402e", "#7f1d1d"],
    rose:   ["#fbcfe8", "#c2185b", "#831843"],
  };
  const [bg, mid, fg] = palette[color] || palette.amber;
  return (
    <div style={{
      position: "relative",
      width: size, height: size, borderRadius: "50%",
      background: `radial-gradient(circle at 30% 30%, ${bg}, ${mid})`,
      color: fg, fontFamily: "var(--font-display)", fontWeight: 500,
      fontSize: size * 0.42, display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
      boxShadow: "0 1px 2px rgba(46,30,12,.18), 0 0 0 1.5px rgba(255,255,255,.85) inset",
    }}>
      {initials}
      {online && (
        <div style={{
          position: "absolute", right: 0, bottom: 0,
          width: size * 0.32, height: size * 0.32, borderRadius: "50%",
          background: "var(--ok)", border: "1.5px solid var(--paper-0)",
        }}/>
      )}
    </div>
  );
};