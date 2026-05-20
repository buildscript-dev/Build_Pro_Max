const SIGNAL_PATTERNS = {
  energy: {
    low: [
      { words: ['exhausted', 'wiped', 'dead tired', 'beyond tired', 'can\'t keep eyes'], weight: 0.9 },
      { words: ['tired', 'sleepy', 'drained', 'fatigued', 'worn out', 'burned out'], weight: 0.7 },
      { words: ['slept', 'only', 'hours', 'night'], weight: 0.6, requireCluster: true },
      { words: ['long day', 'rough day', 'hectic day', 'hard day'], weight: 0.5 },
      { words: ['barely', 'functioning', 'running on empty'], weight: 0.8 },
    ],
    high: [
      { words: ['wired', 'can\'t sleep', 'energized', 'rested', 'great sleep'], weight: 0.7 },
      { words: ['pumped', 'hyped', 'ready to go', 'full energy'], weight: 0.6 },
    ],
    overstimulated: [
      { words: ['anxious', 'overstimulated', 'can\'t calm down', 'racing thoughts'], weight: 0.7 },
      { words: ['too much coffee', '3 coffees', '4 coffees', '5 coffees'], weight: 0.8 },
    ],
  },
  focus: {
    deep: [
      { words: ['in the zone', 'deep work', 'flow state', 'locked in', 'ship mode'], weight: 0.9 },
      { words: ['coding', 'writing', 'building', 'creating', 'architecting'], weight: 0.4, requireCluster: true },
    ],
    fragile: [
      { words: ['distracted', 'can\'t focus', 'adhd day', 'brain fog', 'scattered'], weight: 0.8 },
      { words: ['hard to concentrate', 'keep losing', 'attention span'], weight: 0.7 },
    ],
    low: [
      { words: ['bored', 'procrastinating', 'can\'t get started', 'unmotivated'], weight: 0.7 },
      { words: ['dreading', 'avoiding', 'putting off'], weight: 0.5 },
    ],
  },
  mood: {
    negative: [
      { words: ['frustrated', 'angry', 'pissed', 'annoyed', 'irritated'], weight: 0.7 },
      { words: ['terrible', 'awful', 'horrible', 'worst day', 'shit day'], weight: 0.8 },
      { words: ['overwhelmed', 'stressed', 'anxious', 'panic', 'freaking out'], weight: 0.8 },
      { words: ['sad', 'depressed', 'down', 'crying', 'lonely'], weight: 0.7 },
    ],
    positive: [
      { words: ['happy', 'great', 'amazing', 'wonderful', 'fantastic', 'incredible'], weight: 0.6 },
      { words: ['grateful', 'blessed', 'excited', 'thrilled', 'proud'], weight: 0.5 },
    ],
    neutral: [
      { words: ['okay', 'fine', 'alright', 'decent', 'manageable'], weight: 0.4 },
    ],
  },
  health: {
    sick: [
      { words: ['sick', 'fever', 'cough', 'cold', 'flu', 'throat hurts', 'stomach'], weight: 0.8 },
      { words: ['headache', 'migraine', 'eye strain', 'back hurts', 'pain'], weight: 0.7 },
    ],
    injured: [
      { words: ['injured', 'sprained', 'broken', 'pulled', 'strained'], weight: 0.9 },
    ],
    post_exercise: [
      { words: ['workout', 'gym', 'ran', 'biked', 'hiked', 'exercised', 'trained'], weight: 0.6 },
      { words: ['leg day', 'chest day', 'sore', 'post-workout'], weight: 0.5 },
    ],
  },
  social: {
    unavailable: [
      { words: ['with family', 'family time', 'with the kids', 'date night'], weight: 0.8 },
      { words: ['offline', 'away', 'vacation', 'holiday', 'day off'], weight: 0.7 },
    ],
    available: [
      { words: ['alone', 'nobody home', 'working solo', 'home alone'], weight: 0.5 },
    ],
    socializing: [
      { words: ['meeting', 'dinner with', 'drinks with', 'hanging with', 'catching up'], weight: 0.4 },
    ],
  },
  intent: {
    initiative: [
      { words: ['starting', 'kicking off', 'launching', 'beginning', 'initiating'], weight: 0.6 },
      { words: ['new project', 'new initiative', 'new phase'], weight: 0.7 },
    ],
    pivot: [
      { words: ['pivot', 'shifting focus', 'changing direction', 'reprioritizing'], weight: 0.7 },
    ],
    completion: [
      { words: ['closing', 'wrapping up', 'finalizing', 'completing', 'finishing'], weight: 0.6 },
      { words: ['last push', 'final stretch', 'ship it'], weight: 0.5 },
    ],
    urgent: [
      { words: ['urgent', 'asap', 'emergency', 'critical', 'fire', 'server down', 'deadline'], weight: 0.9 },
    ],
  },
  learning: {
    active: [
      { words: ['learning', 'studying', 'practicing', 'tutorial', 'course', 'lesson'], weight: 0.7 },
      { words: ['trying to understand', 'figuring out', 'wrapping my head', 'new concept'], weight: 0.8 },
      { words: ['documentation', 'docs', 'readme', 'guide', 'walkthrough'], weight: 0.5 },
    ],
    coding: [
      { words: ['debug', 'error', 'bug', 'fix', 'compile', 'syntax', 'runtime'], weight: 0.7 },
      { words: ['code', 'function', 'class', 'api', 'endpoint', 'component', 'hook'], weight: 0.5 },
      { words: ['import', 'export', 'return', 'async', 'await', 'promise', 'callback'], weight: 0.4 },
    ],
    exploring: [
      { words: ['what is', 'how does', 'how to', 'why does', 'difference between'], weight: 0.8 },
      { words: ['curious about', 'interested in', 'diving into', 'exploring'], weight: 0.6 },
      { words: ['new tech', 'new language', 'new framework', 'new tool'], weight: 0.5 },
    ],
    stuck: [
      { words: ['stuck', 'confused', 'don\'t understand', 'not working', 'doesn\'t work'], weight: 0.8 },
      { words: ['tried everything', 'hours debugging', 'can\'t figure out', 'no idea'], weight: 0.7 },
      { words: ['help', 'wtf', 'why isn\'t', 'broken'], weight: 0.6 },
    ],
    breakthrough: [
      { words: ['aha', 'got it', 'figured it out', 'found it', 'that was it'], weight: 0.8 },
      { words: ['finally', 'works now', 'solved', 'fixed it', 'understood'], weight: 0.7 },
      { words: ['learned so much', 'mind blown', 'this is cool'], weight: 0.5 },
    ],
  },
};

