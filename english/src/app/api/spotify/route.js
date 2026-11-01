import fs from 'node:fs';
import path from 'node:path';
import {NextResponse} from 'next/server';
import {cacheOwner} from '../session/owner';
export const dynamic='force-dynamic';
const root=process.env.SPOTIFY_CACHE_DIR||'/data/spotify';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
function track(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='open.spotify.com'&&/^\/track\/[A-Za-z0-9]{22}$/.test(u.pathname)?u.pathname.split('/')[2]:null;}catch{return null;}}
function read(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
export async function POST(request){
 const owner=cacheOwner(request);if(!owner)return reply({error:'Cần đăng nhập qua Kong'},401);
 try{const body=await request.json(),id=track(body.url);if(!id)return reply({error:'Chỉ nhận link https://open.spotify.com/track/...'},400);
 fs.mkdirSync(root,{recursive:true});const dirs=fs.readdirSync(root).filter(n=>/^[A-Za-z0-9]{22}$/.test(n));
 if(!dirs.includes(id)&&dirs.filter(n=>!['completed','failed'].includes(read(path.join(root,n,'state.json'),{}).status)).length>=3)return reply({error:'Hàng đợi đầy, thử lại sau'},429);
 if(!dirs.includes(id)&&dirs.length>=200)return reply({error:'Cache đã đủ 200 bài; cần quản trị dọn dung lượng'},429);
 const dir=path.join(root,id);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,owner),'');
 if(!fs.existsSync(path.join(dir,'request.json')))fs.writeFileSync(path.join(dir,'request.json'),JSON.stringify({id}),{flag:'wx'});
 return reply({id,...read(path.join(dir,'state.json'),{status:'queued'})},202);
 }catch{return reply({error:'Không tạo được yêu cầu tải'},400);}
}
export async function GET(request){
 const owner=cacheOwner(request);if(!owner)return reply({error:'Cần đăng nhập qua Kong'},401);
 const list=[];try{for(const id of fs.readdirSync(root)){if(!/^[A-Za-z0-9]{22}$/.test(id)||!fs.existsSync(path.join(root,id,owner)))continue;list.push({id,...read(path.join(root,id,'state.json'),{status:'queued'})});}}catch{}
 return reply({tracks:list});
}
