const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const FALLBACK_MODEL = 'mistralai/mistral-7b-instruct:free';

const TAG_KEYWORDS = {
  Fundraise: ['fundraise', 'investor', 'memo', 'seed', 'round', 'cap table', 'pitch', 'deck', 'valuation', 'money', 'raise'],
  Hiring: ['hire', 'hiring', 'candidate', 'interview', 'recruit', 'role', 'position', 'talks', 'founding', 'team', 'people'],
  Network: ['network', 'dinner', 'coffee', 'meet', 'intro', 'connect', 'lunch', 'social', 'founder', 'event'],
  Pages: ['pages', 'journal', 'morning', 'woke', 'felt', 'today', 'feeling', 'mood', 'dream'],
  Reading: ['read', 'reading', 'book', 'queue', 'article', 'essay', 'paper', 'blog'],
  Product: ['product', 'feature', 'ship', 'roadmap', 'build', 'v0', 'v1', 'v3', 'onboarding', 'launch', 'release'],
  Design: ['design', 'ui', 'ux', 'figma', 'lottie', 'craft', 'motion', 'visual', 'interface'],
  Engineering: ['eng', 'engineering', 'code', 'api', 'schema', 'arch', 'infra', 'backend', 'frontend', 'database'],
  Inbox: ['inbox', 'capture', 'quick', 'note to self', 'reminder'],
};

const ICON_MAP = {
  Fundraise: 'target', Hiring: 'contacts', Network: 'contacts',
  Pages: 'notes', Reading: 'notes', Product: 'tasks',
  Design: 'sparkle', Engineering: 'planner', Inbox: 'plus',
};

function getApiKey() {
  try { return localStorage.getItem('openrouter_api_key') || ''; } catch { return ''; }
}

async function callOpenRouter(messages) {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const res = await fetch(OPENROUTER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Build_PRO_MAX_1',
      },
      body: JSON.stringify({
        model: FALLBACK_MODEL,
        messages: [{ role: 'system', content: 'You are a helpful AI assistant that understands context. Respond concisely.' }, ...messages],
        max_tokens: 200,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

function heuristicTitle(content) {
  if (!content || !content.trim()) return '';
  const lines = content.trim().split('\n').filter(Boolean);
  const firstLine = lines[0]?.substring(0, 60);
  if (firstLine && firstLine.length > 8) return firstLine;
  const words = content.trim().split(/\s+/);
  return words.slice(0, 8).join(' ') + (words.length > 8 ? '…' : '');
}

function heuristicTag(content, title) {
  if (!content && !title) return 'General';
  const text = ((title || '') + ' ' + (content || '')).toLowerCase();
  let bestTag = 'General';
  let bestScore = 0;
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    const score = keywords.reduce((s, kw) => s + (text.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; bestTag = tag; }
  }
  return bestTag;
}

function heuristicIcon(tag) {
  return ICON_MAP[tag] || 'notes';
}

function heuristicSummary(content) {
  if (!content || content.trim().split(/\s+/).length < 8) return null;
  const words = content.trim().split(/\s+/);
  return 'Summary: ' + words.slice(0, 25).join(' ') + (words.length > 25 ? '…' : '');
}

export async function generateTitle(content) {
  if (!content || !content.trim()) return '';
  const apiKey = getApiKey();
  if (apiKey) {
    const result = await callOpenRouter([
      { role: 'user', content: `Generate a concise title (max 8 words) for this note content. Return ONLY the title, nothing else:\n\n${content.slice(0, 1000)}` }
    ]);
    if (result) return result.replace(/^["']|["']$/g, '').slice(0, 80);
  }
  return heuristicTitle(content);
}

export async function generateTag(content, title) {
  const apiKey = getApiKey();
  const text = ((title || '') + ' ' + (content || '')).slice(0, 1500);
  if (apiKey) {
    const tags = Object.keys(TAG_KEYWORDS).join(', ');
    const result = await callOpenRouter([
      { role: 'user', content: `Categorize this text into exactly one tag from this list: ${tags}. Return ONLY the tag name, nothing else:\n\n${text}` }
    ]);
    if (result && TAG_KEYWORDS[result]) return result;
  }
  return heuristicTag(content, title);
}

export async function generateIcon(tag) {
  return heuristicIcon(tag);
}

export async function generateSummary(content) {
  if (!content || content.trim().split(/\s+/).length < 8) return null;
  const apiKey = getApiKey();
  if (apiKey) {
    const result = await callOpenRouter([
      { role: 'user', content: `Summarize this in 1 short sentence (max 15 words):\n\n${content.slice(0, 1000)}` }
    ]);
    if (result) return 'Summary: ' + result;
  }
  return heuristicSummary(content);
}

export async function generateAiResponse(userMessage, context) {
  const apiKey = getApiKey();
  const contextStr = JSON.stringify({
    tasks: (context.tasks || []).slice(0, 10),
    notes: (context.notes || []).slice(0, 5),
    contacts: (context.contacts || []).slice(0, 5),
    events: (context.events || []).slice(0, 5),
    reminders: (context.reminders || []).slice(0, 5),
  });

  if (apiKey) {
    const result = await callOpenRouter([
      { role: 'system', content: `You are an AI assistant inside a productivity app called Build_PRO_MAX_1. You have access to the user's context data. Be helpful, concise, and proactive. Here's the current context:\n${contextStr}` },
      { role: 'user', content: userMessage }
    ]);
    if (result) return result;
  }
  return heuristicResponse(userMessage, context);
}

function heuristicResponse(q, state) {
  const qLower = q.toLowerCase();
  const taskCount = state.tasks?.filter(t => t.status !== 'done').length || 0;
  const todayTasks = state.tasks?.filter(t => /today/i.test(t.due) && t.status !== 'done').length || 0;
  const noteCount = state.notes?.length || 0;

  if (/cancel/i.test(qLower)) {
    const overdue = state.tasks?.filter(t => t.status !== 'done' && /past/i.test(t.due)).length || 0;
    if (overdue > 0) return `You have ${overdue} overdue task(s). Consider rescheduling or canceling those first.`;
    return "Look at your schedule — the lowest-value block is usually the async review. Cancel that and reclaim an hour.";
  }
  if (/caro/i.test(qLower)) return "Caro's last message was Slack DM. She said 'sleep on it, send in the morning.'";
  if (/sana|ines/i.test(qLower)) return "Sana → systems + product. Ines → craft. Both above bar. Decide today.";
  if (/hello|hi|hey/i.test(qLower)) return `Hey! You have ${taskCount} open tasks and ${noteCount} notes. What's on your mind?`;
  if (/task/i.test(qLower)) return `You have ${taskCount} open tasks, ${todayTasks} due today. Want me to list priorities?`;
  if (/summary|week/i.test(qLower)) return `This week: ${todayTasks} tasks due today, ${noteCount} notes captured.`;
  if (/memo|bessemer/i.test(qLower)) return "Bessemer memo v3 is drafted and ready. Send before 14:30.";
  return `I see ${taskCount} active tasks and ${noteCount} notes. What would you like to focus on?`;
}

export { heuristicTitle, heuristicTag, heuristicIcon, heuristicSummary };
