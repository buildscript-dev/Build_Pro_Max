import React, { useState, useMemo, useCallback } from 'react';
import { GlassCard, PaperButton, Icon, AiOrb } from '../components/ui/Icons';
import { useApp } from '../store/AppContext';
import { generateAiResponse } from '../services/ai';

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

const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
const PROJECTS = ['Fundraise', 'Product', 'Hiring', 'Team', 'Ops', 'General', 'Design', 'Engineering'];
const STATUSES = ['todo', 'doing', 'done'];

export const Tasks = () => {
  const { state, actions } = useApp();
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [newTask, setNewTask] = useState({ title: '', project: 'General', priority: 'P2', due: 'Today' });
  const [dragOverId, setDragOverId] = useState(null);

  const tasks = state.tasks || [];

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filter === 'all') return true;
      if (filter === 'today') return /today/i.test(t.due);
      if (filter === 'open') return t.status !== 'done';
      if (filter === 'done') return t.status === 'done';
      return true;
    });
  }, [tasks, filter]);

  const groups = useMemo(() => {
    const g = {};
    filtered.forEach(t => { (g[t.project] = g[t.project] || []).push(t); });
    return g;
  }, [filtered]);

  const addTask = () => {
    if (!newTask.title.trim()) return;
    actions.addTask({ ...newTask, title: newTask.title.trim(), status: 'todo' });
    actions.addNotification({ text: `Task "${newTask.title}" created`, kind: 'info' });
    setNewTask({ title: '', project: 'General', priority: 'P2', due: 'Today' });
    setShowAdd(false);
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setEditData({ ...t });
  };

  const saveEdit = () => {
    if (editData.title?.trim()) {
      const old = tasks.find(t => t.id === editingId);
      actions.updateTask(editData);
      if (old && old.title !== editData.title) {
        actions.addNotification({ text: `Task renamed to "${editData.title}"`, kind: 'info' });
      }
    }
    setEditingId(null);
    setEditData({});
  };

  const deleteTask = (id, title) => {
    actions.deleteTask(id);
    actions.addNotification({ text: `Task "${title}" deleted`, kind: 'info' });
    if (editingId === id) { setEditingId(null); setEditData({}); }
  };

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', id);
  };
  const handleDragOver = (e, id) => {
    e.preventDefault();
    setDragOverId(id);
  };
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    setDragOverId(null);
    const srcId = e.dataTransfer.getData('text/plain');
    if (srcId === targetId) return;
    const reordered = [...tasks];
    const srcIdx = reordered.findIndex(t => t.id === srcId);
    const tgtIdx = reordered.findIndex(t => t.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(tgtIdx, 0, moved);
    actions.reorderTasks(reordered);
  };

  const [aiAdvice, setAiAdvice] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const getSnoozedCount = () => tasks.filter(t => t.status !== 'done' && /past/i.test(t.due)).length;

  const askAi = useCallback(async () => {
    setAiLoading(true);
    const prompt = `Analyze my task list. I have ${tasks.length} total tasks, ${tasks.filter(t => t.status !== 'done').length} open, ${getSnoozedCount()} overdue. P0s: ${tasks.filter(t => t.priority === 'P0' && t.status !== 'done').map(t => t.title).join(', ')}. Give me 1-2 sentences of actionable advice.`;
    const response = await generateAiResponse(prompt, state);
    setAiAdvice(response);
    setAiLoading(false);
  }, [tasks, state]);

  const killSnoozer = () => {
    const snoozed = tasks.filter(t => t.status !== 'done' && /past/i.test(t.due));
    if (snoozed.length > 0) {
      snoozed.forEach(t => actions.deleteTask(t.id));
      actions.addNotification({ text: `Killed ${snoozed.length} snoozed task(s)`, kind: 'info' });
    }
  };

  const replanRecoverables = () => {
    const overdue = tasks.filter(t => t.status !== 'done' && /past/i.test(t.due));
    overdue.forEach(t => {
      const newDue = 'Tomorrow';
      actions.updateTask({ ...t, due: newDue });
    });
    actions.addNotification({ text: `Replanned ${overdue.length} task(s) to tomorrow`, kind: 'info' });
  };

  return (
    <ScreenShell
      eyebrow="AI Task Manager"
      title={<>What you actually have to <span className="t-display-italic" style={{ color: "var(--accent-orange)" }}>do</span>.</>}
      subtitle={<>Sorted by priority, slip-risk, and how often you've snoozed it. Drag to reorder; AI watches.</>}
      right={<>
        <div style={{ display: "flex", padding: 3, gap: 2, borderRadius: 999, background: "rgba(26,20,16,.05)" }}>
          {["all","today","open","done"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 500,
              background: filter === f ? "rgba(255,252,244,.95)" : "transparent",
              color: filter === f ? "var(--ink-1)" : "var(--ink-3)",
              boxShadow: filter === f ? "0 1px 0 rgba(255,255,255,.7) inset, 0 1px 2px rgba(46,30,12,.10)" : "none",
              textTransform: "capitalize",
            }}>{f}</button>
          ))}
        </div>
        <PaperButton icon="plus" primary onClick={() => setShowAdd(true)}>Capture</PaperButton>
      </>}
    >
      {showAdd && (
        <GlassCard style={{ marginBottom: 16, padding: 0 }}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <input autoFocus
              placeholder="What needs to be done?"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') setShowAdd(false); }}
              style={{ all: "unset", fontSize: 16, fontFamily: "var(--font-display)", color: "var(--ink-1)", width: "100%" }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select value={newTask.project} onChange={(e) => setNewTask({ ...newTask, project: e.target.value })}
                style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}>
                {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={newTask.due} onChange={(e) => setNewTask({ ...newTask, due: e.target.value })}
                style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}>
                {["Today", "Tomorrow", "Mon", "Tue", "Wed", "Thu", "Fri", "Next week", "Whenever"].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <div style={{ flex: 1 }} />
              <PaperButton small onClick={() => setShowAdd(false)}>Cancel</PaperButton>
              <PaperButton small primary onClick={addTask} icon="plus">Add</PaperButton>
            </div>
          </div>
        </GlassCard>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, alignItems: "start" }}>
        {Object.entries(groups).map(([project, projectTasks]) => (
          <GlassCard key={project} style={{ minHeight: 200 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div className="t-cap" style={{ color: "var(--accent-orange)" }}>{project}</div>
              <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{projectTasks.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {projectTasks.map(t => (
                <TaskRow key={t.id} t={t}
                  editingId={editingId}
                  editData={editData}
                  onStartEdit={startEdit}
                  onEditChange={(d) => setEditData(d)}
                  onSaveEdit={saveEdit}
                  onCancelEdit={() => { setEditingId(null); setEditData({}); }}
                  onDelete={(id) => deleteTask(id, t.title)}
                  onToggle={(id) => actions.toggleTask(id)}
                  onDragStart={(e) => handleDragStart(e, t.id)}
                  onDragOver={(e) => handleDragOver(e, t.id)}
                  onDrop={(e) => handleDrop(e, t.id)}
                  isDragOver={dragOverId === t.id}
                />
              ))}
            </div>
          </GlassCard>
        ))}
        {Object.keys(groups).length === 0 && (
          <GlassCard>
            <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>
              {filter === 'done' ? 'No completed tasks' : 'No tasks yet. Click "Capture" to add one.'}
            </div>
          </GlassCard>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AiOrb size={22} />
            <span className="ai-text" style={{ fontWeight: 600 }}>AI execution coach</span>
          </div>
          <div className="t-display-italic" style={{ fontSize: 20, marginTop: 10, lineHeight: 1.4, color: "var(--ink-1)" }}>
            {aiAdvice || `"${tasks.filter(t => t.status !== 'done' && /past/i.test(t.due)).length} tasks overdue. Two are recoverable. Click analyze for AI advice."`}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <PaperButton small onClick={askAi} disabled={aiLoading}>{aiLoading ? 'Analyzing…' : 'AI analyze'}</PaperButton>
            <PaperButton small onClick={() => setFilter('today')}>Show today</PaperButton>
            <PaperButton small accent onClick={killSnoozer}>Kill snoozers ({getSnoozedCount()})</PaperButton>
            <PaperButton small primary onClick={replanRecoverables}>Replan overdue</PaperButton>
          </div>
        </GlassCard>
      </div>
    </ScreenShell>
  );
};

const TaskRow = ({ t, editingId, editData, onStartEdit, onEditChange, onSaveEdit, onCancelEdit, onDelete, onToggle, onDragStart, onDragOver, onDrop, isDragOver }) => {
  const p = { P0: "#e7402e", P1: "#f06b1c", P2: "#f5a524", P3: "#b3a890" }[t.priority];
  const isEditing = editingId === t.id;

  if (isEditing) {
    return (
      <div style={{
        padding: 10, borderRadius: 10,
        background: "rgba(245,165,36,.12)",
        border: "0.5px solid rgba(245,165,36,.3)",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        <input autoFocus value={editData.title || ''}
          onChange={(e) => onEditChange({ ...editData, title: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') onSaveEdit(); if (e.key === 'Escape') onCancelEdit(); }}
          style={{ all: "unset", fontSize: 13, fontWeight: 500, width: "100%" }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <select value={editData.project} onChange={(e) => onEditChange({ ...editData, project: e.target.value })}
            style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}>
            {['Fundraise','Product','Hiring','Team','Ops','General','Design','Engineering'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={editData.priority} onChange={(e) => onEditChange({ ...editData, priority: e.target.value })}
            style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}>
            {['P0','P1','P2','P3'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={editData.due} onChange={(e) => onEditChange({ ...editData, due: e.target.value })}
            style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}>
            {["Today","Tomorrow","Mon","Tue","Wed","Thu","Fri","Next week","Whenever"].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={editData.status} onChange={(e) => onEditChange({ ...editData, status: e.target.value })}
            style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}>
            {['todo','doing','done'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div style={{ flex: 1 }} />
          <button onClick={onCancelEdit} style={{ fontSize: 11, color: "var(--ink-3)", padding: "2px 6px" }}>Cancel</button>
          <button onClick={onSaveEdit} style={{ fontSize: 11, color: "var(--accent-orange)", fontWeight: 600, padding: "2px 6px" }}>Save</button>
          <button onClick={() => onDelete(t.id)} style={{ fontSize: 11, color: "var(--accent-coral)", padding: "2px 6px" }}>Delete</button>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e)}
      onDragOver={(e) => onDragOver(e)}
      onDrop={(e) => onDrop(e)}
      onDoubleClick={() => onStartEdit(t)}
      style={{
        padding: 10, borderRadius: 10,
        background: isDragOver ? "rgba(245,165,36,.15)" : t.status === 'done' ? "rgba(74,143,94,.06)" : "rgba(255,252,244,.45)",
        border: isDragOver ? "1px dashed var(--accent-orange)" : "0.5px solid rgba(26,20,16,.06)",
        display: "flex", gap: 10, alignItems: "flex-start",
        transition: "background 150ms",
      }}>
      <button onClick={() => onToggle(t.id)} style={{
        width: 16, height: 16, borderRadius: "50%", flexShrink: 0, marginTop: 1,
        border: `1.5px solid ${t.status === 'done' ? "transparent" : p}`,
        background: t.status === 'done' ? "var(--ok)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
      }}>
        {t.status === 'done' && <Icon name="check" size={10} stroke={2.5} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, color: "var(--ink-1)", textDecoration: t.status === 'done' ? "line-through" : "none",
          opacity: t.status === 'done' ? 0.5 : 1, lineHeight: 1.4,
        }}>
          {t.title}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 10.5, color: "var(--ink-3)" }}>
          <span style={{ color: p, fontWeight: 600 }}>{t.priority}</span>
          <span>·</span><span>{t.due}</span>
          <span>·</span><span>{t.project}</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => onStartEdit(t)} style={{ fontSize: 10, color: "var(--ink-3)" }}>Edit</button>
          <button onClick={() => onDelete(t.id)} style={{ fontSize: 10, color: "var(--ink-4)" }}>✕</button>
        </div>
        {t.ai && (
          <div style={{
            marginTop: 6, padding: "5px 8px", borderRadius: 6,
            background: "rgba(245,165,36,.10)", fontSize: 11, color: "var(--ink-2)",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <Icon name="sparkle" size={10} color="var(--accent-orange)" /> {t.ai}
          </div>
        )}
      </div>
    </div>
  );
};
