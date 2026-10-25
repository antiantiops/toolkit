import { NextResponse } from 'next/server';
import { cacheOwner } from '../session/owner';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { FEATURE_NOTICE_IDS } from '../../../lib/feature-notices.mjs';
export async function POST(request) {
 const headers={'Cache-Control':'private, no-store'};
 const owner=cacheOwner(request);
 if(!owner)return NextResponse.json({error:'Cần đăng nhập qua Kong'},{status:401,headers});
 let id;
 try{({id}=await request.json());if(!FEATURE_NOTICE_IDS.includes(id))throw Error();}
 catch{return NextResponse.json({error:'Tính năng không hợp lệ'},{status:400,headers});}
 try {
  const dir=path.join(process.env.CACHE_DIR||path.join(os.tmpdir(),'vocab_cache'),'feature-notices',owner);
  mkdirSync(dir,{recursive:true});
  // Atomic claim: simultaneous tabs/devices can show this notice only once per account.
  try {writeFileSync(path.join(dir,id+'.json'),JSON.stringify({shownAt:Date.now()}),{flag:'wx'});}
  catch(e){if(e.code==='EEXIST')return NextResponse.json({show:false},{headers});throw e;}
  return NextResponse.json({show:true},{headers});
 }catch{return NextResponse.json({error:'Không ghi nhận được thông báo'},{status:500,headers});}
}
