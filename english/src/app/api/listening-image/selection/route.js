import { NextResponse } from 'next/server';
import { cacheOwner } from '../../session/owner';
import { loadSession, saveSession } from '../../session/storage';
import { selectListeningSections } from '../../../../lib/listening/sections';
export async function POST(request) {
 const owner=cacheOwner(request);
 if(!owner)return NextResponse.json({error:'Cần đăng nhập qua Kong'},{status:401});
 const origin=request.headers.get('origin');
 if(origin&&origin!=='https://english.nimtechnology.com')return NextResponse.json({error:'Invalid origin'},{status:403});
 if(Number(request.headers.get('content-length'))>2048)return NextResponse.json({error:'Input too large'},{status:413});
 try{
  const current=loadSession(owner)?.listening;
  if(!current?.sections)return NextResponse.json({error:'Ảnh hết hạn. Phân tích lại ảnh.'},{status:409});
  const {selected}=await request.json();
  const lesson=selectListeningSections(current.sections,selected);
  const listening={...lesson,sections:current.sections,selected};
  saveSession(owner,{listening});
  return NextResponse.json({listening},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Chọn đoạn hợp lệ, tối đa 30 câu và 6000 ký tự. Nếu dài hơn, tạo từng đoạn.'},{status:400});}
}
