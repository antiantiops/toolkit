import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
let db;
export const LOOKUP_TTL = 7 * 24 * 60 * 60 * 1000;
function database() {
  if (db) return db;
  const path = process.env.LOOKUP_DB_PATH || '/data/lookup.sqlite';
  mkdirSync(dirname(path), { recursive: true });
  db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;
    CREATE TABLE IF NOT EXISTS lookup_cache(owner TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, expires INTEGER NOT NULL, PRIMARY KEY(owner,key));
    CREATE INDEX IF NOT EXISTS lookup_expiry ON lookup_cache(expires);`);
  return db;
}
export function lookupKey(word, context) {
  return JSON.stringify(['word-v1', word.trim().toLowerCase(), context]);
}
export function cachedLookup(owner, key, now = Date.now()) {
  if (!owner) return null;
  const row = database().prepare('SELECT value FROM lookup_cache WHERE owner=? AND key=? AND expires>?').get(owner,key,now);
  return row ? JSON.parse(row.value) : null;
}
export function cacheLookup(owner, key, value, now = Date.now()) {
  if (!owner) return;
  const db = database();
  db.prepare('DELETE FROM lookup_cache WHERE expires<=?').run(now);
  db.prepare('INSERT INTO lookup_cache(owner,key,value,expires) VALUES(?,?,?,?) ON CONFLICT(owner,key) DO UPDATE SET value=excluded.value,expires=excluded.expires').run(owner,key,JSON.stringify(value),now+LOOKUP_TTL);
}

// Reuse the newest available context for saved-word practice; never infer missing data.
export function cachedGameWords(owner, words, now = Date.now()) {
  if (!owner || !words.length) return [];
  const result = [];
  const query = database().prepare(`SELECT value FROM lookup_cache
    WHERE owner=? AND expires>? AND json_extract(key,'$[0]')='word-v1'
    AND json_extract(key,'$[1]')=? ORDER BY expires DESC`);
  for (const row of words) {
    for (const entry of query.all(owner, now, row.english.trim().toLowerCase())) {
      let word;
      try { word = JSON.parse(entry.value); } catch { continue; }
      if (!word || typeof word.meaning !== 'string' || !word.meaning.trim()) continue;
      const example = word.contrastExamples?.find?.(e => e.word?.toLowerCase() === row.english.toLowerCase());
      result.push({...word, word:row.english, example:example?.english || word.example || '', exampleVietnamese:example?.vietnamese || word.exampleVietnamese || '', note:word.usage || word.note || ''});
      break;
    }
  }
  return result;
}
