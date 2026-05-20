import React, { useState, useCallback } from 'react';
import { GlassCard, PaperButton, Icon, AiOrb, Avatar } from '../components/ui/Icons';
import { accentColor } from '../data';
import { useApp } from '../store/AppContext';
import { isGmailConnected, getRecentEmails } from '../services/gmail';

const ScreenShell = ({ title, eyebrow, subtitle, right, children, padTop = 86, padBottom = 110 }) => (
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
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>{right}</div>
    </div>
    {children}
  </div>
);

const TAGS = ['Team', 'Investor', 'Hiring', 'Personal', 'Network', 'Partner', 'Mentor'];
const COLORS = ['amber', 'orange', 'coral', 'rose'];

export const Contacts = () => {
  const { state, actions } = useApp();
  const contacts = state.contacts || [];
  const [sel, setSel] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', role: '', tag: 'Network', color: 'amber' });
  const [editing, setEditing] = useState(false);
  const [editContact, setEditContact] = useState({});

  const [gmailEmails, setGmailEmails] = useState([]);
  const [syncing, setSyncing] = useState(false);

  const c = contacts[sel];

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

  const deleteContact = (idx) => {
    const contact = contacts[idx];
    if (!contact) return;
    actions.deleteContact(contact.id);
    actions.addNotification({ text: `Contact "${contact.name}" deleted`, kind: 'info' });
    if (sel >= contacts.length - 1) setSel(Math.max(0, sel - 1));
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
    actions.addNotification({ text: `Event scheduled with ${c.name}`, kind: 'info' });
  };

  const draftMessage = () => {
    if (!c) return;
    actions.addNotification({ text: `Draft opened for ${c.name}`, kind: 'info' });
  };

  return (
    <ScreenShell
      eyebrow="AI Contacts"
      title={<>People who <span className="t-display-italic" style={{ color: "var(--accent-orange)" }}>matter</span>.</>}
      subtitle={<>Warmth, last touch, and what AI noticed. It's a relationship system, not an address book.</>}
      right={<>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 480px", gap: 16, alignItems: "start" }}>
        <GlassCard padding={0} style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 22px", borderBottom: "0.5px solid var(--ink-line)", display: "grid", gridTemplateColumns: "44px 1fr 100px 80px 110px auto", gap: 12, alignItems: "center" }}>
            <span/><span className="t-cap">Person</span><span className="t-cap">Tag</span><span className="t-cap">Warmth</span><span className="t-cap">Last touch</span><span/>
          </div>
          {contacts.map((contact, i) => (
            <div key={contact.id || i} onClick={() => setSel(i)} style={{
              padding: "12px 22px", display: "grid", gridTemplateColumns: "44px 1fr 100px 80px 110px auto",
              gap: 12, alignItems: "center",
              borderBottom: i < contacts.length - 1 ? "0.5px solid var(--ink-line)" : "none",
              background: sel === i ? "rgba(245,165,36,.10)" : "transparent",
              boxShadow: sel === i ? "inset 3px 0 0 var(--accent-orange)" : "none",
              cursor: "default",
            }}>
              <Avatar initials={contact.avatar || contact.name?.[0] || '?'} color={contact.color} size={36} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{contact.name}</div>
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
              <button onClick={(e) => { e.stopPropagation(); deleteContact(i); }} style={{ fontSize: 10, color: "var(--ink-4)", padding: "2px 6px" }}>✕</button>
            </div>
          ))}
          {contacts.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--ink-3)" }}>No contacts yet.</div>
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
                  <PaperButton small accent onClick={() => deleteContact(sel)}>Delete</PaperButton>
                </div>
              </GlassCard>
              {c.ai && (
                <GlassCard>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AiOrb size={20} />
                    <div className="t-cap" style={{ color: "var(--accent-orange)" }}>AI noticed</div>
                  </div>
                  <div style={{ fontSize: 14, color: "var(--ink-1)", marginTop: 10, lineHeight: 1.5 }}>{c.ai}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <PaperButton small onClick={schedule}>Schedule</PaperButton>
                    <PaperButton small primary onClick={draftMessage}>Draft message</PaperButton>
                  </div>
                </GlassCard>
              )}
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
    </ScreenShell>
  );
};

const Stat = ({ label, value, accent }) => (
  <div>
    <div className="t-cap">{label}</div>
    <div className="t-display" style={{ fontSize: 22, color: accent || "var(--ink-1)", marginTop: 2 }}>{value}</div>
  </div>
);
