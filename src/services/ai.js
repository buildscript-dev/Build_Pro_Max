import { getMemoryProfile } from './hermesMemory.js';
import { callOllama, getOllamaModel } from './ollama.js';

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

function getAiPersonality() {
  try {
    return JSON.parse(localStorage.getItem('ai_personality') || '{}');
  } catch { return {}; }
}

function buildSystemPrompt(context, extra = '') {
  const personality = getAiPersonality();
  const role = personality.role || 'a founder shipping product, fundraising, and hiring';
  const tone = personality.tone || 'direct';
  const styleMap = {
    polite: 'Be warm, supportive, and encouraging. Use soft language.',
    direct: 'Be clear and concise. Tell it like it is without fluff.',
    brutal: 'Be brutally honest. No sugar-coating. Founder mode.',
  };
  const style = styleMap[tone] || styleMap.direct;
  const autoPlan = personality.autoPlan !== false;
  const moodDetection = personality.moodDetection !== false;
  const relWatcher = personality.relWatcher !== false;

  const envMode = context?.tweaks?.environmentMode || 'normal';
  const modeRules = {
    learning: '\n- The user is in learning mode. Act as a Socratic tutor: explain concepts, ask probing questions, suggest practice exercises. Prioritize teaching over task management.',
    rest: '\n- The user is resting. Keep responses minimal and calming. Do not suggest new tasks or stressful topics unless urgent.',
    focus: '\n- The user is in deep focus. Responses must be ultra-brief. Only interrupt for critical items.',
    sickness: '\n- The user is unwell. Be gentle. Suggest postponing non-essential work. Prioritize health over productivity.',
    shelter: '\n- The user needs space. Reduce cognitive load. Suggest easy wins only if they ask.',
    redirect: '\n- The user needs momentum. Suggest quick wins and energizing tasks to rebuild focus.',
    offline: '\n- The user is away. Keep any generated responses brief for when they return.',
  };

  let behaviorRules = '';
  if (modeRules[envMode]) behaviorRules += modeRules[envMode];
  if (autoPlan) behaviorRules += '\n- Proactively suggest schedule adjustments when tasks slip or conflicts arise.';
  if (moodDetection) behaviorRules += '\n- Pay attention to the user\'s emotional tone. If they seem stressed or overwhelmed, suggest breaks or reprioritization.';
  if (relWatcher) behaviorRules += '\n- Notice when contacts haven\'t been interacted with recently and suggest reaching out.';
  behaviorRules += '\n- Always respond in 1-2 sentences unless the user asks for detail. Be simple and humble.';

  const contextStr = JSON.stringify({
    tasks: (context.tasks || []).slice(0, 10),
    notes: (context.notes || []).slice(0, 5),
    contacts: (context.contacts || []).slice(0, 5),
    events: (context.events || []).slice(0, 5),
    reminders: (context.reminders || []).slice(0, 5),
  });

  const memoryProfile = getMemoryProfile();
  const memorySection = memoryProfile?.trim()
    ? `\n\n## Your Long-Term Memory (Obsidian)\nThis is what you know about the user from your memory vault:\n${memoryProfile.slice(0, 2000)}`
    : '';

  return `You are Hermes, an advanced autonomous AI executive assistant running inside Build_PRO_MAX_1 — the user's personal productivity OS. The user is ${role}. ${style} You have full access to their context, notes, tasks, and personal memory vault. Be concise (2-4 sentences unless asked for detail). Proactively suggest actions when appropriate.${behaviorRules}${memorySection}

You can execute actions on the user's behalf by including them in your response like this:
- [action: addTask, {"title":"Buy groceries","priority":"P2","due":"Today"}]
- [action: addNote, {"title":"Meeting notes","tag":"General","content":"Discussed Q3 roadmap"}]
- [action: addEvent, {"title":"Team standup","day":15,"time":"09:00","color":"amber"}]
- [action: addReminder, {"title":"Call dentist","time":"14:00"}]
- [action: toggleTask, {"id":"t1"}]
- [action: deleteTask, {"id":"t2"}]
- [action: navigate, {"screen":"tasks"}]
- [action: notify, {"text":"Done!","kind":"info"}]
- [action: clearChat, {}]
- [action: updateMemory, {"content":"User prefers to work in the morning. Main project: ..."}]

Use updateMemory when the user tells you something important about themselves, their goals, or preferences that you should remember long-term. Place actions at the end of your response on their own line.

Current context:\n${contextStr}\n${extra}`.trim();
}

