import {after,NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {currentUser} from '../me/auth';
import {generate} from './generate';
import {readJob,createJob,writeJob,history} from './jobs';
import {normalizeTargetLang} from '../../../lib/lookup/languages.mjs';
export const dynamic='force-dynamic';
const validId=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request){const user=currentUser(request);if(!user)return reply({error:'Phiên đăng nhập hết hạn. Tải lại trang để đăng nhập.'},401);const searchParams=new URL(request.url).searchParams;if(searchParams.get('history')==='1'){const locale=normalizeTargetLang(searchParams.get('targetLang'));if(!locale)return reply({error:'Invalid targetLang'},400);return reply({messages:history(user.id,locale),retentionDays:7});}const id=searchParams.get('jobId');if(!validId(id))return reply({error:'Mã chat không hợp lệ'},400);const job=readJob(user.id,id);if(!job)return reply({error:'Không tìm thấy chat hoặc đã hết hạn. Gửi lại câu hỏi.'},404);const {digest,...publicJob}=job;return reply(publicJob);}
export async function POST(request){const user=currentUser(request);if(!user)return reply({error:'Phiên đăng nhập hết hạn. Tải lại trang để đăng nhập.'},401);const origin=request.headers.get('origin');if(origin&&origin!=='https://english.nimtechnology.com')return reply({error:'Invalid origin'},403);
 try{const text=await request.text();if(text.length>250000)return reply({error:'Nội dung quá dài'},413);const body=JSON.parse(text),{messages,context,requestId}=body;
 const targetLang=normalizeTargetLang(body.targetLang);
 if(!targetLang||!validId(requestId)||!Array.isArray(messages)||!messages.length||messages.length>12||messages.some(m=>!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>(m.role==='assistant'?16000:4000))||!context||typeof context!=='object'||JSON.stringify(context).length>50000)return reply({error:'Nội dung chat không hợp lệ'},400);
 const digest=createHash('sha256').update(JSON.stringify({messages,context,targetLang})).digest('hex');const {job,fresh}=createJob(user.id,requestId,digest);if(!job)return reply({error:'Chat đã hết hạn. Gửi lại câu hỏi.'},410);if(job.digest!==digest)return reply({error:'Mã chat đã được dùng cho câu hỏi khác'},409);
 if(fresh)after(async()=>{const started=Date.now();console.info('[lesson-chat]',requestId,'started');try{const response=await generate(new Request(request.url,{method:'POST',headers:request.headers,body:JSON.stringify({messages,context,targetLang})}));const data=await response.json();writeJob(user.id,{...job,targetLang,status:response.ok?'completed':'failed',question:messages.filter(m=>m.role==='user').at(-1).content,...data});console.info('[lesson-chat]',requestId,response.ok?'completed':'failed','elapsedMs',Date.now()-started);}catch{writeJob(user.id,{...job,targetLang,status:'failed',error:'AI chưa trả lời được. Gửi lại câu hỏi để thử mới.'});console.error('[lesson-chat]',requestId,'failed','elapsedMs',Date.now()-started);}});
 return reply({jobId:requestId,status:job.status},202);
 }catch{return reply({error:'Không khởi tạo được chat. Thử lại với cùng mã tác vụ.'},503);}}
