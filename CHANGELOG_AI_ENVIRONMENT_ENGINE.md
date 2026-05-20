# Changelog: AI Environment Engine & Learning Mode

> **Build_PRO_MAX_1** — Technical Audit + Learning Acceleration Research
> Every file in `src/` analyzed (4,600+ lines across 24 files)

---

## 📊 FEATURE STATUS MATRIX

| Feature | Status | Files | Notes |
|---------|--------|-------|-------|
| AI Environment Engine (signal detection) | ✅ DONE | `environment.js` | 40+ patterns, 7 categories, 8 modes |
| Learning mode detection | ✅ DONE | `environment.js` | Learning/coding/stuck/breakthrough signals |
| Learning item extraction | ✅ DONE | `environment.js` | Concepts, code blocks, errors, questions, insights |
| Auto-generate learning notes | ✅ DONE | `environment.js` + `Notes.jsx` | Creates structured note from learning session |
| Compile learning → knowledge book | ✅ DONE | `environment.js` | Chapters per topic, aggregated from all learning notes |
| Knowledge graph / auto-linking | ❌ MISSING | — | No note-to-note linking exists |
| Spaced repetition (SRS) | ❌ MISSING | — | No flashcard or review system |
| Active recall quizzing | ❌ MISSING | — | No AI-generated quizzes from notes |
| Code execution sandbox | ❌ MISSING | — | No inline code running |
| Event/task extraction from notes | ✅ DONE | `environment.js` + `Notes.jsx` | Auto-creates reminders, tasks, events |
| Environment mode in other screens | ❌ MISSING | All 8 screens | Only Notes.jsx reads environmentMode |
| Automation kill switch | 🔄 PARTIAL | `AppContext.jsx` | State/actions exist, no UI in Settings |
| Audit log | 🔄 PARTIAL | `AppContext.jsx` | State/actions exist, no viewer UI |
| Feedback collection | 🔄 PARTIAL | `AppContext.jsx` | State/actions exist, no thumbs UI |
| Auto-reply per mode | 🔄 PARTIAL | `AppContext.jsx` + `environment.js` | Config exists, not connected to any chat system |
| Emergency bypass system | ✅ DONE | `environment.js` | Contact tiers + urgency scoring |
| Notion-style block editor | ✅ DONE | `NoteEditor.jsx` | 763 lines, full block-based editor |
| Markdown rendering | ✅ DONE | `NoteEditor.jsx` | Inline md → HTML (bold, italic, code, links) |
| Slash commands (/block-type) | ✅ DONE | `NoteEditor.jsx` | 11 block types via `/` menu |
| Floating format toolbar | ✅ DONE | `NoteEditor.jsx` | B/I/U/S/link/clear with selection detection |
| Code blocks with syntax styling | ✅ DONE | `NoteEditor.jsx` | Pre-formatted code blocks |
| Image embedding | ✅ DONE | `NoteEditor.jsx` | URL-based image embedding |
| Todo checkboxes | ✅ DONE | `NoteEditor.jsx` | Checkable todo items |
| Voice recording (real mic) | ✅ DONE | `Notes.jsx` | Web Audio API + SpeechRecognition |
| Voice recording (fallback sim) | ✅ DONE | `Notes.jsx` | Typing simulation demo |
| Cross-tab sync | ✅ DONE | `main.jsx` + `AppContext.jsx` | BroadcastChannel + storage event |
| Auth system | ✅ DONE | `auth.js` | bcryptjs client-side |
| Gmail integration | ✅ DONE | `gmail.js` | OAuth + email CRUD |
| Notion integration | ✅ DONE | `notion.js` | OAuth + database CRUD |
| Focus mode system | ✅ DONE | `focus.js` + `FocusPanel.jsx` | 4 modes, pomodoro timer |
| AI tutor / teacher persona | ❌ MISSING | — | No persona switching based on mode |
| Raw → optimized note conversion | ❌ MISSING | — | No dual-view (raw/optimized) |
| Continuous session mode | ❌ MISSING | — | No session state on notes |
| Chat-with-note (bidirectional) | ❌ MISSING | — | No inline AI conversation |
| Resource auto-fetching | ❌ MISSING | — | No auto doc search |
| AI session memory per note | ❌ MISSING | — | No per-note conversation history |
| Learning dashboard/progress | ❌ MISSING | — | No progress tracking UI |
| Progressive summarization | ❌ MISSING | — | No 5-layer note compression |
| Deliberate practice engine | ❌ MISSING | — | No stretch zone identification |
| Interleaving scheduler | ❌ MISSING | — | No adaptive topic mixing |
| Tiered feedback system | ❌ MISSING | — | No compile/test/conceptual/delayed feedback tiers |
| Dead code: `useGestures.js` | ❌ UNUSED | `hooks/useGestures.js` | Never imported anywhere |
| Dead code: `db.js` object stores | 🔄 PARTIAL | `store/db.js` | Only `getSetting`/`setSetting` used by auth.js |

---

## ✅ WHAT IS COMPLETE

### 1. `src/services/environment.js` — AI Environment Engine (761 lines)
**Status: ✅ DONE + STABLE**

- **Signal Pattern Database**: 40+ patterns across 7 categories (energy, focus, mood, health, social, intent, learning)
  - Each pattern has weighted keywords with cluster detection (prevents false positives)
  - Example: `requireCluster: true` on "slept only hours night" requires 2+ keywords to trigger
- **`analyzeText()`**: Full NLP pipeline scoring text against all patterns
  - Returns structured state with confidence level (0–1)
  - Includes urgency scoring and learning session detection