function detectSignal(text, category, subcategory) {
  const lower = text.toLowerCase();
  const patterns = SIGNAL_PATTERNS[category]?.[subcategory] || [];
  let maxScore = 0;
  for (const pattern of patterns) {
    const matchCount = pattern.words.filter(w => lower.includes(w)).length;
    if (matchCount === 0) continue;
    if (pattern.requireCluster && matchCount < 2) continue;
    maxScore = Math.max(maxScore, pattern.weight * (matchCount / pattern.words.length));
  }
  return maxScore;
}

function analyzeText(text) {
  if (!text || !text.trim()) return null;

  const scores = {};

  const categories = Object.keys(SIGNAL_PATTERNS);
  for (const cat of categories) {
    scores[cat] = {};
    for (const subcat of Object.keys(SIGNAL_PATTERNS[cat])) {
      scores[cat][subcat] = detectSignal(text, cat, subcat);
    }
  }

  const result = {
    energy: null,
    focus: null,
    mood: null,
    health: null,
    social: null,
    intent: null,
    learning: null,
    urgency: 0,
    confidence: 0,
    isLearningSession: false,
    isCodeSession: false,
  };

  for (const cat of categories) {
    const subcats = Object.entries(scores[cat]);
    const best = subcats.reduce((a, b) => a[1] >= b[1] ? a : b);
    if (best[1] > 0.15) {
      result[cat] = best[0];
      result.confidence = Math.max(result.confidence, best[1]);
      if (cat === 'intent' && best[0] === 'urgent') {
        result.urgency = best[1];
      }
    }
  }

  if (result.learning) {
    result.isLearningSession = result.learning === 'active' || result.learning === 'coding' || result.learning === 'exploring' || result.learning === 'stuck' || result.learning === 'breakthrough';
    result.isCodeSession = result.learning === 'coding' || result.learning === 'stuck';
  }

  const urgencyPatterns = [
    { words: ['urgent', 'asap', 'emergency', 'critical', 'fire', 'server down', 'deadline moved'], weight: 0.9 },
    { words: ['important', 'time-sensitive', 'rush', 'quickly'], weight: 0.5 },
  ];
  const lower = text.toLowerCase();
  for (const pattern of urgencyPatterns) {
    const count = pattern.words.filter(w => lower.includes(w)).length;
    if (count > 0) {
      result.urgency = Math.max(result.urgency, pattern.weight * (count / pattern.words.length));
    }
  }

  return result;
}

