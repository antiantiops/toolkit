import {NextResponse} from 'next/server';
import {cacheOwner} from '../session/owner';
import {history,archiveListening,renameListening} from '../session/listening-history';
import {createHash} from 'node:crypto';
import {loadSession,saveSession} from '../session/storage';
export async function GET(request){
 const owner=cacheOwner(request),headers={'Cache-Control':'private, no-store'};
 if(!owner)return NextResponse.json({error:'Cần đăng nhập qua Kong'},{status:401,headers});
 try{archiveListening(owner,loadSession(owner)?.listening);const rows=history(owner),id=new URL(request.url).searchParams.get('id');
 if(id){const row=rows.find(x=>x.id===id);return NextResponse.json(row?{entry:row}:{error:'Bài nghe không còn trong 7 ngày'},{status:row?200:404,headers});}
 return NextResponse.json({entries:rows.map(({lesson,key,previousKeys,...row})=>row)},{headers});
 }catch{return NextResponse.json({error:'Không đọc được lịch sử bài nghe'},{status:500,headers});}
}

export async function PATCH(request){
 const owner=cacheOwner(request),headers={'Cache-Control':'private, no-store'};
 if(!owner)return NextResponse.json({error:'Cần đăng nhập'},{status:401,headers});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin&&origin!=='https://english.nimtechnology.com')return NextResponse.json({error:'Invalid origin'},{status:403,headers});
 try{const raw=await request.text();if(raw.length>1024)return NextResponse.json({error:'Dữ liệu quá dài'},{status:413,headers});const b=JSON.parse(raw);
 if(typeof b.title!=='string'||!b.title.trim()||b.title.trim().length>160||/[\u0000-\u001f\u007f]/.test(b.title)|| (b.id!==undefined&&(typeof b.id!=='string'||!/^[a-f0-9-]{36}$/.test(b.id))))return NextResponse.json({error:'Tiêu đề cần 1–160 ký tự, không có ký tự điều khiển'},{status:400,headers});
 const current=loadSession(owner)?.listening;archiveListening(owner,current);
 const currentKey=current?createHash('sha256').update(JSON.stringify(current)).digest('hex'):null;
 const row=b.id?history(owner).find(x=>x.id===b.id):history(owner).find(x=>x.key===currentKey);
 if(!row)return NextResponse.json({error:'Bài nghe không còn trong lịch sử'},{status:404,headers});
 const isCurrent=row.key===currentKey,entry=renameListening(owner,row.id,b.title.trim());
 if(isCurrent)saveSession(owner,{listening:entry.lesson});
 return NextResponse.json({title:entry.title,id:entry.id},{headers});
 }catch{return NextResponse.json({error:'Không lưu được tiêu đề. Thử lại.'},{status:500,headers});}
}