- **`computeModeFromState()`**: State machine → 1 of 8 modes
  - Priority ordering: learning > sickness > rest > focus > shelter > redirect > offline > normal
- **`MODE_CONFIG`**: 8 mode configurations with per-mode action bundles:
  - `rest`: silence notifications, block calendar 2h, auto-reply, dim screen, pause music, enable DND
  - `focus`: silence critical-only, start 25min timer, auto-reply, ambient sound, DND
  - `learning`: enable AI tutor, auto-capture notes, show learning panel, silence notifications, resource finder, track progress
  - `shelter`: silence all, auto-reply, dim screen, reduce motion, show easy tasks
  - `sickness`: silence health-only, block calendar 24h, auto-reply, dim screen, resize font
  - `redirect`: show quick wins, energizing music, block distractions
  - `offline`: silence all, away auto-reply
  - `normal`: no actions
- **`extractEnvironmentState()`**: Main entry point — text → `{ mode, analysis, confidence, shouldAct, config, autoReply, learningItems, isLearningSession }`
- **`extractLearningItems()`**: Parses text for 7 learning item types:
  - Concepts (sentences with "learn/understand/concept/idea/principle")
  - Code blocks (backtick fenced + inline `code`)
  - Errors (sentences with "error/bug/issue/doesn't work/failed/crash")
  - Questions (sentences starting with what/how/why/when/where/who + "?")
  - Insights (sentences with "figured/realized/understood/aha/clicked")
  - Resources (sentences with "tutorial/docs/article/video/course/book")
  - Challenges (sentences with "practice/exercise/challenge/build/implement")
- **`generateLearningNote()`**: Auto-creates structured notes with markdown sections per item type
- **`compileLearningIntoBook()` + `formatBookAsNote()`**: Aggregates all learning notes → structured book with chapters (Concepts, Code, Errors, Questions, Insights, Resources, Challenges, Stats)
- **`extractEventsAndReminders()`**: Regex-based extraction of:
  - Time patterns → reminders + calendar events
  - Task patterns ("need to"/"to-do"/"don't forget") → task objects
- **`createAutomationSummary()`**: Human-readable string of all AI actions taken
- **`evaluateUrgency()` + `getContactTier()`**: Emergency bypass system with NLP urgency scoring (0–1) + contact tier mapping (emergency/critical/normal)

### 2. `src/components/editor/NoteEditor.jsx` — Notion-Style Block Editor (763 lines)
**Status: ✅ DONE (NEW — replaces old textarea)**

| Sub-feature | Implementation |
|-------------|---------------|
| Block-based editing | Each paragraph/heading/list is a separate contentEditable block with unique ID |
| Markdown parsing → blocks | `markdownToBlocks()` — parses `# ## ### \`\`\` - * 1. > --- ![]` into block objects |
| Blocks → markdown serialization | `blocksToMarkdown()` — reverse conversion with proper spacing |
| Inline markdown rendering | `inlineMdToHtml()` — `**bold**` `*italic*` `` `code` `` `~~strike~~` `[link](url)` |
| Inline HTML → markdown | `htmlToInlineMd()` — reverse for editing |
| Slash command menu | Type `/` to show 11 block types (Text, H1, H2, H3, Bullet, Numbered, Todo, Quote, Code, Image, Divider) |
| Floating format toolbar | Appears on text selection with B/I/U/S/link/clear buttons |
| Keyboard shortcuts | ⌘B bold, ⌘I italic, ⌘U underline, ⌘K link |
| Enter to split block | Splits at cursor, preserves list type for lists, empty list → paragraph |
| Backspace to merge/convert | Empty block → delete and focus previous; non-empty styled block → convert to paragraph |
| Todo checkboxes | Clickable checkbox with strikethrough on completion |
| Code blocks | Monospace pre with language label header |
| Image embedding | URL input → inline image display with edit button |
| Divider | Horizontal rule |W
| Tab for indent | Two spaces inserted in list items |

### 3. Modified: `src/screens/Notes.jsx` — Full Environment Integration (876 lines)
**Status: ✅ DONE (with known bugs)**

- Uses `NoteEditor` component instead of textarea (line 695)
- `runAiAnalysis()` calls environment engine on every note save (debounced 1200ms)
- Auto-extracts reminders, tasks, events from text
- Auto-generates learning notes when learning mode detected
- Audit logs every environment mode change
- Updates `tweaks.environmentMode` for cross-screen communication
- Environment mode indicator badge in AI Assistant panel header
- Learning session count in Second Brain Stats
- "Compile Learning into Book" button in sidebar
- Voice recording with real mic + SpeechRecognition API + fallback simulation
- Auto-selects first note when none selected

### 4. Modified: `src/store/AppContext.jsx` — New State + Actions (626 lines)
**Status: ✅ DONE**

**New state fields** (all in `freshState()`):
| Field | Default | Purpose |
|-------|---------|---------|
| `environmentMode` | `'normal'` | Current AI-detected environment mode |
| `automationEnabled` | `false` | Master opt-in toggle (privacy-first) |
| `auditLog` | `[]` | Every automation action (capped 200) |
| `automationFeedback` | `[]` | Thumbs up/down per action (capped 500) |
| `autoReply` | `null` | Current auto-reply message per mode |

