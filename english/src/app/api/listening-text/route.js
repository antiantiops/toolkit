import {NextResponse} from 'next/server';
import {cacheOwner} from '../session/owner';
import {saveSession} from '../session/storage';
const headers={'Cache-Control':'private, no-store'};
const words=text=>text.trim()?text.trim().split(/\s+/u).length:0;
export async function POST(request){
 const owner=cacheOwner(request);if(!owner)return NextResponse.json({error:'Cần đăng nhập qua Kong'},{status:401,headers});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin&&origin!=='https://english.nimtechnology.com')return NextResponse.json({error:'Invalid origin'},{status:403,headers});
 try{
  const raw=await request.text();if(raw.length>60000)return NextResponse.json({error:'Văn bản quá dài'},{status:413,headers});
  const lesson=JSON.parse(raw),sentences=lesson?.sentences;
  if(lesson?.title!=='Bài nghe từ văn bản'||!Array.isArray(sentences)||!sentences.length||words(sentences.map(s=>s?.en||'').join(' '))>5000||sentences.some(s=>typeof s?.en!=='string'||!s.en.trim()||s.en.length>600||typeof s?.vi!=='string'||s.vi.length>1000))return NextResponse.json({error:'Bài nghe không hợp lệ'},{status:400,headers});
  saveSession(owner,{listening:{...lesson,source:'text'}});return NextResponse.json({ok:true},{headers});
 }catch{return NextResponse.json({error:'Không lưu được bài nghe từ văn bản'},{status:500,headers});}
}