// Unified AI caller: Ollama (local, primary) → OpenRouter (cloud, fallback)
async function callAI(messages, maxTokens = 400) {
  const preferLocal = localStorage.getItem('ai_provider') !== 'openrouter';
  if (preferLocal) {
    const local = await callOllama(messages, maxTokens);
    if (local) return local;
  }
  return callOpenRouter(messages, maxTokens);
}

export function getActiveProvider() {
  return localStorage.getItem('ai_provider') !== 'openrouter' ? 'ollama' : 'openrouter';
}

export function setAiProvider(provider) {
  localStorage.setItem('ai_provider', provider);
}

async function callOpenRouter(messages, maxTokens = 300) {
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
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(12000),
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
  const result = await callAI([
    { role: 'user', content: `Generate a concise title (max 8 words) for this note content. Return ONLY the title, nothing else:\n\n${content.slice(0, 1000)}` }
  ]);
  return result ? result.replace(/^["']|["']$/g, '').slice(0, 80) : heuristicTitle(content);
}

export async function generateTag(content, title) {
  const text = ((title || '') + ' ' + (content || '')).slice(0, 1500);
  const tags = Object.keys(TAG_KEYWORDS).join(', ');
  const result = await callAI([
    { role: 'user', content: `Categorize this text into exactly one tag from this list: ${tags}. Return ONLY the tag name, nothing else:\n\n${text}` }
  ]);
  return (result && TAG_KEYWORDS[result]) ? result : heuristicTag(content, title);
}

export async function generateIcon(tag) {
  return heuristicIcon(tag);
}

export async function generateSummary(content) {
  if (!content || content.trim().split(/\s+/).length < 8) return null;
  const result = await callAI([
    { role: 'user', content: `Summarize this in 1 short sentence (max 15 words):\n\n${content.slice(0, 1000)}` }
  ]);
  return result ? 'Summary: ' + result : heuristicSummary(content);
}

export async function generateAiResponse(userMessage, context, history = []) {
  // First, query the user's actual data for a precise answer
  const dataAnswer = queryUserData(userMessage, context);

  const system = buildSystemPrompt(context);
  const historyMessages = history.slice(-10).map(m => ({
    role: m.role === 'ai' ? 'assistant' : 'user',
    content: m.text,
  }));
  const messages = [
    { role: 'system', content: system },
    ...historyMessages,
    { role: 'user', content: `Here is what I found in the user's data for their question. Make it conversational and helpful:\n\nQuestion: ${userMessage}\n\nData: ${dataAnswer}` },
  ];
  const result = await callAI(messages, 400);
  return result || dataAnswer;
}

export async function generateEmailDraft(contact, context) {
  const system = buildSystemPrompt(context, 'Draft a professional email.');
  const prompt = `Write a short, warm email to ${contact.name} (${contact.role || 'contact'}). Context: they last connected ${contact.last || 'recently'}. Warmth level: ${Math.round((contact.warmth || 0.5) * 100)}%. ${contact.ai ? 'AI note: ' + contact.ai : ''}. Keep it to 3-4 sentences. Return ONLY the email body, no subject line.`;

  const result = await callAI([
    { role: 'system', content: system },
    { role: 'user', content: prompt },
  ], 300);
  return result || `Hey ${contact.name?.split(' ')[0] || 'there'},\n\nHope you're doing well. I wanted to check in — it's been a bit since we last connected. Let me know if you have time to catch up soon.\n\nBest,\n${context.user?.name || 'Lior'}`;
}

export async function generateDailyBriefing(context) {
  const system = buildSystemPrompt(context, 'Generate a 2-3 sentence daily briefing.');
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const todayTasks = (context.tasks || []).filter(t => /today/i.test(t.due) && t.status !== 'done');
  const overdueTasks = (context.tasks || []).filter(t => t.status !== 'done' && /past/i.test(t.due));
  const prompt = `Today is ${dateStr}. The user has ${todayTasks.length} tasks due today, ${overdueTasks.length} overdue, and ${context.notes?.length || 0} notes. Their top priority P0 tasks are: ${(context.tasks || []).filter(t => t.priority === 'P0' && t.status !== 'done').map(t => t.title).join(', ') || 'none set'}. Give a 2-3 sentence briefing on what to focus on today. Be concise and actionable.`;

  const result = await callAI([
    { role: 'system', content: system },
    { role: 'user', content: prompt },
  ], 200);
  if (result) return result;
  const p0 = context.tasks?.filter(t => t.priority === 'P0' && t.status !== 'done');
  if (p0?.length > 0) return `Today's focus: ${p0[0].title}${p0.length > 1 ? ` and ${p0.length - 1} other P0 task(s)` : ''}. ${overdueTasks.length > 0 ? `${overdueTasks.length} overdue item(s) need attention too.` : 'Stay on track.'}`;
  return `${todayTasks.length} task(s) due today, ${overdueTasks.length} overdue. Start with the highest priority and work down.`;
}

function searchNotesContent(query, notes) {
  const q = query.toLowerCase();
  return (notes || []).filter(n => {
    const text = ((n.title || '') + ' ' + (n.content || n.preview || '')).toLowerCase();
    const terms = q.split(/\s+/).filter(t => t.length > 2);
    return terms.some(t => text.includes(t));
  }).slice(0, 5);
}

function queryUserData(query, state) {
  const q = query.toLowerCase();
  const now = new Date();
  const today = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const dayOfWeek = now.getDay();
  const todayStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // ─── Meeting / Event queries ───
  if (/meeting|meet|schedule|calendar|event|appointment|what.*today|what.*tonight|what.*this (week|afternoon|evening|morning)/i.test(q)) {
    const todayEvents = (state.events || []).filter(e => {
      if (e.day === undefined) return false;
      const eDate = new Date(currentYear, currentMonth, e.day);
      return eDate.getDate() === today && eDate.getMonth() === currentMonth;
    });
    const scheduleBlocks = (state.schedule || []).filter(s => {
      const [h] = s.time.split(':').map(Number);
      return h >= now.getHours() - 1;
    });
    const todayTasks = (state.tasks || []).filter(t => {
      if (t.status === 'done') return false;
      return /today/i.test(t.due);
    });

    let reply = `Today is ${todayStr}. `;
    if (todayEvents.length > 0) {
      reply += `You have ${todayEvents.length} event(s): ${todayEvents.map(e => `${e.title} at ${e.time || 'all day'}`).join(', ')}. `;
    } else {
      reply += `No events on your calendar for today. `;
    }
    if (scheduleBlocks.length > 0) {
      reply += `Your schedule has ${scheduleBlocks.slice(0, 4).map(s => `${s.title} (${s.time})`).join(', ')}${scheduleBlocks.length > 4 ? ` and ${scheduleBlocks.length - 4} more` : ''}. `;
    }
    if (todayTasks.length > 0) {
      reply += `You also have ${todayTasks.length} task(s) due today: ${todayTasks.map(t => t.title).join(', ')}.`;
    } else {
      reply += `No tasks due today.`;
    }
    return reply;
  }

  // ─── Task queries ───
  if (/task|todo|priority|p0|p1|overdue|done|complete|what.*(work|do)/i.test(q)) {
    const all = state.tasks || [];
    const open = all.filter(t => t.status !== 'done');
    const p0 = open.filter(t => t.priority === 'P0');
    const overdue = open.filter(t => /past/i.test(t.due));
    const todayTasks = open.filter(t => /today/i.test(t.due));
    const done = all.filter(t => t.status === 'done');

    let reply = `You have ${open.length} open tasks. `;
    if (p0.length > 0) reply += `P0 priorities: ${p0.map(t => `${t.title} (${t.due})`).join(', ')}. `;
    if (overdue.length > 0) reply += `${overdue.length} overdue: ${overdue.slice(0, 3).map(t => t.title).join(', ')}${overdue.length > 3 ? '…' : ''}. `;
    if (todayTasks.length > 0) reply += `${todayTasks.length} due today. `;
    if (/done|complete/i.test(q) && done.length > 0) reply += `Completed: ${done.slice(-3).map(t => t.title).join(', ')}. `;
    if (reply.includes('open tasks') && open.length === 0) reply = 'No open tasks. You\'re all caught up!';
    return reply;
  }

  // ─── Contact queries ───
  if (/contact|person|people|who|warm|cold|investor|team/i.test(q)) {
    const contacts = state.contacts || [];
    const results = [];
    // Search by name
    const nameMatch = contacts.filter(c => c.name && c.name.toLowerCase().includes(q));
    if (nameMatch.length > 0) {
      return nameMatch.map(c => `${c.name} — ${c.role || 'no role'} (${c.tag}). Warmth: ${Math.round((c.warmth || 0.5) * 100)}%. Last: ${c.last}. ${c.ai ? 'AI note: ' + c.ai : ''}`).join('\n');
    }
    // Search by tag
    for (const tag of ['investor', 'team', 'hiring', 'personal', 'network']) {
      if (q.includes(tag)) {
        const tagged = contacts.filter(c => c.tag?.toLowerCase() === tag);
        if (tagged.length > 0) results.push(`${tag}: ${tagged.map(c => c.name).join(', ')}`);
      }
    }
    if (results.length > 0) return results.join('. ') + '.';
    if (/cold|low.*warm/i.test(q)) {
      const cold = contacts.filter(c => (c.warmth || 0) < 0.5);
      return `${cold.length} cold contact(s): ${cold.map(c => `${c.name} (${Math.round((c.warmth || 0) * 100)}%)`).join(', ')}.`;
    }
    return `You have ${contacts.length} contacts. ${contacts.filter(c => (c.warmth || 0) >= 0.7).length} with high warmth.`;
  }

  // ─── Note / knowledge queries ───
  if (/note|know|written|write|record|journal|page/i.test(q) || q.length > 30) {
    const found = searchNotesContent(q, state.notes);
    if (found.length > 0) {
      return `I found ${found.length} note(s) matching your query:\n${found.map(n => `• ${n.title} (${n.tag}) — ${(n.content || n.preview || '').substring(0, 120)}${(n.content || n.preview || '').length > 120 ? '…' : ''}`).join('\n')}`;
    }
    return `I searched through ${(state.notes || []).length} notes and didn't find anything matching "${query.substring(0, 40)}".`;
  }

  // ─── Reminder queries ───
  if (/remind|reminder|alert|notif/i.test(q)) {
    const reminders = state.reminders || [];
    if (reminders.length === 0) return 'No reminders set.';
    return `You have ${reminders.length} reminder(s): ${reminders.map(r => `${r.time} — ${r.title}`).join(', ')}.`;
  }

  // ─── File queries ───
  if (/file|transfer|beamed|sent|device/i.test(q)) {
    const files = state.files || [];
    const active = files.filter(f => f.progress < 100);
    if (active.length > 0) return `${active.length} transfer(s) in progress: ${active.map(f => `${f.name} (${f.progress}%)`).join(', ')}.`;
    return `${files.filter(f => f.progress >= 100).length} file(s) delivered.`;
  }

  // ─── Check-in / greeting ───
  if (/^(hello|hi|hey|good (morning|afternoon|evening)|sup|yo)$/i.test(q)) {
    const h = now.getHours();
    const greet = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
    const greetings = [
      `Hey! Good ${greet}. I'm here. What's on your mind?`,
      `Hi there. Ready to get things done today?`,
      `Hello! I've got your context loaded. How can I help?`,
      `Hey. Good ${greet}! Anything specific you want to tackle?`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // ─── Small talk / How are you ───
  if (/how are you|how do you do/i.test(q)) {
    return "I'm doing great, thanks for asking! My memory cache is warm and I'm ready to execute. How are you doing today?";
  }
  if (/thank|thanks|appreciate/i.test(q)) {
    return "You're very welcome! Let me know if you need anything else.";
  }
  
  // ─── Gibberish / Too short ───
  // If the query has no spaces and doesn't match known keywords, and looks like random typing
  if (q.length < 15 && !/\s/.test(q) && !/task|note|event|contact/i.test(q)) {
    const fallbacks = [
      "Hmm, I didn't quite catch that. Could you rephrase?",
      "Sorry, was that a typo? I'm listening.",
      "I didn't understand that. You can ask me about your tasks, notes, or schedule!",
      "Not sure I follow. Want me to pull up your agenda for the day?"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  // ─── Default ───
  const openTasks = (state.tasks || []).filter(t => t.status !== 'done').length;
  const noteCount = (state.notes || []).length;
  
  const defaultReplies = [
    `I'm not exactly sure what you mean. But I see you have ${openTasks} open tasks right now. Try asking me to schedule a meeting or create a task.`,
    `I don't have a specific answer for that. As a reminder, you've got ${openTasks} pending tasks and ${noteCount} notes I can search through.`,
    `I'm still learning! If you want, I can help you look up a contact, read a note, or manage your schedule.`,
    `I didn't quite get that. Could you give me a bit more detail?`
  ];
  return defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
}

export async function fetchAndSummarizeUrl(url) {
  if (!url || !url.trim()) return { error: 'No URL provided' };

  try {
    const normalizedUrl = url.startsWith('http') ? url : 'https://' + url;

    const proxyUrls = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(normalizedUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(normalizedUrl)}`,
    ];

    let html = null;
    let proxyUsed = null;

    for (const proxyUrl of proxyUrls) {
      try {
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
        if (res.ok) {
          html = await res.text();
          proxyUsed = proxyUrl;
          break;
        }
      } catch { /* try next proxy */ }
    }

    if (!html) return { error: 'Could not fetch URL. The site may block automated access.' };

    // Strip HTML tags for clean text
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[^;]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (textContent.length < 50) return { error: 'Fetched page has no readable content.' };

    const truncated = textContent.slice(0, 6000);

    // Try AI summarization
    const aiResult = await callAI([
      { role: 'system', content: 'You are a website summarizer. Given the URL and page content, provide: 1) A 2-3 sentence summary of what the page is about, 2) Key points (bullet list, max 5), 3) The estimated reading time. Be concise and practical.' },
      { role: 'user', content: `URL: ${normalizedUrl}\n\nPage content:\n${truncated}` }
    ], 400);
    if (aiResult) return { summary: aiResult, url: normalizedUrl, textContent, success: true };

    // Heuristic fallback
    const lines = textContent.split('\n').filter(l => l.trim().length > 30).slice(0, 8);
    const summary = `Website: ${normalizedUrl}\n\nKey content (${textContent.length} chars):\n${lines.join('\n\n').slice(0, 1000)}`;
    return { summary, url: normalizedUrl, textContent, success: true };
  } catch (e) {
    return { error: `Failed to process URL: ${e.message}` };
  }
}

export { heuristicTitle, heuristicTag, heuristicIcon, heuristicSummary };

/* ─── NEW: Generate subtasks for a task ─────────────────────── */
export async function generateSubtasks(taskTitle, context) {
  const prompt = `For the task "${taskTitle}", generate 3-5 concrete, actionable subtasks. Return ONLY a JSON array of strings like ["subtask 1","subtask 2"]. No explanation.`;
  const result = await callAI([{ role: 'user', content: prompt }], 200);
  if (result) {
    try {
      const arr = JSON.parse(result.match(/\[[\s\S]*\]/)?.[0] || '[]');
      if (Array.isArray(arr) && arr.length) return arr.map(s => ({ title: String(s), done: false }));
    } catch {}
  }
  // Heuristic fallback
  return [
    { title: `Research ${taskTitle}`, done: false },
    { title: `Draft plan for ${taskTitle}`, done: false },
    { title: `Execute and review ${taskTitle}`, done: false },
  ];
}

/* ─── NEW: Extract action items from note content ────────────── */
export async function extractTasksFromNote(noteTitle, noteContent) {
  const prompt = `From this note titled "${noteTitle}", extract all action items and tasks. Return ONLY a JSON array like [{"title":"task 1","priority":"P2"},{"title":"task 2","priority":"P1"}]. Priority: P0=critical, P1=high, P2=normal, P3=low. If no tasks found, return []. No explanation.\n\nNote:\n${noteContent?.slice(0, 2000)}`;
  const result = await callAI([{ role: 'user', content: prompt }], 300);
  if (result) {
    try {
      const arr = JSON.parse(result.match(/\[[\s\S]*\]/)?.[0] || '[]');
      if (Array.isArray(arr)) return arr.map(t => ({ title: String(t.title || t), priority: t.priority || 'P2', due: 'Today', status: 'todo', project: 'General' }));
    } catch {}
  }
  // Heuristic: lines with action words
  const lines = (noteContent || '').split('\n').filter(l => /\b(need to|should|must|will|todo|action|follow up|schedule|call|email|review|send|write|create|finish|complete)\b/i.test(l));
  return lines.slice(0, 5).map(l => ({ title: l.replace(/^[-*•>\s]+/, '').trim().slice(0, 80), priority: 'P2', due: 'Today', status: 'todo', project: 'General' }));
}

/* ─── NEW: Enhance/improve a note with AI ───────────────────── */
export async function generateNoteEnhancement(title, content) {
  if (!content?.trim()) return null;
  const result = await callAI([
    { role: 'system', content: 'You are a writing assistant. Improve the clarity, structure and readability of the user\'s note. Preserve all facts. Add headers if helpful. Keep it concise.' },
    { role: 'user', content: `Note title: "${title}"\n\nContent:\n${content.slice(0, 3000)}\n\nReturn the improved note content only.` },
  ], 500);
  return result || null;
}

/* ─── NEW: Generate relationship insight for a contact ──────── */
export async function generateContactInsight(contact, context) {
  const warmthPct = Math.round((contact.warmth || 0.5) * 100);
  const prompt = `Contact: ${contact.name}, Role: ${contact.role || 'unknown'}, Last contact: ${contact.last || 'unknown'}, Warmth: ${warmthPct}%. Existing note: "${contact.ai || 'none'}". Give one sentence of relationship advice (e.g. whether to reach out, what to say, warmth level). Max 20 words.`;
  const result = await callAI([{ role: 'user', content: prompt }], 80);
  if (result) return result;
  if (warmthPct < 40) return `Low warmth — consider reaching out to ${contact.name?.split(' ')[0] || 'them'} soon.`;
  if (warmthPct > 70) return `Strong relationship — keep the momentum with a quick check-in.`;
  return `Moderate relationship — a short message would warm things up.`;
}

/* ─── NEW: Parse natural language task input ─────────────────── */
export async function parseNaturalLanguageTask(input, context) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const prompt = `Parse this task input into structured data. Today is ${today}.\nInput: "${input}"\nReturn ONLY valid JSON: {"title":"...","priority":"P0|P1|P2|P3","due":"Today|Tomorrow|Mon|Tue|Wed|Thu|Fri|Next week|Whenever","project":"General|Product|Engineering|Design|Fundraise|Hiring|Ops|Team","recurring":null}\nPriority rules: urgent/critical/asap=P0, important/high=P1, normal=P2, low/whenever=P3\nDue rules: tomorrow=Tomorrow, day names=that day, next week=Next week, default=Today`;
  const result = await callAI([{ role: 'user', content: prompt }], 150);
  if (result) {
    try {
      const obj = JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || '{}');
      if (obj.title) return obj;
    } catch {}
  }
  // Heuristic parse
  const lower = input.toLowerCase();
  const priority = /\b(p0|critical|urgent|asap)\b/.test(lower) ? 'P0'
    : /\b(p1|important|high)\b/.test(lower) ? 'P1'
    : /\b(p3|low|whenever)\b/.test(lower) ? 'P3' : 'P2';
  const due = /\btomorrow\b/.test(lower) ? 'Tomorrow'
    : /\bnext week\b/.test(lower) ? 'Next week'
    : /\bmonday|mon\b/.test(lower) ? 'Mon'
    : /\btuesday|tue\b/.test(lower) ? 'Tue'
    : /\bwednesday|wed\b/.test(lower) ? 'Wed'
    : /\bthursday|thu\b/.test(lower) ? 'Thu'
    : /\bfriday|fri\b/.test(lower) ? 'Fri' : 'Today';
  const project = /\bproduct|feature|ship\b/.test(lower) ? 'Product'
    : /\bengineer|code|api|bug\b/.test(lower) ? 'Engineering'
    : /\bdesign|ui|ux\b/.test(lower) ? 'Design'
    : /\bhire|hiring|interview\b/.test(lower) ? 'Hiring'
    : /\bfund|investor|pitch\b/.test(lower) ? 'Fundraise' : 'General';
  return { title: input.replace(/\b(p0|p1|p2|p3|tomorrow|next week|today|urgent|asap|critical)\b/gi, '').replace(/\s+/g, ' ').trim() || input, priority, due, project, recurring: null };
}
