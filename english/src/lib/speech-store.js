import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
let db;
function store(){if(!db){const file=process.env.WORDS_DB_PATH||'/app/data/words.sqlite';mkdirSync(path.dirname(file),{recursive:true});db=new DatabaseSync(file);db.exec('PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS speech_segments(owner TEXT NOT NULL, hash TEXT NOT NULL, data TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY(owner,hash));');}return db;}
const hash=text=>createHash('sha256').update('v1|'+text).digest('hex');
export function getSpeech(owner,text){const row=store().prepare('SELECT data FROM speech_segments WHERE owner=? AND hash=? AND updated>?').get(owner,hash(text),Date.now()-30*86400000);return row?JSON.parse(row.data):null;}
export function saveSpeech(owner,text,segments){const d=store();d.prepare('DELETE FROM speech_segments WHERE updated<?').run(Date.now()-30*86400000);d.prepare('INSERT OR REPLACE INTO speech_segments VALUES(?,?,?,?)').run(owner,hash(text),JSON.stringify(segments),Date.now());d.prepare('DELETE FROM speech_segments WHERE owner=? AND hash NOT IN (SELECT hash FROM speech_segments WHERE owner=? ORDER BY updated DESC LIMIT 2000)').run(owner,owner);}
