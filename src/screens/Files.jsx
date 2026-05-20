import React, { useState, useEffect } from 'react';
import { GlassCard, PaperButton, Icon, AiOrb } from '../components/ui/Icons';
import { useApp } from '../store/AppContext';

const ScreenShell = ({ title, eyebrow, subtitle, right, children, padTop = 86, padBottom = 110 }) => (
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

const FILE_KINDS = ['pdf', 'fig', 'sheet', 'img', 'audio'];
const DEVICE_NAMES = ['MacBook Pro', 'iPhone 15', 'iPad Pro', 'Studio (Mac mini)'];

export const Files = () => {
  const { state, actions } = useApp();
  const files = state.files || [];
  const devices = state.devices || [];
  const [showAdd, setShowAdd] = useState(false);
  const [newFile, setNewFile] = useState({ name: '', from: DEVICE_NAMES[0], to: DEVICE_NAMES[1], size: '1 MB', kind: 'pdf' });

  // Simulate progress for in-flight transfers
  useEffect(() => {
    const iv = setInterval(() => {
      files.forEach(f => {
        if (f.progress < 100) {
          const inc = Math.random() * 15 + 2;
          const next = Math.min(100, f.progress + inc);
          actions.updateFileProgress(f.name, Math.round(next));
        }
      });
    }, 2000);
    return () => clearInterval(iv);
  }, [files, actions]);

  const addTransfer = () => {
    if (!newFile.name.trim()) return;
    actions.addFile({ ...newFile, name: newFile.name.trim(), progress: 0 });
    actions.addNotification({ text: `Transfer started: "${newFile.name}"`, kind: 'info' });
    setNewFile({ name: '', from: DEVICE_NAMES[0], to: DEVICE_NAMES[1], size: '1 MB', kind: 'pdf' });
    setShowAdd(false);
  };

  const attachToCalendar = () => {
    const memo = files.find(f => f.name.toLowerCase().includes('memo') || f.kind === 'pdf');
    if (memo) {
      actions.addNotification({ text: `"${memo.name}" attached to 14:30 calendar block`, kind: 'info' });
    } else {
      actions.addNotification({ text: `No memo file found to attach`, kind: 'info' });
    }
  };

  return (
    <ScreenShell
      eyebrow="Cross-device sync"
      title={<>Beam <span className="t-display-italic" style={{ color: "var(--accent-orange)" }}>anything</span>, anywhere.</>}
      subtitle={<>Drag a file onto any device tile. Real-time sync across your fleet. Lightweight, encrypted, peer-to-peer when possible.</>}
      right={<PaperButton icon="plus" primary onClick={() => setShowAdd(true)}>New transfer</PaperButton>}
    >
      {showAdd && (
        <GlassCard style={{ marginBottom: 16, padding: 0 }}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <input autoFocus placeholder="File name…" value={newFile.name}
              onChange={(e) => setNewFile({ ...newFile, name: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') addTransfer(); if (e.key === 'Escape') setShowAdd(false); }}
              style={{ all: "unset", fontSize: 16, fontFamily: "var(--font-display)", color: "var(--ink-1)", width: "100%" }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select value={newFile.kind} onChange={(e) => setNewFile({ ...newFile, kind: e.target.value })}
                style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}>
                {FILE_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <select value={newFile.from} onChange={(e) => setNewFile({ ...newFile, from: e.target.value })}
                style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}>
                {DEVICE_NAMES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <Icon name="arrow" size={12} />
              <select value={newFile.to} onChange={(e) => setNewFile({ ...newFile, to: e.target.value })}
                style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}>
                {DEVICE_NAMES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <div style={{ flex: 1 }} />
              <PaperButton small onClick={() => setShowAdd(false)}>Cancel</PaperButton>
              <PaperButton small primary onClick={addTransfer} icon="arrow">Start transfer</PaperButton>
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard strong padding={0} style={{ overflow: "hidden", marginBottom: 16 }}>
        <div style={{ position: "relative", height: 360, padding: 24 }}>
          <div style={{
            position: "absolute", left: "50%", top: "50%",
            transform: "translate(-50%, -50%)", width: 96, height: 96,
            borderRadius: "50%",
            background: "radial-gradient(circle at 30% 30%, #fff, #f5a524 30%, #e7402e 70%, #c2185b 100%)",
            boxShadow: "0 0 0 12px rgba(245,165,36,.08), 0 0 0 28px rgba(245,165,36,.04), 0 0 60px rgba(231,64,46,.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 500, letterSpacing: "0.02em",
          }}>Cloud</div>
          {[150, 220].map((r, i) => (
            <div key={i} style={{
              position: "absolute", left: "50%", top: "50%", width: r*2, height: r*2,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              border: "0.5px dashed rgba(245,165,36,.25)",
            }}/>
          ))}
          {devices.map((d, i) => {
            const angle = (i / devices.length) * Math.PI * 2 - Math.PI/2;
            const r = 150;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            return (
              <div key={d.name} style={{
                position: "absolute", left: "50%", top: "50%",
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                width: 160,
              }}>
                <div style={{
                  padding: 14,
                  background: d.online ? "rgba(255,252,244,.85)" : "rgba(255,252,244,.45)",
                  backdropFilter: "blur(20px)",
                  border: `0.5px solid ${d.online ? "rgba(255,255,255,.85)" : "rgba(26,20,16,.10)"}`,
                  borderRadius: 14,
                  boxShadow: d.online ? "0 1px 0 rgba(255,255,255,.7) inset, 0 8px 20px -6px rgba(46,30,12,.20)" : "0 1px 0 rgba(255,255,255,.5) inset, 0 4px 10px -4px rgba(46,30,12,.10)",
                  opacity: d.online ? 1 : 0.55,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon name={d.kind} size={18} color={d.online ? "var(--ink-1)" : "var(--ink-4)"} />
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-1)" }}>{d.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 10.5, color: "var(--ink-3)" }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: 999,
                      background: d.online ? "var(--ok)" : "var(--ink-4)",
                      boxShadow: d.online ? "0 0 6px rgba(74,143,94,.6)" : "none",
                    }}/>
                    {d.online ? (d.here ? "This device" : "Online") : "Offline"}
                    {d.battery !== null && <span style={{ marginLeft: "auto" }} className="t-mono">{d.battery}%</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        <GlassCard>
          <div className="t-cap">Active transfers · {files.filter(f => f.progress < 100).length} in flight</div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            {files.map((f, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "36px 1fr auto 60px auto", gap: 14, alignItems: "center",
                padding: "10px 0", borderBottom: i < files.length - 1 ? "0.5px solid var(--ink-line)" : "none",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: "rgba(26,20,16,.04)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: f.kind === "img" ? "var(--accent-amber)" : f.kind === "audio" ? "var(--accent-coral)" : f.kind === "pdf" ? "var(--accent-orange)" : "var(--ink-2)",
                }}>
                  <Icon name={f.kind} size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4, fontSize: 11, color: "var(--ink-3)" }}>
                    <span>{f.from}</span>
                    <Icon name="arrow" size={11} />
                    <span>{f.to}</span>
                    <span>·</span>
                    <span>{f.size}</span>
                  </div>
                </div>
                <div style={{ width: 120 }}>
                  {f.progress < 100 ? (
                    <div style={{ height: 4, borderRadius: 999, background: "rgba(26,20,16,.06)", overflow: "hidden" }}>
                      <div style={{ width: `${f.progress}%`, height: "100%", background: "linear-gradient(90deg, var(--accent-amber), var(--accent-orange))" }}/>
                    </div>
                  ) : (
                    <span className="chip" style={{ color: "var(--ok)" }}>
                      <Icon name="check" size={11} />Delivered
                    </span>
                  )}
                </div>
                <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "right" }}>{f.progress}%</span>
                <button onClick={() => actions.removeFile(f.name)} aria-label={`Remove ${f.name}`} style={{ fontSize: 10, color: "var(--ink-4)", padding: "2px 6px" }}>✕</button>
              </div>
            ))}
            {files.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--ink-3)" }}>No transfers yet. Click "New transfer" to start.</div>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AiOrb size={20} />
            <div className="t-cap" style={{ color: "var(--accent-orange)" }}>AI · file noticed</div>
          </div>
          <div className="t-display-italic" style={{ fontSize: 19, marginTop: 10, lineHeight: 1.35 }}>
            "I see <strong>Bessemer-memo-v3.pdf</strong> just landed on your phone. Want me to attach it to the 14:30 calendar block automatically?"
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <PaperButton small>Not now</PaperButton>
            <PaperButton small primary onClick={attachToCalendar}>Yes, attach</PaperButton>
          </div>
          <div className="hair" style={{ margin: "16px 0" }}/>
          <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
            Sync status — peer-to-peer over LAN when devices are co-located, end-to-end
            encrypted otherwise. Average transfer ~140Mbps over Halcyon HQ wifi.
          </div>
        </GlassCard>
      </div>
    </ScreenShell>
  );
};
