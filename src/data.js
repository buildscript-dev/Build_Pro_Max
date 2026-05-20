// Sample data — a founder shipping a product, fundraising, hiring.
// All names/companies are fictional.

export const AppData = {
  user: {
    name: "New User",
    handle: "@user",
    role: "Explorer",
    pronouns: "",
    timezone: "Local",
    avatar: "U",
    streak: 1,
  },

  today: {
    date: "Today",
    weekOf: "This Week",
    focus: "Getting started with Build_PRO_MAX_1",
    weather: "Clear skies",
    bigRock: "Explore the Spatial Canvas",
  },

  schedule: [
    { time: "09:00", end: "10:00", title: "Explore Build_PRO_MAX_1 Features", kind: "focus", color: "orange", isFocus: true },
  ],

  tasks: [
    { id: "t1", title: "Read the 'How to Use' note", due: "Today", priority: "P0", status: "todo", project: "Onboarding", ai: "Start here to understand the spatial canvas", recurring: null, subtasks: [] },
  ],

  goals: [
    { name: "Master the Canvas", pct: 10, sub: "Connect your first two blocks", color: "amber" },
  ],

  notes: [
    { id: "n1", title: "How to Use Build_PRO_MAX_1", tag: "Guide", icon: "target", words: 120, edited: "Just now", pinned: true, date: "Today",
      preview: "Welcome to your new Spatial Environment. You can click anywhere to create a note, task, or file. Drag the 'x' on a block to connect it to another block.",
      ai: "Summary: This is a guide on using the spatial canvas and basic features." },
  ],

  events: [
    { day: new Date().getDate(), title: "Welcome Day", color: "coral", time: "all day" },
  ],

  contacts: [
    { name: "AI Assistant", role: "Your Copilot", tag: "System", last: "Just now", warmth: 1.0, avatar: "AI", color: "orange",
      ai: "I am here to help you automate your workflows and keep track of your goals." },
  ],

  files: [
    { name: "Get-Started-Guide.pdf", from: "System", to: "Local", size: "1.2 MB", progress: 100, kind: "pdf" },
  ],

  devices: [
    { name: "Current Device", kind: "laptop", online: true, here: true, battery: 100 },
  ],

  reminders: [
    { time: "12:00", title: "Remember to sync your first changes to Supabase", kind: "deliver" },
  ],

  aiSuggestions: [
    { kind: "focus", text: "Welcome! Try creating a new task by right-clicking the canvas." },
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