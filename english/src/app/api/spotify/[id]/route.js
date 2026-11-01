import fs from 'node:fs';import path from 'node:path';import {Readable} from 'node:stream';import {cacheOwner} from '../../session/owner';
export const dynamic='force-dynamic';
export async function GET(request,{params}){
 const owner=cacheOwner(request);if(!owner)return new Response(null,{status:401});const {id}=await params;
 if(!/^[A-Za-z0-9]{22}$/.test(id))return new Response(null,{status:404});const dir=path.join(process.env.SPOTIFY_CACHE_DIR||'/data/spotify',id);
 if(!fs.existsSync(path.join(dir,owner)))return new Response(null,{status:404});const file=path.join(dir,'audio.mp3');let size;try{size=fs.statSync(file).size;}catch{return new Response(null,{status:404});}
 let start=0,end=size-1;const range=request.headers.get('range');if(range){const m=/^bytes=(\d+)-(\d*)$/.exec(range);if(!m)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),end):end;if(start>end||start>=size)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});}
 const headers={'Content-Type':'audio/mpeg','Content-Length':String(end-start+1),'Accept-Ranges':'bytes','Cache-Control':'private, no-store','Content-Disposition':`${new URL(request.url).searchParams.has('download')?'attachment':'inline'}; filename="spotify-${id}.mp3"`};if(range)headers['Content-Range']=`bytes ${start}-${end}/${size}`;
 return new Response(Readable.toWeb(fs.createReadStream(file,{start,end})),{status:range?206:200,headers});
}
