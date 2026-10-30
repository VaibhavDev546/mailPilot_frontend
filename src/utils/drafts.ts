import * as SQLite from 'expo-sqlite';

// Local drafts only (e.g. an unfinished campaign). Server-managed records are never stored here.
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('mailpilot.db').then(async (d) => {
      await d.execAsync('CREATE TABLE IF NOT EXISTS drafts (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL);');
      return d;
    });
  }
  return dbPromise;
}

export async function saveDraft(key: string, value: unknown) {
  const d = await db();
  await d.runAsync('INSERT OR REPLACE INTO drafts (key, value, updated_at) VALUES (?, ?, ?)', [key, JSON.stringify(value), new Date().toISOString()]);
}

export async function loadDraft<T>(key: string): Promise<T | null> {
  const d = await db();
  const r = await d.getFirstAsync<{ value: string }>('SELECT value FROM drafts WHERE key = ?', [key]);
  return r ? (JSON.parse(r.value) as T) : null;
}

export async function clearDraft(key: string) {
  const d = await db();
  await d.runAsync('DELETE FROM drafts WHERE key = ?', [key]);
}
