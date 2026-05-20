import React, { useState, useEffect } from 'react';

const GUIDE_KEY = 'screen_guide_dismissed';

function isDismissed(screen) {
  try {
    const val = localStorage.getItem(GUIDE_KEY);
    return val ? JSON.parse(val).includes(screen) : false;
  } catch { return false; }
}

function markDismissed(screen) {
  try {
    const val = localStorage.getItem(GUIDE_KEY);
    const arr = val ? JSON.parse(val) : [];
    if (!arr.includes(screen)) {
      localStorage.setItem(GUIDE_KEY, JSON.stringify([...arr, screen]));
    }
  } catch {}
}

export const GUIDES = {
  notes: {
    title: 'How Notes work',
    steps: [
      { icon: '✍️', label: 'Write', desc: 'Start typing or tap the mic to record a voice note. Your content is auto-saved.' },
      { icon: '🤖', label: 'AI auto-tags', desc: 'As you type, AI reads your content and assigns a tag (Fundraise, Gym, Hiring…) and a title.' },
      { icon: '⏰', label: 'Auto-schedule', desc: 'If you mention a time like "3pm meeting", AI creates a reminder and adds it to your schedule.' },
      { icon: '📌', label: 'Pin & organize', desc: 'Pin important notes. Use the sidebar tags to filter. Search across all notes.' },
      { icon: '📊', label: 'Second Brain', desc: 'The right panel shows AI summaries and your brain stats — total notes, pinned, words processed.' },
    ],
  },
  chat: {
    title: 'How AI Chat works',
    steps: [
      { icon: '💬', label: 'Ask anything', desc: 'Ask about your tasks, notes, contacts, or schedule. The AI already knows your data.' },
      { icon: '⚡', label: 'AI takes action', desc: 'Say "Create a task" or "Schedule a meeting" — AI can add, update, or delete items for you.' },
      { icon: '🌐', label: 'Summarize websites', desc: 'Paste any URL in the Website assistant panel. AI reads and summarizes it. Save as a note.' },
      { icon: '🎯', label: 'Suggested prompts', desc: 'Click any example question in the right panel to see what the AI can do.' },
      { icon: '📋', label: 'Action buttons', desc: 'AI responses include clickable action buttons to navigate, create tasks, or open screens.' },
    ],
  },
  planner: {
    title: 'How the Planner works',
    steps: [
      { icon: '📐', label: 'Execution tracks', desc: 'Tracks are chains of time-blocks per project (Fundraise, Product, Hiring). Each block occupies days on the grid.' },
      { icon: '🤖', label: 'AI optimization', desc: 'Click "Regenerate" — AI analyzes your tasks, priorities, and notes to reshuffle blocks for maximum output.' },
      { icon: '👆', label: 'Drag & resolve conflicts', desc: 'When blocks overlap, AI suggests fixes. Click "Show me" to see conflicts, "Do it" to auto-resolve.' },
      { icon: '📅', label: 'Day / Month / Year', desc: 'Toggle between views at the top. Day view shows your schedule hour-by-hour. Month shows events.' },
      { icon: '⏱️', label: 'Focus blocks', desc: 'Orange blocks are deep-focus time. Protect these — they\'re your highest-leverage hours.' },
    ],
  },
  dashboard: {
    title: 'Your Dashboard',
    steps: [
      { icon: '📊', label: 'At a glance', desc: 'Today\'s date, focus, weather, and your big rock — the one thing that must get done.' },
      { icon: '🎯', label: 'Goal progress', desc: 'See your quarter goals and completion percentage. Tasks auto-update goal progress.' },
      { icon: '📋', label: 'Recent activity', desc: 'Your latest tasks, notes, and events. Click any to jump to it.' },
      { icon: '💡', label: 'AI suggestions', desc: 'The AI watches your workload and surfaces suggestions to protect your time.' },
    ],
  },
  tasks: {
    title: 'How Tasks work',
    steps: [
      { icon: '➕', label: 'Add tasks', desc: 'Create tasks with priority (P0-P3), due dates, projects, and subtasks.' },
      { icon: '🔄', label: 'Recurring tasks', desc: 'Set tasks to repeat daily, weekly, biweekly, or monthly. AI auto-generates the next instance on completion.' },
      { icon: '🎯', label: 'Goal linking', desc: 'Completing tasks auto-updates your quarter goals. Each project maps to a goal.' },
      { icon: '📱', label: 'Reorder', desc: 'Drag to reorder tasks within priority groups. Your order syncs across the app.' },
    ],
  },
  contacts: {
    title: 'How Contacts work',
    steps: [
      { icon: '👥', label: 'Relationship system', desc: 'Contacts have warmth scores, last-touch dates, and AI-generated insights.' },
      { icon: '📧', label: 'Gmail sync', desc: 'Connect Gmail to pull recent conversations. AI reads context to update warmth.' },
      { icon: '🤖', label: 'AI drafts', desc: 'Click "AI draft email" — AI generates a personalized message based on your relationship data.' },
      { icon: '📅', label: 'Schedule 1:1', desc: 'One click creates a calendar event with any contact. AI picks the best time slot.' },
    ],
  },
  calendar: {
    title: 'How Calendar works',
    steps: [
      { icon: '📅', label: 'Month view', desc: 'See all events on a calendar grid. Event dots show color-coded activity.' },
      { icon: '➕', label: 'Add events', desc: 'Click any day to add events with title, time, and color.' },
      { icon: '🎨', label: 'Color coding', desc: 'Events are color-coded: amber (rituals), orange (focus), coral (people/meetings).' },
      { icon: '⚡', label: 'Quick schedule', desc: 'The Planner\'s week view gives a fuller picture. Calendar is for month-level overview.' },
    ],
  },
  files: {
    title: 'How Files work',
    steps: [
      { icon: '📁', label: 'File transfers', desc: 'Upload files (PDF, images, docs) with progress tracking. Files are stored in your browser.' },
      { icon: '🔄', label: 'Simulated transfers', desc: 'Files show realistic progress bars and animations for a native feel.' },
      { icon: '🗑️', label: 'Remove files', desc: 'Click the X on any file to remove it from your workspace.' },
    ],
  },
  settings: {
    title: 'How Settings work',
    steps: [
      { icon: '🎨', label: 'Appearance', desc: 'Adjust glass blur, animation intensity, navigation style (dock/rail/top), and canvas mode.' },
      { icon: '🤖', label: 'AI behavior', desc: 'Set AI voice, auto-plan toggle, mood detection, and your OpenRouter API key for real AI.' },
      { icon: '🔗', label: 'Connected accounts', desc: 'Connect Gmail (OAuth) and Notion (API token). Credentials are saved locally.' },
      { icon: '⚙️', label: 'Full control', desc: 'Profile editing, notifications, keyboard shortcuts, and account management.' },
    ],
  },
};

export const ScreenGuide = ({ screen, autoShow = true }) => {
  const [dismissed, setDismissed] = useState(() => autoShow ? isDismissed(screen) : false);
  const guide = GUIDES[screen];
  if (!guide || dismissed) return null;

  const handleDismiss = () => {
    markDismissed(screen);
    setDismissed(true);
  };

  return (
    <div style={{
      marginBottom: 24, borderRadius: 16,
      background: 'linear-gradient(135deg, rgba(245,165,36,.08), rgba(245,165,36,.03))',
      border: '0.5px solid rgba(245,165,36,.2)',
      overflow: 'hidden',
      animation: 'card-rise 500ms var(--ease-genie) both',
    }}>
      <div style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(245,165,36,.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>💡</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>{guide.title}</span>
        </div>
        <button onClick={handleDismiss}
          style={{ fontSize: 11, padding: '4px 12px', borderRadius: 999, background: 'rgba(245,165,36,.15)', color: 'var(--accent-orange)', fontWeight: 600 }}>
          Got it
        </button>
      </div>
      <div style={{ padding: '14px 22px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {guide.steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(245,165,36,.1)', fontSize: 14,
            }}>{s.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)' }}>{s.label}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1, lineHeight: 1.45 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
