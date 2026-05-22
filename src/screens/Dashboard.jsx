import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GlassCard, PaperButton, Avatar, Icon, AiOrb } from '../components/ui/Icons';
import { EnvironmentBadge } from '../components/ui/EnvironmentBadge';
import { CpuArchitecture } from '../components/ui/CpuArchitecture';
import { accentColor } from '../data';
import { useApp, useAppStore } from '../store/AppContext';
import { formatTime, formatDate, sendNotification, getGreeting } from '../services/clock';
import { generateDailyBriefing, parseNaturalLanguageTask } from '../services/ai';

// Card definitions are static — move outside the component to avoid re-creation on every render
const CARDS = [
  { id: "hello",    w: 2, h: 1, accent: "amber",  render: HelloCard },
  { id: "focus",   w: 1, h: 1, accent: "coral",  render: FocusCard },
  { id: "cpu",     w: 1, h: 2, accent: "orange", render: CpuCard },
  { id: "schedule",w: 2, h: 2, accent: "orange", render: ScheduleCard },
  { id: "tasks",   w: 1, h: 2, accent: "amber",  render: TasksCard },
  { id: "goals",   w: 2, h: 1, accent: "rose",   render: GoalsCard },
  { id: "ai",      w: 1, h: 1, accent: "orange", render: AiInboxCard },
  { id: "notes",   w: 1, h: 1, accent: "amber",  render: NotesCard },
  { id: "devices", w: 1, h: 1, accent: "coral",  render: DevicesCard },
  { id: "streak",  w: 1, h: 1, accent: "rose",   render: StreakCard },
];