**New reducer actions** (all implemented in reducer + actions object):
| Action | Function | 
|--------|----------|
| `SET_ENVIRONMENT_MODE` | `setEnvironmentMode(mode)` — ⚠️ DEAD CODE, use `setTweak('environmentMode', val)` |
| `SET_AUTOMATION_ENABLED` | `setAutomationEnabled(bool)` |
| `ADD_AUDIT_LOG` | `addAuditLog(entry)` |
| `ADD_AUTOMATION_FEEDBACK` | `addAutomationFeedback(feedback)` |
| `SET_AUTO_REPLY` | `setAutoReply(message)` |

### 5. New Documents
- `NOTES_AI_AUTOMATION_VISION.md` — Full product vision (6 signal categories, 8 modes, feedback loop, emergency bypass, privacy)
- `BUILD_STRATEGY.md` — 6-phase execution plan with risk register and success metrics

---

## 🔴 CRITICAL BUGS

### C1 — `loadState()` Lacks Fallback for New Fields (AppContext.jsx:15-37)
**Problem**: When loading from older localStorage, new fields (`environmentMode`, `automationEnabled`, `auditLog`, `automationFeedback`, `autoReply`) are `undefined`. `freshState()` defaults never applied.
```js
function loadState() {
  const parsed = JSON.parse(raw);
  return parsed;  // Missing new fields → undefined
}
```
**Impact**: `automationEnabled` is `undefined` → `!== false` check (Notes.jsx:190,206) passes → automation activates without consent.
**Fix**: Merge with `freshState()` defaults.

### C2 — `SET_ENVIRONMENT_MODE` Action Is Dead Code (AppContext.jsx:386-387 + Notes.jsx:222)
**Problem**: Two parallel storage paths:
1. `state.environmentMode` → `SET_ENVIRONMENT_MODE` action (NEVER called)
2. `tweaks.environmentMode` → `actions.setTweak('environmentMode', val)` (CALLED in Notes.jsx:222)
**Impact**: Confusion. `state.environmentMode` is always `undefined`.
**Fix**: Remove `SET_ENVIRONMENT_MODE` and `state.environmentMode`. Keep only `tweaks.environmentMode`.

### C3 — No Screen Reads `environmentMode` Except Notes (8/9 screens blind)
**Impact**: Automation is invisible outside Notes. User writes "I'm so tired" → Notes shows Rest badge → but Dashboard still shows "Good morning", Tasks still shows all P0s, notifications still fire.
**Screens missing integration**:
- `Dashboard.jsx` (702 lines) — HelloCard, FocusCard, AiInboxCard, ScheduleCard all ignore env mode
- `Tasks.jsx` — No energy-based filtering
- `Calendar.jsx` — No auto-blocking for rest/sickness
- `Planner.jsx` — No rescheduling suggestions
- `Contacts.jsx` — No auto-reply integration
- `AiChat.jsx` — No persona switching
- `Files.jsx` — No bandwidth/transfer pause during focus
- `Settings.jsx` — No automation controls at all

### C4 — Settings Has Zero Automation Controls (Settings.jsx:1-567)
**Problem**: 9 sections exist (Profile, Appearance, AI behavior, Connected accounts, Devices, Notifications, Privacy, Keyboard, About) — none include automation controls. The Privacy section is ONE placeholder paragraph.
**Missing entirely**: kill switch, audit log viewer, auto-reply editor, contact tier editor, automation stats, feedback history.

### C5 — `automationEnabled !== false` Allows Silent Auto-On (Notes.jsx:190, 206)
**Fix**: Change to `state.automationEnabled === true`.

---

## 🟠 MAJOR BUGS

### M1 — Stale Closure in `runAiAnalysis` (Notes.jsx:237-239)
`handleContentChange` calls `runAiAnalysis` inside `setTimeout`. `notes` array from closure is stale 1200ms later. Line 100 `notes.find(n => n.id === noteId)` may miss the note.

### M2 — `'Learning'` Missing from TAGS Dropdown (Notes.jsx:9)
`const TAGS = ['Fundraise', 'Hiring', 'Network', ...]` — missing `'Learning'`. AI sets tag to Learning but user can't select it manually.

### M3 — Learning vs Engineering Regex Overlap (Notes.jsx:85-89)
Both regexes match code terms. Engineering check runs last (wins). "learning to code in React" → tagged Engineering.

### M4 — Only One Auto-Learning Note Per Day (environment.js:377 + Notes.jsx:194)
`generateLearningNote()` uses date-based title `"Learning Session — May 20"`. Dedup check compares titles. Second session on same day silently discarded.

### M5 — `extractedActions` Array Dead Code (Notes.jsx:120, 131-136)
Populated but never used. Actual execution uses `extractedItems.reminders` from new system.

### M6 — Double Dispatch on Content Change (Notes.jsx:226-239)
Content written twice — first by `handleContentChange`, then by `runAiAnalysis`. 1.2s window with orphan state.

### M7 — No Loading State on "Compile Learning" Button (Notes.jsx:838-856)
Synchronous iteration over all learning notes could freeze UI. No visual feedback.

### M8 — Inconsistent Note ID Generation (Notes.jsx:269 vs AppContext.jsx:216)
`createEmptyNote()` uses `n_${Date.now().toString(36)}` while reducer uses `n${state.nextNoteId}`. When explicit id is passed, `nextNoteId` is never incremented.

### M9 — Weak Reminder Dedup Key (Notes.jsx:158-159)
Dedup: `r.title === act.title && r.time === act.time`. Same time+title creates duplicates.

### M10 — Tasks Created Without User Review (Notes.jsx:169-179)
Every "need to X" or "don't forget Y" auto-creates a task. No confirmation dialog. Task list pollution.

