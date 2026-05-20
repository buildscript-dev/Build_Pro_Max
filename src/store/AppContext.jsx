import React, { createContext, useContext, useReducer, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { AppData as initialData } from '../data';
import { sendNotification, checkDueReminders } from '../services/clock';
import { fetchAllFromSupabase, syncToSupabase, deleteFromSupabase, subscribeToAll } from '../services/supabaseDb';

const STORAGE_KEY = 'build_pro_max_1_state_v4';

function getWeekNumber(d) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with fresh defaults to fill in any missing fields (e.g. new env fields)
      const defaults = freshState();
      const merged = {
        ...defaults,
        ...parsed,
        today: { ...defaults.today, ...parsed.today },
        tweaks: { ...defaults.tweaks, ...parsed.tweaks },
        tasks: parsed.tasks || defaults.tasks,
        notes: parsed.notes || defaults.notes,
        events: parsed.events || defaults.events,
        contacts: parsed.contacts || defaults.contacts,
        files: parsed.files || defaults.files,
        devices: parsed.devices || defaults.devices,
        reminders: parsed.reminders || defaults.reminders,
        aiSuggestions: parsed.aiSuggestions || defaults.aiSuggestions,
        goals: parsed.goals || defaults.goals,
        schedule: parsed.schedule || defaults.schedule,
        chatMessages: parsed.chatMessages || defaults.chatMessages,
        notifications: parsed.notifications || defaults.notifications,
      };
      // ensure today/weekOf is updated
      const now = new Date();
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const dow = days[now.getDay()];
      const month = months[now.getMonth()];
      const date = now.getDate();
      const weekNum = getWeekNumber(now);
      merged.today = {
        ...merged.today,
        date: `${dow}, ${month} ${date}`,
        weekOf: `Week ${weekNum} · ${month} ${date}–${date+6}`,
      };
      return merged;
    }
  } catch (e) { /* ignore */ }
  return null;
}

const initialToday = () => {
  const now = new Date();
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const weekNum = getWeekNumber(now);
  return {
    ...initialData.today,
    date: `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`,
    weekOf: `Week ${weekNum} · ${months[now.getMonth()]} ${now.getDate()}–${now.getDate()+6}`,
  };
};

function freshState() {
  return {
    user: { ...initialData.user },
    today: initialToday(),
    tasks: initialData.tasks.map(t => ({ ...t })),
    notes: initialData.notes.map(n => ({ ...n })),
    events: initialData.events.map(e => ({ ...e })),
    contacts: initialData.contacts.map(c => ({ ...c })),
    files: initialData.files.map(f => ({ ...f })),
    devices: initialData.devices.map(d => ({ ...d })),
    reminders: initialData.reminders.map(r => ({ ...r })),
    aiSuggestions: initialData.aiSuggestions.map(s => ({ ...s })),
    goals: initialData.goals.map(g => ({ ...g })),
    schedule: initialData.schedule.map(s => ({ ...s })),
    chatMessages: [
      { id: 'm1', role: 'ai', text: 'Welcome. I am your environment engine. How can I help you today?', time: Date.now() },
    ],
    notifications: [],
    tweaks: {
      glassBlur: 28,
      motion: 'lively',
      nav: 'dock',
      canvas: 'mono',
      palette: ['#f5a524', '#f06b1c', '#e7402e', '#c2185b'],
      paperWarmth: 1,
      grain: 0.45,
      ambient: 1,
      focusMode: 'off',
      focusHideDock: true,
      focusHideTopbar: false,
      focusTimer: 0,
    },
    nextNoteId: 1,
    nextTaskId: 1,
    nextEventId: 1,
    nextContactId: 1,
    automationEnabled: false,
    auditLog: [],
    automationFeedback: [],
    autoReply: null,
  };
}

function generateId() { return Math.random().toString(36).substring(2, 9); }