function formatTimer(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const Dashboard = ({ tweaks: tweaksProp, onNavigate }) => {
  const { state, actions } = useApp();
  const store = useAppStore();
  const [expandedId, setExpandedId] = useState(null);
  const containerRef = useRef(null);
  const [focusActive, setFocusActive] = useState(false);
  const [focusRemaining, setFocusRemaining] = useState(0);
  const [hour, setHour] = useState(() => new Date().getHours());
  const [liveTime, setLiveTime] = useState(() => formatTime(new Date()));
  const [aiHeadline, setAiHeadline] = useState('');
  const [aiHeadlineLoading, setAiHeadlineLoading] = useState(true);
  const [captureInput, setCaptureInput] = useState('');
  const [showCapture, setShowCapture] = useState(false);
  const captureRef = useRef(null);

  const D = state;
  const t = tweaksProp || state.tweaks;

  // Live clock — updates every second
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setHour(now.getHours());
      setLiveTime(formatTime(now));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Focus timer with notification on complete
  const focusRemainingRef = useRef(focusRemaining);
  useEffect(() => { focusRemainingRef.current = focusRemaining; }, [focusRemaining]);

  useEffect(() => {
    if (!focusActive) return;
    const id = setInterval(() => {
      setFocusRemaining(r => {
        if (r <= 1) {
          sendNotification('Focus complete!', { body: 'Great work. Take a break.' });
          actions.addNotification({ text: 'Focus block complete!', kind: 'info' });
          setFocusActive(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [focusActive, actions]);

  // Request notification permission on first focus
  const notifRequested = useRef(false);
  useEffect(() => {
    if (focusActive && !notifRequested.current && 'Notification' in window) {
      notifRequested.current = true;
      if (Notification.permission === 'default') Notification.requestPermission();
    }
  }, [focusActive]);

  const startFocus = () => {
    setFocusActive(true);
    setFocusRemaining(25 * 60);
    actions.addNotification({ text: '25-min focus block started', kind: 'info' });
  };

  const pauseFocus = () => {
    setFocusActive(false);
    actions.addNotification({ text: 'Focus paused', kind: 'info' });
  };

  const resetFocus = () => {
    setFocusActive(false);
    setFocusRemaining(0);
    actions.addNotification({ text: 'Focus reset', kind: 'info' });
  };

  const handleCapture = useCallback(async () => {
    const text = captureInput.trim();
    if (!text) {
      // Open inline capture
      setShowCapture(true);
      setTimeout(() => captureRef.current?.focus(), 50);
      return;
    }
    // Smart routing: parse intent
    const lower = text.toLowerCase();
    if (/^(note|write|capture|remember|journal)[:;\s]/i.test(text)) {
      const title = text.replace(/^(note|write|capture|remember|journal)[:;\s]+/i, '').trim() || 'Quick note';
      actions.addNote({ title, tag: 'Inbox', content: text, preview: title });
      actions.addNotification({ text: `Note captured: "${title}"`, kind: 'info' });
    } else if (/^(event|meeting|schedule|cal)[:;\s]/i.test(text)) {
      const now = new Date();
      actions.addEvent({ title: text.replace(/^(event|meeting|schedule|cal)[:;\s]+/i, '').trim(), day: now.getDate(), month: now.getMonth(), year: now.getFullYear(), time: '09:00', color: 'amber' });
      actions.addNotification({ text: `Event added`, kind: 'info' });
    } else {
      // Default: route to AI task parser
      try {
        const parsed = await parseNaturalLanguageTask(text, store.getSnapshot());
        actions.addTask({ ...parsed, status: 'todo' });
        actions.addNotification({ text: `Task captured: "${parsed.title}" · ${parsed.priority}`, kind: 'info' });
      } catch {
        actions.addNote({ title: text.slice(0, 60), tag: 'Inbox', content: text, preview: text.slice(0, 80) });
        actions.addNotification({ text: 'Captured to inbox', kind: 'info' });
      }
    }
    setCaptureInput('');
    setShowCapture(false);
  }, [captureInput, actions, store]);

  const cardScreenMap = {
    hello: 'notes',
    focus: 'planner',
    schedule: 'planner',
    tasks: 'tasks',
    goals: 'tasks',
    ai: 'chat',
    notes: 'notes',
    devices: 'files',
    streak: 'notes',
    cpu: 'chat',
  };

  const handleCardClick = (cardId) => {
    if (onNavigate && cardScreenMap[cardId]) {
      onNavigate(cardScreenMap[cardId]);
    } else {
      setExpandedId(cardId);
    }
  };

  const closeExpanded = useCallback(() => setExpandedId(null), []);

  // Live AI briefing on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setAiHeadlineLoading(true);
      const result = await generateDailyBriefing(store.getSnapshot());
      if (!cancelled) { setAiHeadline(result); setAiHeadlineLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Greeting derived from live hour state
  const greeting = useMemo(() => getGreeting(hour), [hour]);

  return (
    <div ref={containerRef} className="scroll" style={{
      position: "absolute", inset: 0,
      paddingTop: 'var(--pad-block)',
      paddingBottom: 'calc(var(--dock-height) + 40px)',
      paddingLeft: 'var(--pad-inline)',
      paddingRight: 'var(--pad-inline)',
      overflowY: "auto"
    }}>
      <div style={{
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
        marginBottom: 'var(--gap-grid)', gap: 'var(--gap-grid)',
        paddingLeft: 4, paddingRight: 4,
        flexWrap: "wrap",
      }} className="dashboard-header">
        <div>
          <div className="t-cap" style={{ marginBottom: 6 }}>
            <span style={{ color: "var(--accent-orange)" }}>●</span>  {D.today.weekOf}
          </div>
          <h1 className="t-display" style={{
            margin: 0,
            fontSize: 'clamp(28px, 5.6vw, 56px)',
            fontWeight: 400, color: "var(--ink-1)",
            letterSpacing: "-0.025em", lineHeight: 1.02
          }}>
            {greeting}, <span className="t-display-italic" style={{ color: "var(--accent-orange)" }}>{D.user?.name?.split(' ')[0] || "User"}</span>.
            {focusActive && <span style={{ fontSize: 'clamp(13px, 1.8vw, 18px)', marginLeft: 'clamp(8px, 1.6vw, 16px)', color: "var(--accent-coral)" }}>Focus · {formatTimer(focusRemaining)}</span>}
          </h1>
          <div style={{ marginTop: 8, fontSize: 'clamp(12px, 1.4vw, 14px)', color: "var(--ink-2)", maxWidth: 640, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <span className="ai-text" style={{ fontWeight: 500, flexShrink: 0 }}>Hermes: </span>
            {aiHeadlineLoading
              ? <span style={{ color: 'var(--ink-3)' }}>Generating your briefing…</span>
              : <span>{aiHeadline || (D.aiSuggestions?.[0]?.text || `Today's big rock: ${D.tasks?.find(t => t.priority === 'P0' && t.status !== 'done')?.title || D.today.bigRock || 'set a P0 task to get started'}.`)}</span>
            }
          </div>
        </div>

        <div className="resp-scroll-x" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: 'wrap' }}>
          <div className="t-mono" style={{ fontSize: 'clamp(11px, 1.3vw, 13px)', color: "var(--ink-3)", padding: "0 6px" }}>
            {liveTime}
          </div>
          {focusActive ? (
            <>
              <PaperButton icon="flame" small onClick={pauseFocus} aria-label="Pause focus timer">
                {formatTimer(focusRemaining)}
              </PaperButton>
              <PaperButton small onClick={resetFocus} aria-label="Reset focus timer">Reset</PaperButton>
            </>
          ) : (
            <PaperButton icon="flame" small onClick={startFocus} aria-label="Start 25-minute focus timer">
              Start 25-min focus
            </PaperButton>
          )}
          {showCapture ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px' }}>
              <input
                ref={captureRef}
                placeholder='Task, note, or event… (note: X, event: X, or just type)'
                value={captureInput}
                onChange={e => setCaptureInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCapture(); if (e.key === 'Escape') { setShowCapture(false); setCaptureInput(''); } }}
                style={{ all: 'unset', fontSize: 12, color: 'var(--ink-1)', fontFamily: 'var(--font-body)', padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,.07)', border: '0.5px solid rgba(255,255,255,.12)', width: 260 }}
              />
              <PaperButton icon="plus" primary small onClick={handleCapture} disabled={!captureInput.trim()}>Save</PaperButton>
              <button type="button" onClick={() => { setShowCapture(false); setCaptureInput(''); }} style={{ fontSize: 12, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
          ) : (
            <PaperButton icon="plus" primary small onClick={() => { setShowCapture(true); setTimeout(() => captureRef.current?.focus(), 50); }}>✨ Capture</PaperButton>
          )}
        </div>
      </div>

      <div className="bento-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gridAutoRows: "minmax(160px, auto)",
        gap: 'var(--gap-grid)',
        filter: expandedId ? "blur(6px) saturate(.9) brightness(1.03)" : "none",
        transform: expandedId ? "scale(0.985)" : "scale(1)",
        transformOrigin: "center center",
        transition: "filter 320ms var(--ease-glass), transform 320ms var(--ease-glass)",
        pointerEvents: expandedId ? "none" : "auto"
      }}>
        {CARDS.map((card, idx) =>
        <DraggableBentoCard
          key={card.id}
          card={card}
          index={idx}
          data={D}
          containerRef={containerRef}
          onExpand={() => setExpandedId(card.id)}
          onClick={() => handleCardClick(card.id)}
          onNavigate={onNavigate}
          tweaks={t}
          actions={actions} />
        )}
      </div>

      {expandedId &&
      <ExpandedCard
        card={CARDS.find((c) => c.id === expandedId)}
        data={D}
        onClose={closeExpanded}
        onNavigate={onNavigate}
        actions={actions} />
      }
    </div>
  );
};

const DraggableBentoCard = React.memo(({ card, data, containerRef, onExpand, onClick, onNavigate, tweaks, index = 0, actions }) => {
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [proximity, setProximity] = useState(0);
  const ref = useRef(null);
  const start = useRef({ x: 0, y: 0, px: 0, py: 0 });
  // Use a ref for the drag-active flag so pointer handlers read fresh values
  // without needing to be recreated on every render
  const isDragging = useRef(false);

  const onPointerDown = (e) => {
    if (e.target.closest("button, a, input")) return;
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, px: drag.x, py: drag.y };
    isDragging.current = true;
    setDrag((d) => ({ ...d, active: true }));
  };
  const onPointerMove = (e) => {
    if (!isDragging.current) return;
    const nx = start.current.px + (e.clientX - start.current.x);
    const ny = start.current.py + (e.clientY - start.current.y);
    setDrag({ x: nx, y: ny, active: true });
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const ccx = window.innerWidth / 2;
      const ccy = window.innerHeight / 2;
      const d = Math.hypot(cx - ccx, cy - ccy);
      const max = 360;
      setProximity(Math.max(0, Math.min(1, 1 - d / max)));
    }
  };
  const onPointerUp = (e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    // Calculate pointer travel distance
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    const dist = Math.hypot(dx, dy);

    setDrag({ x: 0, y: 0, active: false });
    setProximity(0);

    if (dist < 6) {
      // Small travel distance means it is a Click!
      if (onClick) {
        onClick();
      } else {
        onExpand();
      }
      return;
    }

    if (proximity > 0.55) {
      onExpand();
    }
  };

  const lift = drag.active ? 1.02 + proximity * 0.06 : 1;
  const glow = proximity;
  const accentHex = accentColor[card.accent];

  return (
    <div
      ref={ref}
      className="bento-card"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        gridColumn: `span ${card.w}`,
        gridRow: `span ${card.h}`,
        transform: `translate(${drag.x}px, ${drag.y}px) scale(${lift})`,
        transition: drag.active ? "transform 90ms linear, box-shadow 200ms ease-out, filter 200ms ease-out" : "transform 360ms var(--ease-genie), box-shadow 360ms var(--ease-genie), filter 360ms var(--ease-genie)",
        zIndex: drag.active ? 10 : 1,
        cursor: drag.active ? "grabbing" : "grab",
        position: "relative",
        filter: glow > 0 ? `drop-shadow(0 0 ${20 * glow}px ${accentHex}66)` : "none"
      }}>
      <GlassCard
        strong={drag.active}
        className="card-rise"
        style={{
          height: "100%",
          padding: 0,
          animationDelay: `${index * 70}ms`,
          boxShadow: drag.active ?
          `0 30px 60px -10px rgba(0,0,0,.35), 0 0 0 ${1 + glow * 2}px ${accentHex}${Math.round(glow * 55).toString(16).padStart(2, '0')}, inset 0 0 0 0.5px rgba(255,255,255,.20)` :
          undefined
        }}>
        {React.createElement(card.render, { data, expanded: false, accent: accentHex, actions, onNavigate })}
        <div style={{
          position: "absolute", top: 10, right: 10, opacity: drag.active ? 0.7 : 0.25,
          transition: "opacity 200ms",
          color: "var(--ink-3)"
        }}>
          <Icon name="drag" size={14} />
        </div>
      </GlassCard>
    </div>
  );
});

const ExpandedCard = ({ card, data, onClose, onNavigate, actions }) => {
  useEffect(() => {
    const onKey = (e) => {if (e.key === "Escape") onClose();};
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 80,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "100px 60px 120px",
        animation: "expand-fade 320ms var(--ease-glass)"
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1100px, 100%)", height: "min(720px, 100%)",
          background: "rgba(18,18,18,0.92)",
          backdropFilter: "blur(40px) saturate(160%)",
          WebkitBackdropFilter: "blur(40px) saturate(160%)",
          border: "0.5px solid rgba(255,255,255,.12)",
          borderRadius: 28,
          boxShadow: `
            0 1px 0 rgba(255,255,255,.08) inset,
            0 -1px 0 rgba(0,0,0,.30) inset,
            0 50px 100px -20px rgba(0,0,0,.65),
            0 16px 36px -12px rgba(0,0,0,.40)`,
          animation: "genie-in 520ms var(--ease-genie)",
          transformOrigin: "center bottom",
          overflow: "hidden",
          position: "relative"
        }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16, zIndex: 2,
          width: 32, height: 32, borderRadius: 999,
          background: "rgba(255,255,255,.07)", color: "var(--ink-2)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <Icon name="close" size={16} />
        </button>
        <div className="scroll" style={{ height: "100%", overflowY: "auto", padding: "32px 40px 40px" }}>
          {React.createElement(card.render, { data, expanded: true, accent: accentColor[card.accent], actions, onNavigate })}
        </div>
      </div>
    </div>
  );
};

// ─── Card Implementations ───

function HelloCard({ data, expanded, accent }) {
  const mode = data?.tweaks?.environmentMode;
  const envGreeting = mode === 'learning' ? '📖 In a learning flow'
    : mode === 'rest' ? '🌙 Take it easy today'
    : mode === 'focus' ? '🎯 Locked in'
    : mode === 'sickness' ? '🤒 Hope you feel better'
    : mode === 'shelter' ? '🛡️ Taking space'
    : mode === 'redirect' ? '🔄 Finding momentum'
    : mode === 'offline' ? '🔕 Off the grid'
    : null;

  return React.useMemo(() => (
    <div style={{ padding: expanded ? 0 : 24, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div>
        <div className="t-cap" style={{ color: accent }}>
          {envGreeting || "Today's big rock"}
          {mode && mode !== 'normal' && <EnvironmentBadge mode={mode} style={{ marginLeft: 8 }} />}
        </div>
        <div className="t-display" style={{ fontSize: expanded ? 44 : 26, fontWeight: 400, lineHeight: 1.15, marginTop: 8, letterSpacing: "-0.015em" }}>
          {data.today.bigRock}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
        <span className="chip"><span className="chip-dot" style={{ background: accent }} />Fundraise</span>
        <span className="chip">Due 14:30</span>
        <span className="chip">P0</span>
        <span style={{ flex: 1 }} />
        <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{data.today.weather}</span>
      </div>
    </div>
  ), [data.today.bigRock, data.today.weather, expanded, accent, mode, envGreeting]);
}

function FocusCard({ data, expanded, accent }) {
  const done = data.schedule.filter(s => s.isFocus).length;
  const total = 4;
  const pct = Math.min(100, Math.round((done / total) * 100));
  return (
    <div style={{ padding: expanded ? 0 : 22, height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="t-cap">POINTS · TODAY</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginTop: 14 }}>
        <span className="t-num" style={{ fontSize: expanded ? 110 : 72, color: "var(--ink-1)", lineHeight: 0.95 }}>{done * 46}</span>
        <span style={{ fontSize: 14, color: "var(--ink-3)", paddingBottom: 8 }}>/ {total * 60} goal</span>
      </div>
      <div style={{ marginTop: 16, position: "relative", height: 8, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0, width: `${pct}%`,
          background: `linear-gradient(90deg, ${accent}, var(--accent-orange))`,
          borderRadius: 999, boxShadow: `0 0 12px ${accent}66`
        }} />
      </div>
      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", paddingTop: 16, fontSize: 11.5, color: "var(--ink-3)" }}>
        <span>{done} blocks done</span>
        <span style={{ color: "var(--ok)" }}>↑ +{done * 5}% on yesterday</span>
      </div>
    </div>
  );
}

function ScheduleCard({ data, expanded, accent, actions, onNavigate }) {
  const items = expanded ? data.schedule : data.schedule.slice(0, 7);
  const [nowTime, setNowTime] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNowTime(new Date()), 60000); return () => clearInterval(id); }, []);
  const nowStr = nowTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const addBuffer = () => {
    actions.addScheduleBlock({ time: '14:20', end: '14:30', title: 'Buffer · memo prep', kind: 'buffer', color: 'amber' });
    actions.addNotification({ text: 'Buffer block added before 14:30 memo', kind: 'info' });
  };

  return (
    <div style={{ padding: expanded ? 0 : 24, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div className="t-cap" style={{ color: accent }}>Today · {data.today.date}</div>
          <div className="t-display" style={{ fontSize: expanded ? 36 : 22, marginTop: 4 }}>Your day, planned by AI</div>
        </div>
        <div className="chip" style={{ color: "var(--ink-2)" }}>
          <span className="chip-dot" style={{ background: "var(--accent-coral)", animation: "orb-pulse 2s ease-in-out infinite" }} />
          NOW · {nowStr}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, overflow: "hidden", minHeight: 0 }}>
        {items.map((it, i) => {
          const cAccent = accentColor[it.color] || accent;
          const isPast = i < 2;
          return (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onNavigate?.('planner');
              }}
              style={{
                all: "unset", display: "grid", width: "100%", cursor: "pointer",
                gridTemplateColumns: "62px 14px 1fr auto",
                alignItems: "center", gap: 12,
                padding: "6px 10px 6px 0",
                borderRadius: 10,
                background: it.isFocus ? "rgba(245,165,36,.08)" : "transparent",
                opacity: isPast ? 0.5 : 1
              }}
            >
              <span className="t-mono" style={{ fontSize: 12, color: "var(--ink-3)", textAlign: "right" }}>
                {it.time}
              </span>
              <span style={{
                width: 8, height: 8, borderRadius: 999, background: cAccent, justifySelf: "center",
                boxShadow: it.critical ? `0 0 0 3px ${cAccent}22` : "none"
              }} />
              <span style={{
                fontSize: 13.5, color: "var(--ink-1)", textDecoration: isPast ? "line-through" : "none",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "left"
              }}>{it.title}</span>
              {it.critical && <span style={{ fontSize: 10, fontWeight: 600, color: cAccent, textTransform: "uppercase", letterSpacing: "0.06em" }}>Critical</span>}
              {it.isFocus && !it.critical && <span className="ai-text" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Deep work</span>}
            </button>);
        })}
      </div>
      {expanded &&
      <div style={{ marginTop: 20, padding: 16, borderRadius: 14, background: "rgba(245,165,36,.08)", border: "0.5px solid rgba(245,165,36,.22)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <AiOrb size={20} />
            <span className="t-cap" style={{ color: "var(--accent-orange)" }}>AI · gentle nudge</span>
          </div>
          <div style={{ fontSize: 13.5, color: "var(--ink-2)" }}>
            You have zero buffer between 13:00 and 14:30. The memo will not get sent on time without it.
            <button onClick={addBuffer} style={{ color: "var(--accent-orange)", marginLeft: 8, cursor: "pointer" }}>Add 10-min buffer →</button>
          </div>
        </div>
      }
    </div>
  );
}

function TasksCard({ data, expanded, accent, actions, onNavigate }) {
  const tasks = expanded ? data.tasks : data.tasks.filter((t) => t.status !== "done").slice(0, 5);
  return (
    <div style={{ padding: expanded ? 0 : 22, height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="t-cap" style={{ color: accent }}>Up next</div>
      <div className="t-display" style={{ fontSize: expanded ? 32 : 20, marginTop: 4, marginBottom: 14 }}>
        {tasks.filter((t) => t.status !== "done").length} tasks · {data.tasks.filter(t => t.priority === 'P0' && t.status !== 'done').length} P0
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden", minHeight: 0 }}>
        {tasks.map((t) => {
          const p = { P0: "#e7402e", P1: "#f06b1c", P2: "#f5a524", P3: "#b3a890" }[t.priority];
          const checked = t.status === "done";
          return (
            <div key={t.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0" }}>
              <button onClick={() => actions?.toggleTask(t.id)} style={{
                width: 16, height: 16, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                border: `1.5px solid ${checked ? "transparent" : p}`,
                background: checked ? "var(--ok)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer"
              }}>
                {checked && <Icon name="check" size={10} stroke={2.5} />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate?.('tasks');
                }}
                style={{
                  all: "unset", display: "block", flex: 1, minWidth: 0, cursor: "pointer", textAlign: "left", width: "100%"
                }}
              >
                <div style={{
                  fontSize: 13, color: "var(--ink-1)",
                  textDecoration: checked ? "line-through" : "none",
                  opacity: checked ? 0.5 : 1,
                  overflow: "hidden", textOverflow: "ellipsis",
                  display: "-webkit-box", WebkitLineClamp: expanded ? 3 : 2, WebkitBoxOrient: "vertical"
                }}>{t.title}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 3, fontSize: 10.5, color: "var(--ink-3)" }}>
                  <span style={{ color: p, fontWeight: 600 }}>{t.priority}</span>
                  <span>·</span>
                  <span>{t.due}</span>
                  <span>·</span>
                  <span>{t.project}</span>
                </div>
                {expanded && t.ai &&
                <div style={{
                  marginTop: 6, padding: "6px 8px", borderRadius: 7,
                  background: "rgba(245,165,36,.10)", fontSize: 11.5, color: "var(--ink-2)",
                  display: "flex", alignItems: "center", gap: 6
                }}>
                    <Icon name="sparkle" size={11} color="var(--accent-orange)" />
                    {t.ai}
                  </div>
                }
              </button>
            </div>);
        })}
      </div>
    </div>
  );
}

function GoalsCard({ data, expanded, accent }) {
  return (
    <div style={{ padding: expanded ? 0 : 22, height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="t-cap" style={{ color: accent }}>Goals · Q2</div>
      <div className="t-display" style={{ fontSize: expanded ? 32 : 20, marginTop: 4, marginBottom: 16 }}>Where you stand</div>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: expanded ? "1fr 1fr" : "1fr 1fr", gap: 14 }}>
        {data.goals.map((g, i) => {
          const c = accentColor[g.color] || accent;
          return (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{g.name}</span>
                <span className="t-num" style={{ fontSize: 22, color: c }}>{g.pct}%</span>
              </div>
              <div style={{ marginTop: 6, height: 6, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
                <div style={{ width: `${g.pct}%`, height: "100%", background: `linear-gradient(90deg, ${c}, ${c}cc)`, borderRadius: 999 }} />
              </div>
              <div style={{ marginTop: 5, fontSize: 10.5, color: "var(--ink-3)" }}>{g.sub}</div>
            </div>);
        })}
      </div>
    </div>
  );
}

function AiInboxCard({ data, expanded, accent }) {
  return (
    <div style={{ padding: expanded ? 0 : 22, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <AiOrb size={20} intensity={1.3} />
        <div className="t-cap" style={{ color: accent }}>AI inbox · {data.aiSuggestions?.length || 0}</div>
      </div>
      <div className="t-display-italic" style={{ fontSize: expanded ? 22 : 15, color: "var(--ink-2)", marginBottom: 12, lineHeight: 1.35 }}>
        "I've been quietly watching your week."
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minHeight: 0, overflow: "hidden" }}>
        {(data.aiSuggestions || []).map((s, i) =>
        <div key={i} style={{ padding: "8px 10px", borderRadius: 9, background: "rgba(255,255,255,.05)", border: "0.5px solid rgba(255,255,255,.08)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, marginBottom: 3 }}>
              {s.kind}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.4 }}>{s.text}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function NotesCard({ data, expanded, accent, onNavigate }) {
  const notes = expanded ? data.notes : data.notes.slice(0, 3);
  return (
    <div style={{ padding: expanded ? 0 : 22, height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="t-cap" style={{ color: accent }}>Recent notes</div>
      <div style={{ flex: 1, marginTop: 10, display: "flex", flexDirection: "column", gap: 10, minHeight: 0, overflow: "hidden" }}>
        {notes.map((n) =>
        <button
          key={n.id}
          onClick={(e) => {
            e.stopPropagation();
            onNavigate?.('notes');
          }}
          style={{
            all: "unset", display: "block", width: "100%", cursor: "pointer", textAlign: "left",
            paddingBottom: 8, borderBottom: "0.5px solid var(--ink-line)", marginBottom: 4
          }}
        >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-1)" }}>{n.title}</span>
              <span style={{ fontSize: 10, color: "var(--ink-3)" }}>{n.edited}</span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 3, lineHeight: 1.4,
            overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical"
          }}>{n.preview || 'No preview'}</div>
        </button>
        )}
      </div>
    </div>
  );
}

function DevicesCard({ data, expanded, accent, onNavigate }) {
  return (
    <div style={{ padding: expanded ? 0 : 22, height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="t-cap" style={{ color: accent }}>Connected · {data.devices.filter((d) => d.online).length}/{data.devices.length}</div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate?.('files');
        }}
        style={{
          all: "unset", display: "flex", flexDirection: "column", gap: 8, width: "100%", cursor: "pointer",
          marginTop: 12, flex: 1
        }}
      >
        {data.devices.map((d) =>
        <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
            <Icon name={d.kind} size={16} color={d.online ? "var(--ink-1)" : "var(--ink-4)"} />
            <span style={{ fontSize: 12, color: d.online ? "var(--ink-1)" : "var(--ink-4)", flex: 1, textAlign: "left" }}>{d.name}</span>
            {d.online && d.battery !== null &&
            <span className="t-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{d.battery}%</span>
            }
            <span style={{
              width: 6, height: 6, borderRadius: 999,
              background: d.online ? "var(--ok)" : "var(--ink-4)",
              boxShadow: d.online ? "0 0 6px rgba(74,143,94,.6)" : "none"
            }} />
          </div>
        )}
      </button>
      <div style={{ marginTop: 14, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,.04)", fontSize: 10.5, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="sync" size={11} />
        <span>Synced just now</span>
      </div>
    </div>
  );
}

function CpuCard({ expanded, accent }) {
  return (
    <div style={{
      padding: expanded ? 0 : 16,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    }}>
      <div className="t-cap" style={{ color: accent, alignSelf: 'flex-start' }}>AI CORE</div>
      <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
        <CpuArchitecture text="HERMES" lineMarkerSize={5} />
      </div>
      <div style={{
        fontSize: 9,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.12em',
        color: 'var(--ink-3)',
        textTransform: 'uppercase',
      }}>
        Mistral · Online
      </div>
    </div>
  );
}

function StreakCard({ data, expanded, accent, onNavigate }) {
  const days = Array.from({ length: 7 }, (_, i) => ({ done: i < 6, day: ["S", "M", "T", "W", "T", "F", "S"][i] }));
  return (
    <div style={{ padding: expanded ? 0 : 22, height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="t-cap" style={{ color: accent }}>Pages streak</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
        <span className="t-num" style={{ fontSize: expanded ? 92 : 56, color: "var(--ink-1)", lineHeight: 1 }}>{data.user.streak}</span>
        <span style={{ fontSize: 13, color: "var(--ink-3)" }}>days</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate?.('notes');
        }}
        style={{
          all: "unset", display: "flex", gap: 6, width: "100%", cursor: "pointer",
          marginTop: "auto", paddingTop: 14
        }}
      >
        {days.map((d, i) =>
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
            width: "100%", aspectRatio: "1",
            borderRadius: 6,
            background: d.done ? `linear-gradient(135deg, ${accent}, var(--accent-coral))` : "rgba(255,255,255,.06)",
            boxShadow: d.done ? `0 0 8px ${accent}55` : "none"
          }} />
            <span style={{ fontSize: 9, color: "var(--ink-3)" }}>{d.day}</span>
          </div>
        )}
      </button>
    </div>
  );
}
