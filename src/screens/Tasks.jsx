import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { GlassCard, PaperButton, Icon, AiOrb } from '../components/ui/Icons';
import { useAppState, useAppActions, useAppStore } from '../store/AppContext';
import { generateAiResponse, generateSubtasks, parseNaturalLanguageTask } from '../services/ai';
import { ScreenShell } from '../components/ui/ScreenShell';

const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
const PROJECTS = ['Fundraise', 'Product', 'Hiring', 'Team', 'Ops', 'General', 'Design', 'Engineering'];
const STATUSES = ['todo', 'doing', 'done'];
const RECUR_OPTIONS = [
  { value: null, label: 'No repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
];

export const Tasks = () => {
  const { actions } = useAppActions();
  const store = useAppStore();
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [newTask, setNewTask] = useState({ title: '', project: 'General', priority: 'P2', due: 'Today', recurring: null });
  const [dragOverId, setDragOverId] = useState(null);
  const [expandedSubtasks, setExpandedSubtasks] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const tasks = useAppState((s) => s.tasks) || [];

  const filtered = useMemo(() => {
    let result = tasks.filter(t => {
      if (filter === 'all') return true;
      if (filter === 'today') return /today/i.test(t.due);
      if (filter === 'open') return t.status !== 'done';
      if (filter === 'done') return t.status === 'done';
      if (filter === 'overdue') return t.status !== 'done' && /past/i.test(t.due);
      if (filter === 'p0') return t.priority === 'P0' && t.status !== 'done';
      return true;
    });

    if (sortBy === 'priority') {
      const pOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
      result = [...result].sort((a, b) => (pOrder[a.priority] ?? 99) - (pOrder[b.priority] ?? 99));
    } else if (sortBy === 'due') {
      const dueOrder = { Today: 0, Tomorrow: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6 };
      result = [...result].sort((a, b) => {
        const aOrder = dueOrder[a.due] ?? 99;
        const bOrder = dueOrder[b.due] ?? 99;
        return aOrder - bOrder;
      });
    } else if (sortBy === 'project') {
      result = [...result].sort((a, b) => (a.project || '').localeCompare(b.project || ''));
    }

    return result;
  }, [tasks, filter, sortBy]);

  const groups = useMemo(() => {
    const g = {};
    filtered.forEach(t => { (g[t.project] = g[t.project] || []).push(t); });
    return g;
  }, [filtered]);

  const addTask = () => {
    if (!newTask.title.trim()) return;
    const taskPayload = { ...newTask, title: newTask.title.trim(), status: 'todo' };
    if (!taskPayload.recurring) taskPayload.recurring = null;
    actions.addTask(taskPayload);
    actions.addNotification({ text: `Task "${newTask.title}" created`, kind: 'info' });
    setNewTask({ title: '', project: 'General', priority: 'P2', due: 'Today', recurring: null });
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
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    setConfirmDeleteId(null);
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
  const [nlMode, setNlMode] = useState(false);
  const [nlInput, setNlInput] = useState('');
  const [nlParsing, setNlParsing] = useState(false);
  const [subtaskLoading, setSubtaskLoading] = useState({});

  const getSnoozedCount = () => tasks.filter(t => t.status !== 'done' && /past/i.test(t.due)).length;

  // Auto-load AI advice on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (tasks.length === 0) return;
      setAiLoading(true);
      const prompt = `Analyze my task list. I have ${tasks.length} total tasks, ${tasks.filter(t => t.status !== 'done').length} open, ${tasks.filter(t => t.status !== 'done' && /past/i.test(t.due)).length} overdue. P0s: ${tasks.filter(t => t.priority === 'P0' && t.status !== 'done').map(t => t.title).join(', ') || 'none'}. Give me 1-2 sentences of actionable advice.`;
      const response = await generateAiResponse(prompt, store.getSnapshot());
      if (!cancelled) { setAiAdvice(response); setAiLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const askAi = useCallback(async () => {
    setAiLoading(true);
    const prompt = `Analyze my task list. I have ${tasks.length} total tasks, ${tasks.filter(t => t.status !== 'done').length} open, ${getSnoozedCount()} overdue. P0s: ${tasks.filter(t => t.priority === 'P0' && t.status !== 'done').map(t => t.title).join(', ') || 'none'}. Give me 1-2 sentences of actionable advice.`;
    const response = await generateAiResponse(prompt, store.getSnapshot());
    setAiAdvice(response);
    setAiLoading(false);
  }, [tasks, store]);

  const handleNlAdd = useCallback(async () => {
    if (!nlInput.trim() || nlParsing) return;
    setNlParsing(true);
    try {
      const parsed = await parseNaturalLanguageTask(nlInput, store.getSnapshot());
      actions.addTask({ ...parsed, status: 'todo', subtasks: [] });
      actions.addNotification({ text: `Task created: "${parsed.title}" · ${parsed.priority} · ${parsed.due}`, kind: 'info' });
      setNlInput('');
      setNlMode(false);
    } catch (e) {
      actions.addTask({ title: nlInput.trim(), priority: 'P2', due: 'Today', status: 'todo', project: 'General', subtasks: [] });
      setNlInput('');
      setNlMode(false);
    }
    setNlParsing(false);
  }, [nlInput, nlParsing, store, actions]);

  const handleAutoSubtasks = useCallback(async (task) => {
    setSubtaskLoading(prev => ({ ...prev, [task.id]: true }));
    try {
      const subtasks = await generateSubtasks(task.title, store.getSnapshot());
      actions.updateTask({ ...task, subtasks: [...(task.subtasks || []), ...subtasks] });
      actions.addNotification({ text: `${subtasks.length} subtasks generated by Hermes`, kind: 'info' });
    } catch {}
    setSubtaskLoading(prev => ({ ...prev, [task.id]: false }));
  }, [store, actions]);

  const toggleSubtask = (taskId, subIdx) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return;
    const updatedSubtasks = task.subtasks.map((s, i) =>
      i === subIdx ? { ...s, done: !s.done } : s
    );
    actions.updateTask({ id: taskId, subtasks: updatedSubtasks });
  };

  const addSubtask = (taskId, title) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !title.trim()) return;
    const updatedSubtasks = [...(task.subtasks || []), { title: title.trim(), done: false }];
    actions.updateTask({ id: taskId, subtasks: updatedSubtasks });
  };

  const toggleExpand = (taskId) => {
    setExpandedSubtasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const killSnoozer = () => {
    const snoozed = tasks.filter(t => t.status !== 'done' && /past/i.test(t.due));
    if (snoozed.length === 0) return;
    if (confirmDeleteId !== 'bulk-overdue') { setConfirmDeleteId('bulk-overdue'); return; }
    setConfirmDeleteId(null);
    snoozed.forEach(t => actions.deleteTask(t.id));
    actions.addNotification({ text: `Killed ${snoozed.length} snoozed task(s)`, kind: 'info' });
  };

  const replanRecoverables = () => {
    const overdue = tasks.filter(t => t.status !== 'done' && /past/i.test(t.due));
    if (overdue.length === 0) return;
    // Batch update: create updated tasks array and dispatch once
    const updatedTasks = tasks.map(t => {
      if (overdue.includes(t)) {
        return { ...t, due: 'Tomorrow' };
      }
      return t;
    });
    actions.reorderTasks(updatedTasks);
    actions.addNotification({ text: `Replanned ${overdue.length} task(s) to tomorrow`, kind: 'info' });
  };

  return (
    <ScreenShell
      eyebrow="Hermes Task Engine"
      title={<>What you actually have to <span className="t-display-italic" style={{ color: "var(--accent-orange)" }}>do</span>.</>}
      subtitle={<>Sorted by priority, slip-risk, and how often you've snoozed it. Drag to reorder — Hermes watches.</>}
      right={<>
        <div style={{ display: "flex", padding: 3, gap: 2, borderRadius: 999, background: "rgba(26,20,16,.05)" }}>
          {["all","today","open","p0","overdue","done"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 500,
              background: filter === f ? "rgba(255,252,244,.95)" : "transparent",
              color: filter === f ? "var(--ink-1)" : "var(--ink-3)",
              boxShadow: filter === f ? "0 1px 0 rgba(255,255,255,.7) inset, 0 1px 2px rgba(46,30,12,.10)" : "none",
              textTransform: "capitalize",
            }}>{f === 'p0' ? 'P0' : f}</button>
          ))}
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          style={{ padding: "6px 12px", borderRadius: 999, fontSize: 11.5, border: "0.5px solid var(--ink-line)", background: "rgba(255,252,244,.7)", color: "var(--ink-2)", fontWeight: 500 }}>
          <option value="default">Default order</option>
          <option value="priority">By priority</option>
          <option value="due">By due date</option>
          <option value="project">By project</option>
        </select>
        <PaperButton small onClick={() => setNlMode(v => !v)}>✨ Natural language</PaperButton>
        <PaperButton icon="plus" primary onClick={() => setShowAdd(true)}>Capture</PaperButton>
      </>}
    >
      {/* Natural Language Task Input */}
      {nlMode && (
        <div style={{ marginBottom: 16, padding: '16px 20px', borderRadius: 16, background: 'rgba(245,165,36,.08)', border: '1px solid rgba(245,165,36,.25)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 18 }}>✨</span>
          <input
            autoFocus
            placeholder='Type naturally: "Ship auth tomorrow P0" or "Weekly team sync every Monday"'
            value={nlInput}
            onChange={e => setNlInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleNlAdd(); if (e.key === 'Escape') setNlMode(false); }}
            style={{ all: 'unset', flex: 1, fontSize: 14, color: 'var(--ink-1)', fontFamily: 'var(--font-body)' }}
          />
          {nlParsing ? (
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--accent-orange)', borderTopColor: 'transparent', animation: 'orb-pulse 1s linear infinite' }}/>
          ) : (
            <PaperButton small primary onClick={handleNlAdd} disabled={!nlInput.trim()}>Parse & Add</PaperButton>
          )}
          <button type="button" onClick={() => setNlMode(false)} style={{ fontSize: 12, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

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
              <select value={newTask.recurring || ''} onChange={(e) => setNewTask({ ...newTask, recurring: e.target.value || null })}
                style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}>
                {RECUR_OPTIONS.map(r => <option key={r.value || 'none'} value={r.value || ''}>{r.label}</option>)}
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
                  onToggleSubtask={toggleSubtask}
                  onAddSubtask={addSubtask}
                  isExpanded={!!expandedSubtasks[t.id]}
                  onToggleExpand={() => toggleExpand(t.id)}
                  isConfirmingDelete={confirmDeleteId === t.id}
                  onCancelDelete={() => setConfirmDeleteId(null)}
                />
              ))}
            </div>
          </GlassCard>
        ))}
        {Object.keys(groups).length === 0 && (
          <GlassCard>
            <div style={{ padding: 24, textAlign: "center" }}>
              {filter === 'done' ? (
                <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>No completed tasks yet. Keep going!</div>
              ) : (
                <>
                  <div style={{ fontSize: 16, marginBottom: 8 }}>🚀</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 12 }}>No tasks here. Let Hermes help you get started.</div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {['Ship the MVP', 'Review investor deck', 'Weekly team sync', 'Fix critical bug'].map(s => (
                      <button key={s} type="button" onClick={() => { setNlInput(s); setNlMode(true); }}
                        style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11.5, color: 'var(--ink-2)', background: 'rgba(245,165,36,.08)', border: '0.5px solid rgba(245,165,36,.2)', cursor: 'pointer' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </GlassCard>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <AiOrb size={22} />
            <span className="ai-text" style={{ fontWeight: 600 }}>Hermes execution coach</span>
            {aiLoading && <div style={{ width: 12, height: 12, borderRadius: '50%', border: '1.5px solid var(--accent-orange)', borderTopColor: 'transparent', animation: 'orb-pulse 1s linear infinite', marginLeft: 4 }}/>}
          </div>
          <div className="t-display-italic" style={{ fontSize: 18, lineHeight: 1.5, color: "var(--ink-1)", minHeight: 28 }}>
            {aiLoading ? 'Hermes is analyzing your tasks…' : aiAdvice || 'Hermes is ready to advise. Add a task to get started.'}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <PaperButton small onClick={askAi} disabled={aiLoading}>🔄 Re-analyze</PaperButton>
            <PaperButton small onClick={() => setFilter('today')}>Show today</PaperButton>
            <PaperButton small primary onClick={replanRecoverables}>⚡ Replan overdue</PaperButton>
            {getSnoozedCount() > 0 && (
              confirmDeleteId === 'bulk-overdue'
                ? <><PaperButton small accent onClick={killSnoozer}>Confirm delete {getSnoozedCount()}</PaperButton><PaperButton small onClick={() => setConfirmDeleteId(null)}>Cancel</PaperButton></>
                : <PaperButton small accent onClick={killSnoozer}>Kill snoozers ({getSnoozedCount()})</PaperButton>
            )}
          </div>
        </GlassCard>
      </div>
    </ScreenShell>
  );
};

const TaskRow = ({ t, editingId, editData, onStartEdit, onEditChange, onSaveEdit, onCancelEdit, onDelete, onToggle, onDragStart, onDragOver, onDrop, isDragOver, onToggleSubtask, onAddSubtask, isExpanded, onToggleExpand, isConfirmingDelete, onCancelDelete }) => {
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
          <select value={editData.recurring || ''} onChange={(e) => onEditChange({ ...editData, recurring: e.target.value || null })}
            style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}>
            {RECUR_OPTIONS.map(r => <option key={r.value || 'none'} value={r.value || ''}>{r.label}</option>)}
          </select>
          <div style={{ flex: 1 }} />
          <button onClick={onCancelEdit} style={{ fontSize: 11, color: "var(--ink-3)", padding: "2px 6px" }}>Cancel</button>
          <button onClick={onSaveEdit} style={{ fontSize: 11, color: "var(--accent-orange)", fontWeight: 600, padding: "2px 6px" }}>Save</button>
          {isConfirmingDelete
            ? <><button onClick={() => onDelete(t.id)} style={{ fontSize: 11, color: "#fff", background: "var(--accent-coral)", padding: "2px 8px", borderRadius: 4 }}>Confirm delete</button><button onClick={onCancelDelete} style={{ fontSize: 11, color: "var(--ink-3)", padding: "2px 6px" }}>Cancel</button></>
            : <button onClick={() => onDelete(t.id)} style={{ fontSize: 11, color: "var(--accent-coral)", padding: "2px 6px" }}>Delete</button>
          }
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
          {isConfirmingDelete
            ? <><button onClick={() => onDelete(t.id)} style={{ fontSize: 10, color: "var(--accent-coral)", fontWeight: 600 }}>Delete?</button><button onClick={onCancelDelete} style={{ fontSize: 10, color: "var(--ink-4)" }}>✕</button></>
            : <button onClick={() => onDelete(t.id)} style={{ fontSize: 10, color: "var(--ink-4)" }}>✕</button>
          }
        </div>
        {t.recurring && (
          <div style={{
            marginTop: 6, padding: "3px 8px", borderRadius: 6,
            background: "rgba(74,143,94,.10)", fontSize: 10.5, color: "var(--ok)",
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>
            ↻ {RECUR_OPTIONS.find(r => r.value === t.recurring)?.label || t.recurring}
          </div>
        )}
        {t.subtasks && t.subtasks.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <button onClick={onToggleExpand} style={{ fontSize: 10.5, color: "var(--ink-3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              {t.subtasks.filter(s => s.done).length}/{t.subtasks.length} subtasks {isExpanded ? '▲' : '▼'}
            </button>
            {isExpanded && (
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                {t.subtasks.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ink-2)" }}>
                    <input type="checkbox" checked={!!s.done} onChange={() => onToggleSubtask(t.id, i)}
                      style={{ margin: 0, cursor: "pointer" }}
                    />
                    <span style={{ textDecoration: s.done ? "line-through" : "none", opacity: s.done ? 0.5 : 1 }}>
                      {s.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