function computeNextRecurDate(recurring, currentDue) {
  if (!recurring) return null;
  const now = new Date();
  const next = new Date(now);

  if (currentDue && !isNaN(new Date(currentDue).getTime())) {
    next.setTime(new Date(currentDue).getTime());
  }

  switch (recurring) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekdays': {
      next.setDate(next.getDate() + 1);
      const dow = next.getDay();
      if (dow === 6) next.setDate(next.getDate() + 2);
      if (dow === 0) next.setDate(next.getDate() + 1);
      break;
    }
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      return null;
  }

  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  return next.toLocaleDateString('en-US', options);
}

function reducer(state, action) {
  switch (action.type) {
    // ─── Tasks ───
    case 'ADD_TASK': {
      const id = `t${state.nextTaskId}`;
      const newTask = {
        title: '',
        due: 'Today',
        priority: 'P2',
        status: 'todo',
        project: 'General',
        ai: null,
        recurring: null,
        subtasks: [],
        createdAt: Date.now(),
        ...action.payload,
        id,
      };
      return { ...state, tasks: [newTask, ...state.tasks], nextTaskId: state.nextTaskId + 1 };
    }
    case 'UPDATE_TASK': {
      const tasks = state.tasks.map(t => t.id === action.payload.id ? { ...t, ...action.payload } : t);
      return { ...state, tasks };
    }
    case 'DELETE_TASK': {
      const tasks = state.tasks.filter(t => t.id !== action.payload);
      return { ...state, tasks };
    }
    case 'TOGGLE_TASK': {
      const task = state.tasks.find(t => t.id === action.payload);
      if (!task) return state;
      const isCompleting = task.status !== 'done';
      let newTasks = state.tasks.map(t =>
        t.id === action.payload ? { ...t, status: isCompleting ? 'done' : 'todo' } : t
      );

      // Auto-generate next recurring instance when completing
      if (isCompleting && task.recurring) {
        const nextDue = computeNextRecurDate(task.recurring, task.due);
        if (nextDue) {
          const id = `t${state.nextTaskId}`;
          const nextTask = {
            ...task,
            id,
            status: 'todo',
            due: nextDue,
            subtasks: task.subtasks?.map(s => ({ ...s, done: false })) || [],
            ai: `Recurring: next due ${nextDue}`,
            createdAt: Date.now(),
          };
          delete nextTask.recurringInstanceOf;
          newTasks = [nextTask, ...newTasks];
          return { ...state, tasks: newTasks, nextTaskId: state.nextTaskId + 1 };
        }
      }

      // Auto-update goal progress based on task completion
      const completedPerProject = {};
      const totalPerProject = {};
      newTasks.forEach(t => {
        const proj = t.project || 'General';
        totalPerProject[proj] = (totalPerProject[proj] || 0) + 1;
        if (t.status === 'done') completedPerProject[proj] = (completedPerProject[proj] || 0) + 1;
      });
      const projectGoalMap = { Fundraise: 'Close seed', Product: 'Ship v1', Hiring: 'Team to 8' };
      const updatedGoals = state.goals.map(g => {
        const matchedProject = Object.entries(projectGoalMap).find(([, goalName]) => goalName === g.name)?.[0];
        if (matchedProject && totalPerProject[matchedProject] > 0) {
          const pct = Math.round((completedPerProject[matchedProject] || 0) / totalPerProject[matchedProject] * 100);
          return { ...g, pct: Math.min(100, Math.max(0, pct)) };
        }
        return g;
      });

      return { ...state, tasks: newTasks, goals: updatedGoals };
    }
    case 'REORDER_TASKS': {
      return { ...state, tasks: action.payload };
    }

    // ─── Notes ───
    case 'ADD_NOTE': {
      const explicitId = action.payload?.id;
      const id = explicitId || `n${state.nextNoteId}`;
      const newNote = {
        title: 'Untitled',
        tag: 'General',
        icon: 'notes',
        words: 0,
        edited: 'just now',
        pinned: false,
        preview: '',
        ai: null,
        content: '',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: Date.now(),
        ...action.payload,
        id,
      };
      const nextId = explicitId ? state.nextNoteId : state.nextNoteId + 1;
      return { ...state, notes: [newNote, ...state.notes], nextNoteId: nextId };
    }
    case 'UPDATE_NOTE': {
      const notes = state.notes.map(n => n.id === action.payload.id ? {
        ...n, ...action.payload,
        edited: 'just now',
        words: (action.payload.content || n.content || n.preview || '').split(/\s+/).filter(Boolean).length || n.words,
      } : n);
      return { ...state, notes };
    }
    case 'DELETE_NOTE': {
      const notes = state.notes.filter(n => n.id !== action.payload);
      return { ...state, notes };
    }
    case 'TOGGLE_PIN_NOTE': {
      const notes = state.notes.map(n => n.id === action.payload ? { ...n, pinned: !n.pinned } : n);
      return { ...state, notes };
    }

    // ─── Events / Calendar ───
    case 'ADD_EVENT': {
      const id = `e${state.nextEventId}`;
      const newEvent = {
        day: new Date().getDate(),
        title: 'New event',
        color: 'amber',
        time: '12:00',
        ...action.payload,
        id,
      };
      return { ...state, events: [...state.events, newEvent], nextEventId: state.nextEventId + 1 };
    }
    case 'UPDATE_EVENT': {
      const events = state.events.map(e => e.id === action.payload.id ? { ...e, ...action.payload } : e);
      return { ...state, events };
    }
    case 'DELETE_EVENT': {
      const events = state.events.filter(e => e.id !== action.payload);
      return { ...state, events };
    }

    // ─── Contacts ───
    case 'ADD_CONTACT': {
      const id = `c${state.nextContactId}`;
      const newContact = {
        name: '',
        role: '',
        tag: 'Personal',
        last: 'Just now',
        warmth: 0.5,
        avatar: '??',
        color: 'amber',
        ai: null,
        ...action.payload,
        id,
      };
      return { ...state, contacts: [...state.contacts, newContact], nextContactId: state.nextContactId + 1 };
    }
    case 'UPDATE_CONTACT': {
      const contacts = state.contacts.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c);
      return { ...state, contacts };
    }
    case 'DELETE_CONTACT': {
      const contacts = state.contacts.filter(c => c.id !== action.payload);
      return { ...state, contacts };
    }
    case 'DECAY_WARMTH': {
      const contacts = state.contacts.map(c => ({
        ...c,
        warmth: Math.max(0.1, +(c.warmth - 0.03).toFixed(2)),
      }));
      return { ...state, contacts };
    }

    // ─── Files ───
    case 'ADD_FILE': {
      const fileId = `file_${generateId()}`;
      return { ...state, files: [{ id: fileId, ...action.payload, progress: 0 }, ...state.files] };
    }
    case 'UPDATE_FILE_PROGRESS': {
      // Support matching by id (preferred) or name (legacy fallback)
      const files = state.files.map(f =>
        (f.id && f.id === action.payload.id) || f.name === action.payload.name
          ? { ...f, progress: action.payload.progress }
          : f
      );
      return { ...state, files };
    }
    case 'REMOVE_FILE': {
      // Match by id first, fall back to name
      const files = state.files.filter(f => {
        if (action.payload && typeof action.payload === 'object') {
          return f.id !== action.payload.id && f.name !== action.payload.name;
        }
        return f.id !== action.payload && f.name !== action.payload;
      });
      return { ...state, files };
    }

    // ─── Schedule ───
    case 'ADD_SCHEDULE_BLOCK': {
      return { ...state, schedule: [...state.schedule, { ...action.payload }] };
    }
    case 'UPDATE_SCHEDULE_BLOCK': {
      const schedule = state.schedule.map((b, i) => i === action.payload.index ? { ...b, ...action.payload.data } : b);
      return { ...state, schedule };
    }

    // ─── Goals ───
    case 'UPDATE_GOAL': {
      const goals = state.goals.map(g => g.name === action.payload.name ? { ...g, ...action.payload } : g);
      return { ...state, goals };
    }

    // ─── Reminders ───
    case 'ADD_REMINDER': {
      return { ...state, reminders: [...state.reminders, { id: generateId(), ...action.payload }] };
    }
    case 'DELETE_REMINDER': {
      const reminders = state.reminders.filter(r => r.id !== action.payload);
      return { ...state, reminders };
    }

    // ─── Chat ───
    case 'ADD_CHAT_MESSAGE': {
      return { ...state, chatMessages: [...state.chatMessages, { id: generateId(), time: Date.now(), ...action.payload }] };
    }
    case 'CLEAR_CHAT': {
      return { ...state, chatMessages: [] };
    }

    // ─── Notifications ───
    case 'ADD_NOTIFICATION': {
      return { ...state, notifications: [{ id: generateId(), time: Date.now(), read: false, ...action.payload }, ...state.notifications].slice(0, 50) };
    }
    case 'MARK_NOTIFICATION_READ': {
      const notifications = state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n);
      return { ...state, notifications };
    }
    case 'MARK_ALL_NOTIFICATIONS_READ': {
      const notifications = state.notifications.map(n => ({ ...n, read: true }));
      return { ...state, notifications };
    }
    case 'CLEAR_NOTIFICATIONS': {
      return { ...state, notifications: [] };
    }

    // ─── Environment / AI Automation ───
    case 'SET_AUTOMATION_ENABLED': {
      return { ...state, automationEnabled: action.payload };
    }
    case 'ADD_AUDIT_LOG': {
      const entry = { id: generateId(), timestamp: Date.now(), ...action.payload };
      return { ...state, auditLog: [entry, ...(state.auditLog || [])].slice(0, 200) };
    }
    case 'ADD_AUTOMATION_FEEDBACK': {
      return { ...state, automationFeedback: [{ id: generateId(), timestamp: Date.now(), ...action.payload }, ...(state.automationFeedback || [])].slice(0, 500) };
    }
    case 'SET_AUTO_REPLY': {
      return { ...state, autoReply: action.payload };
    }

    // ─── Tweaks ───
    case 'SET_TWEAK': {
      const edits = typeof action.payload === 'object' ? action.payload : { [action.key]: action.val };
      return { ...state, tweaks: { ...state.tweaks, ...edits } };
    }

    // ─── User ───
    case 'UPDATE_USER': {
      return { ...state, user: { ...state.user, ...action.payload } };
    }

    // ─── AI Suggestions ───
    case 'SET_AI_SUGGESTIONS': {
      return { ...state, aiSuggestions: action.payload };
    }

    // ─── Cross-tab sync: replace entire state ───
    case 'REPLACE_STATE': {
      return action.payload;
    }

    // ─── Supabase Hydration ───
    case 'HYDRATE_SUPABASE': {
      const db = action.payload;
      return {
        ...state,
        tasks: db.tasks && db.tasks.length > 0 ? db.tasks : state.tasks,
        notes: db.notes && db.notes.length > 0 ? db.notes : state.notes,
        events: db.events && db.events.length > 0 ? db.events : state.events,
        contacts: db.contacts && db.contacts.length > 0 ? db.contacts : state.contacts,
        files: db.files && db.files.length > 0 ? db.files : state.files,
        reminders: db.reminders && db.reminders.length > 0 ? db.reminders : state.reminders,
        goals: db.goals && db.goals.length > 0 ? db.goals : state.goals,
        schedule: db.schedule && db.schedule.length > 0 ? db.schedule : state.schedule,
        chatMessages: db.chat_messages && db.chat_messages.length > 0 ? db.chat_messages : state.chatMessages,
        notifications: db.notifications && db.notifications.length > 0 ? db.notifications : state.notifications,
        tweaks: db.settings && db.settings.length > 0 && db.settings[0].tweaks ? { ...state.tweaks, ...db.settings[0].tweaks } : state.tweaks,
      };
    }

    // ─── Realtime Synchronization ───
    case 'REALTIME_CHANGE': {
      const { table, eventType, newRecord, oldRecord } = action.payload;
      
      // Map supabase table names to state keys
      let stateKey = table;
      if (table === 'chat_messages') stateKey = 'chatMessages';
      
      if (!state[stateKey] || !Array.isArray(state[stateKey])) return state;

      const currentList = state[stateKey];

      if (eventType === 'INSERT') {
        if (currentList.some(item => item.id === newRecord.id)) return state;
        return { ...state, [stateKey]: [newRecord, ...currentList] };
      }
      
      if (eventType === 'UPDATE') {
        return { ...state, [stateKey]: currentList.map(item => item.id === newRecord.id ? newRecord : item) };
      }

      if (eventType === 'DELETE') {
        return { ...state, [stateKey]: currentList.filter(item => item.id !== oldRecord.id) };
      }

      return state;
    }

    default:
      return state;
  }
}

