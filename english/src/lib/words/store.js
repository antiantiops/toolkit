import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
let db;
function database() {
  if (db) return db;
  const path = process.env.WORDS_DB_PATH || '/app/data/words.sqlite';
  mkdirSync(dirname(path), { recursive: true });
  db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;
    CREATE TABLE IF NOT EXISTS words (id INTEGER PRIMARY KEY, owner TEXT NOT NULL, english TEXT NOT NULL, updated INTEGER NOT NULL, UNIQUE(owner,english));
    CREATE INDEX IF NOT EXISTS words_recent ON words(owner,updated DESC,id DESC);`);
  return db;
}
export function saveWord(owner, text) {
  const english = text.trim().replace(/\s+/g,' ').toLowerCase();
  if (!owner || english.length > 500 || !/[a-z]/i.test(english)) throw new Error('Invalid English text');
  database().prepare('INSERT INTO words(owner,english,updated) VALUES(?,?,?) ON CONFLICT(owner,english) DO UPDATE SET updated=excluded.updated').run(owner,english,Date.now());
}
export function listWords(owner, before = Number.MAX_SAFE_INTEGER) {
  return database().prepare('SELECT id,english FROM words WHERE owner=? AND id<? ORDER BY id DESC LIMIT 51').all(owner,before);
}
