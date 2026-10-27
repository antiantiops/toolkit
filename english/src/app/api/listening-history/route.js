import {NextResponse} from 'next/server';
import {cacheOwner} from '../session/owner';
import {history,archiveListening} from '../session/listening-history';
import {loadSession} from '../session/storage';
export async function GET(request){
 const owner=cacheOwner(request),headers={'Cache-Control':'private, no-store'};
 if(!owner)return NextResponse.json({error:'Cần đăng nhập qua Kong'},{status:401,headers});
 try{archiveListening(owner,loadSession(owner)?.listening);const rows=history(owner),id=new URL(request.url).searchParams.get('id');
 if(id){const row=rows.find(x=>x.id===id);return NextResponse.json(row?{entry:row}:{error:'Bài nghe không còn trong 7 ngày'},{status:row?200:404,headers});}
 return NextResponse.json({entries:rows.map(({lesson,key,...row})=>row)},{headers});
 }catch{return NextResponse.json({error:'Không đọc được lịch sử bài nghe'},{status:500,headers});}
}