### M11 — Voice Sim Always Triggers Fundraise (Notes.jsx:458-463)
Hardcoded phrases "Bessemer", "investor memo", "funding round" always match Fundraise regex. Biased demo.

### M12 — Focus Timer Is Local, Not Connected (Dashboard.jsx:48-66 + focus.js)
Dashboard has independent timer. FocusPanel has its own. focus.js has modes. Environment mode has `startFocusTimer: 25`. Four independent systems.

### M13 — `useGestures.js` Is Dead Code (hooks/useGestures.js)
Never imported anywhere. Touch gestures handled inline in Dashboard. 100 lines of dead code.

---

## 🟡 MINOR BUGS

### m1 — No Learning-Tagged Notes in Mock Data (data.js)
No notes tagged 'Learning'. Feature invisible on first run.

### m2 — Mock Notes Missing `content` Field (data.js)
Some mock notes have `preview` but no `content`. Environment engine reads `content` first.

### m3 — CmdK Has No Environment Commands (CmdK.jsx)
No `/mode learning`, `/mode focus`, `/automation on`, `/audit` commands.

### m4 — AI Service Ignores Environment Mode (ai.js)
`buildSystemPrompt()` and `queryUserData()` have no environment mode awareness. AI can't answer "what mode am I in?"

### m5 — Privacy Section Is One-Line Placeholder (Settings.jsx:530)
`{activeSection === 'Privacy' && <p>All data is stored locally...</p>}` — no actual controls.

### m6 — Cross-Tab Sync Missing Environment Fields (AppContext.jsx:465-478)
`REPLACE_STATE` only merges `tweaks`, not top-level `environmentMode`, `automationEnabled`, etc.

### m7 — No Shared EnvironmentBadge Component (Notes.jsx:781-800)
Mode badge HTML is copy-pasted inline. Every screen that needs it will duplicate code.

---

## 🧠 MISSING FEATURES — Original Requirements

### F1 — Notion-Style Rich Notes → ✅ NOW COMPLETE
The `NoteEditor.jsx` component (763 lines) provides full block-based editing with:
- Markdown rendering + serialization
- 11 block types via slash menu
- Floating format toolbar
- Code blocks, images, todos, dividers
- Keyboard shortcuts
**Remaining gap**: No syntax highlighting in code blocks, no inline code execution.

### F2 — AI Teacher / Tutor Persona → ❌ MISSING
**Needed**: When `mode === 'learning'`, AI Assistant switches to Socratic tutor:
- Explains concepts user writes about
- Asks probing questions to deepen understanding
- Generates practice exercises automatically
- Tracks progress across sessions
- Uses **scaffolding**: Minimal hint → gentle hint → direct hint → subgoal → example (never gives full solution)
**Implementation**: Update AI Assistant panel to read `environmentMode` and switch system prompt to tutor style. Use RAG from user's own notes to ground responses.

### F3 — Raw → Optimized Note Conversion → ❌ MISSING
**Needed**: User types messy raw thoughts → AI automatically converts to clean structured notes with:
- Sections and subheadings
- Bullet points for key insights
- Code examples formatted
- Questions separated from answers
- One-click toggle between "Raw" and "Optimized" views
- Both versions preserved, user can edit either

### F4 — Continuous Session Mode → ❌ MISSING
**Needed**: When user starts typing, a "session" begins with:
- Session persists until user clicks "End Session"
- User can leave and come back — session memory intact
- AI is persistently engaged (pair programmer mode)
- Progressive accumulation: "Write more" → AI keeps optimizing and organizing
- **Session memory**: "Last session you were debugging CORS..."
- Auto-linking to related notes

### F5 — Bidirectional Chat-with-Note → ❌ MISSING
**Needed**: User can have a conversation WITH the note:
- Ask questions inline: "summarize this", "explain this concept", "find related notes"
- AI responds in the note or in split-panel
- **Interactive editing**: "make this more concise" → AI rewrites
- **Voice conversation**: User speaks, AI responds in text
- Example flow:
  ```
  User: "I'm learning about useCallback in React"
  AI: "Great! useCallback memoizes functions. Want an example?"
  User: "yes"
  AI: [inserts code example into the note]
  User: "now explain useMemo too"
  AI: [inserts comparison table]
  ```

### F6 — Auto Resource Fetching → ❌ MISSING
**Needed**:
- When user mentions a topic (especially in learning mode), AI auto-searches best resources
- Use existing `fetchAndSummarizeUrl()` from `ai.js`
- AI brings back summaries + links directly into the note
- Resources cataloged: "docs", "tutorial", "video", "article"
- Knowledge book compilation includes all resources by topic

### F7 — AI Session Memory Per Note → ❌ MISSING
**Needed**:
- Each note has its own **AI conversation context**
- AI remembers across typing sessions: "Last time you were fixing a CORS issue..."
- User asks: "what did I write about this last week?" → AI retrieves and summarizes
- Auto-linking: "This relates to your CORS fix from May 18"

### F8 — Learning Dashboard / Progress Tracking → ❌ MISSING
**Needed**:
- Mastery matrix (topics × proficiency level)
- Learning velocity (concepts mastered over time)
- Streak calendar (GitHub-style heatmap)
- Weakness radar chart
- SRS stats (cards learned, reviews today, retention rate)
- Session log (recent sessions with duration, accuracy, topics)
- Weekly summary: "You studied 4 topics, wrote 200 lines of code, fixed 7 bugs"

