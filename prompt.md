# Build_PRO_MAX_1 — Complete Professional Audit & Architecture Plan

> **Date:** May 20, 2026
> **Auditor:** Senior full-stack engineer
> **Codebase:** `src/` — 52 modules, 13 production chunks, 1.3s build time
> **Methodology:** Line-by-line review of every screen, service, store, component, and config file

---

## 1. EXECUTIVE SUMMARY

**Build_PRO_MAX_1 is a beautiful UI prototype with zero backend infrastructure.** Every feature that appears to work either:
- Reads from hardcoded mock data (`data.js`)
- Simulates behavior with `Math.random()` (file progress, planner reshuffling)
- Shows placeholder UI with no actual service integration (connected accounts, device sync, AI behavior toggles)

**To make this industry-ready, you need 3 layers:**
1. **Infrastructure:** Supabase (database, auth, realtime, storage) + WebRTC (P2P file transfer)
2. **Cross-device:** Supabase Realtime for state sync + device registration + remote control protocol
3. **Missing business logic:** ~40 features that are listed but non-functional

---

## 2. INFRASTRUCTURE GAPS (Critical)

### 2.1 Database
| What exists | What's needed |
|---|---|
| `db.js` (IndexedDB via `idb`) — defined but **NEVER IMPORTED anywhere** | Connect to Supabase Postgres (500MB free tier) |
| `AppContext.jsx` saves to `localStorage` (5-10MB limit) | Supabase client SDK for all CRUD |
| Chat messages explicitly removed from persistence (`const { chatMessages, ...rest } = state`) | Persist chat to Supabase `chat_messages` table |
| No data migration strategy | Use Supabase migrations or schema versioning |

### 2.2 Real-time Sync
| What exists | What's needed |
|---|---|
| "Synced just now" — hardcoded text, no actual sync | Supabase Realtime (WebSocket-based) for Broadcast, Presence, Postgres Changes |
| "Syncs across devices in < 2s" — pure marketing copy | Real Supabase Realtime subscriptions on all entities |
| No conflict resolution — last tab to save wins | Optimistic concurrency with version fields or CRDT |

### 2.3 Authentication
| What exists | What's needed |
|---|---|
| `auth.js` — localStorage-based, bcryptjs in browser (slow, insecure) | Supabase Auth (email/password, OAuth, magic link) |
| No email verification | Supabase built-in email verification |
| No password reset | Supabase magic link reset |
| `auth_users` stored in plain localStorage | Supabase Auth is server-side, RLS-protected |

### 2.4 File Storage
| What exists | What's needed |
|---|---|
| File records with simulated progress bars | Supabase Storage for actual file upload/download |
| No actual file bytes anywhere | Blob storage with signed URLs |
| "Peer-to-peer over LAN" — not implemented | WebRTC RTCDataChannel for direct P2P transfer |

### 2.5 PWA / Offline
| What exists | What's needed |
|---|---|
| No `manifest.json` | PWA manifest with icons, theme color, display mode |
| No `service-worker.js` | Service worker with cache-first strategy for offline |
| No install prompt | `beforeinstallprompt` event listener |
| `index.html` is bare-bones (17 lines) | Full PWA meta tags, theme color, apple-touch-icon |

---

## 3. FEATURES THAT ARE LISTED BUT DON'T WORK

### 3.1 Connected Accounts (Settings.jsx + Onboarding.jsx)
- **Google Calendar, iCloud, Slack, Linear, Notion** — all show UI cards with "Connect" buttons
- Clicking "Connect" fires a fake notification, nothing actually happens
- **Fix:** Integrate each via OAuth (Google Calendar API, Slack API, Linear GraphQL API, Notion API)

### 3.2 Gmail Integration (Settings.jsx + Contacts.jsx + gmail.js)
- Works but requires user to manually find/enter Google Client ID + API Key
- Average user will not know how to get these from Google Cloud Console
- No email sending UI from Contacts
- No Gmail sidebar in any screen
- **Fix:** Auto-provision via Supabase Edge Function or provide guided setup

### 3.3 AI Behavior Settings (Settings.jsx)
- All 4 toggles (Voice, Auto-plan, Pages mood detection, Relationship watcher) do nothing
- Clicking each fires `actions.addNotification({ text: '...setting toggled' })` — no state change
- **Fix:** Wire toggles to actual context state + AI prompt behavior

### 3.4 Device Sync (Dashboard.jsx + Files.jsx)
- 4 hardcoded devices (MacBook Pro, iPhone 15, iPad Pro, Studio)
- "Online/Offline" status is static mock data
- No actual device detection, no WebRTC, no WebSocket
- **Fix:** Register devices via Supabase Auth + Realtime presence

