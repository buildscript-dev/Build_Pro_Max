import React from 'react';

export const ScreenShell = ({ title, eyebrow, subtitle, right, children, padTop, padBottom }) => (
  <div className="screen-shell scroll" style={{
    position: "absolute", inset: 0,
    paddingTop: padTop ?? 'var(--pad-block)',
    paddingBottom: padBottom ?? 'calc(var(--dock-height) + 48px)',
    paddingLeft: 'var(--pad-inline)',
    paddingRight: 'var(--pad-inline)',
    overflowY: "auto",
  }}>
    <div className="screen-shell-header" style={{
      display: "flex", alignItems: "flex-end", justifyContent: "space-between",
      marginBottom: 'calc(var(--gap-grid) + 8px)',
      paddingLeft: 4, paddingRight: 4,
      flexWrap: "wrap", gap: 12,
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        {eyebrow && <div className="t-cap" style={{ marginBottom: 6, color: "var(--accent-orange)" }}>{eyebrow}</div>}
        <h1 className="t-display screen-shell-title" style={{
          margin: 0, fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 1.02,
          fontSize: 'clamp(28px, 5.2vw, 52px)',
        }}>
          {title}
        </h1>
        {subtitle && (
          <div className="screen-shell-subtitle" style={{
            marginTop: 8, fontSize: 'clamp(12px, 1.4vw, 14px)',
            color: "var(--ink-2)", maxWidth: 640,
          }}>
            {subtitle}
          </div>
        )}
      </div>
      <div className="resp-scroll-x" style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
        {right}
      </div>
    </div>
    {children}
  </div>
);