### F9 — Dashboard HelloCard Shows Environment Mode → ❌ MISSING
**Needed**: When `environmentMode !== 'normal'`, greeting should reflect it:
- "Good afternoon. **You're in Focus mode.** One thing at a time."
- "Hey Build. **Rest mode is active.** I've silenced everything."
- "🧠 Learning mode active. You've studied 3 topics today."

### F10 — Focus Mode Auto-Trigger from Environment → ❌ MISSING
**Needed**: When environment detects `focus: 'deep'` or `mode === 'focus'`:
- Dashboard focus timer auto-starts
- FocusPanel switches to execution mode
- Notifications paused (already in mode config)
- Ambient sound plays (already in mode config)

### F11 — Tasks Screen Filters by Energy Mode → ❌ MISSING
**Needed**:
- `energy: 'low'` → Show only P2/P3 tasks (low cognitive load)
- `energy: 'high'` → Show P0/P1 tasks (high cognitive load)
- `mode === 'rest'` → Hide all tasks, show "Time to rest"
- `mode === 'learning'` → Show learning-related tasks first

### F12 — Calendar Auto-Blocks Rest/Recovery Time → ❌ MISSING
**Needed**:
- `mode === 'rest'` → Auto-add "Recovery" block to calendar
- `mode === 'sickness'` → Auto-decline/block all meetings for 24h
- `mode === 'focus'` → Mark current time as "Deep work — DND"
- User sees: "AI blocked 14:00-16:00 for recovery (detected fatigue)"

### F13 — Settings: AI Automation Section → ❌ MISSING
**Needed controls**:
- Master kill switch (toggle)
- Mode override (dropdown — force any mode)
- Auto-reply editor (text input per mode)
- Contact tier manager (table with emergency/critical/normal)
- Audit log viewer (scrollable list with undo per action)
- Feedback history (thumbs up/down per automation)
- Automation stats (actions taken, mode changes, top triggers)

### F14 — Privacy Section Upgrade → ❌ MISSING
**Needed**:
- Data scope: "Read all notes / Only tagged notes / Only mood-tagged"
- Export: Download full signal-action log as JSON
- Delete signals: Remove specific signals from training data
- Automation log: "What did AI change?" — full transparency view
- Kill switch timer: "Pause automation for 1 hour / until tomorrow / permanently"

### F15 — AiChat Persona Per Mode → ❌ MISSING
**Needed**:
- `mode === 'learning'` → Socratic tutor (explains, teaches, quizzes)
- `mode === 'rest'` → Soothing persona (soft, calm, supportive)
- `mode === 'focus'` → Minimal persona (short answers, no distractions)
- `mode === 'redirect'` → Motivator (quick wins, momentum)
- `mode === 'sickness'` → Caring (health tips, gentle)

### F16 — CmdK Environment Commands → ❌ MISSING
**Needed**:
- `/mode learning`, `/mode focus`, `/mode rest`, `/mode normal`
- `/automation on`, `/automation off`
- `/audit` — show audit log
- `/status` — "You're in Learning mode. 3 automations today."

---

## 🧪 MISSING FEATURES — From Learning Research (NEW)

### R1 — Spaced Repetition System (SRS)
**What**: AI generates flashcards from notes, schedules reviews using FSRS algorithm.
**Why**: Without SRS, learning notes are read once and forgotten. With SRS, concepts are reviewed at optimal intervals for long-term retention.
**Research**: FSRS (Free Spaced Repetition Scheduler) uses DSR model (Difficulty 1-10, Stability, Retrievability). 21-trainable-parameter model trained on 700M reviews. 20-30% fewer reviews than legacy SM-2 at same retention.
**Data model needed**:
```js
Flashcard {
  id: string, sourceNoteId: string, front: string, back: string,
  stability: number, difficulty: number, retrievability: number,
  due: Date, reps: number, lapses: number, state: "New"|"Learning"|"Review"|"Relearning"
}
ReviewLog {
  cardId: string, rating: "Again"|"Hard"|"Good"|"Easy",
  stability: number, difficulty: number, elapsed_days: number
}
```
**UI needed**: 
- Card view: front → think → flip → rate (4 buttons)
- Daily review count + predicted workload
- Per-concept retention stats
**AI prompt**: `Generate atomic Q/A flashcard from this content. One concept per card. Self-contained answer.`

### R2 — Active Recall Quizzing
**What**: AI generates quiz questions from notes — MCQs, open-ended, code output prediction, code completion.
**Why**: Active recall is superior to passive review (Karpicke & Roediger). Recognizing ≠ Recalling.
**Two modes**:
1. **Quiz Mode**: Session-based, multi-question, fire-and-forget. Tests nuanced understanding.
2. **Flashcard Mode**: Atomic Q/A pairs → SRS scheduler. Tests isolated facts.
**Data model**:
```js
QuizQuestion {
  id: string, prompt: string,
  type: "multiple-choice"|"open-ended"|"code-output"|"code-completion",
  choices?: string[], correctAnswer: string, explanation: string,
  tags: string[], difficulty: "skim"|"read"|"study"|"master", sourceNoteId: string
}
```
**Evaluation**: LLM evaluates open-ended answers against rubric. Code questions execute in sandbox then compare output.
**Scheduling**: Correct → longer SRS interval. Wrong → re-quiz within 24h.

