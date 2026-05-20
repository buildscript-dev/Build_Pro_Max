import React from 'react';

export const ScreenShell = ({ title, eyebrow, subtitle, right, children, padTop = 86, padBottom = 110 }) => (
  <div className="scroll" style={{
    position: "absolute", inset: 0, paddingTop: padTop, paddingBottom: padBottom,
    paddingLeft: 36, paddingRight: 36, overflowY: "auto",
  }}>
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, paddingLeft: 6, paddingRight: 6 }}>
      <div>
        {eyebrow && <div className="t-cap" style={{ marginBottom: 8, color: "var(--accent-orange)" }}>{eyebrow}</div>}
        <h1 className="t-display" style={{ margin: 0, fontSize: 52, fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 1.02 }}>
          {title}
        </h1>
        {subtitle && <div style={{ marginTop: 10, fontSize: 14, color: "var(--ink-2)", maxWidth: 720 }}>{subtitle}</div>}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>{right}</div>
    </div>
    {children}
  </div>
);
