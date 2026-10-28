import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync,renameSync,unlinkSync} from 'node:fs';
import path from 'node:path';
const ttl=24*3600000;
function file(owner,id){const dir=path.join(process.env.CACHE_DIR||'/tmp/vocab_cache','chat-jobs',createHash('sha256').update(owner).digest('hex'));mkdirSync(dir,{recursive:true});return path.join(dir,id+'.json');}
export function readJob(owner,id){try{const job=JSON.parse(readFileSync(file(owner,id),'utf8'));if(Date.now()-job.created>ttl){unlinkSync(file(owner,id));return null;}if(job.status==='running'&&Date.now()-job.created>120000)return {...job,status:'failed',error:'Tác vụ bị gián đoạn hoặc quá hạn. Gửi lại câu hỏi để thử mới.'};return job;}catch(e){if(e.code==='ENOENT')return null;throw e;}}
export function createJob(owner,id,digest){const job={jobId:id,digest,status:'running',created:Date.now()};try{writeFileSync(file(owner,id),JSON.stringify(job),{flag:'wx',mode:0o600});return {job,fresh:true};}catch(e){if(e.code!=='EEXIST')throw e;return {job:readJob(owner,id),fresh:false};}}
export function writeJob(owner,job){const dest=file(owner,job.jobId),temp=dest+'.'+crypto.randomUUID()+'.tmp';writeFileSync(temp,JSON.stringify(job),{mode:0o600});renameSync(temp,dest);}
