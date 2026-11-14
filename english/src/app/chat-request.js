import {fetchWithRetry,parseApiResponse} from './fetch-helper.js';
import {normalizeTargetLang} from '../lib/lookup/languages.mjs';

export const pendingKey=(targetLang='vi')=>{
  const norm=normalizeTargetLang(targetLang);
  if(!norm)return null;
  return norm==='vi'?'lesson-chat-pending-v1':`lesson-chat-pending-v1-${norm}`;
};

export const pendingChat=(targetLang='vi')=>{
  const k=pendingKey(targetLang);
  if(!k)return null;
  try{return JSON.parse(sessionStorage.getItem(k)||'null');}catch{return null;}
};

export async function requestChat(payload,onStatus){
  if(!payload||typeof payload!=='object')throw Error('Dữ liệu không hợp lệ');
  const targetLang=normalizeTargetLang(payload.targetLang);
  if(!targetLang)throw Error('Ngôn ngữ không hợp lệ');
  const normalizedPayload={...payload,targetLang};
  const key=pendingKey(targetLang);
  sessionStorage.setItem(key,JSON.stringify(normalizedPayload));
  const deadline=Date.now()+180000;
  let started=false;
  while(Date.now()<deadline){
    let response;
    try{
      response=await fetchWithRetry(started?'/api/chat?jobId='+normalizedPayload.requestId:'/api/chat',{...(started?{cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(normalizedPayload)}),timeout:12000},1,1000);
    }catch{
      onStatus?.('Mất kết nối. Đang nối lại; không gửi câu hỏi lần hai.');
      await new Promise(r=>setTimeout(r,3000));
      continue;
    }
    if([401,403,404,410].includes(response.status))sessionStorage.removeItem(key);
    if([502,503,504].includes(response.status)){
      onStatus?.('Máy chủ tạm gián đoạn. Đang nối lại…');
      await new Promise(r=>setTimeout(r,3000));
      continue;
    }
    const data=await parseApiResponse(response);
    started=true;
    onStatus?.('AI đang trả lời…');
    if(data.status==='completed'){
      sessionStorage.removeItem(key);
      return data;
    }
    if(data.status==='failed'){
      sessionStorage.removeItem(key);
      throw Error(data.error+' · Mã chat: '+normalizedPayload.requestId);
    }
    await new Promise(r=>setTimeout(r,2000));
  }
  throw Error('Chưa lấy được kết quả. Bấm “Nối lại” hoặc tải lại trang; không cần gửi lại. Mã chat: '+normalizedPayload.requestId);
}
