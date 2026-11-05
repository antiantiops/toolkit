import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
export const HISTORY_TTL=7*86400000;
const dir=()=>path.join(process.env.CACHE_DIR||path.join(os.tmpdir(),'vocab_cache'),'listening-history');
function file(owner){if(!/^account_[a-f0-9]{64}$/.test(owner))throw Error('Invalid owner');fs.mkdirSync(dir(),{recursive:true});return path.join(dir(),owner+'.json');}
export function history(owner){const f=file(owner);if(!fs.existsSync(f))return [];const rows=JSON.parse(fs.readFileSync(f,'utf8'));return rows.filter(x=>Date.now()-x.createdAt<HISTORY_TTL);}
export function archiveListening(owner,lesson){
 if(!lesson?.sentences?.length&&!lesson?.result?.segments?.length)return;
 const rows=history(owner),key=createHash('sha256').update(JSON.stringify(lesson)).digest('hex');
 if(rows.some(x=>x.key===key||x.previousKeys?.includes(key)))return;
 const row={id:randomUUID(),key,createdAt:Date.now(),source:lesson.source==='text'?'text':lesson.audio?'audio':'image',title:lesson.audio?.name||lesson.title||lesson.sentences?.[0]?.en?.slice(0,100)||'Bài nghe từ ảnh',lesson};
 const f=file(owner),tmp=f+'.'+randomUUID()+'.tmp';try{fs.writeFileSync(tmp,JSON.stringify([row,...rows]),{mode:0o600});fs.renameSync(tmp,f);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
}
export function renameListening(owner,id,title){
 const rows=history(owner),row=rows.find(x=>x.id===id);if(!row)return null;
 row.previousKeys=[...new Set([...(row.previousKeys||[]),row.key])];
 row.title=title;row.lesson={...row.lesson,title};
 row.key=createHash('sha256').update(JSON.stringify(row.lesson)).digest('hex');
 const f=file(owner),tmp=f+'.'+randomUUID()+'.tmp';try{fs.writeFileSync(tmp,JSON.stringify(rows),{mode:0o600});fs.renameSync(tmp,f);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}return row;
}
