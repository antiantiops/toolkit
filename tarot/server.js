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
const LOKI_URL=process.env.LOKI_URL||'https://loki.nimtechnology.com/loki/api/v1/push';
const LOKI_INSECURE_TLS=process.env.LOKI_INSECURE_TLS==='true';

/* ── Loki logger ── */
function logToLoki(data){
  try{
    const u=new URL(LOKI_URL);
    const body=JSON.stringify({
      streams:[{
        stream:{app:'tarot',env:process.env.NODE_ENV||'production'},
        values:[[String(Date.now()*1000000),JSON.stringify(data)]]
      }]
    });
    const opts={
      hostname:u.hostname,
      port:u.port||(u.protocol==='https:'?443:80),
      path:u.pathname,
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'X-Scope-OrgID':'fake',
        'Content-Length':Buffer.byteLength(body)
      }
    };
    if(u.protocol==='https:'&&LOKI_INSECURE_TLS) opts.rejectUnauthorized=false;
    const mod=u.protocol==='https:'?require('https'):http;
    const req=mod.request(opts,res=>{
      if(res.statusCode<200||res.statusCode>=300) console.error('Loki push HTTP '+res.statusCode);
      res.resume();
    });
    req.on('error',err=>console.error('Loki push error:',err.message));
    req.write(body);
    req.end();
  }catch(e){console.error('Loki log error:',e.message)}
}

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
const readingGrants=new Map(); // ip -> expiry; one full-reading request after card insights
const cardInsightGrants=new Map(); // ip -> {expiresAt,remaining}; one five-card reveal sequence
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

  const granted=readingGrants.get(ip)>Date.now();
  if(granted) readingGrants.delete(ip);
  const r=granted?{ok:true}:rateOk(ip);
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

    // Log to Loki (IP public, question, cards selected)
    logToLoki({
      timestamp: new Date().toISOString(),
      event: 'tarot_reading',
      ip: ip,
      question: question,
      cards: cleanCards.map(c=>({position:c.position, name:c.name, orientation:c.orientation}))
    });
    const cardList=cleanCards.map((card,i)=>`[${i+1}/5] ${card.position}: ${card.name} (${card.orientation}) — ${card.keywords}`).join('\n');
    const userPrompt=`Câu hỏi của người hỏi: "${question}"\n\nDỮ LIỆU ĐÃ ĐỦ ĐÚNG 5 LÁ. Toàn bộ năm lá nằm dưới đây; không có dữ liệu bị ẩn, bị cắt hay cần gửi thêm:\n${cardList}\n\nBạn dùng Tarot như một bản đồ quyết định: giúp người hỏi thấy lựa chọn, điểm mù, cái giá và bước kế tiếp. Không giả vờ biết trước tương lai, nhưng cũng không nói nước đôi.\n\nViết ĐÚNG 6 đoạn văn tiếng Việt, mỗi đoạn cách nhau một dòng trống. Không markdown, không heading, không bullet points.\n\nĐoạn 1 — CÂU TRẢ LỜI THẲNG, 35-60 từ: trả lời trọng tâm câu hỏi, chọn một hướng ưu tiên rõ ràng. Không nói 50/50.\n\nĐoạn 2 — MẠCH BÀI, 90-130 từ: kết nối cả 5 lá thành một câu chuyện về điều đang xảy ra, lực cản chính và hướng mở ra. Không giải nghĩa từng lá như từ điển. Gọi tên tối thiểu 4 lá, nêu đúng chiều Xuôi/Ngược.\n\nĐoạn 3 — SỰ THẬT KHÓ NGHE, 60-90 từ: chỉ ra một hành vi, nỗi sợ, sự trì hoãn hoặc ảo tưởng cần đối diện. Dẫn ít nhất 2 lá bài làm căn cứ. Nói rõ nhưng không phán xét con người.\n\nĐoạn 4 — QUYẾT ĐỊNH ĐỀ XUẤT, 70-100 từ: đưa một lựa chọn duy nhất. Nêu rõ lợi ích phải theo đuổi và cái giá phải chấp nhận. Gọi tên tối thiểu 2 lá. Không dùng "có thể", "cân nhắc", "tùy bạn", "hoặc".\n\nĐoạn 5 — VIỆC CẦN LÀM TRONG 72 GIỜ, 70-110 từ: nêu đúng 3 hành động theo thứ tự trong cùng một đoạn. Mỗi hành động có chủ thể và kết quả rõ; không khuyên chung chung kiểu "suy nghĩ tích cực".\n\nĐoạn 6 — DẤU HIỆU KIỂM CHỨNG TRONG 2-4 TUẦN, 70-100 từ: mô tả 2 tín hiệu thực tế cho thấy hướng đi đang đúng và 1 tín hiệu cho thấy cần dừng hoặc điều chỉnh. Đây là dấu hiệu để quan sát, không phải lời tiên tri. Neo vào ít nhất 2 lá bài.\n\nMọi kết luận phải có căn cứ từ các lá đã rút. Không tự thêm lá, vị trí hoặc dữ kiện về người hỏi. Không dùng câu rỗng như "vũ trụ đang mách bảo", "năng lượng chuyển dịch", "hãy tin vào trực giác" khi không giải thích bằng lá bài nào. Ưu tiên động từ, tình huống, hành động và hệ quả cụ thể. Tổng độ dài 500-650 từ.`;

    // Model, system policy, and output limit are server-owned.
    const upstream=JSON.stringify({
      model:ALLOWED_MODEL,
      messages:[
        {role:'system',content:'Bạn là người đọc Tarot sắc bén và thực tế. Bạn không giả vờ sở hữu sự chắc chắn siêu nhiên, không nói nước đôi, không dùng ngôn ngữ an ủi rỗng. Bạn dùng biểu tượng, chiều lá bài và mối quan hệ giữa các lá để tạo lập luận: lá nào cho thấy điều đó, nó liên quan gì đến câu hỏi, và người hỏi cần làm gì tiếp theo. Ưu tiên hướng dẫn hành động, cái giá phải trả và dấu hiệu cần quan sát. Không biến Tarot thành lời tiên tri hay mệnh lệnh tuyệt đối. Giọng thẳng, ấm, sâu, tự nhiên. Mọi kết luận phải neo vào chính 5 lá trong trải bài. Luôn nhận đủ chính xác 5 lá trong dữ liệu người dùng. Không được nói thiếu lá, không được nhắc CCR/retrieve/context bị ẩn, không được yêu cầu gửi tiếp, không được tự tạo lá bài hoặc vị trí mới. Phải đọc cả năm dòng [1/5] đến [5/5] trước khi trả lời. Dùng tiếng Việt, xưng bạn.'},
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

/* ── Per-card reveal insight ── */
function cardInsights(req,res){
  if(req.method!=='POST'){res.writeHead(405);res.end('POST only');return}
  if(!consumeCsrf(req.headers['x-csrf-token'])){res.writeHead(403);res.end('Invalid session');return}
  const ip=req.headers['x-forwarded-for']||req.socket.remoteAddress;
  const grant=cardInsightGrants.get(ip);
  const granted=grant&&grant.expiresAt>Date.now()&&grant.remaining>0;
  if(granted) grant.remaining--;
  const r=granted?{ok:true}:rateOk(ip);
  if(!r.ok){res.writeHead(429);res.end('Please wait');return}
  let body='';
  req.on('data',chunk=>{body+=chunk;if(body.length>MAX_BODY){req.destroy();res.writeHead(413);res.end()}});
  req.on('end',()=>{
    let parsed;try{parsed=JSON.parse(body)}catch{res.writeHead(400);res.end('Bad JSON');return}
    const question=typeof parsed.question==='string'?parsed.question.trim().slice(0,300):'';
    const card=parsed.card;
    if(!question||!card){res.writeHead(400);res.end('Need question and card');return}
    const clean={position:typeof card.position==='string'?card.position.slice(0,80):'',name:typeof card.name==='string'?card.name.slice(0,100):'',orientation:card.orientation==='Ngược'?'Ngược':'Xuôi',keywords:typeof card.keywords==='string'?card.keywords.slice(0,160):''};
    if(!clean.position||!clean.name){res.writeHead(400);res.end('Invalid card');return}
    if(!granted) cardInsightGrants.set(ip,{expiresAt:Date.now()+TOKEN_TTL_MS,remaining:4});
    readingGrants.set(ip,Date.now()+TOKEN_TTL_MS);
    const prompt=`Câu hỏi: "${question}"\n\nLá đang được lật:\n${clean.position}: ${clean.name} (${clean.orientation}) — ${clean.keywords}\n\nViết một đoạn 45-65 từ bằng tiếng Việt, không markdown hay heading. Gọi đúng tên và chiều lá; giải thích lá này nói gì RIÊNG về vị trí của nó trong câu hỏi. Kết bằng một câu bắt đầu "Lá bài cho thấy bạn..." nêu nhu cầu, sự thật hoặc việc cần nhìn rõ. Không giải nghĩa kiểu từ điển, không lời tiên tri, không câu rỗng về vũ trụ/năng lượng.`;
    const upstream=JSON.stringify({model:ALLOWED_MODEL,messages:[{role:'system',content:'Bạn là người đọc Tarot thực tế. Mỗi luận giải phải neo vào đúng lá, chiều lá, vị trí và câu hỏi. Viết ngắn, rõ, ấm; giúp người hỏi hiểu bản thân thay vì phán số mệnh. Dùng tiếng Việt, xưng bạn.'},{role:'user',content:prompt}],stream:true,max_tokens:180});
    if(!AI_KEY){res.writeHead(503);res.end('AI service unavailable');return}
    const url=new URL(AI_UPSTREAM);
    const upstreamReq=http.request({hostname:url.hostname,port:url.port,path:url.pathname,method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+AI_KEY,'Content-Length':Buffer.byteLength(upstream),'X-OmniRoute-Compression':'off'}},upstreamRes=>{res.writeHead(upstreamRes.statusCode||502,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});upstreamRes.pipe(res)});
    upstreamReq.on('error',()=>{if(!res.headersSent){res.writeHead(502);res.end('AI unavailable')}});
    upstreamReq.write(upstream);upstreamReq.end();
  });
}

/* ── AI card story endpoint ── */
function cardStory(req,res){
  if(req.method!=='POST'){res.writeHead(405);res.end('POST only');return}

  const ip=req.headers['x-forwarded-for']||req.socket.remoteAddress;

  const csrfTok=req.headers['x-csrf-token'];
  if(!consumeCsrf(csrfTok)){
    res.writeHead(403,{'Content-Type':'application/json'});
    res.end(JSON.stringify({error:'Phiên không hợp lệ. Vui lòng tải lại trang.'}));
    return;
  }

  const r=rateOk(ip);
  if(!r.ok){
    res.writeHead(429,{'Content-Type':'application/json'});
    const msg=r.reason==='daily'?'Bạn đã dùng hết lượt xem hôm nay. Quay lại ngày mai nhé!':'Vui lòng đợi 20 giây giữa mỗi lần xem bài.';
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
    const cardName=typeof parsed.name==='string'?parsed.name.trim().slice(0,100):'';
    const orientation=typeof parsed.orientation==='string'?parsed.orientation:'Xuôi';
    if(!cardName){res.writeHead(400);res.end('Need card name');return}

    const secretText=`Tên lá bài: ${cardName}\nChiều: ${orientation}\n\nBạn là nhà nghiên cứu Tarot uyên bác. Kể một câu chuyện thú vị về lá bài này bằng tiếng Việt, giọng kể chuyện tâm linh ấm áp. KHÔNG dùng markdown, heading, bullet points. Viết một đoạn văn duy nhất, 120-180 từ, bao gồm tất cả:\n\n1. MỞ ĐẦU: một câu dẫn thơ mộng hoặc huyền bí về năng lượng của lá bài này.\n2. LỊCH SỬ: nguồn gốc của lá bài trong bộ Rider-Waite-Smith (Arthur Edward Waite và Pamela Colman Smith, xuất bản 1909). Nếu là Major Arcana, kể về vị trí của nó trong hành trình The Fool. Nếu là Minor Arcana, kể về bộ (Wands/Cups/Swords/Pentacles) và yếu tố tương ứng.\n3. CHI TIẾT HÌNH VẼ: mô tả 2-3 chi tiết đáng chú ý nhất trong tranh của Pamela Colman Smith — màu sắc, biểu tượng, tư thế nhân vật, phong cảnh. Giải thích ý nghĩa của từng chi tiết đó.\n4. KẾT: một câu suy ngẫm về bài học của lá bài này dành cho người đang chiêm nghiệm.\n\nDùng tiếng Việt, giọng tự nhiên như đang kể chuyện bên bếp lửa. Không dùng dấu sao, dấu gạch đầu dòng.`;

    const upstream=JSON.stringify({
      model:ALLOWED_MODEL,
      messages:[
        {role:'system',content:'Bạn là nhà nghiên cứu Tarot uyên bác, giọng kể chuyện tâm linh ấm áp. Bạn biết mọi chi tiết về lịch sử, biểu tượng và hình vẽ của từng lá bài trong bộ Rider-Waite-Smith. Bạn kể như đang ngồi bên bếp lửa — thơ mộng, sâu sắc, nhưng chính xác về lịch sử và biểu tượng. Dùng tiếng Việt, xưng bạn.'},
        {role:'user',content:secretText}
      ],
      stream:true,
      max_tokens:600
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
      console.error('Story upstream error:',err.message);
      if(!res.headersSent){res.writeHead(502);res.end('AI service unavailable');}
    });
    proxy.write(upstream);
    proxy.end();
  });
}

/* ── Server ── */
const server=http.createServer((req,res)=>{
  if(req.url==='/api/tarot') return proxyAI(req,res);
  if(req.url==='/api/card-insights') return cardInsights(req,res);
  if(req.url==='/api/card-story') return cardStory(req,res);
  if(req.url==='/api/csrf'&&req.method==='GET'){
    const tok=generateCsrf();
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(JSON.stringify({token:tok}));
    return;
  }
  serveStatic(req,res);
});
server.listen(PORT,()=>console.log(`Tarot server listening on :${PORT}`));
