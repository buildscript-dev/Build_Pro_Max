# BUILD STRATEGY: Execution OS — "Meta-Level" Engineering Blueprint

## North Star
> Build_PRO_MAX is not a note-taking app with a calendar. It is an **AI Operating System for founder execution** — it reads your intent, configures your environment, manages your energy, and amplifies your output. It works *for* you, not *as* a tool you work *on*.

## Business Principles (Meta-Level)
| Principle | Meaning |
|-----------|---------|
| **Every screen must serve every other screen** | Notes inform Calendar. Calendar informs Tasks. Tasks inform Focus. Focus informs Notifications. Cross-section data flow is not optional. |
| **AI is not a feature — it is the runtime** | The AI runs continuously in the background, reading notes, inferring state, executing actions. It is not a chatbot you open. It is the OS. |
| **State is real-time, not polled** | When a note is written, Calendar blocks update immediately. When fatigue is detected, notifications silence in <2s. No refresh. No polling. |
| **Privacy is architecture, not a toggle** | Every automation is opt-in. Every action is undoable. Every decision is logged. The user always controls the off switch. |
| **Feedback loops drive product intelligence** | Every automation has a thumbs up/down. Patterns are learned. Over-automation is the #1 risk — the feedback loop prevents it. |

---

## Architecture Vision (Target State)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React SPA)                        │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Notes    │  │ Calendar │  │ Tasks    │  │ Focus    │        │
│  │ Screen   │  │ Screen   │  │ Screen   │  │ Screen   │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │              │              │              │              │
│  ┌────▼──────────────▼──────────────▼──────────────▼─────────┐  │
│  │                AppContext (useReducer + IndexedDB)         │  │
│  │  • All state lives here                                   │  │
│  │  • IndexedDB for persistence (not localStorage)           │  │
│  │  • BroadcastChannel for cross-tab sync                    │  │
│  │  • Debounced writes (300ms)                               │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                    │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │                AI Environment Engine                       │  │
│  │  • NLP Pipeline: sentiment + entity + intent extraction   │  │
│  │  • State Machine: energy, focus, mood, health, social     │  │
│  │  • Policy Engine: rules that map state → actions          │  │
│  │  • Action Executor: cross-section commands                │  │
│  │  • Feedback Collector: thumbs up/down per action          │  │
│  │  • Learner: adapts per-user lexicon over time             │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                    │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │                Privacy & Control Layer                     │  │
│  │  • Kill switch (global pause)                             │  │
│  │  • Per-action undo                                        │  │
│  │  • Audit log (who did what when)                         │  │
│  │  • Opt-in settings (per domain)                          │  │
│  │  • Data export/delete                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Execution Phases

### Phase 0: Foundation — Fix the Critical Bugs First
**Why**: The current app serializes localStorage on every dispatch. This makes real-time AI automation impossible — you'd freeze the UI on every note save.

| Task | File(s) | Impact |
|------|---------|--------|
| 0.1 | Debounce localStorage writes (300ms) | `AppContext.jsx` | Eliminates jank |
| 0.2 | Stale useMemo → memoize correctly | `AppContext.jsx` | Fixes recompute cascade |
| 0.3 | Dashboard greeting — use live date | `Dashboard.jsx` | Fixes stale midnight greetings |
| 0.4 | Dead code: remove unused IndexedDB schema (or revive it) | `store/db.js` | Reduces confusion |

### Phase 1: Data Layer Upgrade — localStorage → IndexedDB
**Why**: localStorage is synchronous, blocking, and capped at 5MB. For AI state inference (which logs every note, action, and feedback), we need async, unbounded storage.

| Task | File(s) | Impact |
|------|---------|--------|
| 1.1 | Implement real IndexedDB service (idb wrapper) | `src/store/db.js` (revive) | Async, 250MB+ storage |
| 1.2 | Create persistence middleware in AppContext | `AppContext.jsx` | Debounced, async writes |
| 1.3 | Migration layer: localStorage → IndexedDB | `AppContext.jsx` | Preserves existing data |
| 1.4 | Remove synchronous saveState from dispatch | `AppContext.jsx` | Non-blocking dispatches |

### Phase 2: AI Environment Engine Core
**Why**: This is the heart of the product. Without it, Notes is a text editor and nothing else.

