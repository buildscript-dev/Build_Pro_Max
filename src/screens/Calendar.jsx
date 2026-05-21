import React, { useState, useMemo } from 'react';
import { GlassCard, PaperButton, Icon, AiOrb } from '../components/ui/Icons';
import { accentColor } from '../data';
import { useAppState, useAppActions } from '../store/AppContext';
import { ScreenShell } from '../components/ui/ScreenShell';

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
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [showAdd, setShowAdd] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', day: now.getDate(), color: 'amber', time: '12:00' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

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
      eyebrow="AI Calendar"
      title={<>{monthName} <span className="t-display-italic" style={{ color: "var(--accent-orange)" }}>{currentYear}</span>.</>}
      subtitle={<>Events from Google + iCloud + Linear, planned around your execution tracks. AI fills the gaps.</>}
      right={<>
        <PaperButton icon="sparkle" small onClick={autoFill}>Auto-fill week</PaperButton>
        <PaperButton icon="plus" primary onClick={() => setShowAdd(true)}>New event</PaperButton>
      </>}
    >
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AiOrb size={20} />
            <div className="t-cap" style={{ color: "var(--accent-orange)" }}>AI · calendar shaping</div>
          </div>
          <div className="t-display-italic" style={{ fontSize: 22, marginTop: 10, lineHeight: 1.35, color: "var(--ink-1)" }}>
            "Friday is overloaded. Sat is empty. I can rebalance — keep one focus block on Sat AM?"
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <PaperButton small onClick={() => actions.addNotification({ text: 'Kept Saturday free', kind: 'info' })}>Keep Sat free</PaperButton>
            <PaperButton small primary onClick={autoFill}>Rebalance</PaperButton>
          </div>
          <div className="hair" style={{ margin: "16px 0" }}/>
          <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
            Patterns noticed this month:
            <ul style={{ margin: "8px 0 0 0", paddingLeft: 16 }}>
              <li>You schedule deep-work in 90-min blocks; only 2 of 8 completed this week.</li>
              <li>Investor mtgs cluster around Thu — historically your worst-sleep night.</li>
              <li>Off days correlate with 3-day productive streaks. The trade is real.</li>
            </ul>
          </div>
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
