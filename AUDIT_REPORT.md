# Build_PRO_MAX_1 — Full Audit Report
**Date:** 2026-05-20 · **Auditor:** Antigravity AI

---

## 🔴 CRITICAL — Bugs & Vulnerabilities

### 1. `localStorage` Serialization on Every Single State Change
**File:** `src/store/AppContext.jsx` · Line 298–303

The `useEffect` that persists to `localStorage` fires on **every dispatch**, including transient UI changes like chat message typing, notification reads, etc. This causes:
- Synchronous `JSON.stringify` on the entire state tree (400+ object) on every keystroke in Notes or Chat
- Risk of **quota exceeded** errors with large notes content (5MB limit)
- No debouncing — sequential rapid dispatches serialize the full state N times

**Fix:** Debounce the persistence (300ms), and exclude volatile slices more aggressively.

---

### 2. `useMemo` Dependency on the Entire `state` Object in Dashboard
**File:** `src/screens/Dashboard.jsx` · Line 27

```js
const cards = useMemo(() => getCards(D), [D]);
```

`D = state` is the entire state object. Since `state` is a new reference on **every** `dispatch`, this `useMemo` is completely bypassed — it recalculates `getCards` on every render including unrelated notification pings. `getCards()` returns a static array of render functions — it should be `useMemo` with `[]` or defined outside the component entirely.

**Fix:** Move `getCards` result to a top-level constant since it only references component render functions.

---

### 3. `new Date()` Called Inline in Render (Stale Greeting)
**File:** `src/screens/Dashboard.jsx` · Lines 75–77

```js
const now = new Date();
const hour = now.getHours();
const greeting = ...
```

This runs once at mount time and never updates. If the user leaves the app running across midnight, the greeting stays "Good morning" all day.

**Fix:** Derive greeting inside a `useMemo` with a live clock or update it every hour via `setInterval`.

---

### 4. `setInterval` in `AppContext` Creates a Closure Over Stale State
**File:** `src/store/AppContext.jsx` · Lines 306–321

The AI suggestions `setInterval` runs every 30 seconds but reads `state.tasks` and `state.aiSuggestions` from the closure — these are stale after the first render. The dependency array `[state.tasks, state.aiSuggestions]` means the interval is **torn down and recreated on every task/suggestion change**, which is inefficient and creates timer drift.

**Fix:** Use a `useRef` to hold the latest state and read from the ref inside the interval, using a stable single `setInterval`.

---

### 5. File Identification by `name` Instead of `id`
**File:** `src/store/AppContext.jsx` · Lines 211, 215

```js
case 'UPDATE_FILE_PROGRESS': { files.map(f => f.name === action.payload.name ...) }
case 'REMOVE_FILE': { files.filter(f => f.name !== action.payload) }
```

File operations use `.name` as the unique identifier. If two files have the same name (e.g., uploaded `report.pdf` twice), both get updated/deleted simultaneously. This is a data integrity bug.

**Fix:** Generate a unique `id` for each file on creation and use `id` for all operations.

---

### 6. Chat Suggestion Buttons Use Array Index as Key
**File:** `src/screens/AiChat.jsx` · Line 105

```jsx
{m.actions.map((a, j) => <PaperButton key={j} ...>)}
```

Using array index as `key` causes React reconciliation issues when actions are re-ordered or messages are prepended. Not a crash bug but causes stale UI states.

**Fix:** Use `${m.id}-action-${j}` as the key, or use the action string itself as the key.

---

### 7. `DraggableBentoCard` — `drag.active` State Read Inside Closure
**File:** `src/screens/Dashboard.jsx` · Lines 164–165

```js
const onPointerMove = (e) => {
  if (!drag.active) return;
```

`drag` is a state value captured by the closure at the time `onPointerMove` is created. Since `onPointerMove` isn't memoized, it recreates on every render — but during a drag, rapid `setDrag` calls cause re-renders, and there's a chance the stale closure fires the guard check against a stale `drag.active`. Should use `useRef` for the drag active flag.

**Fix:** Track `drag.active` in a `useRef` (`isDragging.current`) to make the pointer handlers stable.

---

## 🟡 PERFORMANCE — Inefficiencies

### 8. Entire `AppContext.Provider` Re-Renders Every Child on Any Action
**File:** `src/store/AppContext.jsx` · Lines 287–389

Every `dispatch` causes `AppProvider` to re-render, which passes a new `actions` object reference to the context. All children that consume `useApp()` re-render even if they only care about a single slice. With 10 screens each consuming the full context, a single notification dispatch re-renders the entire app.

**Fix:** Memoize the `actions` object with `useCallback`/`useMemo`, and split context into `StateContext` and `ActionsContext` so action-only consumers don't re-render on state changes.

---

### 9. `SVG liquid-fx` Filter Is Always Running with Heavy CPU Operations
**File:** `src/App.jsx` · Lines 108–136

The animated SVG `feTurbulence` + `feDisplacementMap` + `feGaussianBlur` filter runs on the **entire viewport** at all times. On lower-end hardware, this is a compositor bottleneck — it forces software rasterization on every animation frame.

**Fix:** Reduce the SVG filter to a smaller viewport-clipped area, or throttle/pause it when the window is not visible using the Page Visibility API.

---

### 10. Ambient Orbs: `will-change: transform` on 4 Large Elements
**File:** `src/index.css` · Line 197

