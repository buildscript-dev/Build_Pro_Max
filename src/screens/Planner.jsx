import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { GlassCard, PaperButton, Icon, AiOrb } from '../components/ui/Icons';
import { accentColor } from '../data';
import { useAppActions, useAppStore, useAppState } from '../store/AppContext';
import { generateAiResponse } from '../services/ai';
import { formatDate, getCurrentTime } from '../services/clock';
import { ScreenGuide } from '../components/ui/ScreenGuide';
import { ScreenShell } from '../components/ui/ScreenShell';

const TRACK_TEMPLATES = [
  { name: "Fundraise", color: "coral",  blocks: [{ d: 0, w: 2, label: "Deck pass" }, { d: 3, w: 1, label: "Bessemer follow-up · memo" }, { d: 4, w: 2, label: "Partner mtgs · 3" }] },
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
  const { actions } = useAppActions();
  const store = useAppStore();
  const state = useAppState();
  const [scope, setScope] = useState("week");
  const [data, setData] = useState(defaultTracks);

  const todayIndex = useMemo(() => (new Date().getDay() + 6) % 7, []);

  const tracks = data.tracks;
  const days = data.days;

  const updateTracks = useCallback((newTracks) => {
    setData(d => ({ ...d, tracks: newTracks }));
  }, []);

  const regenerate = useCallback(async () => {
    actions.addNotification({ text: 'AI regenerating tracks…', kind: 'info' });
    const snapshot = store.getSnapshot();
    const p0Tasks = snapshot.tasks?.filter(t => t.priority === 'P0' && t.status !== 'done') || [];
    
    const prompt = `I have ${p0Tasks.length} P0 tasks. Suggest an optimized weekly plan prioritizing my P0 tasks: ${p0Tasks.map(t=>t.title).join(', ')}. Return a brief suggestion and output action tokens like [action: addEvent, {"title": "Focus: Task Name"}] or [action: notify, {"text": "Updated schedule"}] to automatically place these on my calendar.`;
    
    const response = await generateAiResponse(prompt, snapshot);
    if (response) {
      actions.addNotification({ text: `AI: ${response.replace(/\[action:[^\]]+\]/g, '').slice(0, 100)}…`, kind: 'info' });
      actions.executeAiActions(response);
    }
  }, [store, actions]);

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
      subtitle={<>Drag any block to a new day. Click an empty cell to add a block. Click a block to edit.</>}
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
      {scope === "week" && (
        <WeekView
          days={days}
          tracks={tracks}
          onUpdateTracks={updateTracks}
          showMe={showMe}
          doIt={doIt}
          todayIndex={todayIndex}
        />
      )}
      {scope === "day" && <DayView D={state} />}
      {scope === "month" && <MonthView D={state} />}
      {scope === "year" && <YearView />}
    </ScreenShell>
  );
};

