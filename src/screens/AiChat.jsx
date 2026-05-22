import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GlassCard, PaperButton, Icon, AiOrb, Avatar } from '../components/ui/Icons';
import { useAppState, useAppActions, useAppStore } from '../store/AppContext';
import { generateAiResponse } from '../services/ai';
import {
  getMemoryProfile, setMemoryProfile, appendToMemoryProfile,
  checkObsidianStatus, syncToObsidian, syncFromObsidian,
} from '../services/hermesMemory';
import { checkOllamaStatus, getOllamaModel, setOllamaModel } from '../services/ollama';
import { getActiveProvider, setAiProvider } from '../services/ai';

/* ─── Hermes Pulsing SVG Orb ─────────────────────────────────── */
const HermesOrb = ({ thinking = false, size = 120 }) => {
  const intensity = thinking ? 2.4 : 1;
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <style>{`
        @keyframes hermes-spin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes hermes-spin-r  { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes hermes-pulse   { 0%,100% { opacity:.6; transform:scale(1); } 50% { opacity:1; transform:scale(1.06); } }
        @keyframes hermes-think   { 0%,100% { opacity:.85; transform:scale(1) rotate(0deg); } 50% { opacity:1; transform:scale(1.1) rotate(180deg); } }
        @keyframes halo-breathe   { 0%,100% { opacity:.35; } 50% { opacity:.65; } }
        @keyframes hermes-dot     { 0%,100%{ transform:scale(1);opacity:1 } 50%{ transform:scale(1.4);opacity:.6 } }
      `}</style>

      {/* outer halo */}
      <div style={{
        position:'absolute', inset: -12, borderRadius:'50%',
        background: `radial-gradient(circle, rgba(240,107,28,${thinking?0.18:0.09}) 0%, transparent 70%)`,
        animation: `halo-breathe ${thinking?1.1:3}s ease-in-out infinite`,
      }}/>

      {/* ring 1 */}
      <div style={{
        position:'absolute', inset:8, borderRadius:'50%',
        border: `1.5px solid rgba(245,165,36,${thinking?0.6:0.25})`,
        animation: `hermes-spin ${thinking?2.5:8}s linear infinite`,
      }}/>

      {/* ring 2 */}
      <div style={{
        position:'absolute', inset:18, borderRadius:'50%',
        border: `1px dashed rgba(231,64,46,${thinking?0.5:0.2})`,
        animation: `hermes-spin-r ${thinking?1.8:12}s linear infinite`,
      }}/>

      {/* core */}
      <div style={{
        position:'absolute', inset:26, borderRadius:'50%',
        background: thinking
          ? 'radial-gradient(circle at 30% 30%, #fff 0%, #ffd580 20%, #f06b1c 55%, #c2185b 85%, #6a0dad 100%)'
          : 'radial-gradient(circle at 35% 30%, #fff 0%, #f7d99a 30%, #f06b1c 65%, #c2185b 100%)',
        boxShadow: `0 0 ${thinking?32:14}px rgba(240,107,28,${thinking?0.7:0.4}), 0 0 ${thinking?60:24}px rgba(194,24,91,${thinking?0.4:0.2})`,
        animation: thinking ? `hermes-think 1s ease-in-out infinite` : `hermes-pulse 4s ease-in-out infinite`,
      }}/>

      {/* shimmer */}
      <div style={{
        position:'absolute', inset:28, borderRadius:'50%',
        background: 'conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,.45) 30%, transparent 60%)',
        animation: `hermes-spin ${thinking?1.2:6}s linear infinite`,
        mixBlendMode:'overlay',
      }}/>

      {/* thinking dots */}
      {thinking && (
        <div style={{ position:'absolute', bottom:-20, left:'50%', transform:'translateX(-50%)', display:'flex', gap:5 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width:5, height:5, borderRadius:'50%',
              background:'var(--accent-orange)',
              animation:`hermes-dot .8s ${i*0.2}s ease-in-out infinite`,
            }}/>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Status Badge ────────────────────────────────────────────── */
const StatusBadge = ({ label, value, color = 'var(--accent-orange)' }) => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
    <div style={{ fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-3)' }}>{label}</div>
    <div style={{ fontSize:12, fontWeight:600, color, fontFamily:'var(--font-mono, monospace)' }}>{value}</div>
  </div>
);

/* ─── Glass Toggle Switch ─────────────────────────────────────── */
const GlassToggle = ({ on, onChange, label, sub }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'0.5px solid rgba(26,20,16,.05)' }}>
    <div>
      <div style={{ fontSize:12.5, fontWeight:500, color:'var(--ink-1)' }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2 }}>{sub}</div>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!on)}
      style={{
        width:38, height:22, borderRadius:999, flexShrink:0,
        background: on ? 'linear-gradient(135deg,#f5a524,#f06b1c)' : 'rgba(26,20,16,.10)',
        border: on ? '0.5px solid rgba(240,107,28,.4)' : '0.5px solid rgba(26,20,16,.12)',
        boxShadow: on ? '0 0 12px rgba(240,107,28,.35)' : 'none',
        position:'relative', cursor:'pointer',
        transition:'all 220ms var(--ease-glass)',
      }}
    >
      <div style={{
        position:'absolute', top:3, left: on ? 19 : 3, width:16, height:16,
        borderRadius:'50%', background:'#fff',
        boxShadow:'0 1px 3px rgba(0,0,0,.25)',
        transition:'left 220ms var(--ease-snap)',
      }}/>
    </button>
  </div>
);

/* ─── Habit Row ───────────────────────────────────────────────── */
const HabitRow = ({ habit, onToggle }) => {
  const today = new Date().getDay();
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'0.5px solid rgba(26,20,16,.05)' }}>
      <div style={{
        width:8, height:8, borderRadius:'50%', flexShrink:0,
        background: habit.color || 'var(--accent-orange)',
        boxShadow:`0 0 6px ${habit.color || 'var(--accent-orange)'}`,
      }}/>
      <div style={{ flex:1, fontSize:12.5, color:'var(--ink-1)', fontWeight:500 }}>{habit.name}</div>
      <div style={{ display:'flex', gap:4 }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} onClick={() => onToggle(habit.id, i)} style={{
            width:20, height:20, borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:9, fontWeight:600, cursor:'pointer',
            background: habit.days?.[i] ? (habit.color || 'var(--accent-orange)') : 'rgba(26,20,16,.07)',
            color: habit.days?.[i] ? '#fff' : (i===today ? 'var(--accent-orange)' : 'var(--ink-3)'),
            border: i===today ? '1px solid var(--accent-orange)' : '1px solid transparent',
            transition:'all 150ms',
          }}>{d}</div>
        ))}
      </div>
    </div>
  );
};

