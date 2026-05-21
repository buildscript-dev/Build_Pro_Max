import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GlassCard, PaperButton, Icon, AiOrb, Avatar } from '../components/ui/Icons';
import { useAppState, useAppActions, useAppStore } from '../store/AppContext';
import { generateAiResponse, fetchAndSummarizeUrl } from '../services/ai';
import { ScreenShell } from '../components/ui/ScreenShell';
import { ScreenGuide } from '../components/ui/ScreenGuide';

export const AiChat = () => {
  const { actions } = useAppActions();
  const store = useAppStore();
  const messages = useAppState((s) => s.chatMessages) || [];
  const openTasks = useAppState((s) => s.tasks?.filter(t => t.status !== 'done').length || 0);
  const todayTasks = useAppState((s) => s.tasks?.filter(t => /today/i.test(t.due) && t.status !== 'done').length || 0);
  const notesCount = useAppState((s) => s.notes?.length || 0);
  const messagesEndRef = useRef(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [webUrl, setWebUrl] = useState('');
  const [webSummary, setWebSummary] = useState('');
  const [webError, setWebError] = useState('');
  const [webLoading, setWebLoading] = useState(false);
  const [webSaveable, setWebSaveable] = useState(false);
  const webDataRef = useRef(null);

  const fetchWebSummary = async () => {
    if (!webUrl.trim() || webLoading) return;
    setWebLoading(true);
    setWebError('');
    setWebSummary('');
    setWebSaveable(false);
    const result = await fetchAndSummarizeUrl(webUrl.trim());
    if (result.error) {
      setWebError(result.error);
    } else {
      setWebSummary(result.summary);
      setWebSaveable(true);
      webDataRef.current = result;
    }
    setWebLoading(false);
  };

  const saveWebAsNote = () => {
    if (!webDataRef.current) return;
    try {
      const { summary, url } = webDataRef.current;
      const safeSummary = typeof summary === 'string' ? summary : String(summary || '');
      const title = `Website: ${url.replace(/https?:\/\//, '').slice(0, 50)}`;
      actions.addNote({
        title,
        tag: 'Reading',
        icon: 'notes',
        content: `URL: ${url}\n\n${safeSummary}`,
        preview: safeSummary.slice(0, 120),
        ai: `Auto-summarized from ${url}`,
      });
      actions.addNotification({ text: 'Website summary saved as note', kind: 'info' });
      setWebSaveable(false);
    } catch {
      actions.addNotification({ text: 'Failed to save website summary', kind: 'warning' });
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const executeAiAction = useCallback(async (action) => {
    const { onNavigate } = window.__opencode || {};
    switch (action.type) {
      case 'navigate':
        if (onNavigate) onNavigate(action.screen);
        break;
      case 'addTask':
        actions.addTask(action.data);
        actions.addNotification({ text: `Task "${action.data.title}" created by AI`, kind: 'info' });
        break;
      case 'addNote':
        actions.addNote(action.data);
        actions.addNotification({ text: 'Note created by AI', kind: 'info' });
        break;
      case 'addEvent':
        actions.addEvent(action.data);
        actions.addNotification({ text: `Event "${action.data.title}" added by AI`, kind: 'info' });
        break;
      case 'addReminder':
        actions.addReminder(action.data);
        actions.addNotification({ text: `Reminder set by AI`, kind: 'info' });
        break;
      case 'updateTask':
        actions.updateTask(action.data);
        break;
      case 'toggleTask':
        actions.toggleTask(action.data.id);
        break;
      case 'deleteTask':
        actions.deleteTask(action.data.id);
        actions.addNotification({ text: `Task deleted by AI`, kind: 'info' });
        break;
      case 'addContact':
        actions.addContact(action.data);
        break;
      case 'updateContact':
        actions.updateContact(action.data);
        break;
      case 'addChatMessage':
        actions.addChatMessage(action.data);
        break;
      case 'notify':
        actions.addNotification({ text: action.text, kind: action.kind || 'info' });
        break;
      case 'clearChat':
        actions.clearChat();
        actions.addNotification({ text: 'Conversation cleared', kind: 'info' });
        break;
      default:
        break;
    }
  }, [actions]);

  const parseAiActions = useCallback((text) => {
    if (!text) return null;
    // Look for structured actions in the AI response: [action: type, ...params]
    const actionRegex = /\[action:\s*(\w+)\s*,\s*([^\]]+)\]/gi;
    let match;
    const actions = [];
    while ((match = actionRegex.exec(text)) !== null) {
      try {
        const type = match[1];
        const params = JSON.parse(match[2]);
        actions.push({ type, ...params });
      } catch {
        // If JSON parse fails, treat as string params
        actions.push({ type: match[1], data: { title: match[2].trim() } });
      }
    }
    return actions.length > 0 ? actions : null;
  }, []);

  const send = async () => {
    if (!draft.trim() || sending) return;
    const userMsg = draft.trim();
    setDraft("");
    setSending(true);
    try {
      actions.addChatMessage({ role: "user", text: userMsg });

      const response = await generateAiResponse(userMsg, store.getSnapshot(), messages);
      const qLower = userMsg.toLowerCase();
      const suggestedActions = [];
      if (/meeting|schedule|event/i.test(qLower)) suggestedActions.push('Show calendar');
      if (/task|priority|overdue|p0|p1/i.test(qLower)) suggestedActions.push('Show tasks');
      if (/contact|person|who|warm/i.test(qLower)) suggestedActions.push('Show contacts');
      if (/note|know|search|find/i.test(qLower)) suggestedActions.push('Show notes');
      if (/file|transfer/i.test(qLower)) suggestedActions.push('Show files');
      if (/website|url|http|\.com|summarize|fetch/i.test(qLower)) suggestedActions.push('Summarize website');

      actions.addChatMessage({
        role: "ai",
        text: response || "I couldn't process that. Try asking about your tasks, notes, contacts, or events.",
        actions: suggestedActions.length > 0 ? suggestedActions : undefined,
      });

      // Execute any structured actions from AI response
      const parsedActions = parseAiActions(response);
      if (parsedActions) {
        for (const action of parsedActions) {
          await executeAiAction(action);
        }
      }
    } catch (err) {
      actions.addChatMessage({
        role: "ai",
        text: `Sorry, I hit an error: ${err.message}. Please try again.`,
      });
    }
    setSending(false);
  };

  const clearChat = () => {
    actions.clearChat();
    actions.addNotification({ text: 'Conversation cleared', kind: 'info' });
  };

  const webInputRef = useRef(null);

  const handleAction = (action) => {
    const nav = window.__opencode?.onNavigate;
    const navMap = {
      'Show calendar': 'calendar',
      'Show tasks': 'tasks',
      'Show contacts': 'contacts',
      'Show notes': 'notes',
      'Show files': 'files',
      'Open memo': 'files',
    };
    if (action === 'Summarize website') {
      webInputRef.current?.focus();
    } else if (action === 'Send now') {
      actions.addNotification({ text: 'Bessemer follow-up marked as sent', kind: 'info' });
      nav?.('notes');
    } else if (action === 'Push 30m') {
      actions.addNotification({ text: 'Follow-up pushed to 15:00', kind: 'info' });
    } else if (navMap[action]) {
      nav?.(navMap[action]);
    } else {
      setDraft(action);
    }
  };

  return (
    <ScreenShell
      eyebrow="AI Chat"
      title={<>Talk to <span className="t-display-italic" style={{ color: "var(--accent-orange)" }}>your AI</span>.</>}
      subtitle={<>The same AI that lives in your inbox, planner, and notes. It already knows your week.</>}
    >
      <ScreenGuide screen="chat" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, height: "calc(100vh - 280px)", minHeight: 540 }}>
        <GlassCard strong padding={0} style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div className="scroll" style={{ flex: 1, overflowY: "auto", padding: "30px 36px", display: "flex", flexDirection: "column", gap: 20 }}>
            {messages.map((m, i) => (
              <div key={m.id || i} style={{ display: "flex", gap: 12, alignItems: "flex-start", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
                {m.role === "ai" ? <AiOrb size={28} /> : <Avatar initials="LT" color="orange" size={28} />}
                <div style={{
                  maxWidth: "70%",
                  padding: "12px 16px", borderRadius: 16,
                  background: m.role === "user" ? "rgba(245,165,36,.16)" : "rgba(255,252,244,.85)",
                  border: "0.5px solid rgba(255,255,255,.7)",
                  boxShadow: "0 1px 0 rgba(255,255,255,.7) inset, 0 2px 6px -2px rgba(46,30,12,.08)",
                  borderBottomLeftRadius: m.role === "ai" ? 4 : 16,
                  borderBottomRightRadius: m.role === "user" ? 4 : 16,
                }}>
                  <div style={{ fontSize: 14, color: "var(--ink-1)", lineHeight: 1.55 }}>{m.text}</div>
                  {m.actions && (
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      {m.actions.map((a, j) => <PaperButton key={`${m.id || i}-action-${j}`} small primary={j===1} onClick={() => handleAction(a)}>{a}</PaperButton>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div style={{ padding: 16, borderTop: "0.5px solid var(--ink-line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 14, background: "rgba(255,252,244,.7)", border: "0.5px solid rgba(255,255,255,.7)" }}>
              {sending ? (
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--ink-line)", borderTopColor: "var(--accent-orange)", animation: "orb-pulse 1s linear infinite" }} />
              ) : (
                <Icon name="plus" size={16} color="var(--ink-3)" />
              )}
              <input
                placeholder="Ask, plan, draft, beam…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !sending) { e.preventDefault(); send(); } }}
                style={{ all: "unset", flex: 1, fontSize: 14, color: "var(--ink-1)" }}
              />
              <PaperButton primary small onClick={send} icon={sending ? undefined : "arrow"} disabled={sending}>{sending ? 'Thinking…' : 'Send'}</PaperButton>
            </div>
          </div>
        </GlassCard>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <GlassCard>
            <div className="t-cap" style={{ color: "var(--accent-orange)" }}>What I know about your week</div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
              <div>• {openTasks} open tasks</div>
              <div>• {todayTasks} due today</div>
              <div>• {notesCount} notes captured</div>
              <div>• {messages.length} messages this session</div>
            </div>
            <div className="hair" style={{ margin: "12px 0" }}/>
            <PaperButton small onClick={clearChat}>Clear conversation</PaperButton>
          </GlassCard>
          <GlassCard>
            <div className="t-cap">Website assistant</div>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                ref={webInputRef}
                placeholder="Paste a URL to summarize…"
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !webLoading) fetchWebSummary(); }}
                style={{ padding: "8px 12px", fontSize: 12.5, borderRadius: 8, border: "0.5px solid var(--ink-line)", background: "rgba(255,252,244,.7)", color: "var(--ink-1)", width: "100%", boxSizing: "border-box" }}
              />
              <PaperButton small primary onClick={fetchWebSummary} disabled={webLoading}>
                {webLoading ? 'Fetching…' : 'Summarize'}
              </PaperButton>
              {webSummary && (
                <div style={{
                  marginTop: 8, padding: 10, borderRadius: 8,
                  background: "rgba(255,252,244,.6)", border: "0.5px solid rgba(26,20,16,.06)",
                  fontSize: 12, color: "var(--ink-1)", lineHeight: 1.5, maxHeight: 240, overflowY: "auto",
                  whiteSpace: "pre-wrap",
                }}>{webSummary}</div>
              )}
              {webError && (
                <div style={{ fontSize: 11.5, color: "var(--accent-coral)", marginTop: 4 }}>{webError}</div>
              )}
              {webSaveable && webUrl.trim() && (
                <PaperButton small onClick={saveWebAsNote}>Save as note</PaperButton>
              )}
            </div>
          </GlassCard>
          <GlassCard>
            <div className="t-cap">Try asking…</div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "What meetings do I have today?",
                "What are my P0 tasks?",
                "Do I have any overdue tasks?",
                "Search my notes about investors",
                "How warm are my contacts?",
                "Any reminders today?",
              ].map(s => (
                <button key={s} type="button" onClick={() => setDraft(s)} style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "9px 12px", borderRadius: 9,
                  background: "rgba(26,20,16,.04)", fontSize: 12.5, color: "var(--ink-2)",
                  transition: "background 120ms",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(245,165,36,.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(26,20,16,.04)"; }}
                >{s}</button>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </ScreenShell>
  );
};
