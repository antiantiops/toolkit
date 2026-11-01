import fs from 'node:fs';import path from 'node:path';import {Readable} from 'node:stream';import {cacheOwner} from '../../session/owner';
export const dynamic='force-dynamic';
export async function GET(request,{params}){
 const owner=cacheOwner(request);if(!owner)return new Response(null,{status:401});const {id}=await params;
 if(!/^[A-Za-z0-9]{22}$/.test(id))return new Response(null,{status:404});const dir=path.join(process.env.SPOTIFY_CACHE_DIR||'/data/spotify',id);
 if(!fs.existsSync(path.join(dir,owner)))return new Response(null,{status:404});const cover=new URL(request.url).searchParams.has('cover');const balanced=new URL(request.url).searchParams.get('variant')==='balanced';const tone=new URL(request.url).searchParams.get('variant')==='tone';const edm=new URL(request.url).searchParams.get('variant')==='edm';const file=path.join(dir,cover?'cover':edm?'edm.flac':tone?'tone.flac':balanced?'balanced.flac':'audio.mp3');let size;try{size=fs.statSync(file).size;}catch{return new Response(null,{status:404});}
 let start=0,end=size-1;const range=request.headers.get('range');if(range){const m=/^bytes=(\d+)-(\d*)$/.exec(range);if(!m)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),end):end;if(start>end||start>=size)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});}
 let title=`spotify-${id}`;try{const meta=JSON.parse(fs.readFileSync(path.join(dir,'state.json'),'utf8'));title=meta.title?meta.title+(meta.artist?' - '+meta.artist:''):title;}catch{}
 const name=title.normalize('NFC').replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,180)||`spotify-${id}`;
 const ext=(balanced||tone||edm)?'flac':'mp3';const filename=name+(edm?' - EDM DJ':balanced?' - Balanced':'')+'.'+ext,encoded=encodeURIComponent(filename).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
 const headers={'Content-Type':cover?'image/jpeg':(balanced||tone||edm)?'audio/flac':'audio/mpeg','Content-Length':String(end-start+1),'Accept-Ranges':'bytes','Cache-Control':'private, no-store','Content-Disposition':`${new URL(request.url).searchParams.has('download')?'attachment':'inline'}; filename="${name.replace(/[^\x20-\x7e]/g,'_')}.${ext}"; filename*=UTF-8''${encoded}`};if(range)headers['Content-Range']=`bytes ${start}-${end}/${size}`;
 return new Response(Readable.toWeb(fs.createReadStream(file,{start,end})),{status:range?206:200,headers});
}
