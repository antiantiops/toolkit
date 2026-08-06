const http=require('http');
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');

/* ── Config ── */
const PORT=80;
const AI_UPSTREAM='http://omniroute:20129/v1/chat/completions';
const AI_KEY=process.env.AI_KEY||'';
const ALLOWED_MODEL='cgpt-web/gpt-5.6-thinking';
const MAX_TOKENS=1500;
const RATE_LIMIT_MS=20000; // 1 request per 20s per IP
const MAX_BODY=4096;
const STATIC_DIR=path.join(__dirname,'public');
const TOKEN_TTL_MS=3*60*1000; // token valid 3 minutes
const DAILY_LIMIT=30; // max requests per IP per day

/* ── CSRF tokens (one-time, expire after TTL) ── */
const csrfTokens=new Map(); // token -> {createdAt}
function generateCsrf(){
  const tok=crypto.randomBytes(24).toString('base64url');
  csrfTokens.set(tok,{createdAt:Date.now()});
  return tok;
}
function consumeCsrf(tok){
  if(!tok) return false;
  const entry=csrfTokens.get(tok);
  if(!entry) return false;
  csrfTokens.delete(tok); // one-time use
  if(Date.now()-entry.createdAt>TOKEN_TTL_MS) return false;
  return true;
}
// cleanup expired tokens every 5 min
setInterval(()=>{
  const now=Date.now();
  for(const[k,v] of csrfTokens) if(now-v.createdAt>TOKEN_TTL_MS) csrfTokens.delete(k);
},5*60*1000).unref();

/* ── Rate limiter (per-request + daily quota) ── */
const ipTimestamps=new Map();
const ipDailyCount=new Map(); // ip -> {date,count}
function rateOk(ip){
  const now=Date.now();
  const last=ipTimestamps.get(ip)||0;
  if(now-last<RATE_LIMIT_MS) return {ok:false,reason:'throttle'};
  ipTimestamps.set(ip,now);
  if(ipTimestamps.size>5000){
    for(const[k,v] of ipTimestamps) if(now-v>60000) ipTimestamps.delete(k);
  }
  // daily quota
  const today=new Date().toISOString().slice(0,10);
  let d=ipDailyCount.get(ip);
  if(!d||d.date!==today){d={date:today,count:0};ipDailyCount.set(ip,d)}
  d.count++;
  if(d.count>DAILY_LIMIT) return {ok:false,reason:'daily'};
  return {ok:true};
}