function computeModeFromState(state) {
  if (!state) return 'normal';

  const { energy, focus, mood, health, social, learning } = state;

  if (learning && (learning === 'active' || learning === 'coding' || learning === 'exploring' || learning === 'stuck' || learning === 'breakthrough')) return 'learning';
  if (health === 'sick' || health === 'injured') return 'sickness';
  if (energy === 'low' || energy === 'overstimulated') return 'rest';
  if (energy === 'low' && mood === 'negative') return 'rest';
  if (focus === 'deep') return 'focus';
  if (focus === 'fragile') return 'shelter';
  if (mood === 'negative' || mood === 'anxious') return 'shelter';
  if (focus === 'low') return 'redirect';
  if (social === 'unavailable') return 'offline';

  return 'normal';
}

const MODE_CONFIG = {
  rest: {
    label: 'Rest Mode',
    emoji: '🌙',
    description: 'You seem tired — I\'ve adjusted your environment for rest.',
    actions: {
      silenceNotifications: true,
      blockCalendar: { duration: '2h', label: 'Recovery time' },
      setAutoReply: 'Taking a rest break — will respond soon.',
      dimScreen: true,
      pauseMusic: true,
      enableDnd: true,
    },
  },
  focus: {
    label: 'Deep Focus Mode',
    emoji: '🎯',
    description: 'You\'re in flow — I\'m blocking distractions.',
    actions: {
      silenceNotifications: { critical: true },
      startFocusTimer: 25,
      setAutoReply: 'Deep focus session — will reply after.',
      enableDnd: true,
      playAmbientSound: true,
    },
  },
  shelter: {
    label: 'Shelter Mode',
    emoji: '🛡️',
    description: 'Giving you some space — reducing noise.',
    actions: {
      silenceNotifications: true,
      setAutoReply: 'Taking a moment — will respond soon.',
      dimScreen: true,
      reduceMotion: true,
      showEasyTasks: true,
    },
  },
  sickness: {
    label: 'Sickness Mode',
    emoji: '🤒',
    description: 'Hope you feel better — I\'ve cleared your schedule.',
    actions: {
      silenceNotifications: { health: true },
      blockCalendar: { duration: '24h', label: 'Wellness day' },
      setAutoReply: 'Not feeling well — working reduced hours.',
      dimScreen: true,
      resizeFont: true,
    },
  },
  redirect: {
    label: 'Redirect Mode',
    emoji: '🔄',
    description: 'Let\'s find some momentum — here are quick wins.',
    actions: {
      showQuickWins: true,
      startEnergizingMusic: true,
      blockDistractions: true,
    },
  },
  offline: {
    label: 'Away Mode',
    emoji: '🔕',
    description: 'You\'re away — pausing all work notifications.',
    actions: {
      silenceNotifications: true,
      setAutoReply: 'Currently away — will respond when back.',
    },
  },
  learning: {
    label: 'Learning Mode',
    emoji: '🧠',
    description: 'You\'re in a learning flow — AI is capturing, teaching, and organizing for you.',
    actions: {
      enableAiTutor: true,
      autoCaptureNotes: true,
      showLearningPanel: true,
      silenceNotifications: true,
      enableResourceFinder: true,
      trackLearningProgress: true,
      setAutoReply: 'In a learning session — will respond after.',
    },
  },
  normal: {
    label: 'Normal Mode',
    emoji: '✨',
    description: 'Everything\'s running as usual.',
    actions: {},
  },
};

