import React, { useState, useEffect, useRef } from 'react';
import { FOCUS_MODES, LEARNER_TRACKS, EXECUTION_TRACKS, getProgress, getCompletedCount } from '../../services/focus';
import { Icon } from '../ui/Icons';

const TRACKS_STORAGE_KEY = 'focus_tracks_progress';

function loadTrackProgress() {
  try {
    const raw = localStorage.getItem(TRACKS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveTrackProgress(progress) {
  try {
    localStorage.setItem(TRACKS_STORAGE_KEY, JSON.stringify(progress));
  } catch {}
}

export const FocusPanel = ({ focusMode, onSetMode, onNavigate, onClose }) => {
  const [selectedMode, setSelectedMode] = useState(focusMode || 'off');
  const mode = selectedMode;
  const currentMode = FOCUS_MODES.find(m => m.id === mode) || FOCUS_MODES[0];
  const isLearner = mode === 'learner';
  const isExecution = mode === 'execution';

  const [trackProgress, setTrackProgress] = useState(loadTrackProgress);
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(25);
  const timerRef = useRef(null);

  const handleEnterMode = () => {
    onSetMode(mode);
    onClose();
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const activeTrack = isLearner
    ? LEARNER_TRACKS.find(t => t.id === activeTrackId)
    : isExecution
      ? EXECUTION_TRACKS.find(t => t.id === activeTrackId)
      : null;

  const persistProgress = (updater) => {
    setTrackProgress(prev => {
      const next = updater(prev);
      saveTrackProgress(next);
      return next;
    });
  };

  const toggleStep = (trackId, stepId) => {
    persistProgress(prev => {
      const key = `${focusMode}_${trackId}`;
      const current = prev[key] ? [...prev[key]] : [];
      const idx = current.indexOf(stepId);
      if (idx >= 0) current.splice(idx, 1);
      else current.push(stepId);
      return { ...prev, [key]: current };
    });
  };

  const resetTrack = (trackId) => {
    persistProgress(prev => {
      const next = { ...prev };
      delete next[`${focusMode}_${trackId}`];
      return next;
    });
  };

  const getTrackSteps = (track) => {
    const key = `${focusMode}_${track.id}`;
    const doneSteps = trackProgress[key] || [];
    return track.steps.map(s => ({ ...s, done: doneSteps.includes(s.id) }));
  };

  const handleStepClick = (step) => {
    if (step.link) onNavigate(step.link);
  };

  const startTimer = (min) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(min * 60);
    setTimerRunning(true);
    setTimerMinutes(min);
  };

  useEffect(() => {
    if (!timerRunning) return;
    if (timer <= 0) {
      setTimerRunning(false);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerRunning]); // only re-subscribe when running state changes, not on every tick

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(246,241,229,.7)', backdropFilter: 'blur(8px)',
      animation: 'expand-fade 200ms var(--ease-glass)',
    }}>
      <div className="glass" style={{ width: 640, maxHeight: '90vh', borderRadius: 24 }}>
        <div className="glass-pane" style={{ padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '0.5px solid var(--ink-line)' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Focus Mode</div>
              <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', marginTop: 2 }}>{currentMode.label}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {FOCUS_MODES.map(m => (
                <button key={m.id} onClick={() => { setSelectedMode(m.id); setActiveTrackId(null); }}
                  style={{
                    padding: '6px 14px', borderRadius: 999, fontSize: 11.5, fontWeight: 500,
                    background: mode === m.id ? 'rgba(26,20,16,.86)' : 'rgba(26,20,16,.05)',
                    color: mode === m.id ? '#fff8e8' : 'var(--ink-2)',
                    border: 'none',
                    transition: 'all 200ms ease',
                  }}
                >{m.label}</button>
              ))}
              <button onClick={onClose}
                style={{ width: 32, height: 32, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', marginLeft: 8 }}>✕</button>
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px' }}>
            {mode === 'off' && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
                <div style={{ fontSize: 16, color: 'var(--ink-1)', fontWeight: 500 }}>Focus is off</div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.5 }}>
                  Pick a mode above to enter a distraction-free workspace.<br />
                  <strong>Learner</strong> guides you step by step. <strong>Execution</strong> locks you in.
                </div>
              </div>
            )}

            {isLearner && !activeTrack && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>Pick a track to start learning. Each has steps you complete at your own pace.</div>
                {LEARNER_TRACKS.map(track => {
                  const steps = getTrackSteps(track);
                  const pct = getProgress({ steps });
                  const done = steps.filter(s => s.done).length;
                  return (
                    <button key={track.id} onClick={() => setActiveTrackId(track.id)}
                      style={{
                        padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                        background: 'rgba(255,252,244,.6)', border: '0.5px solid var(--ink-line)',
                        display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
                        transition: 'all 200ms ease',
                      }}>
                      <div style={{ fontSize: 28 }}>{track.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{track.title}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{track.description}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                          <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'rgba(26,20,16,.08)' }}>
                            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: pct === 100 ? 'var(--ok)' : 'var(--accent-orange)', transition: 'width 400ms ease' }} />
                          </div>
                          <span style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600 }}>{done}/{track.steps.length}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {isLearner && activeTrack && (
              <div>
                <button onClick={() => setActiveTrackId(null)}
                  style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  ← Back to tracks
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 32 }}>{activeTrack.icon}</div>
                  <div>
                    <div style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 500 }}>{activeTrack.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{activeTrack.description}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {getTrackSteps(activeTrack).map((step, i) => (
                    <div key={step.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px', borderRadius: 10,
                        background: step.done ? 'rgba(74,143,94,.06)' : step.link ? 'rgba(245,165,36,.04)' : 'rgba(255,252,244,.5)',
                        border: `0.5px solid ${step.done ? 'rgba(74,143,94,.2)' : 'var(--ink-line)'}`,
                        cursor: step.link ? 'default' : 'default',
                      }}>
                      <button onClick={() => toggleStep(activeTrack.id, step.id)}
                        style={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: step.done ? 'var(--ok)' : 'rgba(26,20,16,.06)',
                          border: step.done ? 'none' : '1.5px solid rgba(26,20,16,.15)',
                          color: step.done ? '#fff' : 'transparent',
                          fontSize: 11, fontWeight: 700,
                          transition: 'all 200ms ease',
                        }}>
                        {step.done ? '✓' : ''}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: step.done ? 'var(--ok)' : 'var(--ink-1)', textDecoration: step.done ? 'line-through' : 'none' }}>
                          {step.title}
                        </div>
                      </div>
                      {step.link && (
                        <button onClick={() => { onNavigate(step.link); onClose(); }}
                          style={{ fontSize: 11, color: 'var(--accent-orange)', padding: '4px 10px', borderRadius: 6, background: 'rgba(245,165,36,.1)' }}>
                          Open
                        </button>
                      )}
                      <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>{i + 1}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={() => resetTrack(activeTrack.id)}
                    style={{ fontSize: 11, color: 'var(--ink-3)', padding: '6px 12px' }}>
                    Reset track
                  </button>
                  <div style={{ flex: 1 }} />
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', padding: '6px 12px' }}>
                    {getCompletedCount({ steps: getTrackSteps(activeTrack) })} / {activeTrack.steps.length} complete
                  </div>
                </div>
              </div>
            )}

            {isExecution && !activeTrack && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>Choose a focus track or use the timer directly.</div>
                {EXECUTION_TRACKS.map(track => {
                  const steps = getTrackSteps(track);
                  const pct = getProgress({ steps });
                  return (
                    <button key={track.id} onClick={() => setActiveTrackId(track.id)}
                      style={{
                        padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                        background: 'rgba(255,252,244,.6)', border: '0.5px solid var(--ink-line)',
                        display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
                      }}>
                      <div style={{ fontSize: 28 }}>{track.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{track.title}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{track.description}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                          <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'rgba(26,20,16,.08)' }}>
                            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: 'var(--accent-orange)', transition: 'width 400ms ease' }} />
                          </div>
                          <span style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600 }}>{steps.filter(s => s.done).length}/{track.steps.length}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}

                <div style={{ marginTop: 8, padding: '16px 20px', borderRadius: 12, background: 'rgba(255,252,244,.6)', border: '0.5px solid var(--ink-line)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Focus Timer</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 48, fontFamily: 'var(--font-mono)', fontWeight: 400, color: 'var(--accent-orange)' }}>
                      {formatTime(timer)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {[5, 15, 25, 45].map(m => (
                        <button key={m} onClick={() => startTimer(m)}
                          style={{
                            padding: '3px 12px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                            background: timerMinutes === m && timerRunning ? 'rgba(26,20,16,.86)' : 'rgba(26,20,16,.05)',
                            color: timerMinutes === m && timerRunning ? '#fff8e8' : 'var(--ink-2)',
                          }}>
                          {m}min
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {timerRunning ? (
                        <button onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setTimerRunning(false); }}
                          style={{ padding: '3px 12px', borderRadius: 6, fontSize: 11, background: 'rgba(231,64,46,.1)', color: 'var(--accent-coral)' }}>
                          Pause
                        </button>
                      ) : timer > 0 ? (
                        <button onClick={() => setTimerRunning(true)}
                          style={{ padding: '3px 12px', borderRadius: 6, fontSize: 11, background: 'rgba(74,143,94,.1)', color: 'var(--ok)' }}>
                          Resume
                        </button>
                      ) : null}
                      {timer > 0 && (
                        <button onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setTimer(0); setTimerRunning(false); }}
                          style={{ padding: '3px 12px', borderRadius: 6, fontSize: 11, color: 'var(--ink-3)' }}>
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isExecution && activeTrack && (
              <div>
                <button onClick={() => setActiveTrackId(null)}
                  style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  ← Back to tracks
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 32 }}>{activeTrack.icon}</div>
                  <div>
                    <div style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 500 }}>{activeTrack.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{activeTrack.description}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {getTrackSteps(activeTrack).map((step, i) => (
                    <div key={step.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 10,
                      background: step.done ? 'rgba(74,143,94,.06)' : 'rgba(255,252,244,.5)',
                      border: `0.5px solid ${step.done ? 'rgba(74,143,94,.2)' : 'var(--ink-line)'}`,
                    }}>
                      <button onClick={() => toggleStep(activeTrack.id, step.id)}
                        style={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: step.done ? 'var(--ok)' : 'rgba(26,20,16,.06)',
                          border: step.done ? 'none' : '1.5px solid rgba(26,20,16,.15)',
                          color: step.done ? '#fff' : 'transparent',
                          fontSize: 11, fontWeight: 700,
                        }}>
                        {step.done ? '✓' : ''}
                      </button>
                      <div style={{ fontSize: 13, fontWeight: 500, color: step.done ? 'var(--ok)' : 'var(--ink-1)', textDecoration: step.done ? 'line-through' : 'none' }}>
                        {step.title}
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--ink-4)', marginLeft: 'auto' }}>{i + 1}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={() => resetTrack(activeTrack.id)}
                    style={{ fontSize: 11, color: 'var(--ink-3)', padding: '6px 12px' }}>
                    Reset track
                  </button>
                </div>
              </div>
            )}

            {mode === 'custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Configure what shows and what hides during focus sessions.</div>
                <FocusOption label="Hide dock navigation" value={true} />
                <FocusOption label="Hide top bar" value={false} />
                <FocusOption label="Auto-start timer" value={false} description="Starts a 25-min timer when entering focus mode." />
                <FocusOption label="Dim non-essential elements" value={true} description="Less visual noise." />
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 24px', borderTop: '0.5px solid var(--ink-line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {mode !== focusMode && (
              <button onClick={handleEnterMode}
                style={{ padding: '8px 20px', borderRadius: 999, fontSize: 12.5, fontWeight: 500, background: focusMode === 'off' && mode !== 'off' ? 'var(--accent-orange)' : 'rgba(26,20,16,.86)', color: '#fff8e8' }}>
                {mode === 'off' ? 'Turn off' : `Enter ${currentMode.label} mode`}
              </button>
            )}
            <button onClick={onClose}
              style={{ padding: '8px 20px', borderRadius: 999, fontSize: 12.5, fontWeight: 500, background: 'rgba(26,20,16,.06)', color: 'var(--ink-2)' }}>
              {mode === focusMode ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FocusOption = ({ label, value, description }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,252,244,.5)', border: '0.5px solid var(--ink-line)' }}>
    <div style={{
      width: 20, height: 20, borderRadius: 4, flexShrink: 0,
      background: value ? 'var(--accent-orange)' : 'rgba(26,20,16,.06)',
      border: `1.5px solid ${value ? 'var(--accent-orange)' : 'rgba(26,20,16,.15)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: value ? '#fff' : 'transparent',
      fontSize: 11, fontWeight: 700,
    }}>{value ? '✓' : ''}</div>
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</div>
      {description && <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 1 }}>{description}</div>}
    </div>
  </div>
);
