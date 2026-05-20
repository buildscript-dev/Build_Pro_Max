// Sample data — a founder shipping a product, fundraising, hiring.
// All names/companies are fictional.

export const AppData = {
  user: {
    name: "Lior Tanaka",
    handle: "@lior",
    role: "Founder · Halcyon Labs",
    pronouns: "they/them",
    timezone: "GMT+1 · Lisbon",
    avatar: "LT",
    streak: 47,
  },

  today: {
    date: "Thu, May 14",
    weekOf: "Week 20 · May 12–18",
    focus: "Close seed round · Ship onboarding v3 · Hire founding designer #2",
    weather: "18° · overcast · light rain pm",
    bigRock: "Investor memo — Bessemer follow-up due 14:30",
  },

  schedule: [
    { time: "07:30", end: "08:00", title: "Pages — long-form journal", kind: "ritual", color: "amber" },
    { time: "08:00", end: "09:30", title: "Deep work · Investor memo draft 3", kind: "focus", color: "orange", isFocus: true },
    { time: "09:30", end: "09:45", title: "Walk · sync with Mira (founding eng)", kind: "people", color: "coral" },
    { time: "10:00", end: "10:30", title: "Bessemer · partner meeting", kind: "meeting", color: "coral", critical: true },
    { time: "10:30", end: "11:30", title: "Onboarding v3 — wire up Lottie states", kind: "build", color: "orange" },
    { time: "11:30", end: "12:00", title: "1:1 · Rohan (eng lead)", kind: "people", color: "amber" },
    { time: "12:00", end: "13:00", title: "Lunch + reading queue", kind: "ritual", color: "amber" },
    { time: "13:00", end: "14:30", title: "Design crit · founding designer candidate", kind: "people", color: "coral" },
    { time: "14:30", end: "15:00", title: "Bessemer follow-up · send memo", kind: "deliver", color: "rose", critical: true },
    { time: "15:00", end: "16:00", title: "Buffer · async review", kind: "buffer", color: "amber" },
    { time: "16:00", end: "17:00", title: "Founder dinner prep · pull Q2 dashboard", kind: "deliver", color: "orange" },
    { time: "19:00", end: "21:30", title: "Lisbon founders dinner · Time Out", kind: "social", color: "rose" },
  ],

  tasks: [
    { id: "t1", title: "Send Bessemer follow-up memo + cap table", due: "Today 14:30", priority: "P0", status: "doing", project: "Fundraise", ai: "Drafted v3 — review the ARR slide" },
    { id: "t2", title: "Reply to 8 investor intros from Marc", due: "Today", priority: "P1", status: "todo", project: "Fundraise", ai: "I've grouped them by check size" },
    { id: "t3", title: "Ship onboarding v3 to staging", due: "Fri", priority: "P0", status: "doing", project: "Product", ai: "Lottie still missing 2 states" },
    { id: "t4", title: "Founding designer #2 — close Sana or Ines", due: "Mon", priority: "P1", status: "todo", project: "Hiring" },
    { id: "t5", title: "Review Q2 OKRs with Rohan", due: "Tue", priority: "P2", status: "todo", project: "Team" },
    { id: "t6", title: "Renew the GMB filing in Estonia", due: "Jun 1", priority: "P2", status: "todo", project: "Ops" },
    { id: "t7", title: "Cancel that Adobe seat", due: "Whenever", priority: "P3", status: "done", project: "Ops" },
    { id: "t8", title: "Sketch v0 of the AI Contacts schema", due: "Wed", priority: "P1", status: "doing", project: "Product" },
  ],

  goals: [
    { name: "Close seed", pct: 72, sub: "$2.4M / $3.3M · 6 wks left", color: "coral" },
    { name: "Ship v1", pct: 58, sub: "Onboarding · Notes · Tasks", color: "orange" },
    { name: "Team to 8", pct: 50, sub: "4 hired · 2 in pipeline", color: "amber" },
    { name: "Pages every day", pct: 94, sub: "47-day streak", color: "amber" },
  ],

  notes: [
    { id: "n1", title: "Investor memo — Bessemer v3", tag: "Fundraise", icon: "target", words: 1240, edited: "12m ago", pinned: true, date: "May 14",
      preview: "The wedge isn't productivity software — it's an execution operating system. Most planning tools assume you've already decided what to do. We start one step earlier.",
      ai: "Summary: positions us against Notion/Linear by owning the 'what next' loop, not the storage loop." },
    { id: "n2", title: "Founding designer · panel notes", tag: "Hiring", icon: "contacts", words: 612, edited: "2h ago", date: "May 14",
      preview: "Sana — strong systems thinking, weaker on motion. Ines — exceptional craft, less product instinct. Both >> bar.",
      ai: "Decision needed by Monday. I've drafted offer math for both." },
    { id: "n3", title: "Lisbon dinner — talking points", tag: "Network", icon: "contacts", words: 188, edited: "Yesterday", date: "May 13",
      preview: "1) ask Caro about the Seedcamp partner intro 2) be honest about runway 3) don't drink the green wine again" },
    { id: "n4", title: "Pages · 2026-05-14", tag: "Pages", icon: "notes", words: 824, edited: "07:48", date: "May 14",
      preview: "Woke up tight in the chest. The Bessemer thing is louder than it should be. Naming it helps.",
      ai: "I noticed 'tight in the chest' shows up 6 times this month — usually before deliverables." },
    { id: "n5", title: "Reading queue · May", tag: "Reading", icon: "notes", words: 340, edited: "Mon", date: "May 12",
      preview: "Thinking in Bets · Reread Crossing the Chasm · Tony Fadell on hiring · the Stripe Press one on canals" },
    { id: "n6", title: "Product north star — revisit Q3", tag: "Product", icon: "tasks", words: 1820, edited: "Apr 28", date: "Apr 28",
      preview: "Helping people execute, not helping people organize. Organization is the symptom of un-executed intent." },
  ],

  events: [
    // Calendar-ish — additional non-time-blocked events
    { day: 14, title: "Bessemer", color: "coral", time: "10:00" },
    { day: 14, title: "Memo due", color: "rose", time: "14:30" },
    { day: 14, title: "Founders dinner", color: "amber", time: "19:00" },
    { day: 15, title: "Ship onboarding", color: "orange", time: "all day" },
    { day: 15, title: "Caro · coffee", color: "amber", time: "11:00" },
    { day: 16, title: "Off — surfing", color: "amber", time: "all day" },
    { day: 19, title: "Board prep", color: "coral", time: "09:00" },
    { day: 19, title: "Sana decision", color: "rose", time: "16:00" },
    { day: 20, title: "All hands", color: "orange", time: "10:00" },
    { day: 21, title: "Stripe quarterly review", color: "coral", time: "14:00" },
    { day: 22, title: "Off · long weekend", color: "amber", time: "all day" },
  ],

  contacts: [
    { name: "Mira Okafor", role: "Founding eng · Halcyon", tag: "Team", last: "Today 09:30", warmth: 0.98, avatar: "MO", color: "orange",
      ai: "Mentioned burnout twice this week. Schedule a real 1:1, not a walking one." },
    { name: "Rohan Sahay", role: "Eng lead · Halcyon", tag: "Team", last: "11:30 today", warmth: 0.95, avatar: "RS", color: "amber",
      ai: "His Q2 OKRs draft is sitting in Notion since Monday." },
    { name: "Caroline Ferreira", role: "Partner · Seedcamp", tag: "Investor", last: "Yesterday", warmth: 0.78, avatar: "CF", color: "coral",
      ai: "She intro'd Bessemer. Send a thank-you note today." },
    { name: "Dr. Anya Volkov", role: "Partner · Bessemer", tag: "Investor", last: "Mon", warmth: 0.62, avatar: "AV", color: "coral",
      ai: "Memo due 14:30. She prefers PDFs not Notion links." },
    { name: "Sana Eriksson", role: "Designer · candidate", tag: "Hiring", last: "Apr 30", warmth: 0.71, avatar: "SE", color: "rose",
      ai: "Crit was Tuesday. You owe her an answer by Monday." },
    { name: "Ines Marchetti", role: "Designer · candidate", tag: "Hiring", last: "May 2", warmth: 0.68, avatar: "IM", color: "rose" },
    { name: "Marc Reuther", role: "Angel · Pioneer", tag: "Investor", last: "Apr 26", warmth: 0.55, avatar: "MR", color: "amber",
      ai: "He sent 8 intros — you've only replied to 2." },
    { name: "Dad", role: "Dad", tag: "Personal", last: "Apr 22", warmth: 0.42, avatar: "🌱", color: "amber",
      ai: "Birthday May 28. Three weeks." },
  ],

  files: [
    { name: "Bessemer-memo-v3.pdf", from: "MacBook Pro", to: "iPhone 15", size: "2.1 MB", progress: 100, kind: "pdf" },
    { name: "Onboarding-v3.fig", from: "MacBook Pro", to: "iPad Pro", size: "48.6 MB", progress: 74, kind: "fig" },
    { name: "cap-table-may.xlsx", from: "iPhone 15", to: "MacBook Pro", size: "612 KB", progress: 100, kind: "sheet" },
    { name: "founders-dinner-2026.heic", from: "iPhone 15", to: "MacBook Pro", size: "4.2 MB", progress: 100, kind: "img" },
    { name: "halcyon-runway.numbers", from: "iPad Pro", to: "MacBook Pro", size: "1.8 MB", progress: 12, kind: "sheet" },
    { name: "voice-memo-sana-crit.m4a", from: "iPhone 15", to: "MacBook Pro", size: "8.4 MB", progress: 100, kind: "audio" },
  ],

  devices: [
    { name: "MacBook Pro", kind: "laptop", online: true, here: true, battery: 88 },
    { name: "iPhone 15", kind: "phone", online: true, here: false, battery: 64 },
    { name: "iPad Pro", kind: "tablet", online: true, here: false, battery: 47 },
    { name: "Studio (Mac mini)", kind: "desktop", online: false, here: false, battery: null },
  ],

  reminders: [
    { time: "10:00", title: "Bessemer · stand up, drink water, smile", kind: "person" },
    { time: "14:30", title: "Send memo — even if it's not perfect", kind: "deliver" },
    { time: "18:30", title: "Stop working. Walk to dinner.", kind: "ritual" },
    { time: "22:00", title: "Phone in the kitchen", kind: "ritual" },
  ],

  aiSuggestions: [
    { kind: "reschedule", text: "Move 'Cancel Adobe seat' to next week — it's been sliding for 11 days." },
    { kind: "merge", text: "The Bessemer follow-up and the Q2 dashboard pull can become one block." },
    { kind: "buffer", text: "You have zero buffer between 13:00 and 14:30. The memo will not get sent on time without it." },
  ],
};

export const accentColor = {
  amber: "#f5a524",
  orange: "#f06b1c",
  coral: "#e7402e",
  rose: "#c2185b"
};

export const DOCK_ITEMS = [
  { id: "dashboard", label: "Workspace", icon: "home", accent: "amber" },
  { id: "planner", label: "Planner", icon: "planner", accent: "orange" },
  { id: "notes", label: "Notes", icon: "notes", accent: "amber" },
  { id: "calendar", label: "Calendar", icon: "calendar", accent: "coral" },
  { id: "tasks", label: "Tasks", icon: "tasks", accent: "orange" },
  { id: "contacts", label: "Contacts", icon: "contacts", accent: "rose" },
  { id: "files", label: "Files", icon: "files", accent: "amber" },
  { id: "chat", label: "AI", icon: "orb", accent: "coral", isAi: true },
  { id: "settings", label: "Settings", icon: "settings", accent: "amber" }
];