### 3.5 File Transfers (Files.jsx)
- `useEffect` with `setInterval` simulating progress with `Math.random()`
- No actual file bytes, no upload, no download, no P2P
- "Beam anything, anywhere" — nothing is beamed
- **Fix:** WebRTC RTCDataChannel for P2P + Supabase Storage as fallback

### 3.6 Planner AI Regeneration
- Despite earlier fix, the AI response is shown only in notification
- Track reshuffling is still random: `[...tracks].sort(() => Math.random() - 0.5)`
- AI prompt tells it about tasks but the actual layout doesn't change based on response
- **Fix:** Make AI response actually reposition blocks intelligently

### 3.7 Calendar "Auto-fill Week"
- Always adds identical 3 hardcoded events regardless of context
- **Fix:** Use AI to generate events based on tasks, contacts, and history

### 3.8 Command Center (CmdK.jsx)
- All AI answers are hardcoded strings for specific queries
- No actual data search or AI generation
- **Fix:** Wire to real data search + AI generation

### 3.9 Contact Warmth Decay
- `DECAY_WARMTH` reducer action exists but is **never dispatched** by any component
- **Fix:** Run decay interval in AppContext (like reminder checker)

---

## 4. MISSING BUSINESS LOGIC

### 4.1 Goal Management
- Goals are static data from `data.js` — no UI to update progress
- No goal creation, deletion, or editing
- No goal-to-task linking

### 4.2 Task Features
- No recurring tasks
- No sub-tasks or task dependencies
- No task filtering/sorting by priority, due date, project (only inline text search)
- No task comments or attachments
- No estimated vs actual time tracking

### 4.3 Calendar Features
- No event categories/types beyond color
- No recurring events
- No event reminders (separate from generic reminders)
- No Google Calendar sync (despite UI saying "connected")
- No drag-to-resize events in day view

### 4.4 Contact Features
- No contact groups/lists
- No email/linking to Gmail
- No notes per contact
- No contact import (CSV, vCard)

### 4.5 Note Features
- No rich text formatting (bold, italic, lists)
- No image embedding in notes
- No export (Markdown, PDF)
- No version history

### 4.6 Files & Device Features
- No actual file upload
- No file preview (PDF viewer, image viewer, audio player)
- No real device discovery (mDNS, WebRTC)
- No remote control (mouse/keyboard forwarding, screen sharing)

### 4.7 Data Management
- No export/import UI (despite `db.js` having `exportAllData`/`importAllData`)
- No data backup
- No undo/redo for destructive actions
- No analytics or usage tracking

---

## 5. UI/UX GAPS

| Issue | Location | Severity |
|---|---|---|
| No loading states for data fetching (future remote data) | All screens | High |
| No error boundaries — any crash = white screen | App.jsx | High |
| No empty states for empty task/note/contact lists | Multiple | Medium |
| No keyboard navigation for drag interactions | Dashboard, Tasks | Medium |
| No responsive bento grid — fixed 4-column | Dashboard | Medium |
| No dark mode — only warm paper and mono | CSS | Medium |
| Auth password shown in plain text | Auth.jsx | Medium |
| No "forgot password" flow | Auth.jsx | High |
| No session timeout handling | App.jsx | Medium |
| No aria-labels on icon-only buttons | Multiple | Low |
| Firefox scrollbar styles removed | CSS | Low |

---

## 6. ARCHITECTURAL ISSUES

| Issue | Details |
|---|---|
| Dual storage: AppContext/localStorage + db.js/IndexedDB, only one used | db.js is dead code |
| Single monolithic reducer in AppContext | Will become unmanageable above ~20 actions |
| No TypeScript | All PropTypes implicit, runtime errors only |
| No test suite | No unit, integration, or E2E tests |
| ChatMessages excluded from persistence | All chat lost on page refresh |
| Hardcoded demo data revolves around "Lior Tanaka" | No onboarding for new users |
| localStorage 5-10MB cap | Will fail with real file metadata + notes + chat |

---

## 7. CROSS-DEVICE ARCHITECTURE DESIGN

### 7.1 Recommended Stack

