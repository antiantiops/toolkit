import {NextResponse} from 'next/server';
import {currentUser} from '../me/auth';
import {enabled,setEnabled,job,undo} from '../../../lib/words/chat-store';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request){const u=currentUser(request);if(!u)return reply({error:'Cần đăng nhập'},401);const id=new URL(request.url).searchParams.get('id');const row=id&&/^[a-f0-9]{64}$/.test(id)?job(u.id,id):null;return reply({enabled:enabled(u.id),...(row?{status:row.status,items:JSON.parse(row.items)}:{})});}
export async function POST(request){const u=currentUser(request);if(!u)return reply({error:'Cần đăng nhập'},401);const origin=request.headers.get('origin');if(origin&&origin!=='https://english.nimtechnology.com')return reply({error:'Invalid origin'},403);try{const text=await request.text();if(text.length>512)return reply({},413);const b=JSON.parse(text);if(typeof b.enabled==='boolean')setEnabled(u.id,b.enabled);else if(typeof b.undo==='string'&&/^[a-f0-9]{64}$/.test(b.undo))undo(u.id,b.undo);else return reply({},400);return reply({ok:true});}catch{return reply({error:'Không lưu được thay đổi'},503);}}
