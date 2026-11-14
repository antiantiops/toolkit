import {history} from '../../session/listening-history';
import { cacheOwner } from '../../session/owner';
import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadSession } from '../../session/storage';
import { normalizeTargetLang, DEFAULT_LANGUAGE } from '../../../../lib/lookup/languages.mjs';
const TTL=7*24*60*60*1000;
export async function GET(request){
 if (!cacheOwner(request)) return NextResponse.json({error:"Cần đăng nhập qua Kong"},{status:401});
 const owner=cacheOwner(request);
 const query=new URL(request.url).searchParams;
 const rawTargetLang=query.get('targetLang');
 const targetLang=normalizeTargetLang(rawTargetLang);
 if(!targetLang)return NextResponse.json({error:'Invalid targetLang'},{status:400});

 const id=query.get('history');
 let audio;
 if(id){
   const entry=history(owner).find(x=>x.id===id);
   if(!entry)return NextResponse.json({error:'File nghe đã hết hạn'},{status:404});
   const entryLang=normalizeTargetLang(entry.lesson?.targetLang||entry.lesson?.result?.targetLang)||DEFAULT_LANGUAGE;
   if(entryLang!==targetLang)return NextResponse.json({error:'File nghe không khớp ngôn ngữ'},{status:404});
   audio=entry.lesson?.audio;
 }else{
   audio=loadSession(owner,targetLang)?.listening?.audio;
 }
 if(!owner||!audio?.id)return NextResponse.json({error:'File nghe đã hết hạn'}, {status:404});
 const dir=process.env.LISTENING_AUDIO_DIR||path.join(process.env.CACHE_DIR||path.join(os.tmpdir(),'vocab_cache'),'listening-audio');
 const found=fs.existsSync(dir)&&fs.readdirSync(dir).find(n=>n.startsWith(`${owner}-${audio.id}.`));const file=found&&path.join(dir,found);
 if(!file||Date.now()-fs.statSync(file).mtimeMs>TTL)return NextResponse.json({error:'File nghe đã hết hạn'}, {status:404});
 const size=fs.statSync(file).size, range=request.headers.get('range');
 const headers={'Content-Type':audio.type,'Accept-Ranges':'bytes','Cache-Control':'private, no-store'};
 if(!range)return new NextResponse(fs.readFileSync(file),{headers:{...headers,'Content-Length':String(size)}});
 const match=/^bytes=(\d*)-(\d*)$/.exec(range);
 if(!match)return new NextResponse(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
 let start=match[1]?Number(match[1]):0, end=match[2]?Number(match[2]):size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||start>=size)return new NextResponse(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
 end=Math.min(end,size-1);const length=end-start+1;
 return new NextResponse(fs.readFileSync(file).subarray(start,end+1),{status:206,headers:{...headers,'Content-Length':String(length),'Content-Range':`bytes ${start}-${end}/${size}`}});
}
