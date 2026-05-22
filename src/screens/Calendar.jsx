import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { GlassCard, PaperButton, Icon, AiOrb } from '../components/ui/Icons';
import { accentColor } from '../data';
import { useAppState, useAppActions, useAppStore } from '../store/AppContext';
import { ScreenShell } from '../components/ui/ScreenShell';
import { generateDailyBriefing, generateAiResponse } from '../services/ai';

const COLORS = ['amber', 'orange', 'coral', 'rose'];
const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function eventDate(event, fallbackYear, fallbackMonth) {
  return new Date(
    event.year ?? fallbackYear,
    event.month ?? fallbackMonth,
    Math.max(1, Number(event.day) || 1)
  );
}

function eventInMonth(event, year, month) {
  const today = new Date();
  const date = eventDate(event, today.getFullYear(), today.getMonth());
  return date.getFullYear() === year && date.getMonth() === month;
}

function createDatedEvent(base, date) {
  return {
    ...base,
    day: date.getDate(),
    month: date.getMonth(),
    year: date.getFullYear(),
  };
}

export const Calendar = () => {
  const { actions } = useAppActions();
  const events = useAppState((s) => s.events) || [];
  const store = useAppStore();
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [showAdd, setShowAdd] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', day: now.getDate(), color: 'amber', time: '12:00' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [briefing, setBriefing] = useState('');
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [nlMode, setNlMode] = useState(false);
  const [nlInput, setNlInput] = useState('');
  const [nlParsing, setNlParsing] = useState(false);
  const tasks = useAppState(s => s.tasks) || [];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setBriefingLoading(true);
      const result = await generateDailyBriefing(store.getSnapshot());
      if (!cancelled) { setBriefing(result); setBriefingLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleNlEvent = useCallback(async () => {
    if (!nlInput.trim() || nlParsing) return;
    setNlParsing(true);
    try {
      const snap = store.getSnapshot();
      const today = now.getDate();
      const prompt = `Parse this calendar event: "${nlInput}". Today is day ${today} of month ${now.getMonth()+1}. Return ONLY JSON: {"title":"...","day":${today},"time":"HH:MM","color":"amber|orange|coral|rose"}. day must be a number 1-31.`;
      const response = await generateAiResponse(prompt, snap);
      const obj = JSON.parse(response?.match(/\{[\s\S]*\}/)?.[0] || '{}');
      if (obj.title) {
        actions.addEvent({ ...obj, month: currentMonth, year: currentYear, day: Number(obj.day) || today });
        actions.addNotification({ text: `Event added: "${obj.title}"`, kind: 'info' });
        setNlInput(''); setNlMode(false);
      }
    } catch { actions.addNotification({ text: 'Could not parse event — try manual add', kind: 'warning' }); }
    setNlParsing(false);
  }, [nlInput, nlParsing, store, actions, currentMonth, currentYear, now]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const today = now.getDate();
  const isCurrentMonth = now.getMonth() === currentMonth && now.getFullYear() === currentYear;

  const monthEvents = useMemo(
    () => events.filter(e => e.day >= 1 && e.day <= daysInMonth && eventInMonth(e, currentYear, currentMonth)),
    [events, daysInMonth, currentMonth, currentYear]
  );

  const days = Array.from({ length: Math.ceil((daysInMonth + startOffset) / 7) * 7 }, (_, i) => i - startOffset + 1);

  const weekEvents = useMemo(() => {
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(todayDate);
    end.setDate(todayDate.getDate() + 7);
    return events
      .map(e => ({ ...e, _date: eventDate(e, now.getFullYear(), now.getMonth()) }))
      .filter(e => e._date >= todayDate && e._date <= end)
      .sort((a, b) => a._date - b._date || String(a.time || '').localeCompare(String(b.time || '')))
      .slice(0, 14);
  }, [events, now]);

  const addEvent = () => {
    if (!newEvent.title.trim()) return;
    const day = Math.max(1, Math.min(daysInMonth, Number(newEvent.day) || today));
    actions.addEvent({
      ...newEvent,
      title: newEvent.title.trim(),
      day,
      month: currentMonth,
      year: currentYear,
    });
    actions.addNotification({ text: `Event "${newEvent.title}" added`, kind: 'info' });
    setNewEvent({ title: '', day: today, color: 'amber', time: '12:00' });
    setShowAdd(false);
  };

  const startEdit = (e) => {
    setEditingId(e.id);
    setEditData({ ...e });
  };

  const saveEdit = () => {
    if (!editData.title?.trim()) return;
    const day = Math.max(1, Math.min(daysInMonth, Number(editData.day) || today));
    const { _date, ...cleanEditData } = editData;
    actions.updateEvent({
      ...cleanEditData,
      day,
      month: cleanEditData.month ?? currentMonth,
      year: cleanEditData.year ?? currentYear,
    });
    setEditingId(null);
    setEditData({});
    actions.addNotification({ text: `Event updated`, kind: 'info' });
  };

  const deleteEvent = (id) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    setConfirmDeleteId(null);
    actions.deleteEvent(id);
    actions.addNotification({ text: `Event deleted`, kind: 'info' });
    if (editingId === id) { setEditingId(null); setEditData({}); }
  };

  const autoFill = () => {
    const existing = monthEvents.length;
    [1, 2, 3].forEach((offset, index) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      const templates = [
        { title: 'Focus block', color: 'orange', time: '09:00' },
        { title: 'Deep work', color: 'amber', time: '10:00' },
        { title: 'Review', color: 'coral', time: '14:00' },
      ];
      actions.addEvent(createDatedEvent(templates[index], date));
    });
    actions.addNotification({ text: `Auto-filled week with 3 new blocks (had ${existing} existing)`, kind: 'info' });
  };

  const monthName = months[currentMonth];

  return (
    <ScreenShell
      eyebrow="Hermes Calendar"
      title={<>{monthName} <span className="t-display-italic" style={{ color: "var(--accent-orange)" }}>{currentYear}</span>.</>}
      subtitle={<>AI-powered scheduling. Conflicts detected automatically. Ask Hermes to plan your week.</>}
      right={<>
        <PaperButton small onClick={() => setNlMode(v => !v)}>✨ Quick add</PaperButton>
        <PaperButton icon="sparkle" small onClick={autoFill}>Auto-fill week</PaperButton>
        <PaperButton icon="plus" primary onClick={() => setShowAdd(true)}>New event</PaperButton>
      </>}
    >
      {nlMode && (
        <div style={{ marginBottom: 16, padding: '16px 20px', borderRadius: 16, background: 'rgba(245,165,36,.08)', border: '1px solid rgba(245,165,36,.25)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 18 }}>📅</span>
          <input
            autoFocus
            placeholder='Type naturally: "Lunch with Alex Thursday 1pm" or "Review meeting Friday 3pm"'
            value={nlInput}
            onChange={e => setNlInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleNlEvent(); if (e.key === 'Escape') setNlMode(false); }}
            style={{ all: 'unset', flex: 1, fontSize: 14, color: 'var(--ink-1)', fontFamily: 'var(--font-body)' }}
          />
          {nlParsing
            ? <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--accent-orange)', borderTopColor: 'transparent', animation: 'orb-pulse 1s linear infinite' }}/>
            : <PaperButton small primary onClick={handleNlEvent} disabled={!nlInput.trim()}>Add</PaperButton>
          }
          <button type="button" onClick={() => setNlMode(false)} style={{ fontSize: 12, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}
      {showAdd && (
        <GlassCard style={{ marginBottom: 16, padding: 0 }}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <input autoFocus placeholder="Event title…" value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') addEvent(); if (e.key === 'Escape') setShowAdd(false); }}
              style={{ all: "unset", fontSize: 16, fontFamily: "var(--font-display)", color: "var(--ink-1)", width: "100%" }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input type="number" min={1} max={daysInMonth} value={newEvent.day}
                onChange={(e) => setNewEvent({ ...newEvent, day: parseInt(e.target.value, 10) || today })}
                style={{ width: 60, padding: "4px 10px", borderRadius: 8, fontSize: 11, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}
              />
              <input type="time" value={newEvent.time}
                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}
              />
              <select value={newEvent.color} onChange={(e) => setNewEvent({ ...newEvent, color: e.target.value })}
                style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}>
                {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{ flex: 1 }} />
              <PaperButton small onClick={() => setShowAdd(false)}>Cancel</PaperButton>
              <PaperButton small primary onClick={addEvent}>Add event</PaperButton>
            </div>
          </div>
        </GlassCard>
      )}

      {editingId && (
        <GlassCard style={{ marginBottom: 16, padding: 0 }}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <input autoFocus placeholder="Event title…" value={editData.title || ''}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditingId(null); setEditData({}); } }}
              style={{ all: "unset", fontSize: 16, fontFamily: "var(--font-display)", color: "var(--ink-1)", width: "100%" }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input type="number" min={1} max={daysInMonth} value={editData.day || today}
                onChange={(e) => setEditData({ ...editData, day: parseInt(e.target.value, 10) || today })}
                style={{ width: 60, padding: "4px 10px", borderRadius: 8, fontSize: 11, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}
              />
              <input type="time" value={editData.time || '12:00'}
                onChange={(e) => setEditData({ ...editData, time: e.target.value })}
                style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}
              />
              <select value={editData.color || 'amber'} onChange={(e) => setEditData({ ...editData, color: e.target.value })}
                style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}>
                {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{ flex: 1 }} />
              <PaperButton small onClick={() => { setEditingId(null); setEditData({}); setConfirmDeleteId(null); }}>Cancel</PaperButton>
              {confirmDeleteId === editingId
                ? <><PaperButton small accent onClick={() => deleteEvent(editingId)}>Confirm delete</PaperButton><PaperButton small onClick={() => setConfirmDeleteId(null)}>✕</PaperButton></>
                : <PaperButton small onClick={() => deleteEvent(editingId)}>Delete</PaperButton>
              }
              <PaperButton small primary onClick={saveEdit}>Save event</PaperButton>
            </div>
          </div>
        </GlassCard>
      )}

      <MonthView days={days} daysInMonth={daysInMonth} isCurrentMonth={isCurrentMonth} today={today}
        monthEvents={monthEvents} currentMonth={currentMonth} currentYear={currentYear}
        onPrev={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); }}
        onNext={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); }}
        editingId={editingId} editData={editData} onStartEdit={startEdit} onEditChange={(d) => setEditData(d)}
        onSaveEdit={saveEdit} onDelete={deleteEvent}
      />

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <GlassCard>
          <div className="t-cap">Up next · 7 days</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 14 }}>
            {weekEvents.length > 0 ? weekEvents.map((e, i) => {
              const c = accentColor[e.color];
              return (
                <div key={e.id || i} style={{
                  display: "grid", gridTemplateColumns: "44px 1fr auto auto", gap: 14, alignItems: "center",
                  padding: "10px 0", borderBottom: i < weekEvents.length - 1 ? "0.5px solid var(--ink-line)" : "none",
                }}>
                  <div style={{ textAlign: "right" }}>
                    <div className="t-num" style={{ fontSize: 22, lineHeight: 1, color: "var(--ink-1)" }}>{e._date?.getDate?.() || e.day}</div>
                    <div className="t-mono" style={{ fontSize: 9.5, color: "var(--ink-3)" }}>{months[e._date?.getMonth?.() ?? currentMonth].slice(0, 3)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ width: 4, height: 28, background: c, borderRadius: 2 }}/>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{e.title}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{e.time}</div>
                    </div>
                  </div>
                  <button onClick={() => startEdit(e)} style={{ fontSize: 10, color: "var(--ink-3)", padding: "2px 6px" }}>Edit</button>
                  {confirmDeleteId === e.id
                    ? <><button onClick={() => deleteEvent(e.id)} style={{ fontSize: 10, color: "var(--accent-coral)", fontWeight: 600, padding: "2px 6px" }}>Delete?</button><button onClick={() => setConfirmDeleteId(null)} style={{ fontSize: 10, color: "var(--ink-4)", padding: "2px 6px" }}>✕</button></>
                    : <button onClick={() => deleteEvent(e.id)} style={{ fontSize: 10, color: "var(--ink-4)", padding: "2px 6px" }}>✕</button>
                  }
                </div>
              );
            }) : (
              <div style={{ padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📅</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-2)", marginBottom: 4 }}>No upcoming events</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)" }}>Click "New event" or "Auto-fill week" to populate your calendar.</div>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <AiOrb size={20} />
            <div className="t-cap" style={{ color: "var(--accent-orange)" }}>Hermes · daily briefing</div>
            {briefingLoading && <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid var(--accent-orange)', borderTopColor: 'transparent', animation: 'orb-pulse 1s linear infinite', marginLeft: 4 }}/>}
          </div>
          <div className="t-display-italic" style={{ fontSize: 18, lineHeight: 1.5, color: "var(--ink-1)", minHeight: 52 }}>
            {briefingLoading ? 'Hermes is preparing your daily briefing…' : `"${briefing}"`}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <PaperButton small onClick={autoFill}>Rebalance week</PaperButton>
            <PaperButton small primary onClick={() => window.__opencode?.onNavigate?.('tasks')}>🎯 Open tasks</PaperButton>
            <PaperButton small onClick={() => {
              const p0 = tasks.filter(t => t.priority === 'P0' && t.status !== 'done');
              if (p0.length) {
                const today = now.getDate();
                actions.addEvent({ title: `P0: ${p0[0].title}`, day: today, month: now.getMonth(), year: now.getFullYear(), time: '09:00', color: 'coral' });
                actions.addNotification({ text: `P0 task scheduled as event`, kind: 'info' });
              } else { actions.addNotification({ text: 'No P0 tasks to schedule', kind: 'info' }); }
            }}>⚡ Schedule P0</PaperButton>
          </div>
          {weekEvents.length > 0 && (() => {
            const timeMap = {};
            weekEvents.forEach(e => { const key = `${e._date?.toDateString()}-${e.time}`; timeMap[key] = (timeMap[key] || 0) + 1; });
            const conflicts = Object.entries(timeMap).filter(([,v]) => v > 1);
            return conflicts.length > 0 ? (
              <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(231,64,46,.08)', border: '0.5px solid rgba(231,64,46,.2)', fontSize: 12, color: 'var(--accent-coral)' }}>
                ⚠️ {conflicts.length} scheduling conflict(s) detected this week
              </div>
            ) : (
              <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(74,222,128,.06)', border: '0.5px solid rgba(74,222,128,.2)', fontSize: 12, color: '#16a34a' }}>
                ✓ No scheduling conflicts this week
              </div>
            );
          })()}
        </GlassCard>
      </div>
    </ScreenShell>
  );
};

