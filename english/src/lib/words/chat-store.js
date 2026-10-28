import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {listWords} from './store';
import {weekStart} from './week.js';
let db;
function database(){if(db)return db;const path=process.env.WORDS_DB_PATH||'/app/data/words.sqlite';mkdirSync(dirname(path),{recursive:true});db=new DatabaseSync(path);db.exec(`PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS chat_word_preferences(owner TEXT PRIMARY KEY,enabled INTEGER NOT NULL DEFAULT 1); CREATE TABLE IF NOT EXISTS chat_word_jobs(owner TEXT NOT NULL,id TEXT NOT NULL,status TEXT NOT NULL,items TEXT NOT NULL DEFAULT '[]',created INTEGER NOT NULL,PRIMARY KEY(owner,id)); CREATE TABLE IF NOT EXISTS chat_word_context(owner TEXT NOT NULL,english TEXT NOT NULL,meaning TEXT NOT NULL,example TEXT NOT NULL,kind TEXT NOT NULL,job TEXT NOT NULL,PRIMARY KEY(owner,english));`);return db;}
export function enabled(owner){return database().prepare('SELECT enabled FROM chat_word_preferences WHERE owner=?').get(owner)?.enabled!==0;}
export function setEnabled(owner,value){database().prepare('INSERT INTO chat_word_preferences VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET enabled=excluded.enabled').run(owner,value?1:0);}
export function claim(owner,id){return database().prepare("INSERT INTO chat_word_jobs(owner,id,status,created) VALUES(?,?,'pending',?) ON CONFLICT(owner,id) DO UPDATE SET status='pending',created=excluded.created WHERE chat_word_jobs.status='failed' OR (chat_word_jobs.status='pending' AND chat_word_jobs.created<excluded.created-120000)").run(owner,id,Date.now()).changes===1;}
export function job(owner,id){return database().prepare('SELECT status,items FROM chat_word_jobs WHERE owner=? AND id=?').get(owner,id);}
export function finish(owner,id,candidates){listWords(owner);const d=database(),items=[];d.exec('BEGIN IMMEDIATE');try{
 if(job(owner,id)?.status!=='pending'){d.exec('COMMIT');return;}
 if(enabled(owner))for(const c of candidates){const english=c.english.toLowerCase().trim().replace(/\s+/g,' ');const exists=d.prepare('SELECT id FROM words WHERE owner=? AND english=?').get(owner,english);const now=Date.now();
 const row=d.prepare('INSERT INTO words(owner,english,updated,searches) VALUES(?,?,?,1) ON CONFLICT(owner,english) DO UPDATE SET updated=excluded.updated,searches=words.searches+1 RETURNING id').get(owner,english,now);
 d.prepare('INSERT INTO word_weeks(owner,week,word_id,searches,position) VALUES(?,?,?,1,(SELECT MIN(COALESCE(position,-word_id))-1 FROM word_weeks WHERE owner=? AND week=?)) ON CONFLICT(owner,week,word_id) DO UPDATE SET searches=word_weeks.searches+1').run(owner,weekStart(),row.id,owner,weekStart());
 if(!exists){d.prepare('INSERT OR REPLACE INTO chat_word_context VALUES(?,?,?,?,?,?)').run(owner,english,c.meaning,c.example,c.kind,id);items.push({english,meaning:c.meaning});}}
 d.prepare("UPDATE chat_word_jobs SET status='done',items=? WHERE owner=? AND id=?").run(JSON.stringify(items),owner,id);d.exec('COMMIT');
 }catch(e){d.exec('ROLLBACK');throw e;}
}
export function fail(owner,id){database().prepare("UPDATE chat_word_jobs SET status='failed' WHERE owner=? AND id=?").run(owner,id);}
export function undo(owner,id){const d=database();d.exec('BEGIN IMMEDIATE');try{const rows=d.prepare('SELECT english FROM chat_word_context WHERE owner=? AND job=?').all(owner,id);for(const r of rows){const w=d.prepare('SELECT id,searches FROM words WHERE owner=? AND english=?').get(owner,r.english);if(w?.searches===1){d.prepare('DELETE FROM word_weeks WHERE owner=? AND word_id=?').run(owner,w.id);d.prepare('DELETE FROM words WHERE owner=? AND id=?').run(owner,w.id);}d.prepare('DELETE FROM chat_word_context WHERE owner=? AND english=? AND job=?').run(owner,r.english,id);}d.prepare("UPDATE chat_word_jobs SET status='undone' WHERE owner=? AND id=?").run(owner,id);d.exec('COMMIT');}catch(e){d.exec('ROLLBACK');throw e;}}

export function contexts(owner,rows){const q=database().prepare('SELECT meaning,example,kind FROM chat_word_context WHERE owner=? AND english=?');return rows.map(r=>{const context=q.get(owner,r.english);return context?{...r,chat:context}:r;});}