/* ── MIME types ── */
const mimes={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.json':'application/json'};

/* ── Static file server (inject CSRF token into HTML) ── */
function serveStatic(req,res){
  const pathname=new URL(req.url,'http://localhost').pathname;
  let fp=path.join(STATIC_DIR,pathname==='/'?'/index.html':pathname);
  fp=path.normalize(fp);
  if(!fp.startsWith(STATIC_DIR)){res.writeHead(403);res.end();return}
  fs.stat(fp,(err,st)=>{
    if(err||!st.isFile()){res.writeHead(404);res.end('Not found');return}
    const ext=path.extname(fp);
    const headers={
      'Content-Type':mimes[ext]||'application/octet-stream',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer',
      'X-Frame-Options':'SAMEORIGIN'
    };
    // inject CSRF token into index.html
    if(pathname==='/'||pathname==='/index.html'){
      headers['Cache-Control']='no-store';
      fs.readFile(fp,'utf8',(err2,html)=>{
        if(err2){res.writeHead(500);res.end();return}
        const tok=generateCsrf();
        const injected=html.replace('</head>',`<meta name="csrf-token" content="${tok}"></head>`);
        res.writeHead(200,headers);
        res.end(injected);
      });
      return;
    }
    res.writeHead(200,headers);
    fs.createReadStream(fp).pipe(res);
  });
}

/* ── AI proxy ── */
function proxyAI(req,res){
  if(req.method!=='POST'){res.writeHead(405);res.end('POST only');return}

  const ip=req.headers['x-forwarded-for']||req.socket.remoteAddress;

  // CSRF token check
  const csrfTok=req.headers['x-csrf-token'];
  if(!consumeCsrf(csrfTok)){
    res.writeHead(403,{'Content-Type':'application/json'});
    res.end(JSON.stringify({error:'Phiên không hợp lệ. Vui lòng tải lại trang.'}));
    return;
  }

  const r=rateOk(ip);
  if(!r.ok){
    res.writeHead(429,{'Content-Type':'application/json'});
    const msg=r.reason==='daily'?'Bạn đã dùng hết lượt bói hôm nay. Quay lại ngày mai nhé!':'Vui lòng đợi 20 giây giữa mỗi lần bói bài.';
    res.end(JSON.stringify({error:msg}));
    return;
  }

  let body='';
  req.on('data',chunk=>{
    body+=chunk;
    if(body.length>MAX_BODY){req.destroy();res.writeHead(413);res.end();return}
  });
  req.on('end',()=>{
    let parsed;
    try{parsed=JSON.parse(body)}catch(e){res.writeHead(400);res.end('Bad JSON');return}

    // Accept structured tarot data only. Browser cannot send prompt, model, or system rules.
    const question=typeof parsed.question==='string'?parsed.question.trim().slice(0,300):'';
    const cards=Array.isArray(parsed.cards)?parsed.cards:[];
    if(!question||cards.length!==5){res.writeHead(400);res.end('Need question and exactly five cards');return}
    const cleanCards=cards.map((card,i)=>({
      position:typeof card?.position==='string'?card.position.slice(0,80):'',
      name:typeof card?.name==='string'?card.name.slice(0,100):'',
      orientation:card?.orientation==='Ngược'?'Ngược':'Xuôi',
      keywords:typeof card?.keywords==='string'?card.keywords.slice(0,160):''
    }));
    if(cleanCards.some(card=>!card.position||!card.name)){res.writeHead(400);res.end('Invalid cards');return}
    const cardList=cleanCards.map((card,i)=>`[${i+1}/5] ${card.position}: ${card.name} (${card.orientation}) — ${card.keywords}`).join('\n');
    const userPrompt=`Câu hỏi: "${question}"\n\nDỮ LIỆU ĐÃ ĐỦ ĐÚNG 5 LÁ. Toàn bộ năm lá nằm dưới đây; không có dữ liệu bị ẩn, bị cắt hay cần gửi thêm:\n${cardList}\n\nViết đúng 3 đoạn tiếng Việt, 350-500 từ. Đoạn đầu bắt buộc giải nghĩa đủ năm lá theo đúng thứ tự 1/5 đến 5/5. Đoạn hai kết nối năm lá và trả lời câu hỏi. Đoạn ba đưa lời khuyên thực tế, kết thúc bằng một câu truyền cảm hứng. Không markdown, không heading, không bullet points. Không nói thiếu lá, không hỏi thêm thông tin, không tự thêm lá hoặc vị trí.`;

    // Model, system policy, and output limit are server-owned.
    const upstream=JSON.stringify({
      model:ALLOWED_MODEL,
      messages:[
        {role:'system',content:'Bạn là người đọc Tarot giàu trực giác. Luôn nhận đủ chính xác 5 lá trong dữ liệu người dùng. Không được nói thiếu lá, không được nhắc CCR/retrieve/context bị ẩn, không được yêu cầu gửi tiếp, không được tự tạo lá bài hoặc vị trí mới. Phải đọc cả năm dòng [1/5] đến [5/5] trước khi trả lời. Dùng tiếng Việt, xưng bạn.'},
        {role:'user',content:userPrompt}
      ],
      stream:true,
      max_tokens:MAX_TOKENS
    });

    if(!AI_KEY){res.writeHead(503);res.end('AI service unavailable');return}

    const url=new URL(AI_UPSTREAM);
    const opts={
      hostname:url.hostname,
      port:url.port,
      path:url.pathname,
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+AI_KEY,
        'X-OmniRoute-Compression':'off',
        'Content-Length':Buffer.byteLength(upstream)
      }
    };

    const proxy=http.request(opts,upstream_res=>{
      res.writeHead(upstream_res.statusCode,{
        'Content-Type':'text/event-stream',
        'Cache-Control':'no-cache',
        'Connection':'keep-alive',
        'X-Content-Type-Options':'nosniff'
      });
      upstream_res.pipe(res);
    });
    proxy.on('error',err=>{
      console.error('Upstream error:',err.message);
      if(!res.headersSent){res.writeHead(502);res.end('AI service unavailable');}
    });
    proxy.write(upstream);
    proxy.end();
  });
}

/* ── Server ── */
const server=http.createServer((req,res)=>{
  if(req.url==='/api/tarot') return proxyAI(req,res);
  if(req.url==='/api/csrf'&&req.method==='GET'){
    const tok=generateCsrf();
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(JSON.stringify({token:tok}));
    return;
  }
  serveStatic(req,res);
});
server.listen(PORT,()=>console.log(`Tarot server listening on :${PORT}`));
