import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { GlassCard, PaperButton, Icon, AiOrb } from '../components/ui/Icons';
import { useAppState, useAppActions, useAppStore } from '../store/AppContext';
import { ScreenShell } from '../components/ui/ScreenShell';
import { ScreenGuide } from '../components/ui/ScreenGuide';
import {
  extractEnvironmentState, extractEventsAndReminders, extractLearningItems,
  generateLearningNote, createAutomationSummary, compileLearningIntoBook, formatBookAsNote
} from '../services/environment';
import { generateTitle, generateTag, generateIcon, generateSummary, extractTasksFromNote, generateNoteEnhancement } from '../services/ai';
import { NoteEditor } from '../components/editor/NoteEditor';
import { EnvironmentBadge } from '../components/ui/EnvironmentBadge';
import { NoteCanvas } from '../components/editor/NoteCanvas';

const TAGS = ['Fundraise', 'Hiring', 'Network', 'Pages', 'Reading', 'Product', 'General', 'Inbox', 'Design', 'Engineering', 'Gym', 'Personal', 'Learning'];

// ─── Laser overlay: glowing trail that auto-fades ────────────────────────────
function LaserLayer({ active, pointsRef }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const FADE_MS = 2400;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    const sync = () => {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(container);

    const draw = () => {
      const now = Date.now();
      pointsRef.current = pointsRef.current.filter(p => now - p.t < FADE_MS);
      const pts = pointsRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (active && pts.length >= 2) {
        const groups = [];
        let grp = [pts[0]];
        for (let i = 1; i < pts.length; i++) {
          if (pts[i].t - pts[i - 1].t > 120) { groups.push(grp); grp = []; }
          grp.push(pts[i]);
        }
        groups.push(grp);

        groups.forEach(stroke => {
          if (stroke.length < 2) return;
          for (let i = 1; i < stroke.length; i++) {
            const p0 = stroke[i - 1], p1 = stroke[i];
            const age = now - p1.t;
            const alpha = Math.pow(Math.max(0, 1 - age / FADE_MS), 1.4);
            if (alpha < 0.01) return;
            // outer glow
            ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
            ctx.strokeStyle = `rgba(240,107,28,${alpha * 0.18})`; ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.stroke();
            // mid glow
            ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
            ctx.strokeStyle = `rgba(240,107,28,${alpha * 0.5})`; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke();
            // core beam
            ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
            ctx.strokeStyle = `rgba(255,215,100,${alpha})`; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();
          }
        });
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [active, pointsRef]);

  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 30, borderRadius: 'inherit',
    }} />
  );
}

