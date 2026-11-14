import http from 'node:http';
import {gzipSync} from 'node:zlib';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve,extname,dirname} from 'node:path';
import {chat,validate,RequestError} from './provider.mjs';
const notesFile=process.env.NOTES_FILE||'/data/slide-notes.json';
let noteQueue=Promise.resolve();
const cleanNotes=value=>{if(!value||typeof value!=='object'||Array.isArray(value))return {};const out={};for(const [key,text] of Object.entries(value)){if(/^(?:[1-9]|1[0-2])$/.test(key)&&typeof text==='string')out[key]=text.slice(0,20000);}return out;};
const notes=async()=>{try{return cleanNotes(JSON.parse(await readFile(notesFile,'utf8')))}catch(e){if(e.code==='ENOENT')return {};throw e;}};
const configured=!!(process.env.AI_BASE_URL&&process.env.AI_API_KEY&&process.env.AI_MODEL);
const models=[{id:'demo',label:'Demo · Concept Brain',provider:'demo',model:'demo'},{id:'demo-creative',label:'Demo · Creative Brain',provider:'demo',model:'demo-creative'},...(configured?[{id:'connected',label:process.env.AI_MODEL,provider:'openai-compatible',model:process.env.AI_MODEL}]:[])];
const json=(res,status,data)=>{if(!res.destroyed){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}};
http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
 if(req.url==='/api/config'&&req.method==='GET')return json(res,200,{models,configured});
 if(req.url==='/api/notes'&&req.method==='GET'){try{return json(res,200,{notes:await notes()})}catch{return json(res,500,{error:'Không đọc được ghi chú.'})}}
 if(req.url==='/api/notes'&&req.method==='PUT'){try{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>1000000)throw new RequestError(413,'Ghi chú quá lớn.');}let body;try{body=JSON.parse(raw)}catch{throw new RequestError(400,'JSON không hợp lệ.')}const data=cleanNotes(body.notes);noteQueue=noteQueue.then(async()=>{await mkdir(dirname(notesFile),{recursive:true});const tmp=`${notesFile}.tmp`;await writeFile(tmp,JSON.stringify(data,null,2)+'\n',{mode:0o600});await rename(tmp,notesFile);});await noteQueue;return json(res,200,{notes:data});}catch(e){return json(res,e instanceof RequestError?e.status:500,{error:e instanceof RequestError?e.message:'Không lưu được ghi chú.'})}}
 if(req.url==='/api/chat'&&req.method==='POST'){
 if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return json(res,403,{error:'Origin không hợp lệ.'});}catch{return json(res,403,{error:'Origin không hợp lệ.'});}}
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),60000);res.on('close',()=>{if(!res.writableEnded)controller.abort();});
 try{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>160000)throw new RequestError(413,'Request quá lớn.');}let body;try{body=JSON.parse(raw);}catch{throw new RequestError(400,'JSON không hợp lệ.');}
 const messages=validate(body,models),model=models.find(m=>m.id===body.modelId);const content=await chat({model,messages,signal:controller.signal});json(res,200,{content,modelId:model.id,modelLabel:model.label,demo:model.provider==='demo'});
 }catch(e){json(res,e instanceof RequestError?e.status:e.name==='AbortError'?504:502,{error:e instanceof RequestError?e.message:e.name==='AbortError'?'Request đã dừng hoặc quá thời gian.':'Không kết nối được provider. Kiểm tra cấu hình server.'});}finally{clearTimeout(timer);}return;
 }
 if(req.url?.startsWith('/api/'))return json(res,404,{error:'Không tìm thấy API.'});
 try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const root=resolve('dist');let file=resolve(root,'.'+pathname);if(!file.startsWith(root+'/')&&file!==root)throw Error();if(pathname==='/'||!extname(pathname))file=resolve(root,'index.html');const data=await readFile(file);const compressed=/\.(?:js|css|html|svg)$/.test(file)&&/\bgzip\b/.test(req.headers['accept-encoding']||'');res.writeHead(200,{'Cache-Control':file.endsWith('.html')?'no-cache':file.includes('/assets/')?'public, max-age=31536000, immutable':'public, max-age=3600',...(compressed?{'Content-Encoding':'gzip','Vary':'Accept-Encoding'}:{}),'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.gz':'application/gzip','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif','.mp4':'video/mp4'})[extname(file)]||'application/octet-stream'});res.end(compressed?gzipSync(data):data);}catch{res.writeHead(404);res.end('Not found');}
}).listen(Number(process.env.PORT)||3000,'0.0.0.0');