### R3 — Code Execution Sandbox
**What**: Inline code execution environment within notes — like Jupyter notebooks.
**Why**: The fastest path from learning to understanding is writing code AND seeing it run. Code blocks should have a "Run" button.
**Architecture**: 
- Docker/sandboxed containers per execution
- Strict resource limits (CPU time, memory, network blocked)
- Precompiled test harness per language
- Streaming output, error line highlighting
- Results: compile errors → runtime errors → wrong output → hidden test failures → performance
**Phased approach**:
1. MVP: Client-side JS sandbox (iframe + eval with restricted context)
2. V2: WASM-based runners (Pyodide for Python, QuickJS for JS)
3. V3: Server-side Docker containers
**UI**: "Run" button on code blocks → output panel below → pass/fail indicator

### R4 — Knowledge Graph / Auto-Linking
**What**: Every note auto-discovers links to other notes. Graph visualization shows connections.
**Why**: Connections between concepts drive deep understanding. Manual linking doesn't scale beyond 200 notes.
**Hybrid strategy**:
1. **Explicit links**: User writes `[[note title]]` → auto-link
2. **Auto-linking on save**: Scan text for phrases matching existing note titles → auto-convert with user approval
3. **Semantic proximity**: Embedding similarity between all notes → suggest "related" edges
4. **Unlinked mentions**: Surface mentions of note titles not yet linked
**Data model**:
```js
Link { sourceId, targetId, type: "explicit"|"auto"|"semantic", strength: 0-1, context: string }
```
**UI**: D3.js force-directed graph — node size = inbound links, edge thickness = strength, color = topic cluster, filterable by tag/date/type
**AI prompt**: `Given note X, suggest 3-5 existing notes to link to, with reason and sentence context.`

### R5 — Progressive Summarization (5 Layers)
**What**: Tiago Forte's method — notes progress through 5 layers of compression.
**Why**: Don't apply all layers to all notes. Apply opportunistically when revisiting. Most notes stay at Layer 1.
**Layers**:
- L1: Raw capture (original content)
- L2: Bolded passages (first pass — what resonates)
- L3: Highlighted passages (best of the best)
- L4: Executive summary (3-5 sentences in own words)
- L5: Remix (combine with other notes into new output)
**AI automation**:
- L1→L2: User bolds → AI suggests additional passages to bold
- L2→L3: AI suggests which bolded passages are "best of the best"
- L3→L4: AI drafts executive summary from highlights, user edits
- L4→L5: AI finds themes across multiple executive summaries → creates remix
**UI**: Progressively collapsed display. L1 shows full. Click to expand L2 (only bolded). Click again for L3 (only highlighted). Etc.

### R6 — Deliberate Practice Engine
**What**: Systematically identify "stretch zone" — tasks at ~70% success rate.
**Why**: Anders Ericsson — deliberate practice requires well-defined task at appropriate difficulty, immediate feedback, opportunities for repetition.
**Implementation**:
- Deconstruct skills into subskills (e.g., "Python mastery" → generators, decorators, async/await)
- Track accuracy per subskill
- Assign practice at ~70% success rate threshold
- Below 50% = frustration zone (too hard). Above 85% = comfort zone (too easy).
- Session structure: Warm-up (5min) → Stretch goal (20min) → Feedback analysis (10min) → Adjustment (5min)
**AI prompt**: `Generate a coding problem at user's stretch zone — 60% familiar concepts, 40% novel, ~70% expected success rate, solvable in 20-30 min.`

### R7 — Interleaving Scheduler
**What**: Adaptive topic mixing — alternate between related topics during practice.
**Why**: Interleaving improves category discrimination, long-term retention, and transfer to novel problems (Rohrer et al. — 25% better on tests 1 month later).
**Adaptive strategy**:
- **Early learning** (<60% accuracy): Blocking — build schema
- **Intermediate** (60-80%): Interleave with 2-3 related topics
- **Advanced** (>80%): Full interleaving with all related topics
- Within-session: Alternate topics every 10-15min
- Between-sessions: Never two consecutive days on same topic
**AI prompt**: `Design interleaved practice session for [topics]. Start with 1 blocked warm-up per topic, then 12 interleaved problems requiring discrimination.`

### R8 — Tiered Feedback System
**What**: Four tiers of feedback for code learning.
**Why**: Different feedback types serve different learning needs. One-size-fits-all feedback is suboptimal.
**Tiers**:
1. **Compile-time** (immediate): Red squiggles + "missing semicolon". 100% automatic, 0 wait.
2. **Test-case** (immediate): "3/5 passed. Failed: test_input_empty, test_large_array". Show input/output diff.
3. **Conceptual** (on-request): AI explains WHY the code failed conceptually. "Your loop condition skips the last element because you're using `<` instead of `<=`."
4. **Delayed review** (end of session): Summary of error patterns, misconceptions, suggested next topics.
**Preventive feedback**: The Codio Coach study found AI tutors prevent errors (0.12% error rate vs baseline). Build warnings before errors occur, not just reactions.

### R9 — Learning Analytics & Progress Metrics
**What**: Quantified learning progress across all dimensions.
**Metrics that matter**:
| Metric | Why | How |
|--------|-----|-----|
| Concepts Mastered | True competence measure | Quiz accuracy ≥80% on SRS |
| Recall Accuracy | Memory strength | SRS correct rate per concept |
| Streak | Habit formation | Consecutive days with activity |
| Deliberate Practice Time | Best skill predictor (Ericsson) | Minutes in active coding/quizzing |
| Code Written | Volume matters | Lines, distinct programs, problems solved |
| Error Recovery Time | Debugging skill proxy | Time from compile error to successful run |
| Difficulty Progression | Are they challenging themselves? | Difficulty trend line |
| Retention Rate | Are they forgetting? | Per-concept retrievability trajectory |

