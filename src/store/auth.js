import bcrypt from 'bcryptjs';
import { getSetting, setSetting } from './db';

const AUTH_KEY = 'auth_users';
const SESSION_KEY = 'auth_session';
const SALT_ROUNDS = 10;

function getUsers() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveUsers(users) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(users));
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    email: user.email,
    name: user.name,
    loggedInAt: Date.now(),
  }));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function signup(email, password, name) {
  const users = getUsers();
  if (users.find(u => u.email === email.toLowerCase())) {
    return { ok: false, error: 'Email already registered' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters' };
  }
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = {
    email: email.toLowerCase(),
    name: name || email.split('@')[0],
    password: hash,
    createdAt: Date.now(),
    avatar: (name || email.split('@')[0]).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  };
  users.push(user);
  saveUsers(users);
  saveSession(user);
  return { ok: true, user: { email: user.email, name: user.name, timezone: user.timezone, avatar: user.avatar } };
}

export async function login(email, password) {
  const users = getUsers();
  const user = users.find(u => u.email === email.toLowerCase());
  if (!user) {
    return { ok: false, error: 'No account found with this email' };
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return { ok: false, error: 'Incorrect password' };
  }
  saveSession(user);
  return { ok: true, user: { email: user.email, name: user.name, timezone: user.timezone, avatar: user.avatar } };
}

export async function deleteAccount(email) {
  let users = getUsers();
  users = users.filter(u => u.email !== email.toLowerCase());
  saveUsers(users);
  clearSession();
}

export function isLoggedIn() {
  return !!getSession();
}

export function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  return session;
}