```
┌─────────────────────────────────────────────────────────┐
│                    Build_PRO_MAX_1                       │
├─────────────────────────────────────────────────────────┤
│  PWA Shell (manifest.json + service-worker.js)          │
├─────────────────────────────────────────────────────────┤
│  @supabase/supabase-js                                  │
│  ├── Database (Postgres — 500MB free)                   │
│  ├── Auth (email/password + OAuth — 50K MAU free)       │
│  ├── Realtime (WebSocket — Broadcast + Presence +       │
│  │              Postgres Changes — 200 conn free)        │
│  └── Storage (file upload — 1GB free)                   │
├─────────────────────────────────────────────────────────┤
│  WebRTC (RTCPeerConnection + RTCDataChannel)             │
│  ├── P2P file transfer (LAN: direct, WAN: via TURN)     │
│  ├── Remote control signaling (mouse, keyboard events)  │
│  └── Screen sharing / remote desktop                    │
├─────────────────────────────────────────────────────────┤
│  @supabase/realtime-js (client)                         │
│  ├── Broadcast: ephemeral events (cursor, typing)       │
│  ├── Presence: device online/offline tracking           │
│  └── Postgres Changes: CRUD sync across devices         │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Device Registration & Presence

```
Phone opens app
  → Supabase Auth signs in (same user)
  → Realtime Presence joins channel "user:{userId}:devices"
  → Presence payload: { deviceId, deviceName, deviceKind, online: true }
  → Other devices receive presence join/leave events
  → Device appears in Dashboard "Connected" list
  → "Synced just now" becomes real: last presence heartbeat timestamp
```

### 7.3 Cross-Device CRUD Sync

```
Phone creates a task "Review PR"
  → AppContext dispatches ADD_TASK
  → Supabase Realtime Broadcast sends { type: 'ADD_TASK', payload: ... }
  → OR write to Postgres → Postgres Changes triggers → all subscribed clients receive update
  → Laptop receives event, updates local state
  → Both devices show the same tasks in real-time
  → Conflict resolution: last-write-wins with timestamp (or CRDT for complex data)
```

### 7.4 File Sharing (P2P)

```
User drags file to "iPhone 15" device tile
  → Supabase Realtime sends signaling offer to target device
  → WebRTC RTCPeerConnection established between browser tabs/devices
  → RTCDataChannel opened
  → File chunked (64KB chunks), sent over data channel
  → Progress bar updates from real chunk acknowledgments
  → On completion, file stored in Supabase Storage as backup
  → Both devices show "Delivered"
```

### 7.5 Remote Control

```
Phone opens "Remote Desktop" from laptop
  → WebRTC data channel established
  → Laptop sends screen capture (Canvas API, 1fps)
  → Phone sends mouse/keyboard events over data channel
  → Laptop executes events via simulated input or forwards to OS (requires native addon)
  → Alternative: Use VNC/RDP protocol tunneling over WebSocket
```

### 7.6 Supabase Tables Schema

```sql
-- Users (managed by Supabase Auth)
-- Auto-generated auth.users table

-- Tasks
create table tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  due text,
  priority text default 'P2',
  status text default 'todo',
  project text default 'General',
  ai text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  version integer default 1  -- for conflict detection
);
alter table tasks enable row level security;

-- Notes
create table notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text default 'Untitled',
  tag text default 'General',
  icon text default 'notes',
  content text,
  preview text,
  ai text,
  pinned boolean default false,
  word_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Events
create table events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  day integer,
  month integer,
  year integer,
  color text default 'amber',
  time text default '12:00',
  created_at timestamptz default now()
);

-- Contacts
create table contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  role text,
  tag text default 'Personal',
  warmth real default 0.5,
  avatar text,
  color text default 'amber',
  email text,
  phone text,
  ai text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Chat Messages
create table chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  role text not null,  -- 'user' or 'ai'
  text text not null,
  actions jsonb,
  created_at timestamptz default now()
);

-- Devices
create table devices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  kind text not null,  -- 'laptop', 'phone', 'tablet', 'desktop'
  last_seen timestamptz default now(),
  online boolean default false
);

-- Files (metadata)
create table files (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  storage_path text not null,  -- Supabase Storage path
  size bigint,
  kind text,  -- 'pdf', 'fig', 'sheet', 'img', 'audio'
  from_device text,
  to_device text,
  created_at timestamptz default now()
);

-- Reminders
create table reminders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  time text not null,
  title text not null,
  kind text,
  created_at timestamptz default now()
);

-- Goals
create table goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  pct integer default 0,
  sub text,
  color text default 'amber',
  created_at timestamptz default now()
);