function getModeConfig(mode) {
  return MODE_CONFIG[mode] || MODE_CONFIG.normal;
}

function getAutoReply(mode, userName = '') {
  const config = MODE_CONFIG[mode];
  if (!config || mode === 'normal') return null;
  return config.actions.setAutoReply || null;
}

function shouldSilenceNotifications(mode) {
  const config = MODE_CONFIG[mode];
  if (!config) return false;
  return !!config.actions.silenceNotifications;
}

export function extractEnvironmentState(text) {
  const analysis = analyzeText(text);
  if (!analysis || analysis.confidence < 0.2) {
    return { mode: 'normal', analysis: null, confidence: 0, shouldAct: false, learningItems: null };
  }

  const mode = computeModeFromState(analysis);
  const shouldAct = mode !== 'normal' && analysis.confidence >= 0.25;

  const learningItems = analysis.isLearningSession ? extractLearningItems(text) : null;

  return {
    mode,
    analysis,
    confidence: analysis.confidence,
    shouldAct,
    config: getModeConfig(mode),
    autoReply: getAutoReply(mode),
    silenceNotifications: shouldSilenceNotifications(mode),
    learningItems,
    isLearningSession: analysis.isLearningSession,
    isCodeSession: analysis.isCodeSession,
  };
}

export function extractEventsAndReminders(text) {
  const results = { events: [], reminders: [], tasks: [] };
  if (!text) return results;

  const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)\b/g;
  const dateWords = ['today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'next week'];

  let match;
  while ((match = timeRegex.exec(text)) !== null) {
    const fullTime = match[0];
    const activityMatch = text.match(
      /(?:meeting|call|sync|dinner|gym|workout|lunch|coffee|appointment|standup|interview)\s*(?:with\s+(\w+(?:\s+\w+)?))?/gi
    );
    const activity = activityMatch?.[0] || 'Scheduled item';

    const dateMatch = text.match(new RegExp(dateWords.join('|'), 'i'));
    const dayOffset = dateMatch?.[0]?.toLowerCase() === 'tomorrow' ? 1 : 0;

    const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    const namedDay = dateMatch ? dayMap[dateMatch[0].toLowerCase()] : undefined;
    let targetDay = new Date().getDate() + dayOffset;
    if (namedDay !== undefined) {
      const today = new Date().getDay();
      targetDay = new Date().getDate() + ((namedDay - today + 7) % 7);
    }

    results.reminders.push({
      title: `🔔 ${activity}`,
      time: fullTime,
      kind: 'ai-extracted',
    });

    results.events.push({
      title: activity,
      day: targetDay,
      time: fullTime,
      color: 'amber',
    });
  }

  const taskPatterns = [
    { regex: /(?:need to|should|have to|must|gotta|going to)\s+(.+?)(?:\.|,|$)/gi, priority: 'P1' },
    { regex: /(?:todo|to-do|to do):\s*(.+?)(?:\.|,|$)/gi, priority: 'P2' },
    { regex: /(?:don't forget|remind me|remember)\s+(?:to\s+)?(.+?)(?:\.|,|$)/gi, priority: 'P2' },
  ];

  for (const pattern of taskPatterns) {
    let tm;
    while ((tm = pattern.regex.exec(text)) !== null) {
      const taskText = tm[1].trim();
      if (taskText.length > 5 && taskText.length < 100) {
        const isUrgent = /\b(urgent|asap|critical|today)\b/i.test(taskText);
        results.tasks.push({
          title: taskText.charAt(0).toUpperCase() + taskText.slice(1),
          priority: isUrgent ? 'P0' : pattern.priority,
          due: isUrgent ? 'Today' : 'This week',
        });
      }
    }
  }

  return results;
}

const LEARNING_CATEGORIES = {
  concept: { words: ['concept', 'idea', 'principle', 'theory', 'pattern', 'paradigm'], icon: '💡' },
  code: { words: ['code', 'function', 'class', 'method', 'api', 'syntax'], icon: '💻' },
  error: { words: ['error', 'bug', 'issue', 'problem', 'crash', 'exception', 'stack trace'], icon: '🐛' },
  question: { words: ['what if', 'how', 'why', 'when should', 'difference', 'vs', 'versus'], icon: '❓' },
  practice: { words: ['practice', 'exercise', 'challenge', 'build', 'implement', 'try'], icon: '⚡' },
  resource: { words: ['tutorial', 'docs', 'article', 'video', 'course', 'book', 'guide'], icon: '📚' },
  insight: { words: ['realized', 'understood', 'aha', 'clicked', 'makes sense', 'connection'], icon: '✨' },
};

export function extractLearningItems(text) {
  const items = { concepts: [], codeBlocks: [], errors: [], questions: [], resources: [], insights: [], challenges: [] };
  if (!text) return items;

  // Extract code blocks (backtick or indented)
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    items.codeBlocks.push({
      language: match[1] || 'code',
      code: match[2].trim(),
      source: 'explicit',
    });
  }

  // Inline code extraction
  const inlineCodeRegex = /`([^`]+)`/g;
  while ((match = inlineCodeRegex.exec(text)) !== null) {
    if (match[1].length > 3) {
      items.codeBlocks.push({
        language: 'inline',
        code: match[1].trim(),
        source: 'inline',
      });
    }
  }

  const lower = text.toLowerCase();
  const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 10);

  for (const sentence of sentences) {
    const s = sentence.trim();
    const sl = s.toLowerCase();

    // Questions
    if (/^(what|how|why|when|where|who|is |are |can |does |should |would |could )/i.test(sl) && sl.includes('?')) {
      items.questions.push(s);
      continue;
    }

    // Error descriptions
    if (/(error|bug|issue|doesn't work|not working|failed|crash|exception|unexpected|wrong)/i.test(sl)) {
      items.errors.push(s);
      continue;
    }

    // Insights / breakthroughs
    if (/(figured|realized|understood|aha|clicked|makes sense|that's why|now i see|got it)/i.test(sl)) {
      items.insights.push(s);
      continue;
    }

    // Resources
    if (/(tutorial|documentation|docs|article|video|course|book|guide|blog|post|readme)/i.test(sl)) {
      items.resources.push(s);
      continue;
    }

    // Challenges / practice
    if (/(practice|exercise|challenge|build|implement|try|experiment|test)/i.test(sl)) {
      items.challenges.push(s);
      continue;
    }

    // Concepts (catch learning-oriented statements)
    if (/(learn|study|understand|concept|idea|principle|pattern|approach|technique|method)/i.test(sl)) {
      items.concepts.push(s);
    }
  }

  return items;
}

export function generateLearningNote(learningItems, topic = '') {
  const title = topic || `Learning Session — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  const contentParts = [];

  if (learningItems.concepts.length > 0) {
    contentParts.push('## 📖 Concepts Learned\n' + learningItems.concepts.map(c => `- ${c}`).join('\n'));
  }
  if (learningItems.codeBlocks.length > 0) {
    contentParts.push('## 💻 Code\n' + learningItems.codeBlocks.slice(0, 5).map(c => `\`\`\`${c.language}\n${c.code}\n\`\`\``).join('\n\n'));
  }
  if (learningItems.errors.length > 0) {
    contentParts.push('## 🐛 Errors & Solutions\n' + learningItems.errors.map(e => `- ${e}`).join('\n'));
  }
  if (learningItems.questions.length > 0) {
    contentParts.push('## ❓ Questions to Explore\n' + learningItems.questions.map(q => `- ${q}`).join('\n'));
  }
  if (learningItems.insights.length > 0) {
    contentParts.push('## ✨ Breakthroughs\n' + learningItems.insights.map(i => `- ${i}`).join('\n'));
  }
  if (learningItems.resources.length > 0) {
    contentParts.push('## 📚 Resources\n' + learningItems.resources.map(r => `- ${r}`).join('\n'));
  }
  if (learningItems.challenges.length > 0) {
    contentParts.push('## ⚡ Practice & Challenges\n' + learningItems.challenges.map(c => `- ${c}`).join('\n'));
  }

  return {
    title,
    content: contentParts.join('\n\n'),
    tag: 'Learning',
    icon: 'sparkle',
    ai: `🧠 AI Auto-Captured: ${learningItems.concepts.length} concepts, ${learningItems.codeBlocks.length} code blocks, ${learningItems.errors.length} errors, ${learningItems.questions.length} questions`,
  };
}

