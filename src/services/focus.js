export const FOCUS_MODES = [
  {
    id: 'off',
    label: 'Off',
    icon: 'x',
    description: 'Normal workspace with all panels visible.',
  },
  {
    id: 'learner',
    label: 'Learner',
    icon: 'compass',
    description: 'Step-by-step guidance with tracks, simplified UI, and progress badges.',
    defaultHideDock: true,
    defaultHideTopbar: false,
    defaultTimer: 0,
  },
  {
    id: 'execution',
    label: 'Execution',
    icon: 'target',
    description: 'Distraction-free deep work. Hides chrome, shows timer, keeps you on one thing.',
    defaultHideDock: true,
    defaultHideTopbar: true,
    defaultTimer: 25,
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: 'sliders',
    description: 'Mix and match what you see. Your rules.',
    defaultHideDock: false,
    defaultHideTopbar: false,
    defaultTimer: 0,
  },
];

export const LEARNER_TRACKS = [
  {
    id: 'orientation',
    title: 'Orientation',
    icon: '👋',
    description: 'Get your bearings — what each screen does, how to navigate, how the AI helps.',
    steps: [
      { id: 'l1', title: 'Welcome to Build_PRO_MAX_1', done: false, link: 'dashboard' },
      { id: 'l2', title: 'Your daily dashboard', done: false, link: 'dashboard' },
      { id: 'l3', title: 'Navigate with the dock', done: false, link: 'dashboard' },
      { id: 'l4', title: 'Use ⌘K to command everything', done: false, link: 'dashboard' },
    ],
  },
  {
    id: 'tasks',
    title: 'Tasks & Execution',
    icon: '✅',
    description: 'Learn how to add, prioritize, and complete tasks like a pro.',
    steps: [
      { id: 't1', title: 'Create your first task', done: false, link: 'tasks' },
      { id: 't2', title: 'Set priority & due date', done: false, link: 'tasks' },
      { id: 't3', title: 'Use subtasks', done: false, link: 'tasks' },
      { id: 't4', title: 'Mark complete & build streaks', done: false, link: 'tasks' },
    ],
  },
  {
    id: 'notes',
    title: 'Notes & Thinking',
    icon: '📝',
    description: 'Capture ideas, journal, and let AI help you think.',
    steps: [
      { id: 'n1', title: 'Write your first note', done: false, link: 'notes' },
      { id: 'n2', title: 'Tag and organize', done: false, link: 'notes' },
      { id: 'n3', title: 'Use AI to expand ideas', done: false, link: 'notes' },
      { id: 'n4', title: 'Pin important notes', done: false, link: 'notes' },
    ],
  },
  {
    id: 'calendar',
    title: 'Calendar & Time',
    icon: '📅',
    description: 'Master your schedule and protect your focus blocks.',
    steps: [
      { id: 'c1', title: 'Understand your schedule', done: false, link: 'calendar' },
      { id: 'c2', title: 'Add events', done: false, link: 'calendar' },
      { id: 'c3', title: 'Block focus time', done: false, link: 'calendar' },
      { id: 'c4', title: 'Review your week', done: false, link: 'calendar' },
    ],
  },
  {
    id: 'contacts',
    title: 'People & Network',
    icon: '👥',
    description: 'Track relationships, warmth, and never lose touch.',
    steps: [
      { id: 'p1', title: 'Add a contact', done: false, link: 'contacts' },
      { id: 'p2', title: 'Track warmth score', done: false, link: 'contacts' },
      { id: 'p3', title: 'AI draft an email', done: false, link: 'contacts' },
      { id: 'p4', title: 'Connect Gmail', done: false, link: 'settings' },
    ],
  },
  {
    id: 'ai',
    title: 'AI Superpowers',
    icon: '🤖',
    description: 'Let AI work for you — summaries, drafts, suggestions.',
    steps: [
      { id: 'a1', title: 'Talk to AI in chat', done: false, link: 'chat' },
      { id: 'a2', title: 'Use AI to plan your day', done: false, link: 'planner' },
      { id: 'a3', title: 'AI-powered task suggestions', done: false, link: 'tasks' },
      { id: 'a4', title: 'Set your AI personality', done: false, link: 'settings' },
    ],
  },
  {
    id: 'integrations',
    title: 'Connect Everything',
    icon: '🔗',
    description: 'Plug in Gmail, Notion, and more.',
    steps: [
      { id: 'i1', title: 'Connect Gmail', done: false, link: 'settings' },
      { id: 'i2', title: 'Connect Notion', done: false, link: 'settings' },
      { id: 'i3', title: 'Set up notifications', done: false, link: 'settings' },
      { id: 'i4', title: 'Sync across browsers', done: false, link: 'settings' },
    ],
  },
];

export const EXECUTION_TRACKS = [
  {
    id: 'deep-work',
    title: 'Deep Work Sprint',
    icon: '🎯',
    description: '25-minute focus blocks. One task at a time. No interruptions.',
    steps: [
      { id: 'd1', title: 'Pick ONE task', done: false },
      { id: 'd2', title: 'Start 25-min timer', done: false },
      { id: 'd3', title: 'Work until timer ends', done: false },
      { id: 'd4', title: '5-min break', done: false },
      { id: 'd5', title: 'Repeat or wrap', done: false },
    ],
  },
  {
    id: 'inbox-zero',
    title: 'Inbox Zero',
    icon: '📬',
    description: 'Clear your notifications and action items.',
    steps: [
      { id: 'z1', title: 'Review all notifications', done: false },
      { id: 'z2', title: 'Handle critical items', done: false },
      { id: 'z3', title: 'Clear or defer the rest', done: false },
      { id: 'z4', title: 'Mark all read', done: false },
    ],
  },
  {
    id: 'weekly-review',
    title: 'Weekly Review',
    icon: '📊',
    description: 'Close the week. Plan the next.',
    steps: [
      { id: 'w1', title: 'Review completed tasks', done: false },
      { id: 'w2', title: 'Check goal progress', done: false },
      { id: 'w3', title: 'Plan next week', done: false },
      { id: 'w4', title: 'Update contacts warmth', done: false },
    ],
  },
];

export function getCompletedCount(track) {
  return track.steps.filter(s => s.done).length;
}

export function getProgress(track) {
  if (!track?.steps?.length) return 0;
  return Math.round((getCompletedCount(track) / track.steps.length) * 100);
}

export function isTrackComplete(track) {
  return track?.steps?.every(s => s.done);
}
