import React, { useState, useCallback } from 'react';
import { GlassCard, PaperButton, Icon, AiOrb } from '../components/ui/Icons';
import { accentColor } from '../data';
import { useApp } from '../store/AppContext';
import { generateAiResponse } from '../services/ai';
import { formatDate, getCurrentTime } from '../services/clock';

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

const TRACK_TEMPLATES = [
  { name: "Fundraise", color: "coral", blocks: [{ d: 0, w: 2, label: "Deck pass" }, { d: 3, w: 1, label: "Bessemer follow-up · memo" }, { d: 4, w: 2, label: "Partner mtgs · 3" }] },
  { name: "Product",   color: "orange", blocks: [{ d: 0, w: 4, label: "Ship onboarding v3" }, { d: 4, w: 1, label: "Polish" }] },
  { name: "Hiring",    color: "amber",  blocks: [{ d: 1, w: 1, label: "Crit · Sana" }, { d: 3, w: 1, label: "Decide" }] },
  { name: "Team",      color: "rose",   blocks: [{ d: 2, w: 1, label: "1:1 · Rohan" }, { d: 5, w: 1, label: "All-hands prep" }] },
  { name: "Rest",      color: "amber",  blocks: [{ d: 5, w: 2, label: "Off · long ride" }] },
];

const defaultTracks = () => {
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7;
  const mon = now.getDate() - dayOfWeek;
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), mon + i);
    const isToday = i === dayOfWeek;
    return formatDate(d) + (isToday ? ' · Today' : '');
  });
  return { tracks: TRACK_TEMPLATES, days };
};

export const Planner = () => {
  const { state, actions } = useApp();
  const [scope, setScope] = useState("week");
  const [data, setData] = useState(defaultTracks);

  const tracks = data.tracks;
  const days = data.days;

  const regenerate = useCallback(async () => {
    actions.addNotification({ text: 'AI regenerating tracks…', kind: 'info' });
    const prompt = `I have ${state.tasks?.length || 0} tasks and ${state.notes?.length || 0} notes. My current week tracks are: ${tracks.map(t => t.name).join(', ')}. Suggest an optimized weekly plan prioritizing my ${state.tasks?.filter(t => t.priority === 'P0' && t.status !== 'done').length || 0} P0 tasks. Return a brief suggestion.`;
    const response = await generateAiResponse(prompt, state);
    const daysArr = (() => {
      const now = new Date();
      const dayOfWeek = (now.getDay() + 6) % 7;
      const mon = now.getDate() - dayOfWeek;
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth(), mon + i);
        const isToday = i === dayOfWeek;
        return formatDate(d) + (isToday ? ' · Today' : '');
      });
    })();
    const shifting = [...tracks].sort(() => Math.random() - 0.5);
    const regenerated = shifting.map((t, ti) => ({
      ...t,
      blocks: t.blocks.map(b => ({
        ...b,
        label: b.label,
        d: Math.min(6, Math.max(0, b.d + (ti === 0 ? 1 : 0))),
      })),
    }));
    setData({ tracks: regenerated, days: daysArr });
    if (response) actions.addNotification({ text: `AI: ${response.slice(0, 120)}…`, kind: 'info' });
  }, [state, tracks, actions]);

  const showMe = () => {
    actions.addNotification({ text: 'Showing competing blocks: Product polish vs All-hands prep on Friday', kind: 'info' });
  };
  const doIt = () => {
    const updated = tracks.map(t => t.name === 'Team' ? {
      ...t,
      blocks: t.blocks.map(b => b.label.includes('All-hands') ? { ...b, d: 0, label: 'All-hands prep (moved to Mon)' } : b),
    } : t);
    setData({ ...data, tracks: updated });
    actions.addNotification({ text: 'Moved All-hands prep to Monday morning', kind: 'info' });
  };

  return (
    <ScreenShell
      eyebrow="AI Planner"
      title={<>Tracks for <span className="t-display-italic" style={{ color: "var(--accent-orange)" }}>this week</span>.</>}
      subtitle={<>An execution track is a chain of blocks the AI commits to on your behalf. Edit any block, and the rest reshuffles.</>}
      right={<>
        <div style={{ display: "flex", padding: 3, gap: 2, borderRadius: 999, background: "rgba(26,20,16,.05)", border: "0.5px solid rgba(26,20,16,.08)" }}>
          {["day","week","month","year"].map(s => (
            <button key={s} onClick={() => setScope(s)} style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 500,
              background: scope === s ? "rgba(255,252,244,.95)" : "transparent",
              color: scope === s ? "var(--ink-1)" : "var(--ink-3)",
              boxShadow: scope === s ? "0 1px 0 rgba(255,255,255,.7) inset, 0 1px 2px rgba(46,30,12,.10)" : "none",
              textTransform: "capitalize",
            }}>{s}</button>
          ))}
        </div>
        <PaperButton icon="sparkle" primary onClick={regenerate}>Regenerate</PaperButton>
      </>}
    >
      {scope === "week" && <WeekView days={days} tracks={tracks} showMe={showMe} doIt={doIt} />}
      {scope === "day" && <DayView D={state} />}
      {scope === "month" && <MonthView D={state} />}
      {scope === "year" && <YearView />}
    </ScreenShell>
  );
};

