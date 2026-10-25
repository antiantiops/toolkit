export class RequestError extends Error { constructor(status,message){super(message);this.status=status;} }
export function validate(body,models){
 if(!body||typeof body!=='object'||!models.some(m=>m.id===body.modelId))throw new RequestError(400,'Model không hợp lệ.');
 if(!Array.isArray(body.messages)||body.messages.length<1||body.messages.length>24)throw new RequestError(400,'Chỉ nhận 1–24 tin nhắn.');
 let total=0;const messages=body.messages.map(m=>{if(!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>8000)throw new RequestError(400,'Tin nhắn không hợp lệ hoặc quá dài.');total+=m.content.length;return {role:m.role,content:m.content};});
 if(total>32000||messages.at(-1).role!=='user')throw new RequestError(400,'Ngữ cảnh quá dài hoặc thiếu câu hỏi.');return messages;
}
export async function chat({model,messages,signal,env=process.env,fetcher=fetch}){
 if(model.provider==='demo'){await new Promise((resolve,reject)=>{const t=setTimeout(resolve,650);signal.addEventListener('abort',()=>{clearTimeout(t);reject(new DOMException('Aborted','AbortError'));},{once:true});});return 'Đây là câu trả lời mẫu trong **chế độ Demo**, không đến từ model thật.\n\nWeb/app là **cơ thể**: giữ giao diện và hội thoại. Model là **bộ não** có thể thay thế qua API. Thử đổi model: hội thoại này vẫn còn.\n\nWeb và Files chưa kết nối. Memory chỉ là lịch sử hội thoại được gửi trong context.';}
 const url=new URL(env.AI_BASE_URL);if(!['http:','https:'].includes(url.protocol))throw new RequestError(503,'Cấu hình server không hợp lệ.');
 const response=await fetcher(`${url.href.replace(/\/$/,'')}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.AI_API_KEY}`},body:JSON.stringify({model:model.model,messages,stream:false}),signal});
 if(!response.ok)throw new RequestError(502,'Provider không trả lời được. Kiểm tra cấu hình server hoặc thử lại.');
 const data=await response.json();const text=data?.choices?.[0]?.message?.content;if(typeof text!=='string'||!text.trim()||text.length>64000)throw new RequestError(502,'Provider trả dữ liệu không hợp lệ.');return text;
}