### R10 — Code Learning Exercise Pipeline
**What**: Structured exercise types that progress from understanding to application.
**Exercise types**:
1. **Concept explanation**: "Explain closures in JavaScript" — tests understanding
2. **Code reading**: "What does this code output?" — tests comprehension
3. **Bug fixing**: "This code has a bug. Find and fix it." — tests debugging
4. **Code completion**: "Fill in the missing function body." — tests implementation
5. **Code writing**: "Write a function that..." — tests full competence
6. **Refactoring**: "This code works but is poorly written. Improve it." — tests mastery
7. **Code review**: "Review this code. What would you change?" — tests expert judgment

---

## 🏗️ ARCHITECTURE RECOMMENDATIONS

### A1 — Shared `EnvironmentBadge` Component
Create reusable component. Currently copy-pasted inline in Notes.jsx (lines 781-800).

### A2 — Unified `useEnvironment()` Hook
```js
function useEnvironment() {
  const mode = state?.tweaks?.environmentMode || 'normal';
  const isActive = mode !== 'normal';
  return { mode, isActive, config: MODE_CONFIG[mode], setMode, resetMode, ... };
}
```

### A3 — Reactive Effect in Dashboard
```js
useEffect(() => {
  if (mode === 'focus') startFocus();
  if (mode === 'rest') { pauseFocus(); showRestMessage(); }
  if (mode === 'learning') showLearningStats();
}, [mode]);
```

### A4 — `loadState()` with Proper Defaults
```js
function loadState() {
  const parsed = JSON.parse(raw);
  return { ...freshState(), ...parsed, tweaks: { ...freshState().tweaks, ...parsed.tweaks } };
}
```

### A5 — Remove Dead `SET_ENVIRONMENT_MODE` Action
Delete `case 'SET_ENVIRONMENT_MODE'` and `state.environmentMode` from freshState. Keep only `tweaks.environmentMode`.

### A6 — The "Living Note" Data Model
```js
{
  id: 'n_abc123',
  title: 'Learning React Hooks',
  tag: 'Learning',
  blocks: [
    { type: 'heading', content: 'Introduction' },
    { type: 'text', content: 'Today I learned about useState...' },
    { type: 'code', language: 'jsx', content: "const [count, setCount] = useState(0)" },
    { type: 'ai-insight', content: 'useState is the most basic hook...' },
    { type: 'question', content: 'What happens when state updates?' },
    { type: 'ai-answer', content: 'Component re-renders...' },
  ],
  session: { active: true, startedAt: Date.now(), lastActivity: Date.now() },
  aiMemory: { context: 'Learning React hooks. Mastered useState.', conceptsCovered: ['useState', 'useEffect'] },
  optimized: { title: 'React Hooks Study Guide', content: '## useState\n...', generatedAt: Date.now() },
  srsCards: ['fc_1', 'fc_2'],  // References to flashcards generated from this note
  links: [{ targetId: 'n_def456', type: 'auto', strength: 0.85 }],
  progressiveSummary: { layer2: [], layer3: [], layer4: '' },
}
```

### A7 — Flashcard Generation Pipeline
```
Note saved
  → AI extracts atomic concepts
  → Generates Q/A pairs (front/back)
  → Creates Flashcard objects in state
  → SRS scheduler assigns due dates
  → Review panel shows due cards
  → User rates (Again/Hard/Good/Easy)
  → FSRS updates stability/difficulty
  → Next due date computed
```

### A8 — Quiz Generation Pipeline
```
Note saved
  → AI identifies key concepts
  → Generates multi-type questions (MCQ, code-output, open-ended)
  → Creates QuizSession
  → UI shows quiz interface
  → User answers → immediate feedback + explanation
  → Correct → SRS card created. Wrong → re-quiz queued.
```

---

## 📊 SUMMARY

| Category | Count | Items |
|----------|-------|-------|
| ✅ Complete features | 22 | Environment engine, NoteEditor, new reducer actions, voice recording, cross-tab sync, integrations, etc. |
| 🔴 Critical bugs | 5 | C1, C2, C3, C4, C5 |
| 🟠 Major bugs | 13 | M1-M13 |
| 🟡 Minor bugs | 7 | m1-m7 |
| 🧠 Missing features (original) | 16 | F1-F16 (F1 ✅ done via NoteEditor) |
| 🧪 Missing features (learning research) | 10 | R1-R10 |
| 🏗️ Architecture suggestions | 8 | A1-A8 |
| **TOTAL findings** | **59** | |

---

## 🎯 EXECUTION PRIORITY

### Sprint 1: Foundation Fixes (Critical bugs)
```
C5 — automationEnabled !== false → === true
C2 — Remove dead SET_ENVIRONMENT_MODE
C1 — loadState() merge with freshState()
A4 — Apply C1 fix
A5 — Apply C2 fix
m6 — Cross-tab sync include environmentMode
```

### Sprint 2: Core Usability (Major bugs)
```
M1 — Stale closure fix
M2 — Add 'Learning' to TAGS
M3 — Fix regex order
M4 — Per-note learning dedup
M5 — Remove dead code
M6 — Eliminate double dispatch
M10 — Task confirmation dialog
M12 — Connect timer systems
```

### Sprint 3: Feature Parity (All screens react)
```
C3 — Wire environmentMode into all 9 screens
F9 — Dashboard HelloCard shows mode
F11 — Tasks filters by energy
F12 — Calendar auto-blocks
F10 — Focus auto-trigger
A1 — Shared EnvironmentBadge
A2 — useEnvironment() hook
A3 — Reactive Dashboard effect
m4 — AI service env awareness
m3 — CmdK env commands (F16)
```

