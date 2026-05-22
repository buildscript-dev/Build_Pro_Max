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
    { id: "n1", title: "How to Use Build_PRO_MAX_1", tag: "Guide", icon: "target", words: 450, edited: "Just now", pinned: true, date: "Today",
      preview: "Welcome to your new Spatial Environment. You can click anywhere to create a note, task, or file. Drag the 'x' on a block to connect it to another block.",
      content: "Welcome to your **Build_PRO_MAX_1 Workspace**! \nThis is not just a notes app—it is a spatial execution environment powered by an ambient AI engine.\n\nHere is everything you need to know to master the system, broken down simply.\n\n## 1. The Spatial Canvas (Infinite Environment)\nThe Canvas is where you can map out your thoughts visually.\n- **Create Containers:** Right-click anywhere on the empty grid to spawn a new block (Note, Task, File, or Node).\n- **Move Blocks:** Click and hold the header of any block to drag it around your spatial workspace.\n- **Connect Blocks:** Click the small orange 'x' handle on any block, drag the wire, and drop it onto another block to create a link.\n- **Disconnect:** To break a connection, grab the connection wire itself and drag it away from the block!\n- **Pan & Zoom:** Click and drag the grid background to pan around. The canvas is infinite.\n\n## 2. Notes & The Editor\nNotes are your central brain for deep work and meeting minutes.\n- **Formatting:** Use double asterisks for **bold** (e.g. `**text**`), underscores for _italic_, and dashes (`-`) for bullet points.\n- **Headings:** Start a line with `# ` for a large heading, or `## ` for a sub-heading.\n- **Slash Menu:** Type `/` anywhere in the editor to open the quick-insert menu for lists, code blocks, or AI commands.\n- **Laser Pointer:** Toggle the \"Laser\" button at the top of the editor. Your mouse will draw glowing, fading laser trails to highlight things while screen sharing!\n\n## 3. The AI Engine (Your Copilot)\nThe AI is always running in the background, acting as your second brain.\n- **Auto-Tagging:** When you write a note, the AI automatically reads the context and assigns it a Tag and an Icon.\n- **Action Extraction:** If you type \"I need to review the report by tomorrow\" in a note, the AI will automatically extract that as a Task and add it to your Planner.\n- **Ambient Suggestions:** Keep an eye on the orange glowing orb in the dock. It will pop up with intelligent suggestions.\n- **Voice Memos:** Click the Voice Note button to transcribe your thoughts. The AI will format your spoken words into structured paragraphs.\n\n## 4. Tasks & Planner\nYour execution layer.\n- **Priorities:** Tasks can be flagged as P0 (Critical), P1 (High), P2 (Normal), or P3 (Low).\n- **Drag & Drop:** You can reorder tasks by dragging them in the list.\n- **Recurring:** The AI detects words like \"daily\" or \"weekly\" and sets them to recur.\n\n## 5. Global Navigation\n- **The Dock:** Use the glass dock at the bottom of the screen to switch between Notes, Tasks, Calendar, and the Spatial Canvas.\n- **Command Palette:** Press `Cmd + K` (or `Ctrl + K`) anywhere in the app to instantly open the search bar.\n\nTake a few minutes to play around. Right-click the Canvas, create a task, draw a connection, and let the AI do the heavy lifting!",
      ai: "Summary: The comprehensive master guide to understanding and operating the spatial environment and AI engine." },
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
  { id: "chat", label: "Hermes", icon: "orb", accent: "coral", isAi: true },
  { id: "settings", label: "Settings", icon: "settings", accent: "amber" }
];