Four 380–600px blurred orbs all use `will-change: transform`. While this promotes them to GPU layers, four large blurred elements at once is expensive VRAM-wise, especially on mobile/low-power GPUs.

**Fix:** Add `content-visibility: auto` to ambient orbs and reduce blur from `80px` to `60px` with no visual quality loss.

---

### 11. `formatTime` and `greeting` Are Computed Inside the Component Body (Not Memoized)
**File:** `src/screens/Dashboard.jsx` · Lines 49–53, 75–77

`formatTime` is a pure function re-created on every render. `greeting` is computed on every render even though it changes at most 3 times per day.

**Fix:** Move `formatTime` outside the component. Memoize `greeting`.

---

### 12. `Math.random()` in JSX Render
**File:** `src/screens/Files.jsx` (and Dashboard.jsx DevicesCard)

```js
<span>Synced {Math.floor(Math.random() * 30)} sec ago</span>
```

`Math.random()` in JSX means a new random number on **every re-render**, causing the "synced X sec ago" label to flicker with a new value every time anything re-renders. This also breaks React's reconciliation guarantee.

**Fix:** Initialize the sync timestamp in a `useRef` or `useState` that only updates on actual sync events.

---

### 13. Screen Components Are All Eagerly Imported
**File:** `src/App.jsx` · Lines 7–17

All 9 screen components are eagerly imported even though only `Dashboard` is visible on load. This inflates the initial bundle parse time. The build shows a single 299KB JS chunk.

**Fix:** Use `React.lazy` + `Suspense` for all non-dashboard screens to enable code splitting.

---

## 🔵 MISSING FEATURES / UX GAPS (My Recommendations)

### 14. No Keyboard Navigation Between Screens
The dock has no keyboard shortcut beyond `⌘K`. Users can't press `1`–`9` or arrow keys to navigate screens. Premium apps (Linear, Arc) support this.

**Proposed:** Add `1`–`9` number shortcuts mapped to dock items.

---

### 15. No Empty State for Search Results in Notes/Tasks
When the Notes search returns nothing, the list simply goes empty with no feedback.

**Proposed:** Add a warm, illustrated empty state with the search term displayed.

---

### 16. No `aria-label` / Accessibility on Icon Buttons
The drag handle, close buttons, and dock icons have no `aria-label`. Screen readers get nothing useful.

**Proposed:** Add `aria-label` to all icon-only buttons.

---

### 17. Focus Timer Has No Pause, Reset, or Visual Ring
The 25-min focus timer in the dashboard header shows a text countdown but has no pause button and no circular progress ring — both expected UX patterns for a Pomodoro timer.

**Proposed:** Add pause/reset to the focus timer and a thin progress arc around the flame icon.

---

### 18. Chat "Try Asking" Prompts Are Not Clickable (Just `cursor: default`)
**File:** `src/screens/AiChat.jsx` · Line 150

The suggestion chips set `cursor: default` instead of `cursor: pointer`, which signals they're not interactive — but they do fill the draft on click. This is a confusing UX signal.

**Fix:** Change `cursor: default` to `cursor: pointer` on the suggestion chips.

---

### 19. No `<title>` Tag or `<meta>` Description
**File:** Root `index.html`

The app has no `<title>` tag update per screen and no meta description, which matters for when this is shared as a PWA or bookmarked.

**Proposed:** Set a dynamic `document.title` on screen change.

---

### 20. No `prefers-reduced-motion` Media Query Support
All animations — drift orbs, glass ring rotation, grain shift, card-rise — ignore the OS accessibility setting `prefers-reduced-motion`. Users with vestibular disorders will experience excessive motion.

**Proposed:** Add a CSS media query that disables animations for users who prefer reduced motion.

---

## Summary Table

| # | Severity | Area | Issue |
|---|----------|------|-------|
| 1 | 🔴 Critical | Store | localStorage serializes on every dispatch — no debounce |
| 2 | 🔴 Critical | Dashboard | `useMemo([D])` invalidates on every render |
| 3 | 🔴 Critical | Dashboard | `greeting` never updates after mount |
| 4 | 🔴 Critical | Store | Stale closure in AI suggestions interval |
| 5 | 🔴 Critical | Store | Files identified by name instead of unique ID |
| 6 | 🟡 Medium | AiChat | Array index used as key for action buttons |
| 7 | 🟡 Medium | Dashboard | `drag.active` read from stale closure |
| 8 | 🟡 Medium | Store | Whole-app re-render on any dispatch |
| 9 | 🟡 Medium | App | Heavy SVG filter always running |
| 10 | 🟡 Medium | CSS | 4× `will-change` large blurred orbs |
| 11 | 🟡 Medium | Dashboard | Non-memoized pure functions in render |
| 12 | 🟡 Medium | Multiple | `Math.random()` in JSX render |
| 13 | 🟡 Medium | App | All screens eagerly imported (no code splitting) |
| 14 | 🔵 Feature | Nav | No `1`–`9` keyboard shortcuts |
| 15 | 🔵 Feature | Notes/Tasks | No empty state on search |
| 16 | 🔵 Feature | Accessibility | No `aria-label` on icon buttons |
| 17 | 🔵 Feature | Dashboard | Focus timer missing pause/reset |
| 18 | 🔵 Fix | AiChat | Suggestion chips use wrong cursor |
| 19 | 🔵 Feature | Meta | No dynamic `<title>` / meta description |
| 20 | 🔵 Feature | Accessibility | No `prefers-reduced-motion` support |