const WeekView = ({ days, tracks, showMe, doIt }) => (
  <GlassCard padding={0} style={{ overflow: "hidden" }}>
    <div style={{ display: "grid", gridTemplateColumns: "160px repeat(7, 1fr)", borderBottom: "0.5px solid var(--ink-line)" }}>
      <div style={{ padding: "14px 18px", fontSize: 11, fontWeight: 600, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Track</div>
      {days.map((d, i) => (
        <div key={i} style={{
          padding: "14px 12px", fontSize: 12, color: "var(--ink-2)",
          borderLeft: "0.5px solid var(--ink-line)",
          background: i === 3 ? "rgba(245,165,36,.08)" : "transparent",
          fontWeight: i === 3 ? 600 : 500,
        }}>
          {d}
          {i === 3 && <span style={{ marginLeft: 6, fontSize: 9, color: "var(--accent-orange)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Today</span>}
        </div>
      ))}
    </div>
    {tracks.map((t, ti) => {
      const c = accentColor[t.color];
      return (
        <div key={ti} style={{ display: "grid", gridTemplateColumns: "160px repeat(7, 1fr)", borderBottom: "0.5px solid var(--ink-line)", minHeight: 64, position: "relative" }}>
          <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: c, boxShadow: `0 0 6px ${c}88` }}/>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</span>
          </div>
          {[0,1,2,3,4,5,6].map(d => (
            <div key={d} style={{
              borderLeft: "0.5px solid var(--ink-line)", position: "relative",
              background: d === 3 ? "rgba(245,165,36,.04)" : "transparent",
            }}/>
          ))}
          {t.blocks.map((b, bi) => (
            <div key={bi} style={{
              position: "absolute", top: 12, bottom: 12,
              left: `calc(160px + ${b.d} * ((100% - 160px) / 7) + 6px)`,
              width: `calc(${b.w} * ((100% - 160px) / 7) - 12px)`,
              background: `linear-gradient(135deg, ${c}30, ${c}18)`,
              border: `0.5px solid ${c}55`,
              borderRadius: 10,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,.5), 0 2px 6px ${c}22`,
              padding: "8px 12px",
              display: "flex", flexDirection: "column", justifyContent: "center",
              cursor: "grab",
              transition: "all 300ms ease",
            }}>
              <div style={{ fontSize: 11.5, fontWeight: 500, color: "var(--ink-1)", lineHeight: 1.3 }}>{b.label}</div>
              <div style={{ fontSize: 9.5, color: c, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2, fontWeight: 600 }}>{t.name}</div>
            </div>
          ))}
        </div>
      );
    })}
    <div style={{ padding: "16px 22px", display: "flex", alignItems: "center", gap: 10 }}>
      <AiOrb size={22} />
      <div style={{ fontSize: 13, color: "var(--ink-2)", flex: 1 }}>
        <span className="ai-text" style={{ fontWeight: 600 }}>AI · </span>
        Fri afternoon has 3 blocks competing for the same focus window. Want me to move "All-hands prep" to Mon morning?
      </div>
      <PaperButton small onClick={showMe}>Show me</PaperButton>
      <PaperButton small primary onClick={doIt}>Do it</PaperButton>
    </div>
  </GlassCard>
);

const DayView = ({ D }) => {
  const hours = Array.from({ length: 16 }, (_, i) => i + 6);
  const PX_PER_HOUR = 72;
  const toMin = (t) => { const [h,m] = t.split(":").map(Number); return h*60 + m; };
  const dayStartMin = 6*60;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
      <GlassCard padding={0} style={{ overflow: "hidden" }}>
        <div style={{ position: "relative", padding: "20px 28px 28px" }}>
          {hours.map(h => (
            <div key={h} style={{
              display: "grid", gridTemplateColumns: "56px 1fr", alignItems: "center",
              height: PX_PER_HOUR, borderTop: "0.5px solid var(--ink-line)",
            }}>
              <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                {h.toString().padStart(2,"0")}:00
              </span>
            </div>
          ))}
          <div style={{
            position: "absolute", left: 28+56, right: 28,
            top: 20 + ((10*60+24) - dayStartMin) / 60 * PX_PER_HOUR,
            height: 1, background: "var(--accent-coral)",
            boxShadow: "0 0 8px var(--accent-coral)",
            pointerEvents: "none",
          }}>
            <span style={{ position: "absolute", left: -56, top: -8, fontSize: 10.5, fontWeight: 700, color: "var(--accent-coral)" }}>10:24</span>
            <span style={{ position: "absolute", left: -6, top: -3, width: 7, height: 7, borderRadius: 999, background: "var(--accent-coral)", boxShadow: "0 0 8px var(--accent-coral)" }}/>
          </div>
          {D.schedule.map((it, i) => {
            const c = accentColor[it.color];
            const top = (toMin(it.time) - dayStartMin) / 60 * PX_PER_HOUR + 20;
            const h = (toMin(it.end) - toMin(it.time)) / 60 * PX_PER_HOUR;
            return (
              <div key={i} style={{
                position: "absolute", left: 28+72, right: 28, top, height: h-4,
                background: `linear-gradient(135deg, ${c}28, ${c}14)`,
                border: `0.5px solid ${c}55`,
                borderRadius: 10,
                padding: "8px 14px",
                boxShadow: `inset 0 1px 0 rgba(255,255,255,.5), 0 4px 10px ${c}22`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-1)" }}>{it.title}</span>
                  <span className="t-mono" style={{ fontSize: 10.5, color: c, fontWeight: 600 }}>{it.time}–{it.end}</span>
                </div>
                {it.critical && <span style={{ fontSize: 9.5, fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: "0.08em" }}>Critical</span>}
              </div>
            );
          })}
        </div>
      </GlassCard>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <GlassCard>
          <div className="t-cap" style={{ color: "var(--accent-orange)" }}>AI · today's plan</div>
          <div className="t-display-italic" style={{ fontSize: 18, marginTop: 8, lineHeight: 1.35, color: "var(--ink-1)" }}>
            "Tight day. I protected your deep-work block and trimmed lunch."
          </div>
          <div className="hair" style={{ margin: "14px 0" }}/>
          {(D.aiSuggestions || []).map((s, i) => (
            <div key={i} style={{ paddingBottom: 10, borderBottom: i < D.aiSuggestions.length-1 ? "0.5px solid var(--ink-line)" : "none", marginBottom: i < D.aiSuggestions.length-1 ? 10 : 0 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--accent-orange)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.kind}</div>
              <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 4, lineHeight: 1.45 }}>{s.text}</div>
            </div>
          ))}
        </GlassCard>
        <GlassCard>
          <div className="t-cap">Reminders · today</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {(D.reminders || []).map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-3)", paddingTop: 1, width: 38, flexShrink: 0 }}>{r.time}</span>
                <span style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.4 }}>{r.title}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

const MonthView = ({ D }) => {
  const days = Array.from({ length: 35 }, (_, i) => i - 3);
  const today = 14;
  return (
    <GlassCard padding={20}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
          <div key={d} className="t-cap" style={{ padding: "4px 8px", color: "var(--ink-3)" }}>{d}</div>
        ))}
        {days.map(d => {
          const valid = d >= 1 && d <= 31;
          const isToday = d === today;
          const events = (D.events || []).filter(e => e.day === d);
          return (
            <div key={d} style={{
              aspectRatio: "1.3", padding: 8, borderRadius: 10,
              border: "0.5px solid var(--ink-line)",
              background: isToday ? "rgba(245,165,36,.10)" : "rgba(255,252,244,.4)",
              opacity: valid ? 1 : 0.3,
              display: "flex", flexDirection: "column", gap: 4,
              boxShadow: isToday ? "inset 0 0 0 1px rgba(245,165,36,.45)" : "none",
            }}>
              <span style={{ fontSize: 12, fontWeight: isToday ? 600 : 500, color: isToday ? "var(--accent-orange)" : "var(--ink-2)" }}>
                {valid ? d : ""}
              </span>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minHeight: 0 }}>
                {events.slice(0, 3).map((e, i) => (
                  <div key={i} style={{
                    fontSize: 9.5, padding: "1px 5px", borderRadius: 4,
                    background: `${accentColor[e.color]}25`,
                    color: accentColor[e.color], fontWeight: 600,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{e.title}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};

const YearView = () => {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      {months.map((m, mi) => (
        <GlassCard key={m} style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span className="t-display" style={{ fontSize: 20 }}>{m}</span>
            <span className="t-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>2026</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {Array.from({ length: 35 }).map((_, i) => {
              const has = (i*7 + mi*3) % 11 === 0;
              const heavy = (i*5 + mi) % 19 === 0;
              return <div key={i} style={{
                aspectRatio: "1", borderRadius: 2,
                background: heavy ? "var(--accent-coral)" : has ? "var(--accent-amber)" : "rgba(26,20,16,.06)",
                opacity: has || heavy ? 0.7 : 1,
              }}/>;
            })}
          </div>
        </GlassCard>
      ))}
    </div>
  );
};