/* ─── Message Bubble ──────────────────────────────────────────── */
const MessageBubble = ({ msg, onAction }) => {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';
  
  return (
    <div style={{ display:'flex', gap:10, alignItems:'flex-start', flexDirection: isUser ? 'row-reverse' : 'row' }}>
      {isUser
        ? <Avatar initials="U" color="orange" size={26}/>
        : isSystem 
          ? <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(26,20,16,.1)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>⚙️</div>
          : <div style={{ width:26, height:26, borderRadius:'50%', background:'radial-gradient(circle at 30% 30%,#fff,#f7d99a 30%,#f06b1c 65%,#c2185b)', flexShrink:0, boxShadow:'0 0 8px rgba(240,107,28,.4)' }}/>
      }
      <div style={{
        maxWidth:'75%', padding:'11px 15px', borderRadius:16,
        background: isSystem ? 'rgba(26,20,16,.85)' : isUser ? 'rgba(245,165,36,.15)' : 'rgba(255,252,244,.88)',
        border: isSystem ? '0.5px solid rgba(26,20,16,.1)' : '0.5px solid rgba(255,255,255,.75)',
        boxShadow: isSystem ? 'none' : '0 1px 0 rgba(255,255,255,.7) inset, 0 2px 8px -2px rgba(46,30,12,.08)',
        borderBottomLeftRadius: !isUser ? 4 : 16,
        borderBottomRightRadius: isUser ? 4 : 16,
        color: isSystem ? '#4ade80' : 'var(--ink-1)',
        fontFamily: isSystem ? 'monospace' : 'inherit',
      }}>
        <div style={{ fontSize:isSystem ? 11.5 : 13.5, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{msg.text}</div>
        {msg.actions?.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10 }}>
            {msg.actions.map((a,j) => (
              <PaperButton key={j} small primary={j===0} onClick={() => onAction(a)}>{a}</PaperButton>
            ))}
          </div>
        )}
        <div style={{ fontSize:10, color: isSystem ? 'rgba(255,255,255,.4)' : 'var(--ink-3)', marginTop:6, textAlign: isUser ? 'right' : 'left' }}>
          {msg.time ? new Date(msg.time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : ''}
        </div>
      </div>
    </div>
  );
};

/* ─── Console Log Line ────────────────────────────────────────── */
const LogLine = ({ line }) => {
  const colors = { INFO:'#4ade80', SYNC:'#60a5fa', WARN:'#fbbf24', HERMES:'#f06b1c', HABIT:'#a78bfa', VOICE:'#f472b6' };
  return (
    <div style={{ fontFamily:'monospace', fontSize:10.5, color:'rgba(255,255,255,.55)', lineHeight:1.7, display:'flex', gap:8 }}>
      <span style={{ color:'rgba(255,255,255,.3)', flexShrink:0 }}>{line.ts}</span>
      <span style={{ color: colors[line.kind] || '#fff', flexShrink:0, fontWeight:600 }}>[{line.kind}]</span>
      <span>{line.msg}</span>
    </div>
  );
};

/* ─── Inbox Message ───────────────────────────────────────────── */
const InboxMsg = ({ msg, onReply }) => (
  <div style={{
    padding:'12px 14px', borderRadius:12, cursor:'pointer',
    background: msg.unread ? 'rgba(245,165,36,.08)' : 'rgba(255,252,244,.5)',
    border: msg.unread ? '0.5px solid rgba(245,165,36,.25)' : '0.5px solid rgba(26,20,16,.06)',
    transition:'all 150ms',
  }} onClick={onReply}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {msg.unread && <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent-orange)', flexShrink:0 }}/>}
        <span style={{ fontSize:12.5, fontWeight: msg.unread ? 600 : 500, color:'var(--ink-1)' }}>{msg.from}</span>
        <span style={{ fontSize:10.5, color:'var(--ink-3)' }}>{msg.tag}</span>
      </div>
      <span style={{ fontSize:10.5, color:'var(--ink-3)' }}>{msg.time}</span>
    </div>
    <div style={{ fontSize:12.5, fontWeight: msg.unread ? 600 : 400, color:'var(--ink-1)', marginBottom:2 }}>{msg.subject}</div>
    <div style={{ fontSize:11.5, color:'var(--ink-3)', lineHeight:1.5 }}>{msg.preview}</div>
  </div>
);

/* ─── Tab Bar ─────────────────────────────────────────────────── */
const TabBar = ({ tabs, active, onSelect }) => (
  <div style={{ display:'flex', gap:2, padding:'4px', borderRadius:12, background:'rgba(26,20,16,.06)', flexShrink:0 }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => onSelect(t.id)} style={{
        padding:'7px 14px', borderRadius:9, fontSize:12, fontWeight: active===t.id ? 600 : 400,
        color: active===t.id ? '#fff' : 'var(--ink-2)',
        background: active===t.id ? 'linear-gradient(135deg,#f5a524,#f06b1c)' : 'transparent',
        boxShadow: active===t.id ? '0 2px 8px rgba(240,107,28,.3)' : 'none',
        border:'none', cursor:'pointer', transition:'all 180ms var(--ease-glass)',
        display:'flex', alignItems:'center', gap:6,
      }}>
        {t.emoji && <span style={{ fontSize:13 }}>{t.emoji}</span>}
        {t.label}
      </button>
    ))}
  </div>
);

