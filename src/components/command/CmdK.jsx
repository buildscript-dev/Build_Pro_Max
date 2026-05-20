import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../store/AppContext';
import { Icon, AiOrb } from '../ui/Icons';

function simulatedAnswer(label, q) {
  if (/plan my afternoon/i.test(label)) {
    return {
      kind: "plan",
      summary: "Here's a tight afternoon. I removed 2 things you'd regret missing.",
      steps: [
        "13:00–14:25 · Design crit with Sana (90m → 85m, keep buffer)",
        "14:25–14:30 · Walk + breath, then hit send on the memo",
        "14:30 · Bessemer follow-up — pre-scheduled, requires one click",
        "15:00–15:45 · Async review (Slack, GitHub, Linear) — capped",
        "15:45–16:30 · Q2 dashboard pull (the one Marc asked for)",
        "16:30–17:00 · Buffer. You always think you don't need it. You do.",
      ],
    };
  }
  if (/summarize.*panel/i.test(label)) {
    return {
      kind: "plan",
      summary: "Sana > Ines on systems and product instinct. Ines has the craft edge.",
      steps: [
        "Sana — strongest signal on 'what to build next'; weaker on motion polish",
        "Ines — exceptional visual + interaction craft; needs more product context",
        "Both are above bar. Hire Sana now, keep Ines warm for IC #3 in Q3.",
        "Offer math drafted in note 'Founding designer · panel notes'.",
      ],
    };
  }
  if (/thank-you.*Caro/i.test(label)) {
    return {
      kind: "plan",
      summary: "Drafted. Tone matches your last three with her — warm, short, no ask.",
      steps: [
        "Subject: 'thanks for the Bessemer intro'",
        "One line of gratitude, one line of context (memo going today)",
        "Closes with the Seedcamp partner intro as a soft callback",
        "Ready to send from Notes → Drafts.",
      ],
    };
  }
  if (/slipping/i.test(label)) {
    return {
      kind: "plan",
      summary: "Three things are sliding. One of them is sliding into a wall.",
      steps: [
        "Founding designer #2 — decision is 11 days old. Sana will go elsewhere.",
        "Cancel Adobe seat — 11-day slide, this is a money leak, not a task.",
        "Q2 OKRs with Rohan — sitting in Notion since Monday; he won't ping you.",
      ],
    };
  }
  return { kind: "plan", summary: `Working on "${q || label}"…`, steps: ["Step 1", "Step 2"] };
}