export function createAutomationSummary(envState, extractedItems) {
  const parts = [];
  if (envState.shouldAct) {
    parts.push(`🤖 AI Environment: Activated ${envState.config.label}`);
    if (envState.silenceNotifications) parts.push('🔕 Notifications silenced');
    if (envState.autoReply) parts.push(`💬 Auto-reply set`);
    if (envState.config.actions.blockCalendar) parts.push('📅 Calendar blocked');
    if (envState.config.actions.startFocusTimer) parts.push('⏱️ Focus timer started');
  }
  if (extractedItems.reminders?.length > 0) {
    parts.push(`⏰ ${extractedItems.reminders.length} reminder(s) scheduled`);
  }
  if (extractedItems.tasks?.length > 0) {
    parts.push(`📋 ${extractedItems.tasks.length} task(s) extracted`);
  }
  if (extractedItems.events?.length > 0) {
    parts.push(`📅 ${extractedItems.events.length} event(s) created`);
  }
  if (extractedItems.concepts?.length || extractedItems.codeBlocks?.length) {
    parts.push(`🧠 ${(extractedItems.concepts?.length || 0) + (extractedItems.codeBlocks?.length || 0)} learning items captured`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function getContactTier(contact) {
  if (!contact || !contact.tag) return 'normal';
  const tierMap = {
    emergency: 'emergency',
    spouse: 'emergency',
    partner: 'emergency',
    family: 'emergency',
    doctor: 'emergency',
    'co-founder': 'critical',
    cto: 'critical',
    investor: 'critical',
    'key investor': 'critical',
  };
  return tierMap[contact.tag?.toLowerCase()] || 'normal';
}

export function evaluateUrgency(messageText, contact, rapidRetryCount = 0) {
  let score = 0;
  const lower = messageText?.toLowerCase() || '';

  const urgencyWords = ['urgent', 'asap', 'emergency', 'critical', 'fire', 'server down', 'security breach', 'deadline moved', 'production', 'outage', 'downtime', 'broken', 'crash', 'data loss', 'hacked'];
  for (const word of urgencyWords) {
    if (lower.includes(word)) score += 0.2;
  }

  if (rapidRetryCount >= 3) score += 0.5;

  const tier = getContactTier(contact);
  if (tier === 'emergency') score += 0.6;
  if (tier === 'critical') score += 0.3;

  return Math.min(1, score);
}

export function compileLearningIntoBook(learningNotes) {
  if (!learningNotes || learningNotes.length === 0) {
    return { title: 'Knowledge Base', chapters: [], stats: { totalNotes: 0, totalConcepts: 0, totalCodeBlocks: 0, totalErrors: 0, totalQuestions: 0 } };
  }

  const allConcepts = [];
  const allCode = [];
  const allErrors = [];
  const allQuestions = [];
  const allInsights = [];
  const allResources = [];
  const allChallenges = [];

  for (const note of learningNotes) {
    const content = (note.content || '') + ' ' + (note.preview || '');
    const items = extractLearningItems(note.content || note.preview || '');
    allConcepts.push(...items.concepts);
    allCode.push(...items.codeBlocks);
    allErrors.push(...items.errors);
    allQuestions.push(...items.questions);
    allInsights.push(...items.insights);
    allResources.push(...items.resources);
    allChallenges.push(...items.challenges);
  }

  const chapters = [];

  if (allConcepts.length > 0) {
    const unique = [...new Set(allConcepts)];
    chapters.push({
      title: '📖 Concepts Learned',
      icon: '💡',
      items: unique,
      count: unique.length,
    });
  }

  if (allCode.length > 0) {
    const unique = [];
    const seen = new Set();
    for (const c of allCode) {
      const key = c.code.substring(0, 50);
      if (!seen.has(key)) { seen.add(key); unique.push(c); }
    }
    chapters.push({
      title: '💻 Code & Implementations',
      icon: '💻',
      items: unique.map(c => ({ language: c.language, code: c.code })),
      count: unique.length,
    });
  }

  if (allErrors.length > 0) {
    const unique = [...new Set(allErrors)];
    chapters.push({
      title: '🐛 Errors & Solutions',
      icon: '🐛',
      items: unique,
      count: unique.length,
    });
  }

  if (allQuestions.length > 0) {
    const unique = [...new Set(allQuestions)];
    chapters.push({
      title: '❓ Questions & Explorations',
      icon: '❓',
      items: unique,
      count: unique.length,
    });
  }

  if (allInsights.length > 0) {
    const unique = [...new Set(allInsights)];
    chapters.push({
      title: '✨ Breakthroughs & Insights',
      icon: '✨',
      items: unique,
      count: unique.length,
    });
  }

  if (allResources.length > 0) {
    const unique = [...new Set(allResources)];
    chapters.push({
      title: '📚 Resources & References',
      icon: '📚',
      items: unique,
      count: unique.length,
    });
  }

  if (allChallenges.length > 0) {
    const unique = [...new Set(allChallenges)];
    chapters.push({
      title: '⚡ Practice & Challenges',
      icon: '⚡',
      items: unique,
      count: unique.length,
    });
  }

  const topicKeywords = allConcepts
    .flatMap(c => c.split(/\s+/))
    .filter(w => w.length > 4)
    .reduce((acc, w) => {
      const key = w.toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

  const topTopics = Object.entries(topicKeywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

  const bookTitle = topTopics.length > 0
    ? `📗 Knowledge Base: ${topTopics.join(', ')}`
    : `📗 Learning Knowledge Base — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

  const stats = {
    totalNotes: learningNotes.length,
    totalConcepts: allConcepts.length,
    totalCodeBlocks: allCode.length,
    totalErrors: allErrors.length,
    totalQuestions: allQuestions.length,
    totalInsights: allInsights.length,
    totalResources: allResources.length,
    totalChallenges: allChallenges.length,
  };

  return { title: bookTitle, chapters, stats };
}

export function formatBookAsNote(book) {
  if (!book || book.chapters.length === 0) {
    return { title: '📗 Knowledge Base', content: 'No learning content captured yet. Start learning and the AI will automatically compile your knowledge here.', tag: 'Learning', icon: 'sparkle', ai: '📗 Empty knowledge base' };
  }

  const contentParts = [`# ${book.title}`];
  contentParts.push('');
  contentParts.push(`**${book.stats.totalNotes} sessions** · **${book.stats.totalConcepts} concepts** · **${book.stats.totalCodeBlocks} code blocks** · **${book.stats.totalErrors} errors** · **${book.stats.totalQuestions} questions**`);
  contentParts.push('');
  contentParts.push('---');
  contentParts.push('');

  for (const chapter of book.chapters) {
    contentParts.push(`## ${chapter.title} (${chapter.count})`);
    contentParts.push('');
    if (chapter.title.includes('Code')) {
      for (const item of chapter.items) {
        contentParts.push(`\`\`\`${item.language || 'code'}`);
        contentParts.push(item.code);
        contentParts.push('```');
        contentParts.push('');
      }
    } else {
      for (const item of chapter.items) {
        contentParts.push(`- ${item}`);
      }
      contentParts.push('');
    }
    contentParts.push('---');
    contentParts.push('');
  }

  const aiSummary = `📗 Compiled knowledge base: ${book.stats.totalConcepts} concepts, ${book.stats.totalCodeBlocks} code blocks, ${book.stats.totalErrors} errors, ${book.stats.totalQuestions} questions from ${book.stats.totalNotes} learning sessions.`;

  return {
    title: book.title,
    content: contentParts.join('\n'),
    tag: 'Learning',
    icon: 'sparkle',
    ai: aiSummary,
  };
}

export function getModeFromState(appState) {
  const tweaks = appState?.tweaks;
  if (!tweaks) return 'normal';
  return tweaks.environmentMode || tweaks.focusMode || 'normal';
}