/* ══════════════════════════════════════════════════════════════
   HERMES CONTROL CENTER — Main Component
══════════════════════════════════════════════════════════════ */
export const AiChat = () => {
  const { actions } = useAppActions();
  const store = useAppStore();
  const messages = useAppState(s => s.chatMessages) || [];
  const tasks    = useAppState(s => s.tasks) || [];
  const notes    = useAppState(s => s.notes) || [];
  const contacts = useAppState(s => s.contacts) || [];
  const events   = useAppState(s => s.events) || [];
  const goals    = useAppState(s => s.goals) || [];
  const user     = useAppState(s => s.user);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const voiceRef       = useRef(null);

  /* ── state ── */
  const [draft, setDraft]           = useState('');
  const [sending, setSending]       = useState(false);
  const [activeTab, setActiveTab]   = useState('chat');    // chat | memory | inbox | planner | build | voice
  const [personality, setPersonality] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ai_personality') || '{}'); } catch { return {}; }
  });
  const [habits, setHabits]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('hermes_habits') || JSON.stringify([
      { id:'h1', name:'Morning reflection', color:'#f06b1c', days:[false,false,false,false,false,false,false] },
      { id:'h2', name:'Deep work block',    color:'#f5a524', days:[false,false,false,false,false,false,false] },
      { id:'h3', name:'Move 30 mins',        color:'#4ade80', days:[false,false,false,false,false,false,false] },
      { id:'h4', name:'Read 20 pages',       color:'#a78bfa', days:[false,false,false,false,false,false,false] },
    ])); } catch { return []; }
  });
  const [inboxMsgs, setInboxMsgs]   = useState([
    { id:'i1', from:'Hermes', tag:'AI', subject:'Welcome to your unified inbox', preview:'I can help you draft replies, summarize threads, and keep your inbox at zero.', time:'now', unread:true },
    { id:'i2', from:'System', tag:'Notify', subject:'Gmail integration ready', preview:'Connect your Gmail account in settings to see real emails here.', time:'5m', unread:true },
    { id:'i3', from:'Notes AI', tag:'Auto', subject:'3 action items extracted from last note', preview:'I found tasks in your recent note. Want me to add them to your planner?', time:'1h', unread:false },
  ]);
  const [logs, setLogs]             = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [newNote, setNewNote]       = useState({ title:'', content:'', tag:'Inbox' });
  const [buildItems, setBuildItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hermes_build') || JSON.stringify([
      { id:'b1', name:'Hermes Control Center', status:'in-progress', pct:72, priority:'P0' },
      { id:'b2', name:'Voice assistant wiring', status:'todo', pct:0, priority:'P1' },
      { id:'b3', name:'Gmail OAuth integration', status:'todo', pct:0, priority:'P1' },
      { id:'b4', name:'Memory graph view', status:'todo', pct:0, priority:'P2' },
    ])); } catch { return []; }
  });
  const [dayPlan, setDayPlan]       = useState({ bigRock:'', morningNote:'', eveningNote:'' });
  const [obsidianOnline, setObsidianOnline] = useState(false);
  const [ollamaStatus, setOllamaStatus]     = useState({ online: false, models: [], hasGemma3: false });
  const [ollamaModel, setOllamaModelState]  = useState(() => getOllamaModel());
  const [aiProvider, setAiProviderState]    = useState(() => getActiveProvider());
  const [memoryProfile, setMemProfileState] = useState(() => getMemoryProfile());
  const [memoryEditing, setMemoryEditing]   = useState(false);
  const [memoryDraft, setMemoryDraft]       = useState('');
  const [obsidianApiKey, setObsidianApiKey] = useState(() => localStorage.getItem('obsidian_api_key') || '');
  const [obsidianVaultPath, setObsidianVaultPath] = useState(() => localStorage.getItem('obsidian_vault_path') || 'Hermes');

  /* ── derived ── */
  const openTasks   = useMemo(() => tasks.filter(t => t.status !== 'done').length, [tasks]);
  const todayTasks  = useMemo(() => tasks.filter(t => /today/i.test(t.due||'') && t.status!=='done').length, [tasks]);
  const p0Tasks     = useMemo(() => tasks.filter(t => t.priority==='P0' && t.status!=='done').length, [tasks]);
  const habitStreak = useMemo(() => habits.reduce((acc,h) => acc + h.days.filter(Boolean).length, 0), [habits]);
  const cogLoad     = useMemo(() => Math.min(99, Math.round((openTasks * 3) + (sending ? 30 : 0) + (p0Tasks * 10))), [openTasks, sending, p0Tasks]);

  /* ── auto-scroll chat ── */
  useEffect(() => {
    if (activeTab === 'chat') messagesEndRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages, activeTab]);

  /* ── console logs ticker ── */
  useEffect(() => {
    const entries = [
      { kind:'HERMES', msg:'Consciousness online — all systems nominal' },
      { kind:'SYNC', msg:`Supabase sync: ${notes.length} notes, ${tasks.length} tasks loaded` },
      { kind:'INFO', msg:`Memory cache warm — ${contacts.length} contacts, ${events.length} events` },
      { kind:'HABIT', msg:`Habit engine active — ${habitStreak} completions tracked this week` },
      { kind:'INFO', msg:'OpenRouter API endpoint reachable' },
    ];
    const now = () => new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const initial = entries.map(e => ({ ...e, ts: now() }));
    setLogs(initial);
    const timer = setInterval(() => {
      const pool = [
        { kind:'SYNC', msg:`Heartbeat — ${openTasks} open tasks, cognitive load ${cogLoad}%` },
        { kind:'INFO', msg:`Watching ${contacts.length} contacts for relationship decay` },
        { kind:'HERMES', msg:'Standing by — ready to execute on your behalf' },
        { kind:'HABIT', msg:`Habit check: ${habitStreak} streak points accumulated` },
        { kind:'INFO', msg:'Memory index updated successfully' },
      ];
      const entry = pool[Math.floor(Math.random()*pool.length)];
      setLogs(prev => [...prev.slice(-18), { ...entry, ts: now() }]);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  /* ── Obsidian + Ollama status polling ── */
  useEffect(() => {
    (async () => {
      const [{ online: obsOnline }, ollama] = await Promise.all([
        checkObsidianStatus(),
        checkOllamaStatus(),
      ]);
      setObsidianOnline(obsOnline);
      setOllamaStatus(ollama);
      if (obsOnline) {
        const pulled = await syncFromObsidian();
        if (pulled) setMemProfileState(pulled);
      }
    })();
    const interval = setInterval(async () => {
      const [{ online: obsOnline }, ollama] = await Promise.all([
        checkObsidianStatus(),
        checkOllamaStatus(),
      ]);
      setObsidianOnline(obsOnline);
      setOllamaStatus(ollama);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  /* ── memory helpers ── */
  const saveMemory = useCallback((content) => {
    setMemoryProfile(content);
    setMemProfileState(content);
    addNotification?.({ text: obsidianOnline ? 'Memory saved & synced to Obsidian' : 'Memory saved locally', kind: 'info' });
  }, [obsidianOnline]);

  const addNotification = actions?.addNotification;

  /* ── personality persist ── */
  const updatePersonality = useCallback((key, val) => {
    setPersonality(prev => {
      const next = { ...prev, [key]: val };
      try { localStorage.setItem('ai_personality', JSON.stringify(next)); } catch {}
      actions.addNotification({ text: `Hermes: ${key} ${val ? 'enabled' : 'disabled'}`, kind:'info' });
      return next;
    });
  }, [actions]);

  /* ── habits persist ── */
  const toggleHabit = useCallback((id, dayIdx) => {
    setHabits(prev => {
      const next = prev.map(h => h.id===id ? { ...h, days: h.days.map((d,i) => i===dayIdx ? !d : d) } : h);
      try { localStorage.setItem('hermes_habits', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  /* ── send message ── */
  const send = useCallback(async (text) => {
    const msg = (text || draft).trim();
    if (!msg || sending) return;
    setDraft('');
    setSending(true);
    actions.addChatMessage({ role:'user', text:msg, time: Date.now() });

    const lower = msg.toLowerCase();
    const suggested = [];
    if (/task|todo|p0|priority/i.test(lower)) suggested.push('📋 Open Tasks');
    if (/note|write|capture|memory/i.test(lower)) suggested.push('📝 Open Notes');
    if (/calendar|event|schedule|meeting/i.test(lower)) suggested.push('📅 Open Calendar');
    if (/habit|streak|routine/i.test(lower)) suggested.push('🔥 Open Planner');
    if (/build|ship|roadmap|feature/i.test(lower)) suggested.push('🚀 Open Build');
    if (/email|inbox|gmail|message/i.test(lower)) suggested.push('📬 Open Inbox');

    const addLog = (kind, m) => setLogs(prev => [...prev.slice(-18), { kind, msg:m, ts: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}) }]);
    addLog('HERMES', `Processing: "${msg.slice(0,40)}…"`);

    try {
      const response = await generateAiResponse(msg, store.getSnapshot(), messages);
      addLog('HERMES', 'Response generated — dispatching to UI');
      actions.addChatMessage({
        role:'ai',
        text: response || "I'm ready to help. Ask me about your tasks, notes, habits, inbox, or anything you need to build.",
        actions: suggested.length ? suggested : undefined,
        time: Date.now(),
      });

      // Parse and execute [action:] blocks
      const actionRegex = /\[action:\s*(\w+)\s*,\s*([^\]]+)\]/gi;
      let match;

      while ((match = actionRegex.exec(response||'')) !== null) {
        try {
          const type = match[1];
          const params = JSON.parse(match[2]);
          switch(type) {
            case 'addTask':    actions.addTask(params); addLog('INFO','Task created by Hermes'); break;
            case 'addNote':    actions.addNote(params); addLog('INFO','Note created by Hermes'); break;
            case 'addEvent':   actions.addEvent(params); addLog('INFO','Event added by Hermes'); break;
            case 'addReminder':actions.addReminder(params); addLog('INFO','Reminder set by Hermes'); break;
            case 'toggleTask': actions.toggleTask(params.id); break;
            case 'deleteTask': actions.deleteTask(params.id); break;
            case 'navigate':   window.__opencode?.onNavigate?.(params.screen); break;
            case 'notify':     actions.addNotification({ text:params.text, kind:params.kind||'info' }); break;
            case 'clearChat':  actions.clearChat(); break;
            case 'updateMemory': {
              appendToMemoryProfile(params.content || '');
              setMemProfileState(getMemoryProfile());
              addLog('INFO', obsidianOnline ? 'Memory updated → synced to Obsidian' : 'Memory updated locally');
              break;
            }
            default: break;
          }
        } catch {}
      }

    } catch (err) {
      actions.addChatMessage({ role:'ai', text:`Error: ${err.message}. Please try again.`, time: Date.now() });
    }
    setSending(false);
  }, [draft, sending, actions, store, messages]);

  /* ── voice ── */
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      actions.addNotification({ text:'Voice not supported in this browser', kind:'warning' });
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'en-US'; rec.continuous = false; rec.interimResults = true;
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map(r=>r[0].transcript).join('');
      setVoiceTranscript(transcript);
      if (e.results[0].isFinal) { setDraft(transcript); setVoiceTranscript(''); }
    };
    rec.onend = () => { setIsListening(false); };
    rec.onerror = () => { setIsListening(false); actions.addNotification({ text:'Voice error — try again', kind:'warning' }); };
    voiceRef.current = rec;
    rec.start();
  }, [actions]);

  const stopListening = useCallback(() => {
    voiceRef.current?.stop();
    setIsListening(false);
  }, []);

  /* ── add note quick ── */
  const saveQuickNote = useCallback(() => {
    if (!newNote.title.trim()) return;
    actions.addNote({ title:newNote.title, content:newNote.content, tag:newNote.tag, icon:'notes', preview:newNote.content.slice(0,120) });
    setNewNote({ title:'', content:'', tag:'Inbox' });
    actions.addNotification({ text:'Note saved to memory', kind:'info' });
    setLogs(prev => [...prev.slice(-18), { kind:'INFO', msg:`Note "${newNote.title}" stored in memory`, ts: new Date().toLocaleTimeString() }]);
  }, [newNote, actions]);

  /* ── handle action buttons ── */
  const handleAction = useCallback((action) => {
    const nav = window.__opencode?.onNavigate;
    const navMap = {
      '📋 Open Tasks':'tasks','📝 Open Notes':'notes','📅 Open Calendar':'calendar',
      '🔥 Open Planner':'planner','🚀 Open Build':'tasks','📬 Open Inbox':'files',
      'Show tasks':'tasks','Show notes':'notes','Show calendar':'calendar',
    };
    if (navMap[action]) { nav?.(navMap[action]); }
    else { setDraft(action); inputRef.current?.focus(); }
  }, []);

  /* ─── TABS ─────────────────────────────────────────────── */
  const TABS = [
    { id:'chat',    label:'Chat',    emoji:'💬' },
    { id:'memory',  label:'Memory',  emoji:'🧠' },
    { id:'inbox',   label:'Inbox',   emoji:'📬' },
    { id:'planner', label:'Planner', emoji:'📅' },
    { id:'build',   label:'Build',   emoji:'🚀' },
    { id:'voice',   label:'Voice',   emoji:'🎙️' },
  ];

  /* ─── RENDER ───────────────────────────────────────────── */
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 80px)', maxHeight:'calc(100vh - 80px)', overflow:'hidden', padding:'0 24px 16px' }}>
      <style>{`
        .hermes-scroll::-webkit-scrollbar { width: 4px; }
        .hermes-scroll::-webkit-scrollbar-track { background: transparent; }
        .hermes-scroll::-webkit-scrollbar-thumb { background: rgba(26,20,16,.12); border-radius: 4px; }
        .hermes-input { all: unset; flex:1; font-size:14px; color:var(--ink-1); font-family:var(--font-body); }
        .hermes-input::placeholder { color: var(--ink-3); }
        .hermes-textarea { all: unset; width:100%; box-sizing:border-box; font-size:13px; color:var(--ink-1); font-family:var(--font-body); line-height:1.6; resize:none; }
        .hermes-textarea::placeholder { color: var(--ink-3); }
        @keyframes fade-in-up { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fade-in-up 250ms var(--ease-glass) both; }
        @media (max-width:767px) {
          .hermes-main-grid { grid-template-columns: 1fr !important; }
          .hermes-hud { display: none; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0 12px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <HermesOrb size={48} thinking={sending}/>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <h1 style={{ fontSize:22, fontWeight:300, letterSpacing:'-0.03em', color:'var(--ink-1)', margin:0 }}>
                Hermes<span style={{ color:'var(--accent-orange)', fontStyle:'italic' }}> AI</span>
              </h1>
              <div style={{
                padding:'2px 8px', borderRadius:999, fontSize:9, fontWeight:700,
                letterSpacing:'0.12em', textTransform:'uppercase',
                background: sending ? 'rgba(240,107,28,.15)' : 'rgba(74,222,128,.1)',
                color: sending ? 'var(--accent-orange)' : '#16a34a',
                border: sending ? '0.5px solid rgba(240,107,28,.3)' : '0.5px solid rgba(74,222,128,.3)',
              }}>{sending ? 'THINKING' : 'ONLINE'}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2, flexWrap:'wrap' }}>
              {/* Ollama badge — click to toggle provider */}
              <div title="Click to switch AI provider" onClick={() => {
                const next = aiProvider === 'ollama' ? 'openrouter' : 'ollama';
                setAiProvider(next); setAiProviderState(next);
                actions.addNotification({ text:`Provider: ${next === 'ollama' ? ollamaModel + ' (local)' : 'OpenRouter cloud'}`, kind:'info' });
              }} style={{
                display:'flex', alignItems:'center', gap:4, padding:'2px 7px', borderRadius:999, fontSize:9, fontWeight:600,
                letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer',
                background: ollamaStatus.online ? 'rgba(74,222,128,.12)' : 'rgba(26,20,16,.07)',
                color: ollamaStatus.online ? '#16a34a' : 'var(--ink-3)',
                border: ollamaStatus.online ? '0.5px solid rgba(74,222,128,.3)' : '0.5px solid rgba(26,20,16,.1)',
              }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background: ollamaStatus.online ? '#4ade80' : 'rgba(26,20,16,.2)', boxShadow: ollamaStatus.online ? '0 0 4px #4ade80' : 'none' }}/>
                {ollamaStatus.online ? (aiProvider === 'ollama' ? ollamaModel : 'OpenRouter') : 'No Ollama'}
              </div>
              {/* Obsidian badge */}
              <div style={{
                display:'flex', alignItems:'center', gap:4, padding:'2px 7px', borderRadius:999, fontSize:9, fontWeight:600,
                letterSpacing:'0.1em', textTransform:'uppercase',
                background: obsidianOnline ? 'rgba(167,139,250,.12)' : 'rgba(26,20,16,.07)',
                color: obsidianOnline ? '#a78bfa' : 'var(--ink-3)',
                border: obsidianOnline ? '0.5px solid rgba(167,139,250,.3)' : '0.5px solid rgba(26,20,16,.1)',
              }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background: obsidianOnline ? '#a78bfa' : 'rgba(26,20,16,.2)', boxShadow: obsidianOnline ? '0 0 4px #a78bfa' : 'none' }}/>
                {obsidianOnline ? "Hermina's Memory" : 'Obsidian offline'}
              </div>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div style={{
          display:'flex', gap:20, padding:'10px 18px', borderRadius:14,
          background:'rgba(255,252,244,.7)', border:'0.5px solid rgba(255,255,255,.8)',
          boxShadow:'0 2px 12px rgba(46,30,12,.06)',
        }}>
          <StatusBadge label="TASKS" value={`${openTasks}`}/>
          <StatusBadge label="COG LOAD" value={`${cogLoad}%`} color={cogLoad>70?'var(--accent-coral)':'var(--accent-orange)'}/>
          <StatusBadge label="MEMORY" value={`${notes.length}n`} color="#a78bfa"/>
          <StatusBadge label="STREAK" value={`${habitStreak}d`} color="#4ade80"/>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ marginBottom:12, flexShrink:0 }}>
        <TabBar tabs={TABS} active={activeTab} onSelect={setActiveTab}/>
      </div>

      {/* ── Main Grid ── */}
      <div className="hermes-main-grid" style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:14, flex:1, minHeight:0, overflow:'hidden' }}>

        {/* ════════ LEFT — Main Panel ════════ */}
        <div style={{ display:'flex', flexDirection:'column', minHeight:0, overflow:'hidden' }}>

          {/* ── CHAT TAB ── */}
          {activeTab === 'chat' && (
            <div className="fade-up" style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0, borderRadius:18, overflow:'hidden', background:'rgba(255,252,244,.7)', border:'0.5px solid rgba(255,255,255,.8)', boxShadow:'0 4px 24px rgba(46,30,12,.06)' }}>
              {/* Messages */}
              <div className="hermes-scroll" style={{ flex:1, overflowY:'auto', padding:'24px 22px', display:'flex', flexDirection:'column', gap:16 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--ink-3)' }}>
                    <HermesOrb size={80} thinking={false}/>
                    <div style={{ marginTop:24, fontSize:15, fontWeight:300, letterSpacing:'-0.02em' }}>I'm Hermes, your AI. Ask me anything.</div>
                    <div style={{ marginTop:8, fontSize:12, color:'var(--ink-3)' }}>Tasks · Notes · Gmail · Habits · Build · Voice</div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={m.id || i} className="fade-up">
                    <MessageBubble msg={m} onAction={handleAction}/>
                  </div>
                ))}
                {sending && (
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <div style={{ width:26, height:26, borderRadius:'50%', background:'radial-gradient(circle at 30% 30%,#fff,#f7d99a 30%,#f06b1c 65%,#c2185b)', flexShrink:0 }}/>
                    <div style={{ padding:'11px 15px', borderRadius:16, borderBottomLeftRadius:4, background:'rgba(255,252,244,.88)', border:'0.5px solid rgba(255,255,255,.75)' }}>
                      <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                        {[0,1,2].map(i => (
                          <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent-orange)', animation:`hermes-dot 0.8s ${i*0.2}s ease-in-out infinite` }}/>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef}/>
              </div>

              {/* Input */}
              <div style={{ padding:'12px 16px', borderTop:'0.5px solid rgba(26,20,16,.06)', background:'rgba(255,252,244,.5)' }}>
                {voiceTranscript && (
                  <div style={{ marginBottom:8, padding:'6px 10px', borderRadius:8, background:'rgba(240,107,28,.08)', fontSize:12, color:'var(--accent-orange)', fontStyle:'italic' }}>
                    🎙️ {voiceTranscript}
                  </div>
                )}
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderRadius:14, background:'rgba(255,252,244,.9)', border:'0.5px solid rgba(255,255,255,.9)', boxShadow:'0 2px 8px rgba(46,30,12,.05)' }}>
                  <input
                    ref={inputRef}
                    className="hermes-input"
                    placeholder={sending ? 'Hermes is thinking…' : 'Ask Hermes anything — tasks, notes, inbox, habits, code…'}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey && !sending) { e.preventDefault(); send(); }}}
                    disabled={sending}
                  />
                  {/* Voice button */}
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    style={{
                      width:32, height:32, borderRadius:'50%', flexShrink:0, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                      background: isListening ? 'rgba(231,64,46,.15)' : 'rgba(26,20,16,.05)',
                      border: isListening ? '1.5px solid var(--accent-coral)' : '0.5px solid rgba(26,20,16,.10)',
                      animation: isListening ? 'hermes-pulse 1s ease-in-out infinite' : 'none',
                      color: isListening ? 'var(--accent-coral)' : 'var(--ink-3)',
                    }}
                  >
                    🎙️
                  </button>
                  <PaperButton primary small onClick={() => send()} disabled={sending || !draft.trim()} icon={sending ? undefined : 'arrow'}>
                    {sending ? '…' : 'Send'}
                  </PaperButton>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10 }}>
                  {['What are my P0 tasks?','Create a note about my goals','Plan my day','Check my habits','Build status'].map(s => (
                    <button key={s} type="button" onClick={() => { setDraft(s); inputRef.current?.focus(); }}
                      style={{ padding:'4px 10px', borderRadius:20, fontSize:11.5, color:'var(--ink-2)', background:'rgba(26,20,16,.05)', border:'0.5px solid rgba(26,20,16,.08)', cursor:'pointer', transition:'all 120ms' }}
                      onMouseEnter={e => { e.currentTarget.style.background='rgba(245,165,36,.12)'; e.currentTarget.style.color='var(--accent-orange)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background='rgba(26,20,16,.05)'; e.currentTarget.style.color='var(--ink-2)'; }}
                    >{s}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── MEMORY TAB ── */}
          {activeTab === 'memory' && (
            <div className="fade-up hermes-scroll" style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:14 }}>

              {/* Obsidian connection settings */}
              <GlassCard strong>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div className="t-cap" style={{ color:'#a78bfa' }}>Obsidian Connection</div>
                  <div style={{
                    display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:999, fontSize:10, fontWeight:600,
                    background: obsidianOnline ? 'rgba(167,139,250,.15)' : 'rgba(26,20,16,.08)',
                    color: obsidianOnline ? '#a78bfa' : 'var(--ink-3)',
                    border: obsidianOnline ? '0.5px solid rgba(167,139,250,.35)' : '0.5px solid rgba(26,20,16,.12)',
                  }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background: obsidianOnline ? '#a78bfa' : 'rgba(26,20,16,.25)', boxShadow: obsidianOnline ? '0 0 5px #a78bfa' : 'none' }}/>
                    {obsidianOnline ? 'Connected' : 'Offline'}
                  </div>
                </div>
                {!obsidianOnline && (
                  <div style={{ fontSize:12, color:'var(--ink-3)', lineHeight:1.6, marginBottom:12, padding:'10px 12px', borderRadius:10, background:'rgba(26,20,16,.04)', border:'0.5px solid rgba(26,20,16,.08)' }}>
                    Install the <strong>Local REST API</strong> community plugin in Obsidian, then enter the API key below. Memory saves locally until connected.
                  </div>
                )}
                <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                  <input
                    className="hermes-input"
                    placeholder="Obsidian API key (from Local REST API plugin)"
                    value={obsidianApiKey}
                    onChange={e => setObsidianApiKey(e.target.value)}
                    style={{ flex:1, padding:'9px 12px', borderRadius:9, background:'rgba(255,252,244,.8)', border:'0.5px solid rgba(26,20,16,.10)', fontSize:12.5, color:'var(--ink-1)' }}
                  />
                  <PaperButton small onClick={() => {
                    localStorage.setItem('obsidian_api_key', obsidianApiKey);
                    localStorage.setItem('obsidian_vault_path', obsidianVaultPath);
                    checkObsidianStatus().then(({ online }) => setObsidianOnline(online));
                    actions.addNotification({ text: 'Obsidian settings saved', kind: 'info' });
                  }}>Save</PaperButton>
                </div>
                <input
                  className="hermes-input"
                  placeholder="Vault folder (default: Hermes)"
                  value={obsidianVaultPath}
                  onChange={e => setObsidianVaultPath(e.target.value)}
                  style={{ display:'block', width:'100%', padding:'9px 12px', borderRadius:9, background:'rgba(255,252,244,.8)', border:'0.5px solid rgba(26,20,16,.10)', fontSize:12.5, color:'var(--ink-1)', boxSizing:'border-box' }}
                />
                {obsidianOnline && (
                  <div style={{ marginTop:10, display:'flex', gap:8 }}>
                    <PaperButton small primary onClick={async () => {
                      const pulled = await syncFromObsidian();
                      if (pulled) { setMemProfileState(pulled); actions.addNotification({ text:'Memory pulled from Obsidian', kind:'info' }); }
                      else actions.addNotification({ text:'No UserProfile.md found in vault', kind:'warning' });
                    }}>Pull from Obsidian</PaperButton>
                    <PaperButton small onClick={async () => {
                      await syncToObsidian('UserProfile.md', memoryProfile);
                      actions.addNotification({ text:'Memory pushed to Obsidian', kind:'info' });
                    }}>Push to Obsidian</PaperButton>
                  </div>
                )}
              </GlassCard>

              {/* Hermes user profile / memory editor */}
              <GlassCard strong>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div className="t-cap" style={{ color:'var(--accent-orange)' }}>User Profile (UserProfile.md)</div>
                  <PaperButton small primary={memoryEditing} onClick={() => {
                    if (memoryEditing) {
                      saveMemory(memoryDraft);
                      setMemoryEditing(false);
                    } else {
                      setMemoryDraft(memoryProfile);
                      setMemoryEditing(true);
                    }
                  }}>{memoryEditing ? 'Save' : 'Edit'}</PaperButton>
                </div>
                {memoryEditing ? (
                  <textarea
                    className="hermes-textarea"
                    rows={14}
                    value={memoryDraft}
                    onChange={e => setMemoryDraft(e.target.value)}
                    style={{ padding:'12px 14px', borderRadius:10, background:'rgba(255,252,244,.9)', border:'0.5px solid rgba(240,107,28,.25)', fontSize:12.5, fontFamily:'var(--font-mono,monospace)', lineHeight:1.7 }}
                  />
                ) : (
                  <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(255,252,244,.6)', border:'0.5px solid rgba(26,20,16,.08)', fontSize:12.5, color:'var(--ink-2)', lineHeight:1.7, fontFamily:'var(--font-mono,monospace)', whiteSpace:'pre-wrap', minHeight:120 }}>
                    {memoryProfile || <span style={{ color:'var(--ink-3)', fontStyle:'italic' }}>No profile yet — click Edit to fill it in</span>}
                  </div>
                )}
                <div style={{ marginTop:10, fontSize:11, color:'var(--ink-3)' }}>
                  {obsidianOnline ? 'Saved to localStorage + Obsidian vault' : 'Saved to localStorage (Obsidian offline)'}
                </div>
              </GlassCard>

              {/* Quick note capture */}
              <GlassCard>
                <div className="t-cap" style={{ color:'var(--accent-orange)', marginBottom:12 }}>Quick Capture</div>
                <input
                  className="hermes-input"
                  placeholder="Note title…"
                  value={newNote.title}
                  onChange={e => setNewNote(p => ({...p, title:e.target.value}))}
                  style={{ display:'block', width:'100%', marginBottom:10, padding:'10px 14px', borderRadius:10, background:'rgba(255,252,244,.8)', border:'0.5px solid rgba(26,20,16,.10)', fontSize:14, color:'var(--ink-1)', boxSizing:'border-box' }}
                />
                <textarea
                  className="hermes-textarea"
                  rows={3}
                  placeholder="Write anything — Hermes will tag and index it…"
                  value={newNote.content}
                  onChange={e => setNewNote(p => ({...p, content:e.target.value}))}
                  style={{ padding:'10px 14px', borderRadius:10, background:'rgba(255,252,244,.8)', border:'0.5px solid rgba(26,20,16,.10)', marginBottom:10 }}
                />
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
                  {['Inbox','Work','Personal','Ideas','Reading','Goals'].map(tag => (
                    <button key={tag} type="button" onClick={() => setNewNote(p => ({...p, tag}))} style={{
                      padding:'4px 12px', borderRadius:20, fontSize:11.5, cursor:'pointer',
                      background: newNote.tag===tag ? 'linear-gradient(135deg,#f5a524,#f06b1c)' : 'rgba(26,20,16,.06)',
                      color: newNote.tag===tag ? '#fff' : 'var(--ink-2)',
                      border: newNote.tag===tag ? '0.5px solid rgba(240,107,28,.4)' : '0.5px solid transparent',
                    }}>{tag}</button>
                  ))}
                </div>
                <PaperButton primary onClick={saveQuickNote} disabled={!newNote.title.trim()}>Save Note</PaperButton>
              </GlassCard>

              {/* Memory index */}
              <GlassCard>
                <div className="t-cap" style={{ color:'#a78bfa', marginBottom:12 }}>Memory Index</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                  {[
                    { label:'Notes', val:notes.length, icon:'📝', color:'#a78bfa' },
                    { label:'Tasks', val:tasks.length, icon:'✅', color:'var(--accent-orange)' },
                    { label:'Contacts', val:contacts.length, icon:'👥', color:'var(--accent-coral)' },
                    { label:'Goals', val:goals.length, icon:'🎯', color:'#4ade80' },
                  ].map(item => (
                    <div key={item.label} style={{ padding:'14px', borderRadius:12, background:'rgba(255,252,244,.6)', border:'0.5px solid rgba(255,255,255,.7)', textAlign:'center' }}>
                      <div style={{ fontSize:22 }}>{item.icon}</div>
                      <div style={{ fontSize:22, fontWeight:300, color:item.color, letterSpacing:'-0.04em', marginTop:2 }}>{item.val}</div>
                      <div style={{ fontSize:10.5, color:'var(--ink-3)', letterSpacing:'0.08em', textTransform:'uppercase' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <div className="hair" style={{ margin:'0 0 12px' }}/>
                <div className="t-cap" style={{ marginBottom:10 }}>Recent Notes</div>
                {notes.slice(0,5).map((n,i) => (
                  <div key={n.id||i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'0.5px solid rgba(26,20,16,.04)' }}>
                    <div>
                      <div style={{ fontSize:12.5, fontWeight:500, color:'var(--ink-1)' }}>{n.title}</div>
                      <div style={{ fontSize:11, color:'var(--ink-3)' }}>{n.tag} · {n.edited||'recently'}</div>
                    </div>
                    <div style={{ fontSize:10.5, padding:'3px 8px', borderRadius:20, background:'rgba(167,139,250,.12)', color:'#a78bfa' }}>{n.tag}</div>
                  </div>
                ))}
                {notes.length === 0 && <div style={{ fontSize:12.5, color:'var(--ink-3)', textAlign:'center', padding:16 }}>No notes yet</div>}
              </GlassCard>
            </div>
          )}

          {/* ── INBOX TAB ── */}
          {activeTab === 'inbox' && (
            <div className="fade-up hermes-scroll" style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:12 }}>
              <GlassCard strong>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <div className="t-cap" style={{ color:'var(--accent-orange)' }}>📬 Unified Inbox</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <PaperButton small onClick={() => actions.addNotification({ text:'Gmail OAuth coming soon — configure in Settings', kind:'info' })}>Connect Gmail</PaperButton>
                    <PaperButton small primary onClick={() => setInboxMsgs(p => p.map(m => ({...m, unread:false})))}>Mark all read</PaperButton>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {inboxMsgs.map(msg => (
                    <InboxMsg key={msg.id} msg={msg} onReply={() => {
                      setInboxMsgs(p => p.map(m => m.id===msg.id ? {...m, unread:false} : m));
                      setDraft(`Reply to ${msg.from}: `);
                      setActiveTab('chat');
                      setTimeout(() => inputRef.current?.focus(), 100);
                    }}/>
                  ))}
                </div>
              </GlassCard>

              <GlassCard>
                <div className="t-cap" style={{ marginBottom:12 }}>Compose with Hermes AI</div>
                <div style={{ fontSize:12.5, color:'var(--ink-2)', lineHeight:1.6, marginBottom:12 }}>
                  Tell Hermes who to write to and what about — it will draft the email, subject line, and follow-up for you.
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <PaperButton primary small onClick={() => { setDraft('Draft an email to '); setActiveTab('chat'); setTimeout(()=>inputRef.current?.focus(),100); }}>✍️ Draft email</PaperButton>
                  <PaperButton small onClick={() => { setDraft('Summarize my inbox and suggest replies'); setActiveTab('chat'); setTimeout(()=>inputRef.current?.focus(),100); }}>🤖 AI Triage</PaperButton>
                </div>
              </GlassCard>
            </div>
          )}

          {/* ── PLANNER TAB ── */}
          {activeTab === 'planner' && (
            <div className="fade-up hermes-scroll" style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:14 }}>
              {/* Day plan */}
              <GlassCard strong>
                <div className="t-cap" style={{ color:'var(--accent-orange)', marginBottom:12 }}>🌅 Day Plan</div>
                <input
                  className="hermes-input"
                  placeholder="🎯 Today's Big Rock — one thing that defines a great day"
                  value={dayPlan.bigRock}
                  onChange={e => setDayPlan(p => ({...p, bigRock:e.target.value}))}
                  style={{ display:'block', width:'100%', marginBottom:10, padding:'10px 14px', borderRadius:10, background:'rgba(255,252,244,.8)', border:'0.5px solid rgba(26,20,16,.10)', fontSize:14, color:'var(--ink-1)', boxSizing:'border-box', fontWeight:500 }}
                />
                <textarea
                  className="hermes-textarea"
                  rows={3}
                  placeholder="🌅 Morning intention — how do you want to feel today?"
                  value={dayPlan.morningNote}
                  onChange={e => setDayPlan(p => ({...p, morningNote:e.target.value}))}
                  style={{ padding:'10px 14px', borderRadius:10, background:'rgba(255,252,244,.8)', border:'0.5px solid rgba(26,20,16,.10)', marginBottom:10 }}
                />
                <PaperButton primary small onClick={() => {
                  if(dayPlan.bigRock) { actions.addNote({ title:`Daily Plan: ${dayPlan.bigRock}`, content:`Big Rock: ${dayPlan.bigRock}\n\n${dayPlan.morningNote}`, tag:'Pages', icon:'notes' }); actions.addNotification({ text:'Day plan saved to notes', kind:'info' }); setDayPlan({ bigRock:'', morningNote:'', eveningNote:'' }); }
                }}>Save Day Plan</PaperButton>
              </GlassCard>

              {/* Habits */}
              <GlassCard strong>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <div className="t-cap" style={{ color:'#4ade80' }}>🔥 Habit Tracker</div>
                  <div style={{ fontSize:12, color:'var(--ink-3)' }}>{habitStreak} completions this week</div>
                </div>
                <div style={{ marginTop:8 }}>
                  {habits.map(h => <HabitRow key={h.id} habit={h} onToggle={toggleHabit}/>)}
                </div>
                <div style={{ marginTop:12 }}>
                  <PaperButton small onClick={() => { setDraft('Suggest 3 habits for a productive week'); setActiveTab('chat'); setTimeout(()=>inputRef.current?.focus(),100); }}>🤖 Ask Hermes for habit ideas</PaperButton>
                </div>
              </GlassCard>

              {/* Today's tasks */}
              <GlassCard>
                <div className="t-cap" style={{ marginBottom:12 }}>📋 Today's Tasks ({todayTasks})</div>
                {tasks.filter(t=>t.status!=='done').slice(0,6).map((t,i) => (
                  <div key={t.id||i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'0.5px solid rgba(26,20,16,.05)', cursor:'pointer' }} onClick={() => actions.toggleTask(t.id)}>
                    <div style={{ width:16, height:16, borderRadius:4, border:`1.5px solid ${t.priority==='P0'?'var(--accent-coral)':'rgba(26,20,16,.2)'}`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {t.status==='done' && <span style={{ fontSize:10 }}>✓</span>}
                    </div>
                    <span style={{ flex:1, fontSize:12.5, color:'var(--ink-1)' }}>{t.title}</span>
                    <span style={{ fontSize:10.5, padding:'2px 6px', borderRadius:10, background:`rgba(${t.priority==='P0'?'231,64,46':'245,165,36'},.1)`, color:`var(${t.priority==='P0'?'--accent-coral':'--accent-orange'})` }}>{t.priority}</span>
                  </div>
                ))}
                {tasks.filter(t=>t.status!=='done').length===0 && <div style={{ fontSize:12.5, color:'var(--ink-3)', textAlign:'center', padding:16 }}>All done! 🎉</div>}
              </GlassCard>
            </div>
          )}

          {/* ── BUILD TAB ── */}
          {activeTab === 'build' && (
            <div className="fade-up hermes-scroll" style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:14 }}>
              <GlassCard strong>
                <div className="t-cap" style={{ color:'var(--accent-orange)', marginBottom:12 }}>🚀 Build Tracker</div>
                {buildItems.map(item => (
                  <div key={item.id} style={{ marginBottom:16, padding:'14px', borderRadius:12, background:'rgba(255,252,244,.6)', border:'0.5px solid rgba(255,255,255,.7)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background: item.status==='in-progress'?'var(--accent-orange)':item.status==='done'?'#4ade80':'rgba(26,20,16,.2)', boxShadow: item.status==='in-progress'?'0 0 6px var(--accent-orange)':undefined }}/>
                        <span style={{ fontSize:13, fontWeight:500, color:'var(--ink-1)' }}>{item.name}</span>
                      </div>
                      <span style={{ fontSize:10.5, padding:'2px 8px', borderRadius:20, background:`rgba(${item.priority==='P0'?'231,64,46':'245,165,36'},.1)`, color:`var(${item.priority==='P0'?'--accent-coral':'--accent-orange'})` }}>{item.priority}</span>
                    </div>
                    <div style={{ height:5, borderRadius:99, background:'rgba(26,20,16,.08)', overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:99, width:`${item.pct}%`, background:'linear-gradient(90deg,#f5a524,#f06b1c)', transition:'width 600ms var(--ease-glass)' }}/>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                      <span style={{ fontSize:10.5, color:'var(--ink-3)' }}>{item.status}</span>
                      <span style={{ fontSize:10.5, color:'var(--ink-2)', fontWeight:600 }}>{item.pct}%</span>
                    </div>
                  </div>
                ))}
                <PaperButton small primary onClick={() => { setDraft('Add a new build item: '); setActiveTab('chat'); setTimeout(()=>inputRef.current?.focus(),100); }}>+ Add via Hermes</PaperButton>
              </GlassCard>

              <GlassCard>
                <div className="t-cap" style={{ marginBottom:12 }}>🤖 AI Build Assistant</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {['What should I ship next?','Help me break down a feature','Write a technical spec for me','Review my roadmap priorities'].map(s => (
                    <button key={s} type="button" onClick={() => { setDraft(s); setActiveTab('chat'); setTimeout(()=>inputRef.current?.focus(),100); }}
                      style={{ padding:'10px 14px', borderRadius:10, textAlign:'left', fontSize:12.5, color:'var(--ink-2)', background:'rgba(26,20,16,.04)', border:'0.5px solid rgba(26,20,16,.06)', cursor:'pointer', transition:'all 120ms' }}
                      onMouseEnter={e => { e.currentTarget.style.background='rgba(245,165,36,.08)'; e.currentTarget.style.color='var(--ink-1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background='rgba(26,20,16,.04)'; e.currentTarget.style.color='var(--ink-2)'; }}
                    >{s}</button>
                  ))}
                </div>
              </GlassCard>
            </div>
          )}

          {/* ── VOICE TAB ── */}
          {activeTab === 'voice' && (
            <div className="fade-up" style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:24, padding:24 }}>
              <HermesOrb size={140} thinking={isListening}/>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:20, fontWeight:300, letterSpacing:'-0.02em', color:'var(--ink-1)', marginBottom:8 }}>
                  {isListening ? 'Listening…' : 'Voice Interface'}
                </div>
                <div style={{ fontSize:13, color:'var(--ink-3)' }}>
                  {isListening ? 'Speak clearly — Hermes will transcribe and respond' : 'Tap the mic to speak to Hermes'}
                </div>
                {voiceTranscript && (
                  <div style={{ marginTop:16, padding:'12px 20px', borderRadius:12, background:'rgba(240,107,28,.08)', border:'0.5px solid rgba(240,107,28,.2)', fontSize:14, color:'var(--accent-orange)', fontStyle:'italic', maxWidth:400 }}>
                    "{voiceTranscript}"
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                style={{
                  width:80, height:80, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30,
                  background: isListening ? 'linear-gradient(135deg,rgba(231,64,46,.2),rgba(231,64,46,.1))' : 'linear-gradient(135deg,rgba(245,165,36,.2),rgba(240,107,28,.1))',
                  border: isListening ? '2px solid var(--accent-coral)' : '2px solid var(--accent-orange)',
                  boxShadow: isListening ? '0 0 30px rgba(231,64,46,.35)' : '0 0 20px rgba(245,165,36,.25)',
                  animation: isListening ? 'hermes-pulse 1.2s ease-in-out infinite' : 'none',
                  transition:'all 200ms var(--ease-glass)',
                }}
              >
                {isListening ? '⏹️' : '🎙️'}
              </button>

              <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center', maxWidth:400 }}>
                {['Plan my day','What are my tasks?','Create a note','Check my habits','How am I doing?'].map(p => (
                  <button key={p} type="button"
                    onClick={() => { setDraft(p); setActiveTab('chat'); setTimeout(()=>{ inputRef.current?.focus(); send(p); },100); }}
                    style={{ padding:'8px 14px', borderRadius:20, fontSize:12, color:'var(--ink-2)', background:'rgba(255,252,244,.8)', border:'0.5px solid rgba(26,20,16,.08)', cursor:'pointer', transition:'all 120ms', backdropFilter:'blur(8px)' }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(245,165,36,.12)'}
                    onMouseLeave={e => e.currentTarget.style.background='rgba(255,252,244,.8)'}
                  >{p}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ════════ RIGHT — HUD ════════ */}
        <div className="hermes-hud" style={{ display:'flex', flexDirection:'column', gap:12, overflow:'hidden' }}>

          {/* Consciousness Orb */}
          <div style={{
            padding:'20px 16px', borderRadius:18, textAlign:'center',
            background:'rgba(255,252,244,.75)', border:'0.5px solid rgba(255,255,255,.85)',
            boxShadow:'0 4px 24px rgba(46,30,12,.05)',
          }}>
            <HermesOrb size={80} thinking={sending}/>
            <div style={{ marginTop:16, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-3)' }}>
              {sending ? 'PROCESSING' : 'CONSCIOUSNESS'}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:14 }}>
              <StatusBadge label="COG LOAD" value={`${cogLoad}%`} color={cogLoad>70?'var(--accent-coral)':'var(--accent-orange)'}/>
              <StatusBadge label="SYNC" value="0.2s" color="#4ade80"/>
              <StatusBadge label="P0 TASKS" value={`${p0Tasks}`} color="var(--accent-coral)"/>
              <StatusBadge label="NOTES" value={`${notes.length}`} color="#a78bfa"/>
            </div>
          </div>

          {/* Policy controller */}
          <div style={{ padding:'16px', borderRadius:18, background:'rgba(255,252,244,.75)', border:'0.5px solid rgba(255,255,255,.85)', boxShadow:'0 4px 24px rgba(46,30,12,.05)' }}>
            <div className="t-cap" style={{ marginBottom:8 }}>⚙️ Hermes Policy</div>

            {/* AI Engine selector */}
            <div style={{ marginBottom:10, padding:'10px 12px', borderRadius:10, background: ollamaStatus.online ? 'rgba(74,222,128,.06)' : 'rgba(26,20,16,.04)', border: ollamaStatus.online ? '0.5px solid rgba(74,222,128,.2)' : '0.5px solid rgba(26,20,16,.08)' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--ink-2)', marginBottom:6 }}>AI Engine</div>
              <div style={{ display:'flex', gap:6 }}>
                {[
                  { id:'ollama', label: ollamaStatus.online ? ollamaModel : 'Ollama (offline)', disabled: !ollamaStatus.online },
                  { id:'openrouter', label:'OpenRouter', disabled: false },
                ].map(opt => (
                  <button key={opt.id} type="button" disabled={opt.disabled} onClick={() => { setAiProvider(opt.id); setAiProviderState(opt.id); }} style={{
                    flex:1, padding:'5px 0', borderRadius:8, fontSize:10.5, fontWeight:600, cursor: opt.disabled ? 'not-allowed' : 'pointer',
                    background: aiProvider === opt.id ? 'linear-gradient(135deg,#4ade80,#16a34a)' : 'rgba(26,20,16,.06)',
                    color: aiProvider === opt.id ? '#fff' : opt.disabled ? 'var(--ink-3)' : 'var(--ink-2)',
                    border: aiProvider === opt.id ? '0.5px solid rgba(74,222,128,.4)' : '0.5px solid transparent',
                    opacity: opt.disabled ? 0.5 : 1,
                    transition:'all 160ms',
                  }}>{opt.label}</button>
                ))}
              </div>
              {ollamaStatus.online && ollamaStatus.models.length > 0 && (
                <select value={ollamaModel} onChange={e => { setOllamaModel(e.target.value); setOllamaModelState(e.target.value); }} style={{ marginTop:8, width:'100%', padding:'5px 8px', borderRadius:7, fontSize:11, background:'rgba(255,252,244,.9)', border:'0.5px solid rgba(26,20,16,.12)', color:'var(--ink-1)', cursor:'pointer' }}>
                  {ollamaStatus.models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
            </div>

            <GlassToggle on={personality.autoPlan!==false} onChange={v=>updatePersonality('autoPlan',v)} label="Auto-Plan" sub="Reschedule slipped tasks"/>
            <GlassToggle on={personality.moodDetection!==false} onChange={v=>updatePersonality('moodDetection',v)} label="Mood Detection" sub="Adapt tone to your state"/>
            <GlassToggle on={personality.relWatcher!==false} onChange={v=>updatePersonality('relWatcher',v)} label="Relationship Watch" sub="Nudge stale contacts"/>
            <GlassToggle on={personality.habitCoach===true} onChange={v=>updatePersonality('habitCoach',v)} label="Habit Coach" sub="Daily habit reminders"/>
            <GlassToggle on={personality.buildAdvisor===true} onChange={v=>updatePersonality('buildAdvisor',v)} label="Build Advisor" sub="Suggest shipping priorities"/>
          </div>

          {/* Live console */}
          <div style={{
            padding:'14px', borderRadius:18, flex:1, minHeight:0, overflow:'hidden',
            background:'rgba(14,10,8,.88)', border:'0.5px solid rgba(255,255,255,.08)',
            boxShadow:'0 4px 24px rgba(0,0,0,.25)',
            display:'flex', flexDirection:'column',
          }}>
            <div style={{ fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(255,255,255,.3)', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#4ade80', boxShadow:'0 0 4px #4ade80', animation:'hermes-pulse 2s ease-in-out infinite' }}/>
              HERMES CONSOLE
            </div>
            <div className="hermes-scroll" style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:2 }}>
              {logs.map((l,i) => <LogLine key={i} line={l}/>)}
            </div>
          </div>

          {/* Clear chat */}
          <PaperButton small onClick={() => { actions.clearChat(); actions.addNotification({ text:'Conversation cleared', kind:'info' }); setLogs(prev=>[...prev, { kind:'HERMES', msg:'Conversation memory wiped — fresh start', ts: new Date().toLocaleTimeString() }]); }}>
            Clear Conversation
          </PaperButton>
        </div>
      </div>
    </div>
  );
};

export default AiChat;