export const CmdK = ({ open, onClose, onNavigate }) => {
  const { state, actions } = useApp();
  const [q, setQ]       = useState("");
  const [sel, setSel]   = useState(0);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState(null);
  const inputRef = useRef(null);

  const SUGGESTIONS = useMemo(() => [
    { kind: "ai",      label: "Plan my afternoon around the Bessemer follow-up", icon: "sparkle" },
    { kind: "ai",      label: "Summarize the founding designer panel notes",     icon: "sparkle" },
    { kind: "ai",      label: "Draft a thank-you to Caroline Ferreira",          icon: "sparkle" },
    { kind: "ai",      label: "What's slipping this week?",                       icon: "sparkle" },
    { kind: "nav",     label: "Jump to Tasks",  to: "tasks",   icon: "tasks" },
    { kind: "nav",     label: "Jump to Notes",  to: "notes",   icon: "notes" },
    { kind: "nav",     label: "Jump to Planner", to: "planner", icon: "planner" },
    { kind: "action",  label: "New note — Pages",   icon: "plus" },
    { kind: "action",  label: "Start a 25-min focus block", icon: "flame" },
    { kind: "action",  label: "New task", icon: "tasks" },
  ], []);

  useEffect(() => {
    if (open) {
      setQ(""); setSel(0); setAnswer(null); setBusy(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      });
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!q.trim()) return SUGGESTIONS;
    const s = q.toLowerCase();
    const matched = SUGGESTIONS.filter(x => x.label.toLowerCase().includes(s));
    return [{ kind: "askai", label: `Ask AI · "${q}"`, icon: "sparkle" }, ...matched];
  }, [q, SUGGESTIONS]);

  const onKey = (e) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { setSel(s => Math.min(filtered.length - 1, s + 1)); e.preventDefault(); }
    if (e.key === "ArrowUp")   { setSel(s => Math.max(0, s - 1)); e.preventDefault(); }
    if (e.key === "Enter")     { run(filtered[sel]); }
  };

  function run(item) {
    if (!item) return;
    if (item.kind === "nav") { onNavigate?.(item.to); onClose(); return; }
    if (item.kind === "ai" || item.kind === "askai") {
      setBusy(true);
      setAnswer(null);
      actions.addChatMessage({ role: "user", text: item.label });
      setTimeout(() => {
        setBusy(false);
        const res = simulatedAnswer(item.label, q);
        setAnswer(res);
        actions.addChatMessage({ role: "ai", text: res.summary || `Working on "${item.label}"…` });
      }, 800);
      return;
    }
    if (item.kind === "action") {
      if (item.label.includes("New note")) {
        const note = { title: "Untitled", tag: "Pages", preview: "", content: "", pinned: false };
        actions.addNote(note);
        setAnswer({ kind: "ack", text: `Created new note.` });
        actions.addNotification({ text: `New note created`, kind: "info" });
      } else if (item.label.includes("focus")) {
        setAnswer({ kind: "ack", text: `25-min focus block started.` });
        actions.addScheduleBlock({ time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), title: "Focus block", kind: "focus", color: "orange" });
        actions.addNotification({ text: `25-min focus block started`, kind: "info" });
      } else if (item.label.includes("New task")) {
        actions.addTask({ title: "New task", project: "General", priority: "P2", status: "todo" });
        setAnswer({ kind: "ack", text: `New task created.` });
        actions.addNotification({ text: `New task created`, kind: "info" });
      } else {
        setAnswer({ kind: "ack", text: `Done. ${item.label}.` });
      }
      return;
    }
  }

  if (!open) return null;

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(46, 30, 12, 0.18)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex", justifyContent: "center", paddingTop: "12vh",
        animation: "fade-in 200ms var(--ease-glass)",
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(640px, 92vw)", maxHeight: "70vh", display: "flex", flexDirection: "column",
          background: "rgba(255, 252, 244, 0.82)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          border: "0.5px solid rgba(255,255,255,.85)",
          borderRadius: 24,
          boxShadow: `
            0 2px 1px rgba(255,255,255,.95) inset,
            0 -1px 1px rgba(0,0,0,.05) inset,
            0 40px 80px -20px rgba(46,30,12,.45),
            0 12px 32px -10px rgba(46,30,12,.25)`,
          overflow: "hidden",
          animation: "pop-in 260ms var(--ease-genie)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 22px" }}>
          <AiOrb size={28} intensity={1.2} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={onKey}
            placeholder="Ask Build_PRO_MAX_1 anything…"
            className="cmdk-input"
          />
          <kbd style={{
            fontFamily: "var(--font-mono)", fontSize: 11,
            padding: "3px 7px", borderRadius: 6,
            background: "rgba(26,20,16,.06)", color: "var(--ink-3)",
          }}>esc</kbd>
        </div>
        <div className="hair" />

        {(busy || answer) && (
          <div style={{ padding: "18px 22px", borderBottom: "0.5px solid var(--ink-line)" }}>
            {busy && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink-3)" }}>
                <AiOrb size={18} intensity={1.4} />
                <span className="ai-text" style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 16 }}>
                  Thinking…
                </span>
              </div>
            )}
            {answer && answer.kind === "ack" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink-2)", fontSize: 14 }}>
                <Icon name="check" size={16} color="var(--ok)" />
                {answer.text}
              </div>
            )}
            {answer && answer.kind === "plan" && (
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontStyle: "italic", color: "var(--ink-2)", marginBottom: 10 }}>
                  {answer.summary}
                </div>
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.7 }}>
                  {answer.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </div>
            )}
          </div>
        )}

        <div className="scroll" style={{ flex: 1, overflowY: "auto", padding: 8, minHeight: 0 }}>
          <div style={{ padding: "4px 12px 6px", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>
            {q.trim() ? "Suggestions" : "Try"}
          </div>
          {filtered.map((it, i) => (
            <div
              key={i}
              onMouseEnter={() => setSel(i)}
              onClick={() => run(it)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "9px 12px", borderRadius: 10, cursor: "default",
                background: sel === i ? "rgba(245,165,36,.14)" : "transparent",
                color: "var(--ink-1)",
                boxShadow: sel === i ? "inset 0 0 0 0.5px rgba(245,165,36,.32)" : "none",
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                background: it.kind === "ai" || it.kind === "askai" ? "linear-gradient(135deg, #fef3c7, #fed7aa)" : "rgba(26,20,16,.04)",
                color: it.kind === "ai" || it.kind === "askai" ? "var(--accent-orange)" : "var(--ink-2)",
              }}>
                <Icon name={it.icon} size={14} />
              </div>
              <span style={{ flex: 1, fontSize: 13.5 }}>
                {it.label}
              </span>
              <span style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {it.kind === "ai" || it.kind === "askai" ? "AI" : it.kind === "nav" ? "Jump" : "Action"}
              </span>
            </div>
          ))}
        </div>

        <div className="hair" />
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", fontSize: 11, color: "var(--ink-3)" }}>
          <span>↑↓ navigate</span><span>·</span>
          <span>↵ run</span><span>·</span>
          <span>esc close</span>
          <div style={{ flex: 1 }}/>
          <span className="ai-text" style={{ fontWeight: 600 }}>Build_PRO_MAX_1 AI</span>
        </div>
      </div>
    </div>
  );
};