| Task | File(s) | Impact |
|------|---------|--------|
| 2.1 | Build NLP inference engine (signal extraction) | `src/services/environment.js` | Detects energy, focus, mood, health, social from text |
| 2.2 | Build State Machine (current user state) | `src/services/environment.js` | Holds current inferred state |
| 2.3 | Build Policy Engine (state → actions) | `src/services/environment.js` | Maps state to cross-section commands |
| 2.4 | Build Action Executor (execute actions) | `src/services/environment.js` | Calls AppContext dispatch for each action |
| 2.5 | Integrate with Notes screen (auto-run on save) | `src/screens/Notes.jsx` | Notes now trigger environment changes |
| 2.6 | Emergency contact & urgency detection | `src/services/environment.js` | Bypass system for critical messages |

### Phase 3: Cross-Section Integration
**Why**: Each screen must react to environment state changes.

| Task | File(s) | Impact |
|------|---------|--------|
| 3.1 | Focus mode: auto-activate on "deep work" notes | `FocusPanel.jsx`, `focus.js` | Notes can start focus sessions |
| 3.2 | Calendar: auto-block rest time | `Calendar.jsx` | Fatigue → calendar block created |
| 3.3 | Tasks: auto-reprioritize by energy | `Tasks.jsx` | Low energy → easy tasks surfaced |
| 3.4 | Notifications: silence/queue by state | `Dock.jsx`, `clock.js` | State-driven notification control |
| 3.5 | Contacts: auto-reply by state | `Contacts.jsx` | "Deep focus — will reply later" |
| 3.6 | Devices: volume/brightness control | `Settings.jsx` | Environment state drives device config |

### Phase 4: Feedback & Learning Loop
**Why**: Without feedback, the AI is guessing. With feedback, it learns.

| Task | File(s) | Impact |
|------|---------|--------|
| 4.1 | Feedback banner component | `src/components/ui/` | Thumbs up/down per action |
| 4.2 | Feedback collection in AppContext | `AppContext.jsx` | Stores feedback with action context |
| 4.3 | Learner: per-user lexicon adaptation | `src/services/environment.js` | Adjusts signal weights per user |
| 4.4 | Decay: auto-decay signal weights after 7d | `src/services/environment.js` | Prevents stale pattern matching |

### Phase 5: Privacy & Control
**Why**: Without this, nobody will trust the automation.

| Task | File(s) | Impact |
|------|---------|--------|
| 5.1 | Kill switch component (header/global) | `App.jsx` | One-click pause all AI automation |
| 5.2 | Audit log UI | `Settings.jsx` | Shows every automation action |
| 5.3 | Opt-in settings per domain | `Settings.jsx` | Toggle: notes→calendar, notes→focus, etc. |
| 5.4 | Data export/delete | `Settings.jsx` | User data control |

### Phase 6: Production Polish
**Why**: Looks matter. Performance matters. Reliability matters.

| Task | File(s) | Impact |
|------|---------|--------|
| 6.1 | Loading states for every async operation | All screens | No blank screens |
| 6.2 | Empty states for every list | All screens | "No tasks yet" instead of blank |
| 6.3 | Error boundaries per screen | `App.jsx`, screens | Graceful crash recovery |
| 6.4 | Performance: memoization audit | All components | Render optimization |
| 6.5 | Keyboard shortcuts for power users | `CmdK.jsx` | Fast navigation |

---

## Execution Cadence

```
Week 1: Phase 0 + Phase 1  (Foundation + Storage)
Week 2: Phase 2              (AI Engine)
Week 3: Phase 3              (Integration)
Week 4: Phase 4 + 5          (Feedback + Privacy)
Week 5: Phase 6              (Polish)
```

## Risk Register

| Risk | Mitigation |
|------|------------|
| AI NLP false positives (tired of this meeting ≠ need sleep) | Policy engine requires 2+ signals before acting. Minimum confidence threshold. |
| IndexedDB migration drops data | Migration preserves localStorage until migration is confirmed complete. Rollback available. |
| Performance regression from AI engine | NLP runs in idle callback / requestIdleCallback. Never blocks UI thread. |
| User feels out of control | Every action has undo. Kill switch is always visible. Audit log is always accessible. |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Notes → AI action latency | < 2 seconds | Performance mark |
| Automation accuracy (user thumbs up rate) | > 80% | Feedback collection |
| User override rate | < 20% of actions | Audit log analysis |
| Session time per day | > 30 min | Analytics |
| Feature adoption (% users with AI automation on) | > 60% | Settings state |
| Crash-free session rate | > 99.5% | Error boundary logs |

---

*This is a Meta-level build. Every line of code is an investment in the platform. No shortcuts. No half-measures. Ship the foundation first, then the intelligence.*
