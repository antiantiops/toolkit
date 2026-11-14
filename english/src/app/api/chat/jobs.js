import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync,renameSync,unlinkSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {normalizeTargetLang} from '../../../lib/lookup/languages.mjs';
const ttl=7*24*3600000;
function file(owner,id){const dir=path.join(process.env.CACHE_DIR||'/tmp/vocab_cache','chat-jobs',createHash('sha256').update(owner).digest('hex'));mkdirSync(dir,{recursive:true});return path.join(dir,id+'.json');}
export function readJob(owner,id){try{const job=JSON.parse(readFileSync(file(owner,id),'utf8'));if(Date.now()-job.created>ttl){unlinkSync(file(owner,id));return null;}if(job.status==='running'&&Date.now()-job.created>120000)return {...job,status:'failed',error:'Tác vụ bị gián đoạn hoặc quá hạn. Gửi lại câu hỏi để thử mới.'};return job;}catch(e){if(e.code==='ENOENT')return null;throw e;}}
export function createJob(owner,id,digest){const job={jobId:id,digest,status:'running',created:Date.now()};try{writeFileSync(file(owner,id),JSON.stringify(job),{flag:'wx',mode:0o600});return {job,fresh:true};}catch(e){if(e.code!=='EEXIST')throw e;return {job:readJob(owner,id),fresh:false};}}
export function writeJob(owner,job){const dest=file(owner,job.jobId),temp=dest+'.'+crypto.randomUUID()+'.tmp';writeFileSync(temp,JSON.stringify(job),{mode:0o600});renameSync(temp,dest);}

export function history(owner,targetLang='vi'){const locale=normalizeTargetLang(targetLang);if(!locale)throw new Error('Invalid targetLang');const dir=path.dirname(file(owner,'history'));const jobs=[];for(const name of readdirSync(dir)){if(!/^[a-f0-9-]{36}\.json$/.test(name))continue;const job=readJob(owner,name.slice(0,-5));if(job?.status==='completed'&&(job.targetLang||'vi')===locale&&typeof job.question==='string'&&typeof job.answer==='string')jobs.push(job);}return jobs.sort((a,b)=>a.created-b.created).flatMap(j=>[{id:j.jobId+'-user',role:'user',content:j.question,created:j.created},{id:j.jobId+'-assistant',role:'assistant',content:j.answer,created:j.created}]);}
