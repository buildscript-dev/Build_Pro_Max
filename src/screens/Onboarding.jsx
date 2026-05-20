import React, { useState } from 'react';
import { GlassCard, PaperButton, Icon, AiOrb, Avatar } from '../components/ui/Icons';
import { accentColor } from '../data';
import { useApp } from '../store/AppContext';

export const Onboarding = ({ onComplete }) => {
  const { actions } = useApp();
  const [step, setStep] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState('Close the seed round');
  const [selectedTone, setSelectedTone] = useState('Direct');
  const steps = [
    { id: 0, label: "Welcome", icon: "orb" },
    { id: 1, label: "Connect", icon: "sync" },
    { id: 2, label: "First track", icon: "planner" },
    { id: 3, label: "Pick your tone", icon: "sparkle" },
    { id: 4, label: "Done", icon: "check" },
  ];

  const complete = () => {
    try {
      localStorage.setItem('onboarding_complete', 'true');
      localStorage.setItem('ai_personality', JSON.stringify({
        voice: 'background',
        autoPlan: true,
        moodDetection: true,
        relWatcher: true,
        tone: selectedTone.toLowerCase(),
        role: '',
      }));
    } catch { /* ignore storage failures */ }
    actions.addTask({
      title: selectedTrack,
      project: selectedTrack.includes('seed') ? 'Fundraise' : selectedTrack.includes('onboarding') ? 'Product' : selectedTrack.includes('designer') ? 'Hiring' : 'General',
      priority: 'P0',
      due: 'Today',
      status: 'todo',
      ai: 'Created from onboarding track',
    });
    actions.addNotification({ text: 'Onboarding complete! Welcome to Build_PRO_MAX_1', kind: 'info' });
    onComplete?.();
  };

  return (
    <div style={{ position: "absolute", inset: 0, paddingTop: 90, paddingBottom: 110, paddingLeft: 36, paddingRight: 36, overflowY: "auto" }} className="scroll">
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          {steps.map((s, i) => (
            <React.Fragment key={s.id}>
              <div style={{
                width: 36, height: 36, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
                background: i <= step ? "linear-gradient(135deg, var(--accent-amber), var(--accent-orange))" : "rgba(26,20,16,.05)",
                color: i <= step ? "#fff" : "var(--ink-3)",
                boxShadow: i <= step ? "0 4px 10px -2px rgba(240,107,28,.4)" : "0 1px 0 rgba(255,255,255,.7) inset",
              }}>
                {i < step ? <Icon name="check" size={16} stroke={2.2}/> : <Icon name={s.icon} size={15} />}
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: 2, borderRadius: 2, background: i < step ? "var(--accent-orange)" : "rgba(26,20,16,.08)" }}/>
              )}
            </React.Fragment>
          ))}
        </div>

        <GlassCard strong style={{ padding: 0, minHeight: 480, position: "relative", overflow: "hidden" }}>
          {step === 0 && (
            <div style={{ padding: "60px 64px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 30 }}>
                <AiOrb size={84} intensity={1.6} />
              </div>
              <div className="t-cap" style={{ color: "var(--accent-orange)" }}>Build_PRO_MAX_1 · B.0.0.1</div>
              <h1 className="t-display" style={{ fontSize: 60, fontWeight: 400, margin: "16px 0 12px", letterSpacing: "-0.025em", lineHeight: 1.02 }}>
                A second brain that <span className="t-display-italic" style={{ color: "var(--accent-orange)" }}>actually moves</span>.
              </h1>
              <p style={{ fontSize: 17, color: "var(--ink-2)", maxWidth: 580, margin: "0 auto", lineHeight: 1.55 }}>
                Most productivity tools help you organize. This one helps you execute. The AI watches your
                week, notices what's sliding, and quietly proposes the next move.
              </p>
              <div style={{ marginTop: 36 }}>
                <PaperButton primary onClick={() => setStep(1)} icon="arrow" style={{ height: 48, padding: "0 24px", fontSize: 14 }}>Let's go</PaperButton>
              </div>
            </div>
          )}
          {step === 1 && (
            <div style={{ padding: 48 }}>
              <h2 className="t-display" style={{ fontSize: 42, fontWeight: 400, margin: 0, letterSpacing: "-0.02em" }}>Plug in your life.</h2>
              <p style={{ fontSize: 15, color: "var(--ink-2)", marginTop: 8, maxWidth: 520 }}>
                The more we connect, the more useful the AI becomes. Skip anything you don't want.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 28 }}>
                {[
                  { name: "Google Calendar", connected: false, meta: "Set up in Settings" },
                  { name: "iCloud",          connected: false, meta: "Coming soon" },
                  { name: "Slack",           connected: false, meta: "Coming soon" },
                  { name: "Linear",          connected: false, meta: "For task sync" },
                  { name: "Notion",          connected: false, meta: "Import only" },
                  { name: "Gmail",           connected: false, meta: "Drafts + threads" },
                ].map(c => (
                  <div key={c.name} style={{
                    padding: 14, borderRadius: 12,
                    background: c.connected ? "rgba(74,143,94,.08)" : "rgba(255,252,244,.55)",
                    border: `0.5px solid ${c.connected ? "rgba(74,143,94,.3)" : "rgba(26,20,16,.08)"}`,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{c.meta}</div>
                    </div>
                    {c.connected
                      ? <Icon name="check" size={16} color="var(--ok)" />
                      : <PaperButton small onClick={() => actions.addNotification({ text: `${c.name} setup lives in Settings → Connected accounts`, kind: 'info' })}>Set up later</PaperButton>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {step === 2 && (
            <div style={{ padding: 48 }}>
              <h2 className="t-display" style={{ fontSize: 42, fontWeight: 400, margin: 0 }}>Your first execution track.</h2>
              <p style={{ fontSize: 15, color: "var(--ink-2)", marginTop: 8, maxWidth: 560 }}>
                Tracks are the unit of execution. Pick one to start; we'll generate next-week's blocks for it.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginTop: 28 }}>
                {[
                  { name: "Close the seed round", color: "coral" },
                  { name: "Ship onboarding v3",   color: "orange" },
                  { name: "Hire founding designer", color: "amber" },
                  { name: "Reading every morning", color: "rose" },
                ].map(t => (
                  <button key={t.name} onClick={() => setSelectedTrack(t.name)} style={{
                    all: 'unset',
                    padding: 16, borderRadius: 14,
                    background: selectedTrack === t.name ? `${accentColor[t.color]}18` : "rgba(255,252,244,.55)",
                    border: `0.5px solid ${selectedTrack === t.name ? accentColor[t.color] + "55" : "rgba(26,20,16,.08)"}`,
                    boxShadow: selectedTrack === t.name ? `inset 0 0 0 1px ${accentColor[t.color]}33` : "none",
                    cursor: 'pointer',
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 999, background: accentColor[t.color], boxShadow: `0 0 6px ${accentColor[t.color]}88` }}/>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{t.name}</span>
                      {selectedTrack === t.name && <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: accentColor[t.color], textTransform: "uppercase", letterSpacing: "0.08em" }}>Selected</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 3 && (
            <div style={{ padding: 48 }}>
              <h2 className="t-display" style={{ fontSize: 42, fontWeight: 400, margin: 0 }}>How should the AI talk to you?</h2>
              <p style={{ fontSize: 15, color: "var(--ink-2)", marginTop: 8 }}>You can change this anytime.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 28 }}>
                {[
                  { name: "Polite",   sub: "Soft, supportive, careful with your time." },
                  { name: "Direct",   sub: "Tells you what's broken without softening." },
                  { name: "Brutal",   sub: "Founder-mode. No buffer. May sting." },
                ].map(t => (
                  <button key={t.name} onClick={() => setSelectedTone(t.name)} style={{
                    all: 'unset',
                    padding: 18, borderRadius: 14,
                    background: selectedTone === t.name ? "rgba(245,165,36,.16)" : "rgba(255,252,244,.55)",
                    border: `0.5px solid ${selectedTone === t.name ? "rgba(245,165,36,.5)" : "rgba(26,20,16,.08)"}`,
                    cursor: 'pointer',
                  }}>
                    <div className="t-display" style={{ fontSize: 24 }}>{t.name}</div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 6, lineHeight: 1.4 }}>{t.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 4 && (
            <div style={{ padding: "60px 64px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--accent-amber), var(--accent-coral))",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                  boxShadow: "0 12px 36px -6px rgba(240,107,28,.5)",
                }}>
                  <Icon name="check" size={36} stroke={2.4} />
                </div>
              </div>
              <h1 className="t-display" style={{ fontSize: 52, fontWeight: 400, margin: 0, letterSpacing: "-0.02em" }}>You're in.</h1>
              <p style={{ fontSize: 16, color: "var(--ink-2)", maxWidth: 520, margin: "12px auto 0", lineHeight: 1.55 }}>
                Your week is sketched out. Open the Workspace — your AI second brain is already watching.
              </p>
            </div>
          )}

          <div style={{
            position: "absolute", left: 0, right: 0, bottom: 0,
            padding: "16px 28px", display: "flex", alignItems: "center", gap: 12,
            borderTop: "0.5px solid var(--ink-line)",
            background: "rgba(255,252,244,.4)",
          }}>
            <button onClick={() => setStep(s => Math.max(0, s-1))} disabled={step===0} style={{
              padding: "8px 14px", fontSize: 12, color: step === 0 ? "var(--ink-4)" : "var(--ink-2)",
            }}>← Back</button>
            <span className="t-mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-3)" }}>
              {step+1} / {steps.length}
            </span>
            <PaperButton primary small onClick={() => {
              if (step === steps.length - 1) { complete(); }
              else { setStep(s => Math.min(steps.length-1, s+1)); }
            }}>
              {step === steps.length - 1 ? "Enter workspace" : "Continue"}
            </PaperButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