const WeekView = ({ days, tracks, onUpdateTracks, showMe, doIt, todayIndex }) => {
  const [dragInfo, setDragInfo] = useState(null);       // { trackIdx, blockIdx }
  const [dropTarget, setDropTarget] = useState(null);   // { trackIdx, dayIdx }
  const [editingBlock, setEditingBlock] = useState(null); // { trackIdx, blockIdx }
  const [editLabel, setEditLabel] = useState('');
  const [editW, setEditW] = useState(1);
  const [addingBlock, setAddingBlock] = useState(null); // { trackIdx, dayIdx }
  const [newBlockLabel, setNewBlockLabel] = useState('');

  const openBlockEdit = (e, trackIdx, blockIdx) => {
    e.stopPropagation();
    const block = tracks[trackIdx]?.blocks[blockIdx];
    if (!block) return;
    setEditingBlock({ trackIdx, blockIdx });
    setEditLabel(block.label);
    setEditW(block.w);
    setAddingBlock(null);
  };

  const saveBlockEdit = () => {
    if (!editingBlock) return;
    const { trackIdx, blockIdx } = editingBlock;
    const newTracks = tracks.map((t, ti) =>
      ti !== trackIdx ? t : {
        ...t,
        blocks: t.blocks.map((b, bi) =>
          bi !== blockIdx ? b : { ...b, label: editLabel || b.label, w: Math.max(1, Math.min(7, Number(editW) || 1)) }
        ),
      }
    );
    onUpdateTracks(newTracks);
    setEditingBlock(null);
  };

  const deleteEditBlock = () => {
    if (!editingBlock) return;
    const { trackIdx, blockIdx } = editingBlock;
    const newTracks = tracks.map((t, ti) =>
      ti !== trackIdx ? t : { ...t, blocks: t.blocks.filter((_, bi) => bi !== blockIdx) }
    );
    onUpdateTracks(newTracks);
    setEditingBlock(null);
  };

  const handleDayClick = (e, trackIdx, dayIdx) => {
    if (dragInfo) return;
    setAddingBlock({ trackIdx, dayIdx });
    setEditingBlock(null);
    setNewBlockLabel('');
  };

  const commitAddBlock = () => {
    if (!newBlockLabel.trim() || !addingBlock) return;
    const { trackIdx, dayIdx } = addingBlock;
    const newTracks = tracks.map((t, ti) =>
      ti !== trackIdx ? t : { ...t, blocks: [...t.blocks, { d: dayIdx, w: 1, label: newBlockLabel.trim() }] }
    );
    onUpdateTracks(newTracks);
    setAddingBlock(null);
    setNewBlockLabel('');
  };

  const handleBlockDragStart = (e, trackIdx, blockIdx) => {
    e.stopPropagation();
    setDragInfo({ trackIdx, blockIdx });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${trackIdx}:${blockIdx}`);
  };

  const handleDayDragOver = (e, trackIdx, dayIdx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ trackIdx, dayIdx });
  };

  const handleDayDrop = (e, trackIdx, dayIdx) => {
    e.preventDefault();
    if (!dragInfo) return;
    const { trackIdx: fromTrack, blockIdx } = dragInfo;
    const block = tracks[fromTrack]?.blocks[blockIdx];
    if (!block) { setDragInfo(null); setDropTarget(null); return; }

    // Clamp so block doesn't overflow past day 6
    const clampedD = Math.min(dayIdx, 6 - block.w + 1);

    const newTracks = tracks.map((t, ti) =>
      ti !== fromTrack ? t : {
        ...t,
        blocks: t.blocks.map((b, bi) =>
          bi !== blockIdx ? b : { ...b, d: clampedD }
        ),
      }
    );
    onUpdateTracks(newTracks);
    setDragInfo(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDragInfo(null);
    setDropTarget(null);
  };

  const dismiss = () => { setEditingBlock(null); setAddingBlock(null); };

  return (
    <GlassCard padding={0} className="planner-week" style={{ overflow: "hidden" }}>
      {/* Column headers */}
      <div className="planner-week-grid" style={{ display: "grid", gridTemplateColumns: "160px repeat(7, 1fr)", borderBottom: "0.5px solid var(--ink-line)" }}>
        <div style={{ padding: "14px 18px", fontSize: 11, fontWeight: 600, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Track</div>
        {days.map((d, i) => (
          <div key={i} style={{
            padding: "14px 12px", fontSize: 12, color: "var(--ink-2)",
            borderLeft: "0.5px solid var(--ink-line)",
            background: i === todayIndex ? "rgba(245,165,36,.08)" : "transparent",
            fontWeight: i === todayIndex ? 600 : 500,
          }}>
            {d.split(' · Today')[0]}
            {i === todayIndex && <span style={{ marginLeft: 6, fontSize: 9, color: "var(--accent-orange)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Today</span>}
          </div>
        ))}
      </div>

      {/* Track rows */}
      {tracks.map((t, ti) => {
        const c = accentColor[t.color];
        return (
          <div key={ti} className="planner-week-grid" style={{ display: "grid", gridTemplateColumns: "160px repeat(7, 1fr)", borderBottom: "0.5px solid var(--ink-line)", minHeight: 68, position: "relative" }}>
            {/* Track label */}
            <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: c, flexShrink: 0, boxShadow: `0 0 6px ${c}88` }}/>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</span>
            </div>

            {/* Day cells — drop targets + click-to-add */}
            {[0,1,2,3,4,5,6].map(d => {
              const isDropTarget = dropTarget?.trackIdx === ti && dropTarget?.dayIdx === d;
              const isAdding = addingBlock?.trackIdx === ti && addingBlock?.dayIdx === d;
              return (
                <div key={d}
                  onDragOver={(e) => handleDayDragOver(e, ti, d)}
                  onDrop={(e) => handleDayDrop(e, ti, d)}
                  onDragLeave={() => setDropTarget(null)}
                  onClick={(e) => handleDayClick(e, ti, d)}
                  title="Click to add a block here"
                  style={{
                    borderLeft: "0.5px solid var(--ink-line)", position: "relative",
                    background: isAdding ? `${c}10` : isDropTarget ? `${c}20` : d === todayIndex ? "rgba(245,165,36,.04)" : "transparent",
                    boxShadow: isDropTarget ? `inset 0 0 0 2px ${c}66` : isAdding ? `inset 0 0 0 1.5px ${c}44` : "none",
                    cursor: "pointer",
                    minHeight: 68,
                    transition: "background 80ms, box-shadow 80ms",
                  }}
                />
              );
            })}

            {/* Blocks (absolute, on top of cells) */}
            {t.blocks.map((b, bi) => {
              const isEditing = editingBlock?.trackIdx === ti && editingBlock?.blockIdx === bi;
              const isDragging = dragInfo?.trackIdx === ti && dragInfo?.blockIdx === bi;
              return (
                <div key={bi}
                  draggable
                  onDragStart={(e) => handleBlockDragStart(e, ti, bi)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => openBlockEdit(e, ti, bi)}
                  title="Drag to move · Click to edit"
                  style={{
                    position: "absolute", top: 10, bottom: 10,
                    left: `calc(160px + ${b.d} * ((100% - 160px) / 7) + 5px)`,
                    width: `calc(${b.w} * ((100% - 160px) / 7) - 10px)`,
                    background: isEditing
                      ? `linear-gradient(135deg, ${c}50, ${c}35)`
                      : `linear-gradient(135deg, ${c}30, ${c}18)`,
                    border: isEditing ? `1.5px solid ${c}` : `0.5px solid ${c}55`,
                    borderRadius: 10,
                    boxShadow: isEditing
                      ? `inset 0 1px 0 rgba(255,255,255,.5), 0 4px 12px ${c}33`
                      : `inset 0 1px 0 rgba(255,255,255,.5), 0 2px 6px ${c}22`,
                    padding: "7px 10px",
                    display: "flex", flexDirection: "column", justifyContent: "center",
                    cursor: "grab",
                    opacity: isDragging ? 0.35 : 1,
                    transition: "opacity 150ms, border 150ms, background 150ms",
                    zIndex: 2,
                    userSelect: "none",
                  }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-1)", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.label}</div>
                  <div style={{ fontSize: 9, color: c, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2, fontWeight: 700 }}>{t.name}</div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Block edit panel (GitHub-style inline editor) */}
      {editingBlock && (() => {
        const t = tracks[editingBlock.trackIdx];
        const c = t ? accentColor[t.color] : 'var(--accent-orange)';
        return (
          <div style={{ padding: "14px 22px", background: "rgba(255,252,244,.7)", borderTop: `2px solid ${c}44`, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, flexShrink: 0 }}>
              Edit · {t?.name}
            </span>
            <input
              autoFocus
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveBlockEdit(); if (e.key === 'Escape') dismiss(); }}
              style={{ flex: 1, minWidth: 160, padding: "6px 12px", borderRadius: 8, fontSize: 13, border: "0.5px solid rgba(26,20,16,.15)", background: "rgba(255,252,244,.9)", color: "var(--ink-1)", outline: "none" }}
            />
            <span style={{ fontSize: 11, color: "var(--ink-3)", flexShrink: 0 }}>Span</span>
            <select value={editW} onChange={(e) => setEditW(Number(e.target.value))}
              style={{ padding: "5px 8px", borderRadius: 8, fontSize: 11, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.8)" }}>
              {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}d</option>)}
            </select>
            <button onClick={saveBlockEdit} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#fff", background: c, cursor: "pointer" }}>Save</button>
            <button onClick={deleteEditBlock} style={{ padding: "6px 10px", borderRadius: 8, fontSize: 12, color: "var(--accent-coral)", cursor: "pointer" }}>Delete</button>
            <button onClick={dismiss} style={{ padding: "6px 8px", fontSize: 13, color: "var(--ink-4)", cursor: "pointer" }}>✕</button>
          </div>
        );
      })()}

      {/* Add block panel */}
      {addingBlock && (() => {
        const t = tracks[addingBlock.trackIdx];
        const c = t ? accentColor[t.color] : 'var(--accent-orange)';
        return (
          <div style={{ padding: "14px 22px", background: "rgba(255,252,244,.7)", borderTop: `2px solid ${c}44`, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, flexShrink: 0 }}>
              {t?.name} · {days[addingBlock.dayIdx]?.split(' ·')[0]}
            </span>
            <input
              autoFocus
              placeholder="Block title…"
              value={newBlockLabel}
              onChange={(e) => setNewBlockLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitAddBlock(); if (e.key === 'Escape') setAddingBlock(null); }}
              style={{ flex: 1, minWidth: 160, padding: "6px 12px", borderRadius: 8, fontSize: 13, border: "0.5px solid rgba(26,20,16,.15)", background: "rgba(255,252,244,.9)", color: "var(--ink-1)", outline: "none" }}
            />
            <button onClick={commitAddBlock} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#fff", background: c, cursor: "pointer" }}>Add</button>
            <button onClick={() => setAddingBlock(null)} style={{ padding: "6px 8px", fontSize: 13, color: "var(--ink-4)", cursor: "pointer" }}>✕</button>
          </div>
        );
      })()}

      {/* AI suggestion bar */}
      <div style={{ padding: "16px 22px", display: "flex", alignItems: "center", gap: 10, borderTop: "0.5px solid var(--ink-line)" }}>
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
};

const DayView = ({ D }) => {
  const [nowTime, setNowTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNowTime(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const hours = Array.from({ length: 16 }, (_, i) => i + 6);
  const PX_PER_HOUR = 72;
  const toMin = (t) => { const [h,m] = t.split(":").map(Number); return h*60 + m; };
  const dayStartMin = 6*60;
  const nowMin = nowTime.getHours() * 60 + nowTime.getMinutes();
  const nowLabel = `${nowTime.getHours().toString().padStart(2,'0')}:${nowTime.getMinutes().toString().padStart(2,'0')}`;
  const nowInRange = nowMin >= dayStartMin && nowMin <= dayStartMin + 16*60;

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
          {/* Live "now" indicator */}
          {nowInRange && (
            <div style={{
              position: "absolute", left: 28+56, right: 28,
              top: 20 + (nowMin - dayStartMin) / 60 * PX_PER_HOUR,
              height: 1.5, background: "var(--accent-coral)",
              boxShadow: "0 0 8px var(--accent-coral)",
              pointerEvents: "none",
            }}>
              <span style={{ position: "absolute", left: -56, top: -8, fontSize: 10.5, fontWeight: 700, color: "var(--accent-coral)" }}>{nowLabel}</span>
              <span style={{ position: "absolute", left: -5, top: -3, width: 7, height: 7, borderRadius: 999, background: "var(--accent-coral)", boxShadow: "0 0 8px var(--accent-coral)" }}/>
            </div>
          )}
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
                cursor: "pointer",
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
  const now = new Date();
  const today = now.getDate();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: 35 }, (_, i) => i - startOffset + 1);

  return (
    <GlassCard padding={20}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
          <div key={d} className="t-cap" style={{ padding: "4px 8px", color: "var(--ink-3)" }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          const valid = d >= 1 && d <= daysInMonth;
          const isToday = d === today;
          const events = (D.events || []).filter(e => e.day === d && (e.month == null || e.month === month));
          return (
            <div key={i} style={{
              aspectRatio: "1.3", padding: 8, borderRadius: 10,
              border: "0.5px solid var(--ink-line)",
              background: isToday ? "rgba(245,165,36,.10)" : "rgba(255,252,244,.4)",
              opacity: valid ? 1 : 0.25,
              display: "flex", flexDirection: "column", gap: 4,
              boxShadow: isToday ? "inset 0 0 0 1.5px rgba(245,165,36,.45)" : "none",
            }}>
              <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? "var(--accent-orange)" : "var(--ink-2)" }}>
                {valid ? d : ""}
              </span>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minHeight: 0 }}>
                {events.slice(0, 3).map((e, j) => (
                  <div key={j} style={{
                    fontSize: 9.5, padding: "1px 5px", borderRadius: 4,
                    background: `${accentColor[e.color] || 'var(--accent-amber)'}25`,
                    color: accentColor[e.color] || 'var(--accent-amber)', fontWeight: 600,
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
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      {months.map((m, mi) => {
        const isCurrent = mi === currentMonth;
        return (
          <GlassCard key={m} style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, alignItems: "baseline" }}>
              <span className="t-display" style={{ fontSize: 20, color: isCurrent ? "var(--accent-orange)" : "var(--ink-1)" }}>{m}</span>
              <span className="t-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{currentYear}</span>
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
            {isCurrent && <div style={{ marginTop: 8, fontSize: 9, color: "var(--accent-orange)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Current</div>}
          </GlassCard>
        );
      })}
    </div>
  );
};
