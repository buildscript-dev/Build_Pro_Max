// Hermes Local AI — routes chat to the local Hermes agent via Vite plugin
// Provides notes/tasks/planner context to Hermes for intelligent summaries

const HERMES_ENDPOINT = '/api/hermes-chat';

let _statusCache = null;
let _statusTs = 0;

export async function checkHermesLocalStatus() {
  if (_statusCache && Date.now() - _statusTs < 15000) return _statusCache;
  try {
    const res = await fetch(`${HERMES_ENDPOINT}/status`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) { _statusCache = { online: false }; _statusTs = Date.now(); return _statusCache; }
    const data = await res.json();
    _statusCache = { online: data.online ?? true, model: data.model, provider: data.provider };
    _statusTs = Date.now();
    return _statusCache;
  } catch {
    _statusCache = { online: false };
    _statusTs = Date.now();
    return _statusCache;
  }
}

export function buildHermesContext(appSnapshot) {
  if (!appSnapshot) return '';
  const { user, notes = [], tasks = [], events = [], goals = [], schedule = [] } = appSnapshot;

  const openTasks = tasks.filter(t => t.status !== 'done').slice(0, 10);
  const recentNotes = notes.slice(0, 6);
  const todayEvents = events.slice(0, 5);

  const lines = [
    `User: ${user?.name || 'User'} (${user?.role || 'Founder'})`,
    user?.email ? `Email: ${user.email}` : '',
    '',
    openTasks.length
      ? `Open Tasks (${openTasks.length}):\n${openTasks.map(t => `  - [${t.priority || 'P1'}] ${t.title || t.text}`).join('\n')}`
      : 'Tasks: none open',
    '',
    recentNotes.length
      ? `Recent Notes:\n${recentNotes.map(n => `  - "${n.title || n.text?.slice(0, 60) || 'Untitled'}"`).join('\n')}`
      : 'Notes: none',
    '',
    todayEvents.length
      ? `Upcoming Events:\n${todayEvents.map(e => `  - ${e.title} (${e.time || e.date || ''})`).join('\n')}`
      : '',
    goals.length
      ? `Goals: ${goals.slice(0, 3).map(g => g.title || g.text).join(', ')}`
      : '',
  ].filter(Boolean);

  return lines.join('\n');
}

export async function callHermesLocal(userMessage, appSnapshot, chatHistory = []) {
  const context = buildHermesContext(appSnapshot);

  const historyText = chatHistory
    .slice(-6)
    .filter(m => m.role === 'user' || m.role === 'ai')
    .map(m => `${m.role === 'user' ? 'User' : 'Hermes'}: ${(m.text || '').slice(0, 300)}`)
    .join('\n');

  try {
    const res = await fetch(HERMES_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage, context, historyText }),
      signal: AbortSignal.timeout(55000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.response || null;
  } catch {
    return null;
  }
}

export function parseNameChangeCommand(text) {
  const patterns = [
    /change\s+my\s+name\s+to\s+["']?([^"'\n]+?)["']?\s*$/i,
    /(?:call|rename)\s+me\s+["']?([^"'\n]+?)["']?\s*$/i,
    /my\s+name\s+is\s+now\s+["']?([^"'\n]+?)["']?\s*$/i,
    /set\s+(?:my\s+)?name\s+(?:to\s+)?["']?([^"'\n]+?)["']?\s*$/i,
    /update\s+(?:my\s+)?name\s+(?:to\s+)?["']?([^"'\n]+?)["']?\s*$/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim().replace(/['"]/g, '');
  }
  return null;
}

export function parseSummaryCommand(text) {
  const t = text.toLowerCase();
  if (/summar(y|ize|ise).*(note|memory|journal)/i.test(t) || /note.*summar/i.test(t)) return 'notes';
  if (/summar(y|ize|ise).*(plan|task|todo|schedule)/i.test(t) || /(plan|task).*summar/i.test(t)) return 'planner';
  if (/summar(y|ize|ise).*(today|day|everything|all)/i.test(t) || /daily.*brief/i.test(t)) return 'all';
  return null;
}
