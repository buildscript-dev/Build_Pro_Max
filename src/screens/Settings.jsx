import React, { useState, useEffect } from 'react';
import { GlassCard, PaperButton, Avatar, Icon } from '../components/ui/Icons';
import { accentColor } from '../data';
import { useAppState, useAppActions } from '../store/AppContext';
import { logout, deleteAccount } from '../store/auth';
import { connectGmail, disconnectGmail, isGmailConnected, getGmailEmail } from '../services/gmail';
import { connectNotion, disconnectNotion, isNotionConnected, getNotionEmail, getNotionWorkspace } from '../services/notion';
import { requestNotificationPermission } from '../services/clock';
import { ScreenShell } from '../components/ui/ScreenShell';

const NAV_BASE = ['Profile', 'Appearance', 'AI behavior', 'Connected accounts', 'Devices', 'Notifications', 'Privacy', 'Keyboard', 'About'];

export const Settings = ({ onShowAuth, onLogout: _onLogout }) => {
  const { actions, authUser, onLogout: ctxLogout } = useAppActions();
  const user = useAppState((s) => s.user);
  const tweaks = useAppState((s) => s.tweaks);
  const devices = useAppState((s) => s.devices) || [];
  const taskCount = useAppState((s) => s.tasks?.length || 0);
  const noteCount = useAppState((s) => s.notes?.length || 0);
  const contactCount = useAppState((s) => s.contacts?.length || 0);
  const [activeSection, setActiveSection] = useState(authUser ? 'Appearance' : 'Account');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({ ...user });
  
  // Sync profileData when state.user changes (e.g., from auth sync)
  useEffect(() => {
    setProfileData(prev => ({ ...prev, ...user }));
  }, [user]);
  const [apiKey, setApiKey] = useState(() => { try { return localStorage.getItem('openrouter_api_key') || ''; } catch { return ''; } });
  const [gmailConnected, setGmailConnected] = useState(isGmailConnected());
  const [gmailEmail, setGmailEmail] = useState(getGmailEmail());
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailClientId, setGmailClientId] = useState(() => { try { return localStorage.getItem('gmail_client_id') || ''; } catch { return ''; } });
  const [gmailApiKey, setGmailApiKey] = useState(() => { try { return localStorage.getItem('gmail_api_key') || ''; } catch { return ''; } });
  const [notionConnected, setNotionConnected] = useState(isNotionConnected());
  const [notionEmail, setNotionEmail] = useState(getNotionEmail());
  const [notionWorkspace, setNotionWorkspace] = useState(getNotionWorkspace());
  const [notionToken, setNotionToken] = useState(() => { try { return localStorage.getItem('notion_access_token') || ''; } catch { return ''; } });
  const [notionLoading, setNotionLoading] = useState(false);
  const [notifStatus, setNotifStatus] = useState('');
  const [aiPrefs, setAiPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ai_personality') || '{"voice":"background","autoPlan":true,"moodDetection":true,"relWatcher":true,"tone":"direct","role":""}'); }
    catch { return { voice: 'background', autoPlan: true, moodDetection: true, relWatcher: true, tone: 'direct', role: '' }; }
  });

  const NAV_ITEMS = authUser ? [...NAV_BASE, 'Account'] : [...NAV_BASE, 'Sign in'];

  const saveApiKey = () => {
    localStorage.setItem('openrouter_api_key', apiKey);
    actions.addNotification({ text: 'AI API key saved', kind: 'info' });
  };

  const saveGmailCredentials = () => {
    localStorage.setItem('gmail_client_id', gmailClientId);
    localStorage.setItem('gmail_api_key', gmailApiKey);
    actions.addNotification({ text: 'Gmail credentials saved. Click Connect to authorize.', kind: 'info' });
  };

  const handleConnectGmail = async () => {
    setGmailLoading(true);
    const result = await connectGmail();
    if (result.ok) {
      setGmailConnected(true);
      setGmailEmail(result.email || 'Connected');
      actions.addNotification({ text: 'Gmail connected', kind: 'info' });
    } else {
      actions.addNotification({ text: result.error || 'Gmail connection failed', kind: 'warning' });
    }
    setGmailLoading(false);
  };

  const handleDisconnectGmail = async () => {
    await disconnectGmail();
    setGmailConnected(false);
    setGmailEmail('');
    actions.addNotification({ text: 'Gmail disconnected', kind: 'info' });
  };

  const saveNotionToken = () => {
    localStorage.setItem('notion_access_token', notionToken);
    actions.addNotification({ text: 'Notion token saved. Click Connect to verify.', kind: 'info' });
  };

  const handleConnectNotion = async () => {
    setNotionLoading(true);
    const result = await connectNotion(notionToken);
    if (result.ok) {
      setNotionConnected(true);
      setNotionEmail(result.email);
      setNotionWorkspace(result.workspace);
      actions.addNotification({ text: `Notion connected · ${result.workspace || result.email}`, kind: 'info' });
    } else {
      actions.addNotification({ text: result.error || 'Notion connection failed', kind: 'warning' });
    }
    setNotionLoading(false);
  };

  const handleDisconnectNotion = async () => {
    disconnectNotion();
    setNotionConnected(false);
    setNotionEmail('');
    setNotionWorkspace('');
    actions.addNotification({ text: 'Notion disconnected', kind: 'info' });
  };

  const handleRequestNotif = async () => {
    const result = await requestNotificationPermission();
    setNotifStatus(result);
    actions.addNotification({ text: result === 'granted' ? 'Notifications enabled' : 'Notifications denied', kind: 'info' });
  };

  const handleLogout = async () => {
    await logout();
    if (ctxLogout) ctxLogout();
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure? This will permanently delete your account and all data.')) {
      await deleteAccount();
      const appKeys = [
        'build_pro_max_1_state',
        'openrouter_api_key',
        'ai_personality',
        'gmail_access_token',
        'gmail_client_id',
        'gmail_api_key',
        'gmail_email',
        'notion_access_token',
        'notion_email',
        'notion_workspace',
        'onboarding_complete',
      ];
      appKeys.forEach(key => localStorage.removeItem(key));
      if (ctxLogout) ctxLogout();
      window.location.reload();
    }
  };

  const saveProfile = () => {
    actions.updateUser(profileData);
    actions.addNotification({ text: 'Profile updated', kind: 'info' });
    setEditingProfile(false);
  };

  const cycleNav = () => {
    const modes = ['dock', 'rail', 'top'];
    const idx = modes.indexOf(tweaks.nav);
    actions.setTweak('nav', modes[(idx + 1) % modes.length]);
  };

  const cycleMotion = () => {
    const modes = ['calm', 'balanced', 'lively'];
    const idx = modes.indexOf(tweaks.motion);
    actions.setTweak('motion', modes[(idx + 1) % modes.length]);
  };

  const toggleCanvas = () => {
    actions.setTweak('canvas', tweaks.canvas === 'mono' ? 'warm' : 'mono');
  };

  const adjustGlass = (delta) => {
    const newVal = Math.max(8, Math.min(48, (tweaks.glassBlur || 28) + delta));
    actions.setTweak('glassBlur', newVal);
  };

  return (
    <ScreenShell
      eyebrow="Settings"
      title={<>Make it yours.</>}
      subtitle={<>Most of these live in the Tweaks panel too. Anything you change here syncs across devices in &lt; 2s.</>}
    >
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, alignItems: "start" }}>
        <GlassCard padding={0}>
          {NAV_ITEMS.map((s, i) => (
            <button key={s} onClick={() => setActiveSection(s)}
              aria-current={activeSection === s ? "page" : undefined}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "12px 18px", fontSize: 13.5,
                background: activeSection === s ? "rgba(245,165,36,.10)" : "transparent",
                color: activeSection === s ? "var(--accent-orange)" : "var(--ink-2)",
                fontWeight: activeSection === s ? 600 : 500,
                borderBottom: i < NAV_ITEMS.length - 1 ? "0.5px solid var(--ink-line)" : "none",
                boxShadow: activeSection === s ? "inset 3px 0 0 var(--accent-orange)" : "none",
                transition: "background 120ms ease",
              }}
              onMouseEnter={(e) => { if (activeSection !== s) e.currentTarget.style.background = "rgba(26,20,16,.03)"; }}
              onMouseLeave={(e) => { if (activeSection !== s) e.currentTarget.style.background = "transparent"; }}
            >{s}</button>
          ))}
        </GlassCard>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {activeSection === 'Profile' && (
            <GlassCard>
              <div className="t-cap">Profile</div>
              {editingProfile ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
                  <input value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    style={{ padding: "8px 12px", borderRadius: 8, fontSize: 14, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}
                  />
                  <input value={profileData.role} onChange={(e) => setProfileData({ ...profileData, role: e.target.value })}
                    style={{ padding: "8px 12px", borderRadius: 8, fontSize: 14, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}
                  />
                  <input value={profileData.handle} onChange={(e) => setProfileData({ ...profileData, handle: e.target.value })}
                    style={{ padding: "8px 12px", borderRadius: 8, fontSize: 14, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}
                  />
                  <input value={profileData.timezone} onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                    style={{ padding: "8px 12px", borderRadius: 8, fontSize: 14, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}
                  />
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <PaperButton small onClick={() => setEditingProfile(false)}>Cancel</PaperButton>
                    <PaperButton small primary onClick={saveProfile}>Save profile</PaperButton>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14 }}>
                  <Avatar initials={user.avatar} color="orange" size={64} />
                  <div>
                    <div className="t-display" style={{ fontSize: 24, fontWeight: 400 }}>{user.name}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{user.role}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <span className="chip">{user.handle}</span>
                      <span className="chip">{user.timezone}</span>
                      <span className="chip">{user.pronouns}</span>
                    </div>
                    <PaperButton small onClick={() => { setProfileData({ ...user }); setEditingProfile(true); }} style={{ marginTop: 10 }}>Edit profile</PaperButton>
                  </div>
                </div>
              )}
            </GlassCard>
          )}

          {activeSection === 'Appearance' && (
            <GlassCard>
              <div className="t-cap">Appearance</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Glass intensity</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>How frosted the floating panels feel.</div>
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => adjustGlass(-4)} style={{ fontSize: 14, padding: "4px 8px" }}>−</button>
                    <span className="t-num" style={{ fontSize: 28, color: "var(--accent-orange)" }}>{tweaks.glassBlur || 28}px</span>
                    <button onClick={() => adjustGlass(4)} style={{ fontSize: 14, padding: "4px 8px" }}>+</button>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Animation intensity</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>From restrained to maximalist.</div>
                  <button onClick={cycleMotion} style={{ marginTop: 8 }}>
                    <span className="t-display-italic" style={{ fontSize: 22, color: "var(--ink-2)", borderBottom: "1px dashed var(--ink-4)" }}>{tweaks.motion}</span>
                  </button>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Navigation</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>Dock, top navbar, or side rail.</div>
                  <button onClick={cycleNav} style={{ marginTop: 8 }}>
                    <span className="t-display-italic" style={{ fontSize: 22, color: "var(--ink-2)", borderBottom: "1px dashed var(--ink-4)" }}>{tweaks.nav}</span>
                  </button>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Canvas mode</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>Warm paper or mono.</div>
                  <button onClick={toggleCanvas} style={{ marginTop: 8 }}>
                    <span className="t-display-italic" style={{ fontSize: 22, color: "var(--ink-2)", borderBottom: "1px dashed var(--ink-4)", textTransform: "capitalize" }}>{tweaks.canvas}</span>
                  </button>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Accent palette</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>The warm color personality.</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    {[accentColor.amber, accentColor.orange, accentColor.coral, accentColor.rose].map(c => (
                      <div key={c} style={{ width: 24, height: 24, borderRadius: 999, background: c, boxShadow: "0 0 0 1.5px rgba(255,255,255,.7) inset, 0 2px 4px rgba(0,0,0,.15)" }}/>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {activeSection === 'AI behavior' && (
            <GlassCard>
              <div className="t-cap">AI behavior</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 6 }}>
                {[
                  { key: 'tone', label: "Voice", sub: "How the AI talks to you.", val: ({ tone }) => `"${tone}" mode` },
                  { key: 'autoPlan', label: "Auto-plan", sub: "AI rebalances your day when blocks slip.", val: ({ autoPlan }) => autoPlan ? 'On' : 'Off' },
                  { key: 'moodDetection', label: "Pages mood detection", sub: "Surface patterns from your journaling.", val: ({ moodDetection }) => moodDetection ? 'On' : 'Off' },
                  { key: 'relWatcher', label: "Relationship watcher", sub: "Notice contact warmth decay.", val: ({ relWatcher }) => relWatcher ? 'On' : 'Off' },
                ].map((row) => {
                  const current = row.key === 'tone' ? aiPrefs.tone || 'direct' : aiPrefs[row.key];
                  const display = typeof row.val === 'function' ? row.val(aiPrefs) : current;
                  const toggle = () => {
                    const next = { ...aiPrefs };
                    if (row.key === 'tone') {
                      const modes = ['direct', 'polite', 'brutal'];
                      const idx = modes.indexOf(next.tone);
                      next.tone = modes[(idx + 1) % modes.length];
                    } else {
                      next[row.key] = !next[row.key];
                    }
                    setAiPrefs(next);
                    localStorage.setItem('ai_personality', JSON.stringify(next));
                    actions.addNotification({ text: `${row.label}: ${typeof next[row.key] === 'boolean' ? (next[row.key] ? 'On' : 'Off') : next.tone}`, kind: 'info' });
                  };
                  return (
                    <div key={row.key} style={{ padding: "14px 0", display: "grid", gridTemplateColumns: "200px 1fr auto", gap: 14, alignItems: "center", borderBottom: row.key !== 'relWatcher' ? "0.5px solid var(--ink-line)" : "none" }}>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{row.label}</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{row.sub}</div>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{String(display)}</div>
                      <PaperButton small onClick={toggle}>{row.key === 'tone' ? 'Cycle' : 'Toggle'}</PaperButton>
                    </div>
                  );
                })}
                <div className="hair" style={{ margin: "16px 0" }} />
                <div style={{ padding: "14px 0" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>Your role (for AI context)</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2, marginBottom: 10 }}>
                    Tell the AI what you do so it gives better advice.
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input value={aiPrefs.role || ''}
                      onChange={(e) => setAiPrefs({ ...aiPrefs, role: e.target.value })}
                      placeholder="e.g. founder shipping a product, fundraising"
                      style={{ flex: 1, padding: "8px 12px", fontSize: 13, borderRadius: 8, border: "0.5px solid var(--ink-line)", background: "rgba(255,252,244,.7)", color: "var(--ink-1)" }}
                    />
                    <PaperButton small primary onClick={() => {
                      localStorage.setItem('ai_personality', JSON.stringify(aiPrefs));
                      actions.addNotification({ text: 'AI personality saved', kind: 'info' });
                    }}>Save</PaperButton>
                  </div>
                </div>
                <div className="hair" style={{ margin: "16px 0" }} />
                <div style={{ padding: "14px 0" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>OpenRouter API Key</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2, marginBottom: 10 }}>
                    Get a free key at openrouter.ai/keys — enables real AI understanding for notes, chat, and summaries.
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="password" value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-or-v1-…"
                      style={{ flex: 1, padding: "8px 12px", fontSize: 13, borderRadius: 8, border: "0.5px solid var(--ink-line)", background: "rgba(255,252,244,.7)", color: "var(--ink-1)", fontFamily: "var(--font-mono)" }}
                    />
                    <PaperButton small primary onClick={saveApiKey}>Save</PaperButton>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {activeSection === 'Sign in' && !authUser && onShowAuth && (
            <GlassCard>
              <div className="t-cap">Sign in</div>
              <div style={{ marginTop: 14, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
                <p>Sign in to sync your data across devices and connect to cloud services.</p>
                <PaperButton primary onClick={onShowAuth} icon="arrow" style={{ marginTop: 12 }}>Sign in / Create account</PaperButton>
              </div>
            </GlassCard>
          )}

          {(activeSection === 'Connected accounts' || activeSection === 'Devices' || activeSection === 'Notifications' || activeSection === 'Privacy' || activeSection === 'Keyboard' || activeSection === 'About') && (
            <GlassCard>
              <div className="t-cap">{activeSection}</div>
              <div style={{ marginTop: 14, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
                {activeSection === 'Connected accounts' && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Gmail Setup (Required)</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 12, lineHeight: 1.5 }}>
                        To connect Gmail, you need a Google Cloud project with Gmail API enabled.
                        <br />
                        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-orange)" }}>
                          → Create OAuth credentials here
                        </a>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-2)", display: "block", marginBottom: 4 }}>OAuth 2.0 Client ID</label>
                          <input value={gmailClientId} onChange={(e) => setGmailClientId(e.target.value)}
                            placeholder="123456-abcdef.apps.googleusercontent.com"
                            style={{ width: "100%", padding: "8px 12px", fontSize: 12, borderRadius: 8, border: "0.5px solid var(--ink-line)", background: "rgba(255,252,244,.7)", color: "var(--ink-1)", fontFamily: "var(--font-mono)", boxSizing: "border-box" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-2)", display: "block", marginBottom: 4 }}>API Key</label>
                          <input value={gmailApiKey} onChange={(e) => setGmailApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            style={{ width: "100%", padding: "8px 12px", fontSize: 12, borderRadius: 8, border: "0.5px solid var(--ink-line)", background: "rgba(255,252,244,.7)", color: "var(--ink-1)", fontFamily: "var(--font-mono)", boxSizing: "border-box" }}
                          />
                        </div>
                        <PaperButton small primary onClick={saveGmailCredentials}>Save Credentials</PaperButton>
                      </div>
                    </div>

                    <div className="hair" style={{ margin: "8px 0" }} />

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {/* Notion */}
                      <div style={{ border: "0.5px solid var(--ink-line)", borderRadius: 12, overflow: "hidden" }}>
                        <div style={{ padding: "14px 16px", background: "rgba(255,252,244,.4)" }}>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Notion</div>
                          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 10, lineHeight: 1.5 }}>
                            Get your Internal Integration Token from{' '}
                            <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-orange)" }}>
                              notion.so/my-integrations
                            </a>
                            <br />Create a token, then share the integration with your workspace pages.
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <input value={notionToken} onChange={(e) => setNotionToken(e.target.value)}
                              placeholder="secret_xxxxxxxxxxxxxxxxxxxx"
                              style={{ width: "100%", padding: "8px 12px", fontSize: 12, borderRadius: 8, border: "0.5px solid var(--ink-line)", background: "rgba(255,252,244,.7)", color: "var(--ink-1)", fontFamily: "var(--font-mono)", boxSizing: "border-box" }}
                            />
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <PaperButton small onClick={saveNotionToken}>Save Token</PaperButton>
                              {notionConnected ? (
                                <PaperButton small onClick={handleDisconnectNotion}>Disconnect</PaperButton>
                              ) : (
                                <PaperButton small primary onClick={handleConnectNotion} disabled={notionLoading || !notionToken}>
                                  {notionLoading ? 'Verifying…' : 'Connect'}
                                </PaperButton>
                              )}
                            </div>
                            {notionConnected && (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ok)" }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ok)", boxShadow: "0 0 4px var(--ok)" }} />
                                Connected{notionWorkspace ? ` · ${notionWorkspace}` : ''}{notionEmail ? ` · ${notionEmail}` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Gmail */}
                      <div style={{ border: "0.5px solid var(--ink-line)", borderRadius: 12, overflow: "hidden" }}>
                        <div style={{ padding: "14px 16px", background: "rgba(255,252,244,.4)" }}>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Gmail (Required)</div>
                          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 10, lineHeight: 1.5 }}>
                            To connect Gmail, create OAuth credentials at{' '}
                            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-orange)" }}>
                              Google Cloud Console
                            </a>
                            <br />Enable Gmail API, create a Web OAuth Client, and add your domain to Authorized JavaScript origins.
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <input value={gmailClientId} onChange={(e) => setGmailClientId(e.target.value)}
                              placeholder="OAuth 2.0 Client ID"
                              style={{ width: "100%", padding: "8px 12px", fontSize: 12, borderRadius: 8, border: "0.5px solid var(--ink-line)", background: "rgba(255,252,244,.7)", color: "var(--ink-1)", fontFamily: "var(--font-mono)", boxSizing: "border-box" }}
                            />
                            <input value={gmailApiKey} onChange={(e) => setGmailApiKey(e.target.value)}
                              placeholder="API Key (AIzaSy...)"
                              style={{ width: "100%", padding: "8px 12px", fontSize: 12, borderRadius: 8, border: "0.5px solid var(--ink-line)", background: "rgba(255,252,244,.7)", color: "var(--ink-1)", fontFamily: "var(--font-mono)", boxSizing: "border-box" }}
                            />
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <PaperButton small onClick={saveGmailCredentials}>Save Credentials</PaperButton>
                              {gmailConnected ? (
                                <PaperButton small onClick={handleDisconnectGmail}>Disconnect</PaperButton>
                              ) : (
                                <PaperButton small primary onClick={handleConnectGmail} disabled={gmailLoading}>
                                  {gmailLoading ? 'Connecting…' : 'Connect'}
                                </PaperButton>
                              )}
                            </div>
                            {gmailConnected && (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ok)" }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ok)", boxShadow: "0 0 4px var(--ok)" }} />
                                Connected{gmailEmail ? ` · ${gmailEmail}` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* More coming */}
                      <PaperButton small style={{ marginTop: 4 }} onClick={() => actions.addNotification({ text: 'More integrations coming soon', kind: 'info' })}>Connect new account</PaperButton>
                    </div>
                  </div>
                )}
                {activeSection === 'Devices' && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {devices.map(d => (
                      <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "rgba(255,252,244,.5)", border: "0.5px solid rgba(26,20,16,.06)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Icon name={d.kind} size={16} color={d.online ? "var(--ink-1)" : "var(--ink-4)"} />
                          <span style={{ fontWeight: 500 }}>{d.name}</span>
                        </div>
                        <span style={{ fontSize: 11, color: d.online ? "var(--ok)" : "var(--ink-4)" }}>{d.online ? 'Online' : 'Offline'}</span>
                      </div>
                    ))}
                  </div>
                )}
                {activeSection === 'Notifications' && (
                  <div>
                    <p style={{ marginBottom: 12 }}>Browser notifications for reminders, focus timer, and due dates.</p>
                    <PaperButton small onClick={handleRequestNotif} style={{ marginBottom: 12 }}>
                      {notifStatus === 'granted' ? '✓ Notifications enabled' : notifStatus === 'denied' ? 'Notifications blocked' : 'Enable browser notifications'}
                    </PaperButton>
                    <div className="hair" style={{ margin: "12px 0" }} />
                    <PaperButton small onClick={actions.clearNotifications}>Clear all in-app notifications</PaperButton>
                  </div>
                )}
                {activeSection === 'Privacy' && <p>All data is stored locally. No data is sent to external servers except for AI features, which you can disable in AI behavior settings.</p>}
                {activeSection === 'Keyboard' && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { key: '⌘K', action: 'Open command bar' },
                      { key: 'Escape', action: 'Close modals / dialogs' },
                      { key: '1', action: 'Dashboard' },
                      { key: '2', action: 'Planner' },
                      { key: '3', action: 'Notes' },
                      { key: '4', action: 'Calendar' },
                      { key: '5', action: 'Tasks' },
                      { key: '6', action: 'Contacts' },
                      { key: '7', action: 'Files' },
                      { key: '8', action: 'AI Chat' },
                      { key: '9', action: 'Settings' },
                      { key: '↑↓', action: 'Navigate lists' },
                      { key: 'Enter', action: 'Confirm / select' },
                    ].map(({ key, action }) => (
                      <div key={key} style={{ display: "flex", gap: 16, alignItems: "center", padding: "6px 0" }}>
                        <kbd style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "3px 8px", borderRadius: 5, background: "rgba(26,20,16,.06)", color: "var(--ink-2)", minWidth: 48, textAlign: "center" }}>{key}</kbd>
                        <span style={{ fontSize: 12.5 }}>{action}</span>
                      </div>
                    ))}
                  </div>
                )}
                {activeSection === 'About' && (
                  <div>
                    <p><strong>Build_PRO_MAX_1</strong> — B.0.0.1</p>
                    <p>Paper × Liquid Glass design system. An execution OS for founders shipping product, fundraising, and hiring.</p>
                    <p className="t-mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 16 }}>
                      {taskCount} tasks · {noteCount} notes · {contactCount} contacts
                    </p>
                  </div>
                )}
                {activeSection === 'Account' && authUser && (
                  <div>
                    <GlassCard style={{ marginBottom: 16 }}>
                      <div className="t-cap">Account info</div>
                      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5, color: "var(--ink-1)" }}>
                        <div><span style={{ color: "var(--ink-3)" }}>Email:</span> {authUser.email}</div>
                        <div><span style={{ color: "var(--ink-3)" }}>Name:</span> {authUser.name || '—'}</div>
                        <div><span style={{ color: "var(--ink-3)" }}>Timezone:</span> {user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
                      </div>
                    </GlassCard>
                    <div style={{ display: "flex", gap: 12 }}>
                      <PaperButton small onClick={handleLogout} style={{ background: "rgba(231,64,46,.1)", color: "var(--accent-coral)" }}>Sign out</PaperButton>
                      <PaperButton small onClick={handleDeleteAccount} style={{ background: "rgba(231,64,46,.06)", color: "var(--accent-coral)" }}>Delete account</PaperButton>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </ScreenShell>
  );
};

const SettingRow = ({ label, sub, children }) => (
  <div>
    <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
    <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{sub}</div>
    <div style={{ marginTop: 8 }}>{children}</div>
  </div>
);
