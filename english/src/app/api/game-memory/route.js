import {NextResponse} from 'next/server';
import {cacheOwner} from '../session/owner';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {normalize} from '../../../lib/vocab-game.mjs';
let db;
function store(){if(!db){const file=process.env.WORDS_DB_PATH||'/app/data/words.sqlite';mkdirSync(path.dirname(file),{recursive:true});db=new DatabaseSync(file);db.exec('PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS game_memory(owner TEXT NOT NULL, word TEXT NOT NULL, debt INTEGER NOT NULL DEFAULT 0, mistakes INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(owner,word));');}return db;}
const headers={'Cache-Control':'private, no-store'};
export async function GET(request){const owner=cacheOwner(request);if(!owner)return NextResponse.json({error:'Cần đăng nhập'},{status:401,headers});try{return NextResponse.json({memory:Object.fromEntries(store().prepare('SELECT word,debt,mistakes FROM game_memory WHERE owner=?').all(owner).map(r=>[r.word,{debt:r.debt,mistakes:r.mistakes}]))},{headers});}catch{return NextResponse.json({error:'Không tải được tiến độ ghi nhớ'},{status:500,headers});}}
export async function POST(request){const owner=cacheOwner(request);if(!owner)return NextResponse.json({error:'Cần đăng nhập'},{status:401,headers});let word,correct;try{({word,correct}=await request.json());if(typeof word!=='string'||!word.trim()||word.length>200||typeof correct!=='boolean')throw Error();word=normalize(word);}catch{return NextResponse.json({error:'Kết quả không hợp lệ'},{status:400,headers});}try{const r=store().prepare('INSERT INTO game_memory(owner,word,debt,mistakes) VALUES(?,?,?,?) ON CONFLICT(owner,word) DO UPDATE SET debt=MIN(20,MAX(0,game_memory.debt+?)),mistakes=game_memory.mistakes+? RETURNING debt,mistakes').get(owner,word,correct?0:3,correct?0:1,correct?-1:3,correct?0:1);return NextResponse.json({word,...r},{headers});}catch{return NextResponse.json({error:'Không lưu được tiến độ ghi nhớ'},{status:500,headers});}}
