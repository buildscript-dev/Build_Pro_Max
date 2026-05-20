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
    { id: "n1", title: "How to Use Build_PRO_MAX_1", tag: "Guide", icon: "target", words: 154, edited: "Just now", pinned: true, date: "Today",
      preview: "Welcome to your new Spatial Environment. You can click anywhere to create a note, task, or file. Drag the 'x' on a block to connect it to another block.",
      content: "Welcome to the **Build_PRO_MAX_1 Workspace**!\n\n## What is Notes?\nNotes is your central brain. You can write everything from meeting minutes to deep work essays here.\n- Use **bold** text by wrapping words in double asterisks like **this**.\n- Create bulleted lists using dashes (-).\n- Type `/` (slash) to trigger AI commands and quick actions.\n\n## The Spatial Canvas\nThe Canvas is a totally new way to organize your thoughts visually.\n1. **Create Containers:** Right-click anywhere on the canvas to spawn a new workspace block (like a Note, Task, or File).\n2. **Connect Things:** Drag the 'x' handle on any block and drop it onto another block to draw a bridge between them.\n3. **Move Around:** Click and drag the background to pan around your infinite spatial environment.\n4. **Disconnect:** If you want to remove a connection, just grab the bridge wire and drag it away to break it!\n\n## Let's Get Started!\nTry editing this note right now. Make a new line, type a dash, and write your first bullet point.",
      ai: "Summary: This is a detailed guide on using the spatial canvas and basic formatting features." },
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