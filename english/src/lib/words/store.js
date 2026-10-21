import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { weekStart } from './week.js';
let db;
function database() {
  if (db) return db;
  const path = process.env.WORDS_DB_PATH || '/app/data/words.sqlite';
  mkdirSync(dirname(path), { recursive: true });
  db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;
    CREATE TABLE IF NOT EXISTS words (id INTEGER PRIMARY KEY, owner TEXT NOT NULL, english TEXT NOT NULL, updated INTEGER NOT NULL, UNIQUE(owner,english));
    CREATE INDEX IF NOT EXISTS words_recent ON words(owner,updated DESC,id DESC);`);
  const columns = db.prepare('PRAGMA table_info(words)').all();
  if (!columns.some(c => c.name === 'searches')) db.exec('ALTER TABLE words ADD COLUMN searches INTEGER NOT NULL DEFAULT 1');
  if (!columns.some(c => c.name === 'needs_review')) db.exec('ALTER TABLE words ADD COLUMN needs_review INTEGER NOT NULL DEFAULT 0');
  db.exec(`CREATE TABLE IF NOT EXISTS word_weeks (owner TEXT NOT NULL, week TEXT NOT NULL, word_id INTEGER NOT NULL, searches INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(owner,week,word_id));`);
  if (!db.prepare('PRAGMA table_info(word_weeks)').all().some(c=>c.name==='position')) db.exec('ALTER TABLE word_weeks ADD COLUMN position INTEGER');
  for (const row of db.prepare('SELECT id,owner,updated FROM words WHERE id NOT IN (SELECT word_id FROM word_weeks)').all()) db.prepare('INSERT OR IGNORE INTO word_weeks(owner,week,word_id,searches) VALUES(?,?,?,1)').run(row.owner,weekStart(row.updated),row.id);
  return db;
}
export function saveWord(owner, text) {
  const english = text.trim().replace(/\s+/g,' ').toLowerCase();
  if (!owner || english.length > 500 || !/[a-z]/i.test(english)) throw new Error('Invalid English text');
  const db = database();
  db.exec('BEGIN IMMEDIATE');
  try {
    const row = db.prepare('INSERT INTO words(owner,english,updated,searches) VALUES(?,?,?,1) ON CONFLICT(owner,english) DO UPDATE SET updated=excluded.updated, searches=words.searches+1 RETURNING id').get(owner,english,Date.now());
    db.prepare('INSERT INTO word_weeks(owner,week,word_id,searches,position) VALUES(?,?,?,1,(SELECT MIN(COALESCE(position,-word_id))-1 FROM word_weeks WHERE owner=? AND week=?)) ON CONFLICT(owner,week,word_id) DO UPDATE SET searches=word_weeks.searches+1').run(owner,weekStart(),row.id,owner,weekStart());
    db.exec('COMMIT');
  } catch(e) { db.exec('ROLLBACK'); throw e; }
}
export function listWords(owner, before = Number.MAX_SAFE_INTEGER, week = null) {
  if (!week) return database().prepare('SELECT id,english,searches,needs_review AS needsReview FROM words WHERE owner=? AND id<? ORDER BY id DESC LIMIT 51').all(owner,before);
  return database().prepare('SELECT w.id,w.english,w.searches,w.needs_review AS needsReview,ww.searches AS weekSearches FROM word_weeks ww JOIN words w ON w.id=ww.word_id WHERE ww.owner=? AND w.owner=? AND ww.week=? ORDER BY COALESCE(ww.position,-w.id),w.id DESC LIMIT 51 OFFSET ?').all(owner,owner,week,before===Number.MAX_SAFE_INTEGER?0:before);
}
export function listWeeks(owner) {
  return database().prepare('SELECT week,COUNT(*) AS count,SUM(searches) AS searches FROM word_weeks WHERE owner=? GROUP BY week ORDER BY week DESC').all(owner);
}

export function moveWord(owner,week,id,beforeId,edge) {
 const db=database();db.exec('BEGIN IMMEDIATE');
 try {
  const ids=db.prepare('SELECT ww.word_id AS id FROM word_weeks ww JOIN words w ON w.id=ww.word_id WHERE ww.owner=? AND w.owner=? AND ww.week=? ORDER BY COALESCE(ww.position,-w.id),w.id DESC').all(owner,owner,week).map(r=>r.id);
  if(!ids.includes(id)||(!edge&&(!ids.includes(beforeId)||id===beforeId)))throw new Error('Invalid move');
  ids.splice(ids.indexOf(id),1);ids.splice(edge==='top'?0:edge==='bottom'?ids.length:ids.indexOf(beforeId),0,id);
  const update=db.prepare('UPDATE word_weeks SET position=? WHERE owner=? AND week=? AND word_id=?');
  ids.forEach((wordId,i)=>update.run(i,owner,week,wordId));db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
}

export function tagWord(owner,id,needsReview) {
 const result=database().prepare('UPDATE words SET needs_review=? WHERE owner=? AND id=?').run(needsReview?1:0,owner,id);
 if(result.changes!==1)throw new Error('Word not found');
}
