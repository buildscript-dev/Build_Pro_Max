import { openDB } from 'idb';

const DB_NAME = 'build_pro_max_1';
const DB_VERSION = 1;

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('notes')) {
          db.createObjectStore('notes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('events')) {
          db.createObjectStore('events', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('contacts')) {
          db.createObjectStore('contacts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chatMessages')) {
          db.createObjectStore('chatMessages', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('notifications')) {
          db.createObjectStore('notifications', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('reminders')) {
          db.createObjectStore('reminders', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('goals')) {
          db.createObjectStore('goals', { keyPath: 'name' });
        }
        if (!db.objectStoreNames.contains('schedule')) {
          db.createObjectStore('schedule', { keyPath: 'index', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

const STORE_KEYS = ['notes', 'tasks', 'events', 'contacts', 'chatMessages', 'notifications', 'files', 'reminders', 'goals', 'schedule'];

export async function getAll(storeName) {
  const db = await getDb();
  return db.getAll(storeName);
}

export async function get(storeName, id) {
  const db = await getDb();
  return db.get(storeName, id);
}

export async function put(storeName, value) {
  const db = await getDb();
  return db.put(storeName, value);
}

export async function del(storeName, id) {
  const db = await getDb();
  return db.delete(storeName, id);
}

export async function clear(storeName) {
  const db = await getDb();
  return db.clear(storeName);
}

export async function exportAllData() {
  const db = await getDb();
  const data = {};
  for (const key of STORE_KEYS) {
    data[key] = await db.getAll(key);
  }
  data.settings = await db.getAll('settings');
  data.exportedAt = new Date().toISOString();
  data.version = DB_VERSION;
  return data;
}

export async function importAllData(data) {
  const db = await getDb();
  for (const key of STORE_KEYS) {
    if (Array.isArray(data[key])) {
      await clear(key);
      const tx = db.transaction(key, 'readwrite');
      for (const item of data[key]) {
        tx.store.put(item);
      }
      await tx.done;
    }
  }
  if (Array.isArray(data.settings)) {
    await clear('settings');
    const tx = db.transaction('settings', 'readwrite');
    for (const item of data.settings) {
      tx.store.put(item);
    }
    await tx.done;
  }
}

export async function getSetting(key) {
  const db = await getDb();
  const result = await db.get('settings', key);
  return result ? result.value : null;
}

export async function setSetting(key, value) {
  const db = await getDb();
  return db.put('settings', { key, value });
}

export { STORE_KEYS, DB_NAME, DB_VERSION };
