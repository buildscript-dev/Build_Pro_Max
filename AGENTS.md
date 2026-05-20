# Build_PRO_MAX_1 — Agent Instructions

## Project Overview
React 18 + Vite productivity app ("Paper × Liquid Glass" design).
Supabase backend for auth, database, storage, and real-time sync.

## Supabase Setup (CRITICAL)
- **Client:** `src/services/supabaseClient.js`
- **Auth:** `src/services/supabaseAuth.js` → re-exported via `src/store/auth.js`
- **Database:** `src/services/supabaseDb.js` (CRUD + file storage)
- **Credentials:** `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **Project ref:** `qnagdhnjxrttuitqnvwt`

## Auth Rules (NEVER break these)
- **NEVER** use localStorage for auth sessions or user storage
- **NEVER** use bcryptjs — Supabase handles password hashing
- **ALWAYS** use `src/store/auth.js` exports: `login`, `signup`, `logout`, `resetPassword`, `loginWithGoogle`, `onAuthStateChange`, `getCurrentUser`
- Session is managed by Supabase auth (auto-refresh tokens, persisted in localStorage by Supabase client)
- Google OAuth redirect handled by Supabase — just call `loginWithGoogle()` and redirect to `result.url`
- Forgot password uses `resetPassword(email)` → sends Supabase magic link

## Database Rules
- All tables have `user_id UUID REFERENCES auth.users(id)` + RLS policies
- **NEVER** query Supabase without the user being authenticated
- Use `src/services/supabaseDb.js` helpers: `syncToSupabase()`, `deleteFromSupabase()`, `fetchFromSupabase()`
- Tables: notes, tasks, events, contacts, chat_messages, notifications, files, reminders, goals, schedule, settings
- File storage: bucket `user-files`, paths organized by `userId/`

## Current Architecture
- State: React Context + useReducer (`src/store/AppContext.jsx`)
- Local cache: IndexedDB via `idb` (`src/store/db.js`) — offline-first, sync to Supabase when online
- Routing: manual screen state in `App.jsx` (no React Router)
- Navigation: Dock (desktop), BottomNav (mobile), TopBar

## Mobile Responsive Rules
- Breakpoint: 767px
- Ambient orbs shrink on mobile (250px/200px vs 600px/500px)
- Backdrop-filter blur reduced to 8px on mobile (from 28px)
- Desktop dock hidden on mobile, BottomNav shown
- Dashboard header stacks vertically on mobile
- All grids collapse to single column on mobile

## Performance Rules
- Use `React.memo` on heavy components (cards, list items)
- `content-visibility: auto` on off-screen elements
- Avoid `getBoundingClientRect()` in render loops
- Minimize backdrop-filter usage on mobile
- Debounce localStorage writes (400ms)

## Dependencies
- `@supabase/supabase-js` — auth + database
- `react` 18, `react-dom` 18
- `idb` — IndexedDB offline cache
- `gsap` — animations
- `lenis` — smooth scrolling
- `@splinetool/react-spline` — 3D scenes

## Build
- `npm run dev` — dev server
- `npm run build` — production build
- Vite config: manual chunks for vendor, gsap, supabase, idb

## MCP
- Supabase MCP server configured for project `qnagdhnjxrttuitqnvwt`
- Use MCP for database schema changes, debugging, and Supabase docs
