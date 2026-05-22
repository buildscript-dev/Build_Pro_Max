import React, { useState, useCallback, useEffect } from 'react';
import { GlassCard, PaperButton, Icon, AiOrb, Avatar } from '../components/ui/Icons';
import { accentColor } from '../data';
import { useAppState, useAppActions, useAppStore } from '../store/AppContext';
import { isGmailConnected, getRecentEmails } from '../services/gmail';
import { generateEmailDraft, generateContactInsight } from '../services/ai';
import { ScreenShell } from '../components/ui/ScreenShell';

const TAGS = ['Team', 'Investor', 'Hiring', 'Personal', 'Network', 'Partner', 'Mentor'];
const COLORS = ['amber', 'orange', 'coral', 'rose'];

export const Contacts = () => {
  const { actions } = useAppActions();
  const store = useAppStore();
  const contacts = useAppState((s) => s.contacts) || [];
  const [selId, setSelId] = useState(contacts[0]?.id || null);
  const [syncing, setSyncing] = useState(false);
  const [gmailEmails, setGmailEmails] = useState([]);
  const [newContact, setNewContact] = useState({ name: '', role: '', tag: 'Network', color: 'amber' });
  const [showAdd, setShowAdd] = useState(false);
  const [editContact, setEditContact] = useState(null);
  const [editing, setEditing] = useState(false);
  const [aiDraft, setAiDraft] = useState('');
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [aiInsight, setAiInsight] = useState('');
  const [aiInsightLoading, setAiInsightLoading] = useState(false);

  const c = contacts.find(c => c.id === selId);

  // Auto-select first contact if nothing selected or selected contact no longer exists
  useEffect(() => {
    if (contacts.length === 0) { if (selId) setSelId(null); return; }
    if (!selId || !contacts.find(c => c.id === selId)) setSelId(contacts[0].id);
  }, [contacts]);

  // Auto-generate AI insight when a contact is selected
  useEffect(() => {
    if (!c) return;
    let cancelled = false;
    const load = async () => {
      setAiInsightLoading(true);
      setAiInsight('');
      const result = await generateContactInsight(c, store.getSnapshot());
      if (!cancelled) { setAiInsight(result); setAiInsightLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [selId]);

  const syncFromGmail = useCallback(async () => {
    if (!isGmailConnected()) {
      actions.addNotification({ text: 'Connect Gmail first in Settings', kind: 'warning' });
      return;
    }
    setSyncing(true);
    const emails = await getRecentEmails(10);
    setGmailEmails(emails);
    const names = emails.map(e => {
      const match = e.from.match(/"?([^"]*)"?\s*</);
      return match ? match[1].split(' ')[0] : e.from.split('@')[0];
    }).filter(Boolean);
    actions.addNotification({ text: `Synced ${emails.length} recent emails from Gmail`, kind: 'info' });
    setSyncing(false);
  }, [actions]);

  const addContact = () => {
    if (!newContact.name.trim()) return;
    const initials = newContact.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    actions.addContact({
      ...newContact,
      name: newContact.name.trim(),
      initials,
      last: 'Just now',
      warmth: 0.5,
      avatar: initials,
    });
    actions.addNotification({ text: `Contact "${newContact.name}" added`, kind: 'info' });
    setNewContact({ name: '', role: '', tag: 'Network', color: 'amber' });
    setShowAdd(false);
  };

  const deleteContact = (contactId) => {
    if (confirmDeleteId !== contactId) { setConfirmDeleteId(contactId); return; }
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    setConfirmDeleteId(null);
    actions.deleteContact(contact.id);
    actions.addNotification({ text: `Contact "${contact.name}" deleted`, kind: 'info' });
    if (selId === contactId) {
      const remaining = contacts.filter(c => c.id !== contactId);
      setSelId(remaining[0]?.id || null);
    }
  };

  const startEdit = () => {
    if (!c) return;
    setEditContact({ ...c });
    setEditing(true);
  };

  const saveEdit = () => {
    if (!editContact.name?.trim()) return;
    actions.updateContact(editContact);
    actions.addNotification({ text: `Contact updated`, kind: 'info' });
    setEditing(false);
  };

  const schedule = () => {
    if (!c) return;
    const now = new Date();
    const h = now.getHours() + 1;
    actions.addEvent({ title: `1:1 · ${c.name}`, day: now.getDate(), time: `${h.toString().padStart(2, '0')}:00`, color: c.color });
    // Bump warmth on scheduling
    actions.updateContact({ ...c, warmth: Math.min(1, (c.warmth || 0.5) + 0.1), last: 'Just now' });
    actions.addNotification({ text: `Event scheduled with ${c.name} — warmth +10%`, kind: 'info' });
  };

  const draftMessage = async () => {
    if (!c) return;
    setAiDraftLoading(true);
    const draft = await generateEmailDraft(c, store.getSnapshot());
    setAiDraft(draft);
    setAiDraftLoading(false);
    // Bump warmth on email draft
    actions.updateContact({ ...c, warmth: Math.min(1, (c.warmth || 0.5) + 0.05) });
    actions.addNotification({ text: `AI drafted email for ${c.name}`, kind: 'info' });
  };

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(aiDraft);
      actions.addNotification({ text: 'Draft copied to clipboard', kind: 'info' });
    } catch {
      const ta = document.createElement('textarea');
      ta.value = aiDraft;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      actions.addNotification({ text: 'Draft copied', kind: 'info' });
    }
  };

  const closeDraft = () => {
    setAiDraft('');
    setAiDraftLoading(false);
  };

  const filtered = search.trim()
    ? contacts.filter(ct => ct.name?.toLowerCase().includes(search.toLowerCase()) || ct.role?.toLowerCase().includes(search.toLowerCase()) || ct.tag?.toLowerCase().includes(search.toLowerCase()))
    : contacts;
  const coldContacts = contacts.filter(ct => (ct.warmth || 0.5) < 0.35);

  return (
    <ScreenShell
      eyebrow="Hermes Contacts"
      title={<>People who <span className="t-display-italic" style={{ color: "var(--accent-orange)" }}>matter</span>.</>}
      subtitle={<>Warmth tracked automatically. Hermes generates relationship insights and drafts outreach for you.</>}
      right={<>
        <input
          placeholder="Search contacts…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, border: '0.5px solid rgba(26,20,16,.10)', background: 'rgba(255,252,244,.8)', color: 'var(--ink-1)', outline: 'none', width: 160 }}
        />
        {isGmailConnected() && <PaperButton icon="sync" small onClick={syncFromGmail} disabled={syncing}>{syncing ? 'Syncing…' : 'Sync Gmail'}</PaperButton>}
        <PaperButton icon="plus" primary onClick={() => setShowAdd(true)}>Add person</PaperButton>
      </>}
    >
      {showAdd && (
        <GlassCard style={{ marginBottom: 16, padding: 0 }}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <input autoFocus placeholder="Name…" value={newContact.name}
              onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') addContact(); if (e.key === 'Escape') setShowAdd(false); }}
              style={{ all: "unset", fontSize: 16, fontFamily: "var(--font-display)", color: "var(--ink-1)", width: "100%" }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input placeholder="Role / title…" value={newContact.role}
                onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                style={{ flex: 1, padding: "4px 10px", borderRadius: 8, fontSize: 11, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)", minWidth: 120 }}
              />
              <select value={newContact.tag} onChange={(e) => setNewContact({ ...newContact, tag: e.target.value })}
                style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}>
                {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={newContact.color} onChange={(e) => setNewContact({ ...newContact, color: e.target.value })}
                style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}>
                {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{ flex: 1 }} />
              <PaperButton small onClick={() => setShowAdd(false)}>Cancel</PaperButton>
              <PaperButton small primary onClick={addContact}>Add</PaperButton>
            </div>
          </div>
        </GlassCard>
      )}

      {coldContacts.length > 0 && (
        <div style={{ marginBottom: 14, padding: '10px 16px', borderRadius: 12, background: 'rgba(231,64,46,.06)', border: '0.5px solid rgba(231,64,46,.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14 }}>❤️‍🩹</span>
          <div style={{ flex: 1, fontSize: 12.5, color: 'var(--ink-2)' }}>
            <strong style={{ color: 'var(--accent-coral)' }}>{coldContacts.length} cold contact{coldContacts.length > 1 ? 's' : ''}</strong> — {coldContacts.slice(0,3).map(ct => ct.name?.split(' ')[0]).join(', ')} need{coldContacts.length === 1 ? 's' : ''} a check-in.
          </div>
          <PaperButton small onClick={() => { setSelId(coldContacts[0].id); setSearch(''); }}>Reach out</PaperButton>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 480px", gap: 16, alignItems: "start" }}>
        <GlassCard padding={0} style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 22px", borderBottom: "0.5px solid var(--ink-line)", display: "grid", gridTemplateColumns: "44px 1fr 100px 80px 110px auto", gap: 12, alignItems: "center" }}>
            <span/><span className="t-cap">Person</span><span className="t-cap">Tag</span><span className="t-cap">Warmth</span><span className="t-cap">Last touch</span><span/>
          </div>
          {filtered.map((contact) => (
            <div key={contact.id} onClick={() => { setSelId(contact.id); setConfirmDeleteId(null); }} style={{
              padding: "12px 22px", display: "grid", gridTemplateColumns: "44px 1fr 100px 80px 110px auto",
              gap: 12, alignItems: "center",
              borderBottom: contact.id !== filtered[filtered.length - 1].id ? "0.5px solid var(--ink-line)" : "none",
              background: selId === contact.id ? "rgba(245,165,36,.10)" : (contact.warmth||0.5) < 0.35 ? 'rgba(231,64,46,.03)' : "transparent",
              boxShadow: selId === contact.id ? "inset 3px 0 0 var(--accent-orange)" : "none",
              cursor: "pointer",
              transition: "background 120ms",
            }}>
              <Avatar initials={contact.avatar || contact.name?.[0] || '?'} color={contact.color} size={36} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {contact.name}
                  {(contact.warmth||0.5) < 0.35 && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 10, background: 'rgba(231,64,46,.12)', color: 'var(--accent-coral)', fontWeight: 700 }}>COLD</span>}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{contact.role}</div>
              </div>
              <span style={{
                padding: "3px 9px", borderRadius: 999, fontSize: 10.5, fontWeight: 600,
                color: accentColor[contact.color], background: `${accentColor[contact.color]}18`,
                textTransform: "uppercase", letterSpacing: "0.06em", justifySelf: "start",
              }}>{contact.tag}</span>
              <div style={{ position: "relative", height: 6, borderRadius: 999, background: "rgba(26,20,16,.06)" }}>
                <div style={{
                  position: "absolute", inset: 0, width: `${(contact.warmth || 0.5) * 100}%`,
                  background: `linear-gradient(90deg, ${accentColor[contact.color]}, var(--accent-coral))`,
                  borderRadius: 999,
                }}/>
              </div>
              <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{contact.last}</span>
              {confirmDeleteId === contact.id
                ? <><button onClick={(e) => { e.stopPropagation(); deleteContact(contact.id); }} style={{ fontSize: 10, color: "var(--accent-coral)", fontWeight: 600, padding: "2px 6px" }}>Delete?</button><button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} style={{ fontSize: 10, color: "var(--ink-4)", padding: "2px 4px" }}>✕</button></>
                : <button onClick={(e) => { e.stopPropagation(); deleteContact(contact.id); }} style={{ fontSize: 10, color: "var(--ink-4)", padding: "2px 6px" }}>✕</button>
              }
            </div>
          ))}
          {contacts.length === 0 && (
            <div style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)", marginBottom: 4 }}>No contacts yet</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Add a person or sync from Gmail to get started.</div>
            </div>
          )}
        </GlassCard>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 86 }}>
          {c && (editing ? (
            <GlassCard strong>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input value={editContact.name} onChange={(e) => setEditContact({ ...editContact, name: e.target.value })}
                  style={{ all: "unset", fontSize: 22, fontFamily: "var(--font-display)", fontWeight: 400 }}
                />
                <input value={editContact.role || ''} onChange={(e) => setEditContact({ ...editContact, role: e.target.value })}
                  placeholder="Role"
                  style={{ all: "unset", fontSize: 13, color: "var(--ink-3)" }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={editContact.tag} onChange={(e) => setEditContact({ ...editContact, tag: e.target.value })}
                    style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}>
                    {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={editContact.color} onChange={(e) => setEditContact({ ...editContact, color: e.target.value })}
                    style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, border: "0.5px solid rgba(26,20,16,.1)", background: "rgba(255,252,244,.7)" }}>
                    {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <PaperButton small onClick={() => setEditing(false)}>Cancel</PaperButton>
                  <PaperButton small primary onClick={saveEdit}>Save</PaperButton>
                </div>
              </div>
            </GlassCard>
          ) : (
            <>
              <GlassCard strong>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <Avatar initials={c.avatar || c.name?.[0] || '?'} color={c.color} size={64} />
                  <div>
                    <div className="t-display" style={{ fontSize: 26, fontWeight: 400, letterSpacing: "-0.01em" }}>{c.name}</div>
                    <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>{c.role}</div>
                  </div>
                </div>
                <div className="hair" style={{ margin: "18px 0" }}/>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Stat label="Warmth" value={`${Math.round((c.warmth || 0.5) * 100)}%`} accent={accentColor[c.color]} />
                  <Stat label="Last touch" value={c.last} />
                  <Stat label="Tag" value={c.tag} />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <PaperButton small onClick={startEdit}>Edit</PaperButton>
                  <PaperButton small primary onClick={draftMessage} disabled={aiDraftLoading}>{aiDraftLoading ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", border: "1.5px solid currentColor", borderTopColor: "transparent", animation: "orb-pulse 1s linear infinite" }} />
                      Drafting…
                    </span>
                  ) : 'AI draft email'}</PaperButton>
                  {confirmDeleteId === c.id
                    ? <><PaperButton small accent onClick={() => deleteContact(c.id)}>Confirm delete</PaperButton><PaperButton small onClick={() => setConfirmDeleteId(null)}>Cancel</PaperButton></>
                    : <PaperButton small accent onClick={() => deleteContact(c.id)}>Delete</PaperButton>
                  }
                </div>
              </GlassCard>
              <GlassCard>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <AiOrb size={20} />
                  <div className="t-cap" style={{ color: "var(--accent-orange)" }}>Hermes relationship insight</div>
                  {aiInsightLoading && <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid var(--accent-orange)', borderTopColor: 'transparent', animation: 'orb-pulse 1s linear infinite', marginLeft: 4 }}/>}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--ink-1)', lineHeight: 1.6, fontStyle: 'italic', minHeight: 40 }}>
                  {aiInsightLoading ? 'Generating relationship analysis…' : `"${aiInsight || c.ai || 'No insight yet — interact with this contact to build context.'}"`}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <PaperButton small onClick={schedule}>📅 Schedule 1:1</PaperButton>
                  <PaperButton small primary onClick={draftMessage} disabled={aiDraftLoading}>{aiDraftLoading ? 'Drafting…' : '✉️ Draft email'}</PaperButton>
                </div>
              </GlassCard>
            </>
          ))}
        </div>
      </div>

      {gmailEmails.length > 0 && (
        <GlassCard style={{ marginTop: 16 }}>
          <div className="t-cap">Recent Gmail · {gmailEmails.length}</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 12, gap: 8 }}>
            {gmailEmails.slice(0, 5).map((e, i) => (
              <div key={e.id || i} style={{
                display: "flex", gap: 12, alignItems: "center",
                padding: "8px 12px", borderRadius: 8,
                background: "rgba(255,252,244,.5)", border: "0.5px solid rgba(26,20,16,.06)",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject}</div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 2 }}>{e.from}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {aiDraft && (
        <GlassCard style={{ position: 'relative', marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AiOrb size={18} />
            <div className="t-cap" style={{ color: 'var(--accent-orange)' }}>AI draft · {c?.name}</div>
            <div style={{ flex: 1 }} />
            <button onClick={closeDraft} style={{ fontSize: 11, color: 'var(--ink-3)', padding: '2px 6px' }}>✕</button>
          </div>
          <div style={{
            fontSize: 13, color: 'var(--ink-1)', lineHeight: 1.6,
            whiteSpace: 'pre-wrap', padding: 12, borderRadius: 10,
            background: 'rgba(255,252,244,.6)', border: '0.5px solid rgba(26,20,16,.06)',
          }}>{aiDraft}</div>
          <PaperButton small onClick={copyDraft} style={{ marginTop: 10 }}>Copy to clipboard</PaperButton>
        </GlassCard>
      )}
    </ScreenShell>
  );
};

const Stat = ({ label, value, accent }) => (
  <div>
    <div className="t-cap">{label}</div>
    <div className="t-display" style={{ fontSize: 22, color: accent || "var(--ink-1)", marginTop: 2 }}>{value}</div>
  </div>
);
