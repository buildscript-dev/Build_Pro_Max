import React, { useState, useEffect, useRef } from 'react';
import { GlassCard, PaperButton, Icon, AiOrb, Avatar } from '../components/ui/Icons';
import { useApp } from '../store/AppContext';
import { generateAiResponse } from '../services/ai';

const ScreenShell = ({ title, eyebrow, subtitle, children, padTop = 86, padBottom = 110 }) => (
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
    </div>
    {children}
  </div>
);

export const AiChat = () => {
  const { state, actions } = useApp();
  const messagesEndRef = useRef(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const messages = state.chatMessages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!draft.trim() || sending) return;
    const userMsg = draft.trim();
    setDraft("");
    setSending(true);
    actions.addChatMessage({ role: "user", text: userMsg });

    const response = await generateAiResponse(userMsg, state);
    const qLower = userMsg.toLowerCase();
    const suggestedActions = [];
    if (/cancel/i.test(qLower)) suggestedActions.push('Show me');
    if (/sana|ines/i.test(qLower)) suggestedActions.push('Schedule decision');
    if (/task/i.test(qLower)) suggestedActions.push('Show tasks');
    if (/memo|bessemer/i.test(qLower)) suggestedActions.push('Open memo');

    actions.addChatMessage({
      role: "ai",
      text: response,
      actions: suggestedActions.length > 0 ? suggestedActions : undefined,
    });
    setSending(false);
  };

  const handleAction = (action) => {
    setDraft(action);
  };

  return (
    <ScreenShell
      eyebrow="AI Chat"
      title={<>Talk to <span className="t-display-italic" style={{ color: "var(--accent-orange)" }}>your AI</span>.</>}
      subtitle={<>The same AI that lives in your inbox, planner, and notes. It already knows your week.</>}
    >
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
              <Icon name="plus" size={16} color="var(--ink-3)" />
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
              <div>• {state.tasks?.filter(t => t.status !== 'done').length || 0} open tasks</div>
              <div>• {state.tasks?.filter(t => /today/i.test(t.due) && t.status !== 'done').length || 0} due today</div>
              <div>• {state.notes?.length || 0} notes captured</div>
              <div>• Pages streak: {state.user?.streak || 47} days · don't break it</div>
            </div>
          </GlassCard>
          <GlassCard>
            <div className="t-cap">Try asking…</div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "What can I cancel today?",
                "Where is Caro's last reply?",
                "Compare Sana vs Ines",
                "Give me a weekly summary",
              ].map(s => (
                <div key={s} onClick={() => setDraft(s)} style={{
                  padding: "9px 12px", borderRadius: 9,
                  background: "rgba(26,20,16,.04)", fontSize: 12.5, color: "var(--ink-2)",
                  cursor: "pointer",
                  transition: "background 120ms",
                }}>{s}</div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </ScreenShell>
  );
};
