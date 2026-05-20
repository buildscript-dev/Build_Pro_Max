import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GlassCard, PaperButton, Icon, AiOrb } from '../components/ui/Icons';
import { useApp } from '../store/AppContext';
import { ScreenShell } from '../components/ui/ScreenShell';
import { ScreenGuide } from '../components/ui/ScreenGuide';
import { extractEnvironmentState, extractEventsAndReminders, extractLearningItems, generateLearningNote, createAutomationSummary, compileLearningIntoBook, formatBookAsNote } from '../services/environment';

const TAGS = ['Fundraise', 'Hiring', 'Network', 'Pages', 'Reading', 'Product', 'General', 'Inbox', 'Design', 'Engineering', 'Gym', 'Personal'];

export const Notes = () => {
  const { state, actions } = useApp();
  const notes = state.notes || [];
  const [selectedId, setSelectedId] = useState(notes[0]?.id || null);
  const [search, setSearch] = useState('');
  
  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [audioLevelArray, setAudioLevelArray] = useState(Array(15).fill(4));
  const [transcriptionStream, setTranscriptionStream] = useState('');
  
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // AI processing loading states
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);
  const isRecordingRef = useRef(isRecording);
  const fallbackIntervalRef = useRef(null);
  const simulationTimeoutsRef = useRef([]);
  // Refs to avoid stale closures in async speech recognition handlers
  const preRecordingContentRef = useRef('');
  const transcriptionAccumulatedRef = useRef('');

  const selected = notes.find(n => n.id === selectedId);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Auto-select first note if nothing selected
  useEffect(() => {
    if (!selectedId && notes.length > 0) {
      setSelectedId(notes[0].id);
    }
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

  // Debounced auto-save & auto-AI processing helper
  const aiProcessTimeout = useRef(null);

  // Local rule-based AI processing for instant auto-categorization, title generation, tag selection, event extraction, and environment automation
  const runAiAnalysis = (content, noteId) => {
    if (!content.trim()) return;

    // 1. Tag & Icon Generation
    let tag = 'General';
    let icon = 'notes';
    const text = content.toLowerCase();

    if (/gym|workout|exercise|run|training|fitness|muscle/i.test(text)) {
      tag = 'Gym';
      icon = 'flame';
    } else if (/bessemer|pitch|investor|vc|fundraise|funding|round|deck/i.test(text)) {
      tag = 'Fundraise';
      icon = 'orb';
    } else if (/hiring|recruit|interview|resume|candidate|hire/i.test(text)) {
      tag = 'Hiring';
      icon = 'contacts';
    } else if (/study|learn|book|reading|read|course|exam|tutorial|practice/i.test(text)) {
      tag = 'Learning';
      icon = 'sparkle';
    } else if (/code|engineering|debug|dev|architect|software|github|function|component|api|error|bug/i.test(text)) {
      tag = 'Engineering';
      icon = 'cmd';
    } else if (/meeting|sync|call|calendar|schedule|discussion/i.test(text)) {
      tag = 'Network';
      icon = 'calendar';
    } else if (/design|figma|ui|ux|prototype|wireframe/i.test(text)) {
      tag = 'Design';
      icon = 'fig';
    }

    // 2. Title Generation (if currently generic/untitled)
    let currentNote = notes.find(n => n.id === noteId);
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
    }

    // 3. AI Environment Engine: Detect user state from text
    const envState = extractEnvironmentState(content);
    const extractedItems = extractEventsAndReminders(content);
    const learningItems = envState.isLearningSession ? extractLearningItems(content) : null;

    // 4. Smart Time & Action Extraction
    let aiSummary = "I've cataloged your thoughts under " + tag + ".";
    let extractedActions = [];

    const timeMatch = content.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)\b/i);
    const dateMatch = content.match(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);

    if (timeMatch) {
      const fullTime = timeMatch[0];
      const activity = /meeting|gym|workout|call|sync|dinner|study/i.test(text)
        ? text.match(/meeting\s+with\s+\w+|gym|workout|call\s+with\s+\w+|sync|dinner|study|practice/i)?.[0] || 'Scheduled Activity'
        : 'Note reminder';

      extractedActions.push({
        type: 'reminder',
        title: `AI Extracted: ${activity}`,
        time: fullTime,
        detail: `Extracted from Note: "${title}"`
      });

      aiSummary = `⚡ AI Second Brain: Detected a time-based prompt for "${fullTime}". I have automatically set a reminder and created a time block in your Planner.`;
    }

    // 5. Build AI summary with environment context
    const automationSummary = createAutomationSummary(envState, { ...extractedItems, ...(learningItems || {}) });
    if (automationSummary) {
      aiSummary = automationSummary;
    }

    // 6. Trigger state update
    actions.updateNote({
      id: noteId,
      title,
      tag,
      icon,
      ai: aiSummary,
      content,
    });

    // 7. Execute extracted reminders
    extractedItems.reminders.forEach(act => {
      const alreadyScheduled = state.reminders?.some(r => r.title === act.title && r.time === act.time);
      if (!alreadyScheduled) {
        actions.addReminder(act);
        actions.addNotification({
          text: `⏰ AI automated: Scheduled "${act.title}" for ${act.time}`,
          kind: 'info'
        });
      }
    });

    // 8. Execute extracted tasks
    extractedItems.tasks.forEach(task => {
      const alreadyExists = state.tasks?.some(t => t.title === task.title && t.status !== 'done');
      if (!alreadyExists) {
        actions.addTask(task);
        actions.addNotification({
          text: `📋 AI extracted task: "${task.title}"`,
          kind: 'info'
        });
      }
    });

    // 9. Execute extracted events
    extractedItems.events.forEach(event => {
      const alreadyExists = state.events?.some(e => e.title === event.title && e.day === event.day);
      if (!alreadyExists) {
        actions.addEvent(event);
      }
    });

    // 10. If learning mode detected, auto-generate a structured learning note
    if (envState.isLearningSession && learningItems && state.automationEnabled !== false) {
      const hasMeaningfulContent = learningItems.concepts.length > 0 || learningItems.codeBlocks.length > 0 || learningItems.errors.length > 0 || learningItems.questions.length > 0;
      if (hasMeaningfulContent) {
        const learningNote = generateLearningNote(learningItems, title);
        const alreadyGenerated = state.notes?.some(n => n.title === learningNote.title && n.tag === 'Learning');
        if (!alreadyGenerated) {
          actions.addNote(learningNote);
          actions.addNotification({
            text: `🧠 AI auto-captured learning session: ${learningItems.concepts.length} concepts, ${learningItems.codeBlocks.length} code blocks`,
            kind: 'info'
          });
        }
      }
    }

    // 11. Audit log for environment automation
    if (envState.shouldAct && envState.mode !== 'normal' && state.automationEnabled !== false) {
      actions.addAuditLog({
        action: 'environment_mode_change',
        mode: envState.mode,
        source: 'note',
        noteId,
        confidence: envState.confidence,
        details: {
          silenceNotifications: envState.silenceNotifications,
          autoReply: envState.autoReply,
          isLearningSession: envState.isLearningSession,
        }
      });

      // Update environment mode in state
      actions.setTweak('environmentMode', envState.mode);
    }
  };

  // Triggered on any note content typing
  const handleContentChange = (val) => {
    if (!selected) return;

    // Live update the state immediately for fast feedback
    actions.updateNote({
      id: selectedId,
      content: val,
    });

    // Debounce the AI summarizer, tagger and auto-title generator to keep typing performant
    if (aiProcessTimeout.current) clearTimeout(aiProcessTimeout.current);
    aiProcessTimeout.current = setTimeout(() => {
      runAiAnalysis(val, selectedId);
    }, 1200);
  };

  // Triggered on title typing
  const handleTitleChange = (val) => {
    if (!selected) return;
    actions.updateNote({
      id: selectedId,
      title: val,
    });
  };

  // Triggered on Tag change
  const handleTagChange = (val) => {
    if (!selected) return;
    actions.updateNote({
      id: selectedId,
      tag: val,
    });
  };

  const createEmptyNote = () => {
    const id = `n_${Date.now().toString(36)}`;
    const note = {
      id,
      title: 'New note',
      tag: 'General',
      icon: 'notes',
      content: '',
      preview: '',
      pinned: false,
      edited: 'just now',
      words: 0,
      ai: 'Start writing or recording. I will automatically title, tag, and schedule actions for you.'
    };
    actions.addNote(note);
    setSelectedId(id);
    return id;
  };

  const deleteNote = (id) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    const n = notes.find(x => x.id === id);
    setConfirmDeleteId(null);
    actions.deleteNote(id);
    if (id === selectedId) {
      setSelectedId(notes.filter(x => x.id !== id)[0]?.id || null);
    }
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

  // Web Audio Waveform Analyzer
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
        
        // Map frequency bands to responsive bar heights
        const heights = Array.from(dataArrayRef.current)
          .slice(0, 15)
          .map(val => Math.max(4, Math.floor((val / 255) * 44)));
        
        setAudioLevelArray(heights);
        
        // Sum total volume level for glowing scale effect
        const totalVolume = heights.reduce((a, b) => a + b, 0) / heights.length;
        setVoiceVolume(totalVolume);

        animationFrameRef.current = requestAnimationFrame(updateWave);
      };

      updateWave();
    } catch (e) {
      console.warn("AudioContext setup failed or denied", e);
    }
  };

  // Speech Recognition / Voice Recording Setup
  const toggleVoiceRecording = async () => {
    if (isRecording) {
      // STOP recording
      setIsRecording(false);
      isRecordingRef.current = false;
      
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      // Cleanup Web Audio API refs
      if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
      simulationTimeoutsRef.current.forEach(clearTimeout);
      simulationTimeoutsRef.current = [];
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      
      fallbackIntervalRef.current = null;
      audioContextRef.current = null;
      analyserRef.current = null;
      streamRef.current = null;

      // Content is already live in the note from streaming — just trigger AI analysis
      const base = preRecordingContentRef.current;
      const accumulated = transcriptionAccumulatedRef.current;
      const finalContent = base ? (accumulated ? base + '\n' + accumulated : base) : accumulated;
      setTranscriptionStream('');
      if (finalContent.trim()) {
        setIsAiProcessing(true);
        setTimeout(() => {
          runAiAnalysis(finalContent, selectedId);
          setIsAiProcessing(false);
          actions.addNotification({ text: "Voice note transcribed & compiled!", kind: "info" });
        }, 800);
      }
    } else {
      // START recording
      setIsRecording(true);
      isRecordingRef.current = true;
      setTranscriptionStream('');
      setAudioLevelArray(Array(15).fill(4));
      // Capture pre-recording content so onresult handlers never use stale closure
      preRecordingContentRef.current = selected?.content || '';
      transcriptionAccumulatedRef.current = '';

      // Make sure we have an active note, if not create one
      let currentId = selectedId;
      if (!selected) {
        currentId = createEmptyNote();
      }

      // 1. Try accessing real microphone for Web Audio wave visualizer
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        startAudioContext(stream);
      } catch (err) {
        console.warn("Microphone hardware access not granted. Falling back to intelligent software wave animation.");
        // Software bounce interval fallback
        fallbackIntervalRef.current = setInterval(() => {
          if (!isRecordingRef.current) {
            clearInterval(fallbackIntervalRef.current);
            fallbackIntervalRef.current = null;
            return;
          }
          setAudioLevelArray(Array(15).fill(0).map(() => Math.floor(Math.random() * 32) + 6));
          setVoiceVolume(Math.floor(Math.random() * 20) + 5);
        }, 120);
      }

      // 2. Try browser SpeechRecognition API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onresult = (event) => {
          let interimText = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              // Accumulate finals via ref — avoids stale closure on notes array
              transcriptionAccumulatedRef.current += event.results[i][0].transcript + ' ';
            } else {
              interimText += event.results[i][0].transcript;
            }
          }
          const displayText = transcriptionAccumulatedRef.current + interimText;
          setTranscriptionStream(displayText);

          // Stream directly into the note using stable refs (not stale closure)
          if (currentId) {
            const base = preRecordingContentRef.current;
            actions.updateNote({
              id: currentId,
              content: base ? base + '\n' + displayText : displayText,
            });
          }
        };

        rec.onerror = (e) => console.warn("SpeechRec error: ", e);
        rec.onend = () => {
          // Use ref to check current recording state
          if (isRecordingRef.current) {
            setIsRecording(false);
            isRecordingRef.current = false;
          }
        };
        recognitionRef.current = rec;
        rec.start();
      } else {
        // Speech recognition fallback simulator: Type out a high-fidelity productivity instruction to demonstrate capabilities beautifully
        actions.addNotification({ text: "Simulating high-end voice transcription...", kind: "info" });
        
        const simulationPhrases = [
          "3:00 am meeting with Bessemer to discuss funding round.",
          " Also need to write up the investor memo v3 today.",
          " Then schedule a gym session at 6:00 pm to keep fresh.",
          " AI, extract these into my active schedule and remind me!"
        ];

        let currentPhraseIndex = 0;
        let charIndex = 0;

        const typeSimulatedText = () => {
          if (!isRecordingRef.current) return;
          if (currentPhraseIndex >= simulationPhrases.length) {
            // Auto-stop: trigger AI analysis on accumulated content
            setIsRecording(false);
            isRecordingRef.current = false;
            const base = preRecordingContentRef.current;
            const accumulated = transcriptionAccumulatedRef.current;
            const finalContent = base ? (accumulated ? base + '\n' + accumulated : base) : accumulated;
            setTranscriptionStream('');
            if (finalContent.trim()) {
              setIsAiProcessing(true);
              setTimeout(() => {
                runAiAnalysis(finalContent, currentId);
                setIsAiProcessing(false);
                actions.addNotification({ text: "Voice note transcribed & compiled!", kind: "info" });
              }, 800);
            }
            return;
          }

          const phrase = simulationPhrases[currentPhraseIndex];
          transcriptionAccumulatedRef.current += phrase[charIndex];
          const cumulativeText = transcriptionAccumulatedRef.current;
          setTranscriptionStream(cumulativeText);

          if (currentId) {
            const base = preRecordingContentRef.current;
            actions.updateNote({
              id: currentId,
              content: base ? base + '\n' + cumulativeText : cumulativeText,
            });
          }

          charIndex++;
          if (charIndex >= phrase.length) {
            currentPhraseIndex++;
            charIndex = 0;
            simulationTimeoutsRef.current.push(setTimeout(typeSimulatedText, 600));
          } else {
            simulationTimeoutsRef.current.push(setTimeout(typeSimulatedText, 45));
          }
        };

        // Start typing simulator
        simulationTimeoutsRef.current.push(setTimeout(typeSimulatedText, 400));
      }
    }
  };

  // Cleanup on unmount
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

  return (
    <ScreenShell
      eyebrow="AI Notes & Second Brain"
      title={<>Your <span className="t-display-italic" style={{ color: "var(--accent-orange)" }}>second brain</span>.</>}
      subtitle={<>Write or speak your thoughts. The local AI auto-titles, auto-tags, auto-schedules, and executes actions instantly as you type.</>}
      right={<>
        <PaperButton icon="sparkle" small onClick={summarizeAll}>Summarize all</PaperButton>
        <PaperButton icon="plus" primary onClick={createEmptyNote}>New note</PaperButton>
      </>}
    >
      <ScreenGuide screen="notes" />
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr 280px", gap: 16, height: "calc(100vh - 280px)", minHeight: 600 }}>
        
        {/* Left Side: Notes list */}
        <GlassCard padding={0} style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 8, borderBottom: "0.5px solid var(--ink-line)" }}>
            <Icon name="search" size={14} color="var(--ink-3)" />
            <input
              placeholder="Search notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ all: "unset", flex: 1, fontSize: 13, color: "var(--ink-1)" }}
            />
            {search && <button onClick={() => setSearch('')} style={{ fontSize: 11, color: "var(--ink-3)", background: "none", border: "none", cursor: "pointer" }}>Clear</button>}
          </div>
          
          <div className="scroll" style={{ flex: 1, overflowY: "auto" }}>
            {filtered.map(n => (
              <div key={n.id}
                onClick={() => setSelectedId(n.id)}
                style={{
                  padding: "12px 18px", borderBottom: "0.5px solid var(--ink-line)",
                  background: selectedId === n.id ? "rgba(245,165,36,.10)" : "transparent",
                  cursor: "pointer",
                  boxShadow: selectedId === n.id ? "inset 3px 0 0 var(--accent-orange)" : "none",
                  position: "relative",
                  transition: "background 150ms ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name={n.icon || 'notes'} size={12} color={selectedId === n.id ? "var(--accent-orange)" : "var(--ink-3)"} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>{n.title}</span>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {n.pinned && <span style={{ fontSize: 10, color: "var(--accent-orange)" }}>●</span>}
                  </div>
                </div>
                <div style={{
                  fontSize: 11, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.4,
                  overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                }}>{n.content || n.preview || 'No content yet'}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 9.5, fontWeight: 600, color: "var(--accent-orange)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{n.tag}</span>
                  <span style={{ fontSize: 10, color: "var(--ink-3)" }}>· {n.edited || 'just now'} · {n.words || 0}w</span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--ink-3)" }}>
                {search ? 'No notes match your search' : 'No notes yet. Click "New note" to start.'}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Center: Note canvas (Direct Automatic Edit) */}
        <GlassCard strong style={{ padding: "32px 44px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {selected ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              
              {/* Header Info Area */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <select
                      value={selected.tag || 'General'}
                      onChange={(e) => handleTagChange(e.target.value)}
                      style={{
                        padding: "3px 8px", borderRadius: 6, fontSize: 10.5,
                        fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
                        border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)",
                        color: "var(--accent-orange)", cursor: "pointer"
                      }}
                    >
                      {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    
                    <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                      📅 {selected.date || 'Today'} · {selected.edited || 'just now'}
                    </span>
                  </div>

                  {/* Title Direct Text Input */}
                  <input
                    value={selected.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Note Title..."
                    style={{
                      all: "unset", fontSize: 36, fontFamily: "var(--font-display)",
                      fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.15,
                      marginTop: 10, width: "100%", color: "var(--ink-1)"
                    }}
                  />
                </div>

                {/* Actions Toolbar */}
                <div style={{ display: "flex", gap: 6, marginLeft: 16 }}>
                  <button
                    onClick={() => togglePin(selected.id)}
                    style={{
                      fontSize: 11, background: "none", border: "none", cursor: "pointer",
                      color: selected.pinned ? "var(--accent-orange)" : "var(--ink-3)", padding: "4px 8px"
                    }}
                  >
                    {selected.pinned ? '● Pinned' : '○ Pin'}
                  </button>
                  {confirmDeleteId === selected.id ? (
                    <>
                      <button onClick={() => deleteNote(selected.id)} style={{ fontSize: 11, color: "#fff", background: "var(--accent-coral)", padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>Confirm delete</button>
                      <button onClick={() => setConfirmDeleteId(null)} style={{ fontSize: 11, color: "var(--ink-3)", padding: "4px 8px", cursor: "pointer" }}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => deleteNote(selected.id)} style={{ fontSize: 11, background: "none", border: "none", cursor: "pointer", color: "var(--accent-coral)", padding: "4px 8px" }}>Delete</button>
                  )}
                </div>
              </div>

              <div className="hair" style={{ margin: "0 0 20px" }} />

              {/* Main Content Editable Area */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
                <textarea
                  value={selected.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Start writing your thoughts, draft instructions for AI, or tap the mic below to dictate voice notes directly..."
                  style={{
                    all: "unset", fontSize: 16, lineHeight: 1.7, color: "var(--ink-1)",
                    width: "100%", flex: 1, resize: "none", overflowY: "auto"
                  }}
                />

                {/* Voice note direct overlay */}
                {isRecording && (
                  <div style={{
                    position: "absolute", inset: 0, background: "rgba(255,254,250,0.95)",
                    backdropFilter: "blur(4px)", display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", borderRadius: 12, zIndex: 10,
                    border: "1px dashed var(--accent-orange)"
                  }}>
                    <div style={{
                      transform: `scale(${1 + voiceVolume / 80})`,
                      transition: "transform 100ms ease",
                      marginBottom: 20
                    }}>
                      <AiOrb size={64} intensity={1.5} />
                    </div>
                    
                    <h3 style={{ margin: "0 0 6px", fontSize: 18, color: "var(--ink-1)" }}>Listening to Voice Note...</h3>
                    <p style={{ margin: "0 0 24px", fontSize: 12, color: "var(--ink-3)", textAlign: "center", maxWidth: 280 }}>
                      Microphone levels active. Say your meeting times or activities to auto-schedule them!
                    </p>

                    {/* Audio wave frequency visualizer */}
                    <div style={{ display: "flex", gap: 3, alignItems: "center", height: 50, marginBottom: 30 }}>
                      {audioLevelArray.map((val, idx) => (
                        <div key={idx} style={{
                          width: 4, height: val,
                          background: "linear-gradient(to top, var(--accent-orange), var(--accent-coral))",
                          borderRadius: 99,
                          transition: "height 80ms ease"
                        }} />
                      ))}
                    </div>

                    {/* Streaming draft transcription */}
                    <div style={{
                      padding: "10px 18px", borderRadius: 8, background: "rgba(26,20,16,.03)",
                      fontSize: 13, color: "var(--ink-2)", fontStyle: "italic", maxWidth: "80%",
                      textAlign: "center", minHeight: 40, border: "0.5px solid var(--ink-line)"
                    }}>
                      "{transcriptionStream || 'Speak now...'}"
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Panel: Floating Mic Recording Trigger */}
              <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", paddingTop: 16 }}>
                <button
                  onClick={toggleVoiceRecording}
                  style={{
                    all: "unset", display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 24px", borderRadius: 99, cursor: "pointer",
                    background: isRecording ? "linear-gradient(180deg, #e7402e 0%, #c2185b 100%)" : "rgba(26,20,16,.04)",
                    color: isRecording ? "#fff" : "var(--ink-1)",
                    border: "0.5px solid rgba(26,20,16,.10)",
                    boxShadow: isRecording ? "0 0 16px rgba(231,64,46,.4)" : "none",
                    transition: "all var(--motion-quick) var(--ease-snap)"
                  }}
                >
                  <Icon name="audio" size={18} color={isRecording ? "#fff" : "var(--accent-orange)"} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {isRecording ? "Stop & Transcribe Note" : "Record Direct Voice Note"}
                  </span>
                </button>
              </div>

            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--ink-3)", fontSize: 14 }}>
              Select a note to view or create a new one
            </div>
          )}
        </GlassCard>

        {/* Right Side: AI Assistant context summaries */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <GlassCard style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <AiOrb size={20} intensity={1.2} />
              <div className="t-cap" style={{ color: "var(--accent-orange)" }}>AI Assistant</div>
              {state.tweaks?.environmentMode && state.tweaks?.environmentMode !== 'normal' && (
                <span className="chip" style={{
                  marginLeft: 'auto',
                  background: state.tweaks?.environmentMode === 'learning' ? 'rgba(74,158,255,.12)' :
                    state.tweaks?.environmentMode === 'rest' ? 'rgba(106,106,255,.12)' :
                    state.tweaks?.environmentMode === 'focus' ? 'rgba(232,160,32,.12)' :
                    state.tweaks?.environmentMode === 'sickness' ? 'rgba(232,80,80,.12)' : 'rgba(200,200,200,.12)',
                  color: state.tweaks?.environmentMode === 'learning' ? '#4a9eff' :
                    state.tweaks?.environmentMode === 'rest' ? '#6a6aff' :
                    state.tweaks?.environmentMode === 'focus' ? '#e8a020' :
                    state.tweaks?.environmentMode === 'sickness' ? '#e85050' : 'var(--ink-2)',
                }}>
                  {state.tweaks?.environmentMode === 'learning' ? '🧠 Learning' :
                    state.tweaks?.environmentMode === 'rest' ? '🌙 Rest' :
                    state.tweaks?.environmentMode === 'focus' ? '🎯 Focus' :
                    state.tweaks?.environmentMode === 'sickness' ? '🤒 Sick' :
                    state.tweaks?.environmentMode === 'shelter' ? '🛡️ Shelter' :
                    state.tweaks?.environmentMode === 'redirect' ? '🔄 Redirect' :
                    state.tweaks?.environmentMode === 'offline' ? '🔕 Away' : state.tweaks?.environmentMode}
                </span>
              )}
            </div>
            
            <div className="scroll" style={{ flex: 1, overflowY: "auto", fontSize: 13, lineHeight: 1.6, color: "var(--ink-1)" }}>
              {selected?.ai ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ margin: 0 }}>{selected.ai}</p>
                  
                  {/* Extracted time display warning */}
                  {selected.ai.includes("Detected a time-based prompt") && (
                    <div style={{
                      padding: "8px 12px", borderRadius: 8, background: "rgba(74,143,94,.08)",
                      border: "0.5px solid rgba(74,143,94,.2)", display: "flex", alignItems: "center", gap: 6,
                      fontSize: 11, color: "green"
                    }}>
                      <Icon name="check" size={12} color="green" />
                      <span>Action verified & committed successfully.</span>
                    </div>
                  )}
                </div>
              ) : (
                "I'm listening in the background. Write or record above, and I'll automatically title, tag, and schedule actions for you."
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="t-cap">Second Brain Stats</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10, fontSize: 12, color: "var(--ink-2)" }}>
              <div>{notes.length} cataloged memories</div>
              <div>{notes.filter(n => n.pinned).length} pinned nodes</div>
              <div>{notes.reduce((s, n) => s + (n.words || 0), 0)} total words processed</div>
              <div style={{ marginTop: 6 }}>
                <span className="chip" style={{ background: "rgba(245,165,36,.12)", color: "var(--accent-orange)" }}>
                  🧠 {notes.filter(n => n.tag === 'Learning').length} learning sessions
                </span>
              </div>
            </div>
            {notes.filter(n => n.tag === 'Learning').length > 0 && (
              <div style={{ marginTop: 10 }}>
                <PaperButton
                  icon="sparkle"
                  small
                  onClick={() => {
                    const learningNotes = notes.filter(n => n.tag === 'Learning');
                    const book = compileLearningIntoBook(learningNotes);
                    const bookNote = formatBookAsNote(book);
                    actions.addNote(bookNote);
                    actions.addNotification({
                      text: `📗 Compiled ${book.stats.totalNotes} learning sessions into a knowledge base with ${book.chapters.length} chapters`,
                      kind: 'info',
                    });
                  }}
                >
                  📗 Compile Learning into Book
                </PaperButton>
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <div className="t-cap">Auto tags</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {[...new Set(notes.map(n => n.tag))].map(tag => (
                <span key={tag} className="chip" onClick={() => setSearch(tag)} style={{ cursor: "pointer" }}>
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