const MonthView = ({ days, daysInMonth, isCurrentMonth, today, monthEvents, currentMonth, currentYear, onPrev, onNext, editingId, editData, onStartEdit, onEditChange, onSaveEdit, onDelete }) => {
  return (
    <GlassCard padding={20}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={onPrev} style={{ fontSize: 16, color: "var(--ink-3)", padding: "4px 12px" }}>←</button>
        <span className="t-display" style={{ fontSize: 24 }}>{months[currentMonth]} {currentYear}</span>
        <button onClick={onNext} style={{ fontSize: 16, color: "var(--ink-3)", padding: "4px 12px" }}>→</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
          <div key={d} className="t-cap" style={{ padding: "4px 8px", color: "var(--ink-3)" }}>{d}</div>
        ))}
        {days.map(d => {
          const valid = d >= 1 && d <= daysInMonth;
          const isToday = isCurrentMonth && d === today;
          const dayEvents = monthEvents.filter(e => e.day === d);
          return (
            <div key={d} style={{
              aspectRatio: "1.3", padding: 8, borderRadius: 10,
              border: isToday ? "1px solid var(--accent-orange)" : "0.5px solid var(--ink-line)",
              background: isToday ? "rgba(245,165,36,.10)" : "rgba(255,252,244,.4)",
              opacity: valid ? 1 : 0.3,
              display: "flex", flexDirection: "column", gap: 3,
              boxShadow: isToday ? "inset 0 0 0 1px rgba(245,165,36,.45)" : "none",
            }}>
              <span style={{ fontSize: 12, fontWeight: isToday ? 600 : 500, color: isToday ? "var(--accent-orange)" : "var(--ink-2)" }}>
                {valid ? d : ""}
              </span>
              {dayEvents.slice(0, 3).map((e) => (
                <div key={e.id} style={{
                  fontSize: 9, padding: "1px 4px", borderRadius: 3,
                  background: `${accentColor[e.color]}25`,
                  color: accentColor[e.color], fontWeight: 600,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  display: "flex", gap: 2, alignItems: "center",
                }}>
                  <span style={{ fontSize: 8 }}>●</span>
                  {e.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};