-- Enable Realtime on all tables
alter publication supabase_realtime add table tasks, notes, events, contacts, chat_messages, devices, files, reminders, goals;
```

---

## 8. FREE INFRASTRUCTURE COST ANALYSIS

| Service | Free Tier | Suitable for Build_PRO_MAX_1? |
|---|---|---|
| **Supabase** | 500MB DB, 1GB storage, 50K MAU, 200 realtime conn | ✅ Yes — perfect fit |
| **Vercel** | 100GB bandwidth, 6000 build min/mo | ✅ Yes — for PWA hosting |
| **Cloudflare Pages** | Unlimited bandwidth, 500 builds/mo | ✅ Alternative to Vercel |
| **Redis (Upstash)** | 10K commands/day, 256MB | ⚠️ Nice but not needed; Supabase Realtime replaces most use cases |
| **WebRTC** | Free (browser API, no server cost) | ✅ Yes — P2P file transfer |
| **Google OAuth** | Free (10K requests/day) | ✅ Yes — Gmail integration |

**Key insight:** You do NOT need a dedicated Redis instance. Supabase Realtime's Broadcast + Presence + Postgres Changes covers: cross-device sync, device presence, real-time CRUD, and live notifications — all within the 200-concurrent-connection free tier.

---

## 9. IMPLEMENTATION PLAN (Phased)

### Phase 1: Foundation (2-3 days)
- [ ] Set up Supabase project, get API keys
- [ ] Install `@supabase/supabase-js`
- [ ] Create all tables via Supabase SQL editor
- [ ] Enable RLS policies on all tables
- [ ] Replace `auth.js` with Supabase Auth (email/password)
- [ ] Create Supabase client service (`src/services/supabase.js`)
- [ ] Set up PWA manifest + service worker
- [ ] Add TypeScript support (`tsconfig.json`, rename `.jsx` → `.tsx`)

### Phase 2: Data Migration (2-3 days)
- [ ] Replace all `localStorage` reads with Supabase queries
- [ ] Wire AppContext actions to Supabase CRUD
- [ ] Add loading states to all screens for async data
- [ ] Add error boundaries with fallback UI
- [ ] Enable Supabase Realtime on all tables
- [ ] Implement cross-device sync via Realtime subscriptions
- [ ] Add empty states to all lists

### Phase 3: Real Features (3-4 days)
- [ ] **WebRTC file transfer:** `RTCPeerConnection` + `RTCDataChannel` for P2P
- [ ] **Device registration:** Realtime Presence for device list
- [ ] **Gmail guided setup:** Step-by-step wizard for Gmail API keys
- [ ] **Google Calendar OAuth:** Real calendar integration
- [ ] **Contact warmth decay:** Run decay interval in AppContext
- [ ] **Recurring tasks/events:** Add `recurrence` field + expansion logic
- [ ] **Goal editing UI:** Inline progress editing, creation, deletion
- [ ] **AI behavior wiring:** Connect toggles to actual AI prompt system
- [ ] **CmdK search:** Real data search + AI generation

### Phase 4: Polish & Verify (2-3 days)
- [ ] Dark mode support
- [ ] Responsive layout (tablet, phone)
- [ ] Keyboard navigation for all drag interactions
- [ ] Export/import data UI
- [ ] Notifications (push via service worker + Supabase Realtime)
- [ ] Undo/redo system
- [ ] Full test suite (Vitest + React Testing Library)
- [ ] Production build optimization

---

## 10. RISKS & MITIGATIONS

| Risk | Mitigation |
|---|---|
| Supabase free tier pauses after 1 week inactivity | Set up a cron job (GitHub Actions) to ping the DB daily, or upgrade to $25/mo Pro |
| WebRTC doesn't work on all networks (NAT, firewall) | Fall back to Supabase Storage + signed URLs when P2P fails |
| localStorage → Supabase migration could lose data | Build import/export UI first, test migration path |
| User confusion with OAuth flows | Provide clear guided setup wizards, not raw API key fields |
| Real-time sync conflicts with offline edits | Use version counters + last-write-wins, document behavior |

---

## 11. SUMMARY OF GAPS FOUND

**Total gaps identified: 52**
- **Infrastructure:** 7 (database, sync, auth, storage, PWA, offline, chat persistence)
- **Non-working features:** 15 (connected accounts, device sync, AI toggles, file transfer, etc.)
- **Missing business logic:** 18 (goal mgmt, recurring tasks, export, undo, etc.)
- **UI/UX:** 12 (loading states, empty states, error boundaries, dark mode, etc.)

**Lines of code that are "fake":** ~400 lines (mock data in data.js, simulated progress in Files.jsx, hardcoded AI in CmdK.jsx, placeholder toggles in Settings.jsx)

**Code that exists but is unused:** `src/store/db.js` (entire file — IndexedDB setup with 11 object stores, never imported)
