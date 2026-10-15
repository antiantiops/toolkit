import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadSession } from '../../session/storage';
const TTL=24*60*60*1000;
export async function GET(request){
 const owner=request.cookies.get('vocab_sid')?.value, audio=loadSession(owner)?.listening?.audio;
 if(!owner||!audio?.id)return NextResponse.json({error:'File nghe đã hết hạn'}, {status:404});
 const dir=process.env.LISTENING_AUDIO_DIR||path.join(process.env.CACHE_DIR||path.join(os.tmpdir(),'vocab_cache'),'listening-audio');
 const found=fs.existsSync(dir)&&fs.readdirSync(dir).find(n=>n.startsWith(`${owner}-${audio.id}.`));const file=found&&path.join(dir,found);
 if(!file||Date.now()-fs.statSync(file).mtimeMs>TTL)return NextResponse.json({error:'File nghe đã hết hạn'}, {status:404});
 return new NextResponse(fs.readFileSync(file),{headers:{'Content-Type':audio.type,'Content-Length':String(audio.size),'Cache-Control':'private, no-store'}});
}
