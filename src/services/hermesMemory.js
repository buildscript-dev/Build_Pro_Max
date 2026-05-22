// Hermes Memory Service — dual storage: Obsidian (local) + localStorage (fast) + Supabase (cloud)

const ENV_OBSIDIAN_URL  = import.meta.env.VITE_OBSIDIAN_URL        || 'http://127.0.0.1:27124';
const ENV_OBSIDIAN_KEY  = import.meta.env.VITE_OBSIDIAN_API_KEY    || '';
const ENV_VAULT_FOLDER  = import.meta.env.VITE_OBSIDIAN_VAULT_PATH || 'Hermes';

// Seed localStorage with env defaults on first run
if (ENV_OBSIDIAN_KEY && !localStorage.getItem('obsidian_api_key')) {
  localStorage.setItem('obsidian_api_key',   ENV_OBSIDIAN_KEY);
  localStorage.setItem('obsidian_url',        ENV_OBSIDIAN_URL);
  localStorage.setItem('obsidian_vault_path', ENV_VAULT_FOLDER);
}

const getObsidianKey  = () => localStorage.getItem('obsidian_api_key') || ENV_OBSIDIAN_KEY;
const getVaultFolder  = () => localStorage.getItem('obsidian_vault_path') || ENV_VAULT_FOLDER;

// Route localhost Obsidian through Vite proxy to avoid browser CORS blocks
const getObsidianUrl = () => {
  const stored = localStorage.getItem('obsidian_url');
  const resolved = stored || ENV_OBSIDIAN_URL;
  const isLocal = resolved.includes('localhost') || resolved.includes('127.0.0.1');
  return isLocal ? '/api/obsidian' : resolved;
};

// ─── Local (localStorage) ─────────────────────────────────────────────────────

export function getMemoryProfile() {
  try { return localStorage.getItem('hermes_memory_profile') || DEFAULT_PROFILE; } catch { return DEFAULT_PROFILE; }
}

export function setMemoryProfile(content) {
  try { localStorage.setItem('hermes_memory_profile', content); } catch {}
  syncToObsidian('UserProfile.md', content).catch(() => {});
}

export function appendToMemoryProfile(text) {
  const current = getMemoryProfile();
  const stamp   = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const block   = `\n\n---\n**${stamp}** — ${text}`;
  setMemoryProfile(current + block);
}

// ─── Obsidian Local REST API ──────────────────────────────────────────────────

export async function checkObsidianStatus() {
  try {
    const key = getObsidianKey();
    const res = await fetch(`${getObsidianUrl()}/`, {
      headers: key ? { 'Authorization': `Bearer ${key}` } : {},
      signal: AbortSignal.timeout(1800),
    });
    return { online: res.ok || res.status === 401 };
  } catch {
    return { online: false };
  }
}

export async function syncToObsidian(filename, content) {
  const key = getObsidianKey();
  const url = `${getObsidianUrl()}/vault/${getVaultFolder()}/${filename}`;
  try {
    await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/markdown',
        ...(key ? { 'Authorization': `Bearer ${key}` } : {}),
      },
      body: content,
      signal: AbortSignal.timeout(3000),
    });
  } catch {}
}

export async function readFromObsidian(filename) {
  const key = getObsidianKey();
  const url = `${getObsidianUrl()}/vault/${getVaultFolder()}/${filename}`;
  try {
    const res = await fetch(url, {
      headers: key ? { 'Authorization': `Bearer ${key}` } : {},
      signal: AbortSignal.timeout(3000),
    });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

// Pull UserProfile.md from Obsidian into localStorage
export async function syncFromObsidian() {
  const profile = await readFromObsidian('UserProfile.md');
  if (profile) {
    try { localStorage.setItem('hermes_memory_profile', profile); } catch {}
    return profile;
  }
  return null;
}

// ─── Default profile template ─────────────────────────────────────────────────

const DEFAULT_PROFILE = `# Hermes User Profile

## About Me
<!-- Who you are, your role, what you're working on -->

## Goals
<!-- Current goals and priorities -->

## Preferences
<!-- How I like to work, communication style, etc. -->

## Context
<!-- Projects, teams, current focus areas -->

## Things Hermes Should Always Know
<!-- Key facts, recurring context, important details -->
`;