### Sprint 4: Control Center (Settings)
```
C4 — AI Automation section in Settings
F13 — Kill switch, mode override, auto-reply, contact tiers, audit log
F14 — Privacy section: export, delete, transparency
m5 — Replace privacy placeholder
```

### Sprint 5: Learning Engine (Core learning features)
```
F2 — AI Socratic tutor when mode === 'learning'
F3 — Raw → Optimized note conversion
F5 — Chat-with-note bidirectional
F4 — Continuous session mode
R2 — Active recall quizzing
R1 — Spaced repetition (SRS)
A7 — Flashcard generation pipeline
A8 — Quiz generation pipeline
```

### Sprint 6: Advanced Learning (Research features)
```
R3 — Code execution sandbox
R4 — Knowledge graph + auto-linking
R5 — Progressive summarization
R6 — Deliberate practice engine
R7 — Interleaving scheduler
R8 — Tiered feedback system
R9 — Learning analytics dashboard
R10 — Code exercise pipeline
F6 — Auto resource fetching
F7 — AI session memory
F8 — Learning dashboard
F15 — AiChat persona per mode
A6 — Living Note data model migration
```

---

## 🔗 COMPLETE FILE INVENTORY

| File | Lines | Status | Description |
|------|-------|--------|-------------|
| `src/services/environment.js` | 761 | ✅ DONE | AI Environment Engine |
| `src/components/editor/NoteEditor.jsx` | 763 | ✅ DONE | Notion-style block editor |
| `src/screens/Notes.jsx` | 876 | ✅ DONE | Notes screen with env integration |
| `src/store/AppContext.jsx` | 626 | ✅ DONE | Reducer + new actions |
| `src/store/db.js` | 123 | 🔄 PARTIAL | Only auth uses getSetting/setSetting |
| `src/store/auth.js` | 150 | ✅ DONE | Client-side auth |
| `src/services/ai.js` | 437 | 🔄 PARTIAL | Missing env mode awareness |
| `src/services/focus.js` | 175 | 🔄 PARTIAL | Not connected to env mode |
| `src/services/clock.js` | 76 | 🔄 PARTIAL | No env mode integration |
| `src/services/gmail.js` | 200 | ✅ DONE | Gmail OAuth + API |
| `src/services/notion.js` | 200 | ✅ DONE | Notion OAuth + API |
| `src/screens/Dashboard.jsx` | 702 | ❌ MISSING | No env mode awareness |
| `src/screens/Settings.jsx` | 567 | ❌ MISSING | No automation controls |
| `src/screens/Tasks.jsx` | ~600 | ❌ MISSING | No energy-based filtering |
| `src/screens/Calendar.jsx` | ~400 | ❌ MISSING | No auto-blocking |
| `src/screens/Planner.jsx` | ~700 | ❌ MISSING | No rescheduling |
| `src/screens/Contacts.jsx` | ~500 | ❌ MISSING | No auto-reply |
| `src/screens/AiChat.jsx` | ~400 | ❌ MISSING | No persona switching |
| `src/screens/Files.jsx` | ~300 | ❌ MISSING | No env mode awareness |
| `src/components/command/CmdK.jsx` | ~300 | ❌ MISSING | No env commands |
| `src/hooks/useGestures.js` | 100 | ❌ DEAD | Never imported |
| `src/components/focus/FocusPanel.jsx` | 420 | 🔄 PARTIAL | Not connected to env mode |
| `src/components/navigation/Dock.jsx` | 400 | ✅ DONE | Stable |
| `src/components/ui/Icons.jsx` | 500 | ✅ DONE | Stable |
| `src/main.jsx` | 98 | ✅ DONE | Cross-tab sync setup |
| `NOTES_AI_AUTOMATION_VISION.md` | — | ✅ DONE | Product vision doc |
| `BUILD_STRATEGY.md` | — | ✅ DONE | Execution plan |

---

## 📝 END-TO-END DATA FLOW

```
User types in NoteEditor (contentEditable blocks)
        │
        ▼
blocksToMarkdown(blocks) → serialized markdown string
        │
        ▼
handleContentChange(markdown)
        │
        ├──► actions.updateNote({ content: markdown })  ← Immediate state save
        │
        └──► setTimeout(runAiAnalysis, 1200)
                    │
                    ├──► extractEnvironmentState(content)
                    │       ├── analyzeText() → signals (7 categories)
                    │       ├── computeModeFromState() → mode (1 of 8)
                    │       └── extractLearningItems() → concepts, code, errors, Qs
                    │
                    ├──► extractEventsAndReminders(content)
                    │       ├── Tasks (need to / to-do / don't forget)
                    │       ├── Reminders (time: 3:00 pm)
                    │       └── Events (meeting with + time)
                    │
                    ├──► createAutomationSummary()
                    │
                    ├──► Auto-add tasks, reminders, events to state
                    │
                    ├──► IF learning: auto-capture learning note
                    │
                    └──► IF mode !== normal:
                            ├── addAuditLog({ action, mode, source, noteId })
                            └── setTweak('environmentMode', mode)
                                        │
                                        ▼
                              ┌─── Other screens react (Dashboard, Tasks, etc.)
                              │    ← NOT YET IMPLEMENTED
                              │
                              └─── Settings panel shows controls
                                   ← NOT YET IMPLEMENTED
```