const AppContext = createContext(null);

export function AppProvider({ children, authUser: initialAuthUser = null, setAuthUser: externalSetAuth = null, onLogout: externalLogout = null }) {
  const saved = loadState();
  const [state, dispatch] = useReducer(reducer, saved || freshState());
  const [bootDone, setBootDone] = useState(false);
  const [authUser, setAuthUser] = useState(initialAuthUser);

  useEffect(() => {
    if (initialAuthUser) setAuthUser(initialAuthUser);
  }, [initialAuthUser]);

  useEffect(() => {
    const id = setTimeout(() => setBootDone(true), 1100);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (authUser && authUser.id) {
      // 1. Hydrate full state initially
      fetchAllFromSupabase(authUser.id).then(results => {
        dispatch({ type: 'HYDRATE_SUPABASE', payload: results });
      }).catch(err => console.error("Supabase load failed", err));

      // 2. Listen to real-time changes
      const unsubscribe = subscribeToAll(authUser.id, (table, eventType, newRecord, oldRecord) => {
        dispatch({ type: 'REALTIME_CHANGE', payload: { table, eventType, newRecord, oldRecord } });
      });

      return () => {
        unsubscribe();
      };
    }
  }, [authUser]);

  // Track whether current state change came from cross-tab sync (to avoid re-broadcasting)
  const isSyncingRef = useRef(false);

  // Debounced localStorage persistence — avoid serializing on every tiny dispatch
  const persistTimer = useRef(null);
  useEffect(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        // Only broadcast if this state change originated locally (not from another tab)
        if (!isSyncingRef.current && window.__buildProMaxSync?.broadcast) {
          window.__buildProMaxSync.broadcast(state);
        }
      } catch (e) { /* quota exceeded — ignore */ }
    }, 400);
    return () => clearTimeout(persistTimer.current);
  }, [state]);

  // Listen for cross-tab state sync events — stable listener, merges via ref
  useEffect(() => {
    const handleSync = (e) => {
      const syncedState = e.detail;
      if (syncedState) {
        isSyncingRef.current = true;
        const current = stateRef.current;
        const merged = { ...current, ...syncedState, tweaks: { ...current.tweaks, ...syncedState.tweaks } };
        dispatch({ type: 'REPLACE_STATE', payload: merged });
        // Reset flag after the state update and persistence cycle completes
        setTimeout(() => { isSyncingRef.current = false; }, 600);
      }
    };
    window.addEventListener('build_pro_max_state_sync', handleSync);
    return () => window.removeEventListener('build_pro_max_state_sync', handleSync);
  }, []); // stable — reads fresh state via stateRef

  // Use a ref to always have fresh state inside the AI interval (avoids stale closure)
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Stable AI suggestion interval — runs every 30s, reads from ref to avoid stale data
  useEffect(() => {
    const iv = setInterval(() => {
      const s = stateRef.current;
      const now = new Date();
      const h = now.getHours();
      const recent = s.tasks.filter(t => t.status === 'todo' && /today/i.test(t.due));
      const overdue = s.tasks.filter(t => t.status === 'todo' && /past/i.test(t.due));
      const suggestions = [];
      if (recent.length > 2) suggestions.push({ kind: 'focus', text: `You have ${recent.length} tasks due today. Start with the highest priority first.` });
      if (overdue.length > 0) suggestions.push({ kind: 'reschedule', text: `${overdue.length} task(s) are overdue. Want to reschedule them?` });
      if (h >= 12 && h < 14) suggestions.push({ kind: 'buffer', text: 'Afternoon energy dip incoming. Protect your 14:00–15:00 for focused work.' });
      if (suggestions.length > 0 && JSON.stringify(suggestions) !== JSON.stringify(s.aiSuggestions)) {
        dispatch({ type: 'SET_AI_SUGGESTIONS', payload: suggestions });
      }
    }, 30000);
    return () => clearInterval(iv);
  }, []); // stable — only runs once, reads live state via stateRef

  // Reminder checker — fires browser notifications for reminders every 60s
  const firedRef = useRef(new Set());
  useEffect(() => {
    const iv = setInterval(() => {
      const s = stateRef.current;
      const due = checkDueReminders(s.reminders);
      if (due.length > 0) {
        due.forEach(r => {
          if (firedRef.current.has(r.id)) return;
          firedRef.current.add(r.id);
          sendNotification(r.title || 'Reminder', { body: r.text || r.title || '' });
          dispatch({ type: 'ADD_NOTIFICATION', payload: { text: `Reminder: ${r.title || 'Reminder'}`, kind: 'info' } });
        });
      }
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  // Contact warmth decay — decay every 6 hours
  useEffect(() => {
    const iv = setInterval(() => {
      dispatch({ type: 'DECAY_WARMTH' });
    }, 6 * 3600000); // 6 hours
    return () => clearInterval(iv);
  }, []);

  // Memoize actions so child components don't re-render just because the provider re-rendered
  const actions = useMemo(() => ({
    // Tasks
    addTask: (data) => { dispatch({ type: 'ADD_TASK', payload: data }); if (authUser) syncToSupabase('tasks', data); },
    updateTask: (data) => { dispatch({ type: 'UPDATE_TASK', payload: data }); if (authUser) syncToSupabase('tasks', data); },
    deleteTask: (id) => { dispatch({ type: 'DELETE_TASK', payload: id }); if (authUser) deleteFromSupabase('tasks', id); },
    toggleTask: (id) => { dispatch({ type: 'TOGGLE_TASK', payload: id }); if (authUser) syncToSupabase('tasks', { id, status: 'toggled' }); /* Note: simplified toggle sync, ideally full object is synced */ },
    reorderTasks: (tasks) => { dispatch({ type: 'REORDER_TASKS', payload: tasks }); if (authUser) syncToSupabase('tasks', tasks); },

    // Notes
    addNote: (data) => { dispatch({ type: 'ADD_NOTE', payload: data }); if (authUser) syncToSupabase('notes', data); },
    updateNote: (data) => { dispatch({ type: 'UPDATE_NOTE', payload: data }); if (authUser) syncToSupabase('notes', data); },
    deleteNote: (id) => { dispatch({ type: 'DELETE_NOTE', payload: id }); if (authUser) deleteFromSupabase('notes', id); },
    togglePinNote: (id) => { dispatch({ type: 'TOGGLE_PIN_NOTE', payload: id }); },

    // Events
    addEvent: (data) => { dispatch({ type: 'ADD_EVENT', payload: data }); if (authUser) syncToSupabase('events', data); },
    updateEvent: (data) => { dispatch({ type: 'UPDATE_EVENT', payload: data }); if (authUser) syncToSupabase('events', data); },
    deleteEvent: (id) => { dispatch({ type: 'DELETE_EVENT', payload: id }); if (authUser) deleteFromSupabase('events', id); },

    // Contacts
    addContact: (data) => { dispatch({ type: 'ADD_CONTACT', payload: data }); if (authUser) syncToSupabase('contacts', data); },
    updateContact: (data) => { dispatch({ type: 'UPDATE_CONTACT', payload: data }); if (authUser) syncToSupabase('contacts', data); },
    deleteContact: (id) => { dispatch({ type: 'DELETE_CONTACT', payload: id }); if (authUser) deleteFromSupabase('contacts', id); },

    // Files — accept id or name for progress/remove
    addFile: (data) => { dispatch({ type: 'ADD_FILE', payload: data }); if (authUser) syncToSupabase('files', data); },
    updateFileProgress: (idOrName, progress) => dispatch({ type: 'UPDATE_FILE_PROGRESS', payload: { id: idOrName, name: idOrName, progress } }),
    removeFile: (idOrName) => { dispatch({ type: 'REMOVE_FILE', payload: idOrName }); if (authUser) deleteFromSupabase('files', idOrName); },

    // Schedule
    addScheduleBlock: (data) => { dispatch({ type: 'ADD_SCHEDULE_BLOCK', payload: data }); if (authUser) syncToSupabase('schedule', data); },
    updateScheduleBlock: (index, data) => { dispatch({ type: 'UPDATE_SCHEDULE_BLOCK', payload: { index, data } }); },

    // Goals
    updateGoal: (data) => { dispatch({ type: 'UPDATE_GOAL', payload: data }); if (authUser) syncToSupabase('goals', data); },

    // Reminders
    addReminder: (data) => { dispatch({ type: 'ADD_REMINDER', payload: data }); if (authUser) syncToSupabase('reminders', data); },
    deleteReminder: (id) => { dispatch({ type: 'DELETE_REMINDER', payload: id }); if (authUser) deleteFromSupabase('reminders', id); },

    // Chat
    addChatMessage: (data) => { dispatch({ type: 'ADD_CHAT_MESSAGE', payload: data }); if (authUser) syncToSupabase('chat_messages', data); },
    clearChat: () => dispatch({ type: 'CLEAR_CHAT' }),

    // Notifications
    addNotification: (data) => { dispatch({ type: 'ADD_NOTIFICATION', payload: data }); if (authUser) syncToSupabase('notifications', data); },
    markNotificationRead: (id) => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id }),
    markAllNotificationsRead: () => dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' }),
    clearNotifications: () => dispatch({ type: 'CLEAR_NOTIFICATIONS' }),

    // Tweaks
    setTweak: (key, val) => { dispatch({ type: 'SET_TWEAK', payload: { [key]: val } }); if (authUser) syncToSupabase('settings', { id: authUser.id, tweaks: { [key]: val } }); },

    // User
    updateUser: (data) => { dispatch({ type: 'UPDATE_USER', payload: data }); },

    // AI
    setAiSuggestions: (data) => dispatch({ type: 'SET_AI_SUGGESTIONS', payload: data }),

    // Environment / AI Automation
    setAutomationEnabled: (bool) => dispatch({ type: 'SET_AUTOMATION_ENABLED', payload: bool }),
    addAuditLog: (entry) => dispatch({ type: 'ADD_AUDIT_LOG', payload: entry }),
    addAutomationFeedback: (feedback) => dispatch({ type: 'ADD_AUTOMATION_FEEDBACK', payload: feedback }),
    setAutoReply: (message) => dispatch({ type: 'SET_AUTO_REPLY', payload: message }),

    decayWarmth: () => dispatch({ type: 'DECAY_WARMTH' }),
  }), [dispatch, authUser]);

  // Stable no-op logout to avoid creating new function reference when externalLogout is absent
  const noopLogout = useCallback(() => {}, []);
  const resolvedLogout = externalLogout || noopLogout;

  const contextValue = useMemo(() => ({
    state,
    actions,
    bootDone,
    authUser,
    setAuthUser,
    onLogout: resolvedLogout,
  }), [state, actions, bootDone, authUser, setAuthUser, resolvedLogout]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