// ─── Notes screen ─────────────────────────────────────────────────────────────
export const Notes = () => {
  const { actions } = useAppActions();
  const store = useAppStore();
  const notes = useAppState((s) => s.notes) || [];
  const environmentMode = useAppState((s) => s.tweaks?.environmentMode);
  const [selectedId, setSelectedId] = useState(notes[0]?.id || null);
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [audioLevelArray, setAudioLevelArray] = useState(Array(15).fill(4));
  const [transcriptionStream, setTranscriptionStream] = useState('');

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  // View + laser state
  const [viewMode, setViewMode] = useState('doc'); // 'doc' | 'canvas'
  const [laserMode, setLaserMode] = useState(false);
  const [laserCursor, setLaserCursor] = useState({ x: 0, y: 0, visible: false });
  const laserPointsRef = useRef([]);
  const editorContainerRef = useRef(null);

  // Audio refs
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);
  const isRecordingRef = useRef(isRecording);
  const fallbackIntervalRef = useRef(null);
  const simulationTimeoutsRef = useRef([]);
  // Stale-closure-safe refs for voice handlers
  const preRecordingContentRef = useRef('');
  const transcriptionAccumulatedRef = useRef('');
  const notesRef = useRef(notes);
  useEffect(() => { notesRef.current = notes; }, [notes]);

  const selected = notes.find(n => n.id === selectedId);

  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  useEffect(() => {
    if (!selectedId && notes.length > 0) setSelectedId(notes[0].id);
  }, [notes, selectedId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return notes;
    const s = search.toLowerCase();
    return notes.filter(n =>
      n.title.toLowerCase().includes(s) ||
      (n.preview && n.preview.toLowerCase().includes(s)) ||
      (n.tag && n.tag.toLowerCase().includes(s)) ||
      (n.content && n.content.toLowerCase().includes(s))
    );
  }, [notes, search]);

  const aiProcessTimeout = useRef(null);

  // Laser move handler — tracks cursor position for the overlay
  const handleLaserMove = useCallback((e) => {
    if (!laserMode) return;
    const rect = editorContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLaserCursor({ x, y, visible: true });
    laserPointsRef.current.push({ x, y, t: Date.now() });
  }, [laserMode]);

  // ── AI analysis (local + OpenRouter) ─────────────────────────────────────────
  const runAiAnalysis = async (content, noteId) => {
    if (!content || !content.trim()) return;

    let currentNote = notesRef.current.find(n => n.id === noteId);
    let title = currentNote?.title || 'Untitled';
    if (!currentNote || title === 'Untitled' || title === 'Quick capture' || title.startsWith('Voice Note') || title === 'New note') {
      const cleanContent = content.replace(/[#*`]/g, '').trim();
      const firstLine = cleanContent.split('\n')[0];
      if (firstLine.length < 35 && firstLine.length > 3) {
        title = firstLine;
      } else {
        const words = cleanContent.split(/\s+/).slice(0, 4).join(' ');
        title = words.length > 3 ? words + '…' : 'Brainstorm Note';
      }
      // AI Title generation
      try { title = await generateTitle(content) || title; } catch {}
    }

    let tag = currentNote?.tag || 'General';
    let icon = currentNote?.icon || 'notes';
    try {
      tag = await generateTag(content, title);
      icon = await generateIcon(tag);
    } catch {}

    const envState = extractEnvironmentState(content);
    const extractedItems = extractEventsAndReminders(content);
    const learningItems = envState.isLearningSession ? extractLearningItems(content) : null;
    
    // Call true AI tools in background
    let aiSummary = await generateSummary(content);
    try {
      const aiTasks = await extractTasksFromNote(title, content);
      if (aiTasks?.length) {
        extractedItems.tasks = [...extractedItems.tasks, ...aiTasks];
      }
      const enhancement = await generateNoteEnhancement(title, content);
      if (enhancement) {
        aiSummary = enhancement;
      }
    } catch {}
    
    if (!aiSummary) aiSummary = createAutomationSummary(envState, { ...extractedItems, ...(learningItems || {}) }) || "I've cataloged your thoughts under " + tag + ".";

    actions.updateNote({ id: noteId, title, tag, icon, ai: aiSummary, content });

    const snapshot = store.getSnapshot();
    extractedItems.reminders.forEach(act => {
      const alreadyScheduled = snapshot.reminders?.some(r => r.title === act.title && r.time === act.time && r.day === act.day);
      if (!alreadyScheduled) {
        actions.addReminder(act);
        actions.addNotification({ text: `⏰ AI automated: Scheduled "${act.title}" for ${act.time}`, kind: 'info' });
      }
    });

    extractedItems.tasks.forEach(task => {
      const alreadyExists = snapshot.tasks?.some(t => t.title === task.title && t.status !== 'done');
      if (!alreadyExists) {
        actions.addTask(task);
        actions.addNotification({ text: `📋 AI extracted task: "${task.title}"`, kind: 'info' });
      }
    });

    extractedItems.events.forEach(event => {
      const alreadyExists = snapshot.events?.some(e => e.title === event.title && e.day === event.day);
      if (!alreadyExists) actions.addEvent(event);
    });

    if (envState.isLearningSession && learningItems && snapshot.automationEnabled === true) {
      const hasMeaningfulContent = learningItems.concepts.length > 0 || learningItems.codeBlocks.length > 0 || learningItems.errors.length > 0 || learningItems.questions.length > 0;
      if (hasMeaningfulContent) {
        const learningNote = generateLearningNote(learningItems, title);
        const alreadyGenerated = snapshot.notes?.some(n => n.title === learningNote.title && n.tag === 'Learning');
        if (!alreadyGenerated) {
          actions.addNote(learningNote);
          actions.addNotification({ text: `🧠 AI auto-captured learning session: ${learningItems.concepts.length} concepts, ${learningItems.codeBlocks.length} code blocks`, kind: 'info' });
        }
      }
    }

    if (envState.shouldAct && envState.mode !== 'normal' && snapshot.automationEnabled === true) {
      actions.addAuditLog({
        action: 'environment_mode_change', mode: envState.mode, source: 'note', noteId,
        confidence: envState.confidence,
        details: { silenceNotifications: envState.silenceNotifications, autoReply: envState.autoReply, isLearningSession: envState.isLearningSession },
      });
      actions.setTweak('environmentMode', envState.mode);
    }
  };

  // ── Note handlers ────────────────────────────────────────────────────────────
  const handleContentChange = (val) => {
    if (!selected) return;
    actions.updateNote({ id: selectedId, content: val });
    if (aiProcessTimeout.current) clearTimeout(aiProcessTimeout.current);
    aiProcessTimeout.current = setTimeout(() => runAiAnalysis(val, selectedId), 1200);
  };

  const handleTitleChange = (val) => {
    if (!selected) return;
    actions.updateNote({ id: selectedId, title: val });
  };

  const handleTagChange = (val) => {
    if (!selected) return;
    actions.updateNote({ id: selectedId, tag: val });
  };

  const createEmptyNote = () => {
    const id = `n_${Date.now().toString(36)}`;
    actions.addNote({
      id, title: 'New note', tag: 'General', icon: 'notes',
      content: '', preview: '', pinned: false, edited: 'just now', words: 0,
      ai: 'Start writing or recording. I will automatically title, tag, and schedule actions for you.',
    });
    setSelectedId(id);
    return id;
  };

  const deleteNote = (id) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    const n = notes.find(x => x.id === id);
    setConfirmDeleteId(null);
    actions.deleteNote(id);
    if (id === selectedId) setSelectedId(notes.filter(x => x.id !== id)[0]?.id || null);
    actions.addNotification({ text: `Note "${n?.title || 'untitled'}" deleted`, kind: 'info' });
  };

  const togglePin = (id) => {
    actions.togglePinNote(id);
    const n = notes.find(x => x.id === id);
    actions.addNotification({ text: n?.pinned ? 'Note unpinned' : 'Note pinned', kind: 'info' });
  };

  const summarizeAll = () => {
    const total = notes.length;
    const pinned = notes.filter(n => n.pinned).length;
    const words = notes.reduce((s, n) => s + (n.words || 0), 0);
    actions.addNotification({ text: `Brain Summary: ${total} notes, ${pinned} pinned, ~${words} total words parsed.`, kind: 'info' });
  };

  // ── Web Audio ────────────────────────────────────────────────────────────────
  const startAudioContext = async (stream) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      const updateWave = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const heights = Array.from(dataArrayRef.current).slice(0, 15).map(val => Math.max(4, Math.floor((val / 255) * 44)));
        setAudioLevelArray(heights);
        setVoiceVolume(heights.reduce((a, b) => a + b, 0) / heights.length);
        animationFrameRef.current = requestAnimationFrame(updateWave);
      };
      updateWave();
    } catch (e) { console.warn('AudioContext setup failed', e); }
  };

  // ── Voice recording ──────────────────────────────────────────────────────────
  const toggleVoiceRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      isRecordingRef.current = false;
      if (recognitionRef.current) recognitionRef.current.stop();
      if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
      simulationTimeoutsRef.current.forEach(clearTimeout);
      simulationTimeoutsRef.current = [];
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      fallbackIntervalRef.current = null; audioContextRef.current = null; analyserRef.current = null; streamRef.current = null;

      const base = preRecordingContentRef.current;
      const accumulated = transcriptionAccumulatedRef.current;
      const finalContent = base ? (accumulated ? base + '\n' + accumulated : base) : accumulated;
      setTranscriptionStream('');
      if (finalContent.trim()) {
        setIsAiProcessing(true);
        setTimeout(() => {
          runAiAnalysis(finalContent, selectedId);
          setIsAiProcessing(false);
          actions.addNotification({ text: 'Voice note transcribed & compiled!', kind: 'info' });
        }, 800);
      }
    } else {
      setIsRecording(true);
      isRecordingRef.current = true;
      setTranscriptionStream('');
      setAudioLevelArray(Array(15).fill(4));
      preRecordingContentRef.current = selected?.content || '';
      transcriptionAccumulatedRef.current = '';

      let currentId = selectedId;
      if (!selected) currentId = createEmptyNote();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        startAudioContext(stream);
      } catch (err) {
        console.warn('Microphone access not granted. Using fallback animation.');
        fallbackIntervalRef.current = setInterval(() => {
          if (!isRecordingRef.current) { clearInterval(fallbackIntervalRef.current); fallbackIntervalRef.current = null; return; }
          setAudioLevelArray(Array(15).fill(0).map(() => Math.floor(Math.random() * 32) + 6));
          setVoiceVolume(Math.floor(Math.random() * 20) + 5);
        }, 120);
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
        rec.onresult = (event) => {
          let interimText = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) transcriptionAccumulatedRef.current += event.results[i][0].transcript + ' ';
            else interimText += event.results[i][0].transcript;
          }
          const displayText = transcriptionAccumulatedRef.current + interimText;
          setTranscriptionStream(displayText);
          if (currentId) {
            const base = preRecordingContentRef.current;
            actions.updateNote({ id: currentId, content: base ? base + '\n' + displayText : displayText });
          }
        };
        rec.onerror = (e) => console.warn('SpeechRec error:', e);
        rec.onend = () => { if (isRecordingRef.current) { setIsRecording(false); isRecordingRef.current = false; } };
        recognitionRef.current = rec;
        rec.start();
      } else {
        actions.addNotification({ text: 'Simulating high-end voice transcription...', kind: 'info' });
        const simulationPhrases = [
          'Need to review the design mockup for the new dashboard today.',
          ' Also have a sync at 2:00 pm about the product roadmap.',
          ' Then schedule a gym session at 6:00 pm to keep fresh.',
          ' AI, extract these into my active schedule and remind me!',
        ];
        let currentPhraseIndex = 0;
        let charIndex = 0;
        const typeSimulatedText = () => {
          if (!isRecordingRef.current) return;
          if (currentPhraseIndex >= simulationPhrases.length) {
            setIsRecording(false); isRecordingRef.current = false;
            const base = preRecordingContentRef.current;
            const accumulated = transcriptionAccumulatedRef.current;
            const finalContent = base ? (accumulated ? base + '\n' + accumulated : base) : accumulated;
            setTranscriptionStream('');
            if (finalContent.trim()) {
              setIsAiProcessing(true);
              setTimeout(() => { runAiAnalysis(finalContent, currentId); setIsAiProcessing(false); actions.addNotification({ text: 'Voice note transcribed & compiled!', kind: 'info' }); }, 800);
            }
            return;
          }
          const phrase = simulationPhrases[currentPhraseIndex];
          transcriptionAccumulatedRef.current += phrase[charIndex];
          const cumulativeText = transcriptionAccumulatedRef.current;
          setTranscriptionStream(cumulativeText);
          if (currentId) {
            const base = preRecordingContentRef.current;
            actions.updateNote({ id: currentId, content: base ? base + '\n' + cumulativeText : cumulativeText });
          }
          charIndex++;
          if (charIndex >= phrase.length) { currentPhraseIndex++; charIndex = 0; simulationTimeoutsRef.current.push(setTimeout(typeSimulatedText, 600)); }
          else simulationTimeoutsRef.current.push(setTimeout(typeSimulatedText, 45));
        };
        simulationTimeoutsRef.current.push(setTimeout(typeSimulatedText, 400));
      }
    }
  };

  useEffect(() => {
    return () => {
      if (aiProcessTimeout.current) clearTimeout(aiProcessTimeout.current);
      if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
      simulationTimeoutsRef.current.forEach(clearTimeout);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <ScreenShell
      eyebrow="AI Notes & Second Brain"
      title={<>Your <span className="t-display-italic" style={{ color: 'var(--accent-orange)' }}>second brain</span>.</>}
      subtitle={<>Write or speak. The AI auto-titles, tags, schedules and executes actions instantly.</>}
      right={<>
        <PaperButton icon="sparkle" small onClick={summarizeAll}>Summarize all</PaperButton>
        <PaperButton icon="plus" primary onClick={createEmptyNote}>New note</PaperButton>
      </>}
    >
      <style>{`
        @keyframes noteItemIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes laserPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(240,107,28,0), 0 0 8px 2px rgba(240,107,28,.3); }
          50%       { box-shadow: 0 0 0 4px rgba(240,107,28,.12), 0 0 16px 6px rgba(240,107,28,.5); }
        }
        @keyframes laserDot {
          0%, 100% { transform: scale(1);   opacity: 1; }
          50%       { transform: scale(1.4); opacity: .8; }
        }
        @keyframes voiceIn {
          from { opacity: 0; transform: scale(.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        /* Mobile: collapse sidebar */
        @media (max-width: 768px) {
          .notes-grid { grid-template-columns: 1fr !important; }
          .notes-sidebar { display: none; }
          .notes-sidebar.open { display: flex !important; position: fixed; inset: 0; z-index: 200; background: rgba(255,252,244,.98); backdrop-filter: blur(24px); }
          .notes-ai-panel { display: none; }
          .notes-mobile-bar { display: flex !important; }
        }
        @media (min-width: 769px) {
          .notes-grid { grid-template-columns: 300px 1fr 268px !important; }
          .notes-mobile-bar { display: none !important; }
        }
        @media (max-width: 1100px) and (min-width: 769px) {
          .notes-grid { grid-template-columns: 260px 1fr !important; }
          .notes-ai-panel { display: none; }
        }
        .note-item:hover { background: rgba(245,165,36,.06) !important; }
        .toolbar-btn:hover { background: rgba(26,20,16,.08) !important; }
      `}</style>

      <ScreenGuide screen="notes" />

      {/* Mobile top bar — sidebar toggle */}
      <div className="notes-mobile-bar" style={{
        display: 'none', alignItems: 'center', gap: 10, padding: '8px 0 14px',
      }}>
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(26,20,16,.06)', border: 'none', cursor: 'pointer', color: 'var(--ink-2)' }}
        >
          {sidebarOpen ? '✕ Close' : '☰ Notes'}
        </button>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-1)' }}>{selected?.title || 'No note selected'}</span>
      </div>

      <div className="notes-grid" style={{ display: 'grid', gap: 14, height: 'calc(100vh - 290px)', minHeight: 560 }}>

        {/* ── LEFT: Note list ──────────────────────────────────────────────── */}
        <GlassCard
          padding={0}
          className={`notes-sidebar${sidebarOpen ? ' open' : ''}`}
          style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '0.5px solid var(--ink-line)', flexShrink: 0 }}>
            <Icon name="search" size={13} color="var(--ink-3)" />
            <input
              placeholder="Search notes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ all: 'unset', flex: 1, fontSize: 13, color: 'var(--ink-1)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ fontSize: 11, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>✕</button>
            )}
          </div>

          <div className="scroll" style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.map((n, i) => (
              <div
                key={n.id}
                className="note-item"
                onClick={() => { setSelectedId(n.id); setSidebarOpen(false); }}
                style={{
                  padding: '11px 14px',
                  borderBottom: '0.5px solid var(--ink-line)',
                  background: selectedId === n.id ? 'rgba(245,165,36,.11)' : 'transparent',
                  cursor: 'pointer',
                  boxShadow: selectedId === n.id ? 'inset 3px 0 0 var(--accent-orange)' : 'none',
                  transition: 'background 120ms ease, box-shadow 120ms ease',
                  animation: 'noteItemIn 240ms ease backwards',
                  animationDelay: `${Math.min(i * 25, 350)}ms`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <Icon name={n.icon || 'notes'} size={11} color={selectedId === n.id ? 'var(--accent-orange)' : 'var(--ink-4)'} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                  {n.pinned && <span style={{ fontSize: 9, color: 'var(--accent-orange)' }}>●</span>}
                </div>
                <div style={{
                  fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.45,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {(n.content
                    ? n.content.replace(/^#{1,3} /gm, '').replace(/^[-*>] ?(\[[ x]\] )?/gm, '').replace(/[*_`~]/g, '').replace(/\n+/g, ' ').trim()
                    : n.preview
                  ) || 'No content yet'}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 5, alignItems: 'center' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent-orange)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{n.tag}</span>
                  <span style={{ fontSize: 9.5, color: 'var(--ink-4)' }}>· {n.edited || 'now'} · {n.words || 0}w</span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: 28, textAlign: 'center', fontSize: 12, color: 'var(--ink-3)' }}>
                {search ? 'No notes match your search' : 'No notes yet. Tap "New note" to start.'}
              </div>
            )}
          </div>
        </GlassCard>

        {/* ── CENTER: Document / Canvas ────────────────────────────────────── */}
        <GlassCard strong style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

              {/* Toolbar */}
              <div style={{
                padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                borderBottom: '0.5px solid var(--ink-line)', background: 'rgba(255,252,244,.96)',
                backdropFilter: 'blur(16px)', flexShrink: 0, minHeight: 44,
              }}>
                {/* View mode segmented control */}
                <div style={{ display: 'flex', background: 'rgba(26,20,16,.05)', borderRadius: 8, padding: 2, gap: 1 }}>
                  {[['doc', '✏️ Write'], ['canvas', '📐 Canvas']].map(([mode, label]) => (
                    <button
                      key={mode}
                      className="toolbar-btn"
                      onClick={() => setViewMode(mode)}
                      style={{
                        padding: '4px 11px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                        background: viewMode === mode ? '#fff' : 'transparent',
                        color: viewMode === mode ? 'var(--ink-1)' : 'var(--ink-3)',
                        boxShadow: viewMode === mode ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
                        transition: 'all 140ms ease',
                      }}
                    >{label}</button>
                  ))}
                </div>

                <div style={{ width: 1, height: 16, background: 'var(--ink-line)', flexShrink: 0 }} />

                {/* Laser tool */}
                <button
                  onClick={() => setLaserMode(l => !l)}
                  title="Laser pointer — glowing marks that fade automatically"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                    border: laserMode ? '0.5px solid rgba(240,107,28,.4)' : 'none',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    background: laserMode ? 'rgba(240,107,28,.12)' : 'rgba(26,20,16,.04)',
                    color: laserMode ? 'var(--accent-orange)' : 'var(--ink-3)',
                    animation: laserMode ? 'laserPulse 2s ease infinite' : 'none',
                    transition: 'background 140ms ease, color 140ms ease',
                  }}
                >
                  <span style={{ fontSize: 13 }}>🔴</span>
                  Laser
                  {laserMode && <span style={{ fontSize: 8.5, fontWeight: 800, background: 'var(--accent-orange)', color: '#fff', borderRadius: 3, padding: '1px 4px' }}>ON</span>}
                </button>

                <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {laserMode
                    ? <span style={{ color: 'var(--accent-orange)', fontWeight: 500 }}>Move cursor to draw · fades automatically</span>
                    : <span>/ commands · ⌘B · ⌘I · ⌘K</span>}
                </div>
              </div>

              {/* Editor area */}
              <div
                ref={editorContainerRef}
                onMouseMove={handleLaserMove}
                onMouseLeave={() => setLaserCursor(p => ({ ...p, visible: false }))}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', cursor: laserMode ? 'none' : 'auto' }}
              >
                {/* Laser cursor dot */}
                {laserMode && laserCursor.visible && (
                  <div style={{
                    position: 'absolute', zIndex: 31, pointerEvents: 'none',
                    left: laserCursor.x - 7, top: laserCursor.y - 7,
                    width: 14, height: 14, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,230,80,1) 0%, rgba(240,107,28,.9) 45%, transparent 100%)',
                    boxShadow: '0 0 10px 5px rgba(240,107,28,.5), 0 0 28px 12px rgba(240,107,28,.2)',
                    animation: 'laserDot 0.7s ease infinite',
                  }} />
                )}

                {viewMode === 'canvas' ? (
                  <NoteCanvas
                    value={selected.content ?? ''}
                    onChange={(val) => actions.updateNote({ id: selectedId, content: val })}
                    readOnly={isRecording}
                  />
                ) : (
                  <div className="scroll" style={{ flex: 1, overflowY: 'auto' }}>
                    {/* Note header */}
                    <div style={{ padding: '28px clamp(16px, 5vw, 40px) 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                        <select
                          value={selected.tag || 'General'}
                          onChange={e => handleTagChange(e.target.value)}
                          style={{
                            padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                            border: '0.5px solid rgba(26,20,16,.1)', background: 'rgba(255,252,244,.8)',
                            color: 'var(--accent-orange)', cursor: 'pointer', outline: 'none',
                          }}
                        >
                          {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>

                        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                          📅 {selected.date || 'Today'} · {selected.edited || 'just now'}
                        </span>
                        {isAiProcessing && (
                          <span style={{ fontSize: 10, color: 'var(--accent-orange)', fontWeight: 600 }}>✦ AI thinking…</span>
                        )}

                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
                          <button
                            onClick={() => togglePin(selected.id)}
                            style={{ fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: '3px 6px', color: selected.pinned ? 'var(--accent-orange)' : 'var(--ink-3)' }}
                          >
                            {selected.pinned ? '● Pinned' : '○ Pin'}
                          </button>
                          {confirmDeleteId === selected.id ? (
                            <>
                              <button onClick={() => deleteNote(selected.id)} style={{ fontSize: 11, color: '#fff', background: 'var(--accent-coral)', padding: '3px 9px', borderRadius: 5, border: 'none', cursor: 'pointer' }}>Delete</button>
                              <button onClick={() => setConfirmDeleteId(null)} style={{ fontSize: 11, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                            </>
                          ) : (
                            <button onClick={() => deleteNote(selected.id)} style={{ fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-coral)', padding: '3px 6px' }}>Delete</button>
                          )}
                        </div>
                      </div>

                      {/* Title input */}
                      <input
                        value={selected.title}
                        onChange={e => handleTitleChange(e.target.value)}
                        placeholder="Untitled"
                        style={{
                          all: 'unset', display: 'block', fontSize: 'clamp(28px, 6vw, 36px)', fontFamily: 'var(--font-display)',
                          fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.15,
                          color: 'var(--ink-1)', width: '100%',
                        }}
                      />
                    </div>

                    {/* Content */}
                    <div style={{ padding: '0 clamp(16px, 5vw, 40px) 40px' }}>
                      <div className="hair" style={{ margin: '16px 0 22px' }} />
                      <NoteEditor
                        value={selected.content ?? selected.preview ?? ''}
                        onChange={handleContentChange}
                        readOnly={isRecording}
                      />
                    </div>
                  </div>
                )}

                {/* Laser overlay */}
                <LaserLayer active={laserMode} pointsRef={laserPointsRef} />

                {/* Voice recording overlay */}
                {isRecording && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(255,254,250,0.95)',
                    backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', borderRadius: 12, zIndex: 10,
                    border: '1px dashed var(--accent-orange)', animation: 'voiceIn 220ms ease',
                  }}>
                    <div style={{ transform: `scale(${1 + voiceVolume / 80})`, transition: 'transform 100ms ease', marginBottom: 16 }}>
                      <AiOrb size={58} intensity={1.5} />
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 17, color: 'var(--ink-1)', fontWeight: 600 }}>Listening…</h3>
                    <p style={{ margin: '0 0 22px', fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', maxWidth: 260 }}>
                      Say your thoughts, meetings, or tasks. AI auto-schedules everything.
                    </p>
                    <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 44, marginBottom: 20 }}>
                      {audioLevelArray.map((val, idx) => (
                        <div key={idx} style={{
                          width: 3, height: val,
                          background: 'linear-gradient(to top, var(--accent-orange), var(--accent-coral))',
                          borderRadius: 99, transition: 'height 80ms ease',
                        }} />
                      ))}
                    </div>
                    <div style={{
                      padding: '9px 16px', borderRadius: 8, background: 'rgba(26,20,16,.03)',
                      fontSize: 12.5, color: 'var(--ink-2)', fontStyle: 'italic', maxWidth: '82%',
                      textAlign: 'center', minHeight: 38, border: '0.5px solid var(--ink-line)',
                    }}>
                      "{transcriptionStream || 'Speak now…'}"
                    </div>
                  </div>
                )}
              </div>

              {/* Footer: mic button */}
              <div style={{
                flexShrink: 0, padding: '10px 16px', borderTop: '0.5px solid var(--ink-line)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,252,244,.88)',
              }}>
                <button
                  onClick={toggleVoiceRecording}
                  style={{
                    all: 'unset', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 20px', borderRadius: 99, cursor: 'pointer',
                    background: isRecording ? 'linear-gradient(160deg, #e7402e 0%, #c2185b 100%)' : 'rgba(26,20,16,.04)',
                    color: isRecording ? '#fff' : 'var(--ink-1)',
                    border: '0.5px solid rgba(26,20,16,.10)',
                    boxShadow: isRecording ? '0 0 18px rgba(231,64,46,.45)' : 'none',
                    transition: 'all var(--motion-quick) var(--ease-snap)',
                    fontSize: 12, fontWeight: 600,
                  }}
                >
                  <Icon name="audio" size={15} color={isRecording ? '#fff' : 'var(--accent-orange)'} />
                  {isRecording ? 'Stop & Transcribe' : 'Voice Note'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14, color: 'var(--ink-3)' }}>
              <Icon name="notes" size={44} color="var(--ink-line)" />
              <span style={{ fontSize: 14 }}>Select a note or create a new one</span>
              <PaperButton icon="plus" primary small onClick={createEmptyNote}>New note</PaperButton>
            </div>
          )}
        </GlassCard>

        {/* ── RIGHT: AI panel ──────────────────────────────────────────────── */}
        <div className="notes-ai-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <GlassCard style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AiOrb size={20} intensity={1.2} />
              <div className="t-cap" style={{ color: 'var(--accent-orange)' }}>AI Assistant</div>
              <div style={{ marginLeft: 'auto' }}>
                <EnvironmentBadge mode={environmentMode} />
              </div>
            </div>
            <div className="scroll" style={{ flex: 1, overflowY: 'auto', fontSize: 13, lineHeight: 1.65, color: 'var(--ink-1)' }}>
              {selected?.ai ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ margin: 0 }}>{selected.ai}</p>
                  {selected.ai.includes('Detected a time-based prompt') && (
                    <div style={{
                      padding: '7px 11px', borderRadius: 8, background: 'rgba(74,143,94,.08)',
                      border: '0.5px solid rgba(74,143,94,.2)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'green',
                    }}>
                      <Icon name="check" size={11} color="green" />
                      <span>Action verified & committed.</span>
                    </div>
                  )}
                </div>
              ) : (
                <span style={{ color: 'var(--ink-3)' }}>Write or record above. I'll automatically title, tag, and schedule actions for you.</span>
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="t-cap">Second Brain Stats</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, fontSize: 12, color: 'var(--ink-2)' }}>
              <div>{notes.length} cataloged memories</div>
              <div>{notes.filter(n => n.pinned).length} pinned nodes</div>
              <div>{notes.reduce((s, n) => s + (n.words || 0), 0)} total words</div>
              <div style={{ marginTop: 6 }}>
                <span className="chip" style={{ background: 'rgba(245,165,36,.12)', color: 'var(--accent-orange)' }}>
                  🧠 {notes.filter(n => n.tag === 'Learning').length} learning sessions
                </span>
              </div>
            </div>
            {notes.filter(n => n.tag === 'Learning').length > 0 && (
              <div style={{ marginTop: 10 }}>
                <PaperButton icon="sparkle" small disabled={isCompiling} onClick={() => {
                  setIsCompiling(true);
                  setTimeout(() => {
                    const learningNotes = notes.filter(n => n.tag === 'Learning');
                    const book = compileLearningIntoBook(learningNotes);
                    const bookNote = formatBookAsNote(book);
                    actions.addNote(bookNote);
                    actions.addNotification({ text: `📗 Compiled ${book.stats.totalNotes} learning sessions into ${book.chapters.length} chapters`, kind: 'info' });
                    setIsCompiling(false);
                  }, 100);
                }}>
                  {isCompiling ? '📗 Compiling…' : '📗 Compile Learning Book'}
                </PaperButton>
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <div className="t-cap">Auto tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {[...new Set(notes.map(n => n.tag))].map(tag => (
                <span key={tag} className="chip" onClick={() => setSearch(tag)} style={{ cursor: 'pointer' }}>
                  {tag} · {notes.filter(n => n.tag === tag).length}
                </span>
              ))}
            </div>
          </GlassCard>
        </div>

      </div>
    </ScreenShell>
  );
};
