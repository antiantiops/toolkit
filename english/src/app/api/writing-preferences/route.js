import { NextResponse } from 'next/server';
import { cacheOwner } from '../session/owner';
import { readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { DEFAULT_WRITING_PROMPT, writingPreferences } from '../../../lib/writing-prompt.mjs';
const headers = { 'Cache-Control': 'private, no-store' };
function file(owner) { return path.join(process.env.CACHE_DIR || path.join(os.tmpdir(), 'vocab_cache'), 'writing-preferences', owner + '.json'); }
export async function GET(request) {
 const owner=cacheOwner(request);
 if(!owner)return NextResponse.json({error:'Cần đăng nhập qua Kong'},{status:401,headers});
 try { return NextResponse.json(JSON.parse(readFileSync(file(owner),'utf8')), {headers}); }
 catch(e){if(e.code==='ENOENT')return NextResponse.json({customPrompt:DEFAULT_WRITING_PROMPT},{headers});return NextResponse.json({error:'Không đọc được prompt đã lưu'},{status:500,headers});}
}
export async function PUT(request) {
 const owner=cacheOwner(request);
 if(!owner)return NextResponse.json({error:'Cần đăng nhập qua Kong'},{status:401,headers});
 let customPrompt;
 try { ({customPrompt}=await request.json()); if(typeof customPrompt!=='string')throw new Error('Prompt không hợp lệ'); writingPreferences(customPrompt); }
 catch(e){return NextResponse.json({error:e.message},{status:400,headers});}
 try {
  const target=file(owner);mkdirSync(path.dirname(target),{recursive:true});
  const temp=target+'.'+randomUUID()+'.tmp';writeFileSync(temp,JSON.stringify({customPrompt}),'utf8');renameSync(temp,target);
  return NextResponse.json({customPrompt},{headers});
 }catch{return NextResponse.json({error:'Không lưu được prompt. Thử lại.'},{status:500,headers});}
}
