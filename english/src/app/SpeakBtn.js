"use client";
import { useState } from "react";
import {joinSpeech,hasSpeech} from '../lib/join-speech.mjs';
import {validSegments} from '../lib/speech-segments.mjs';
const tts = { audio: null, cache: new Map(), segments: new Map(), joined: new Map(), run: 0, cancel: null };
function stop(){tts.run++;tts.cancel?.();tts.cancel=null;tts.audio?.pause();globalThis.speechSynthesis?.cancel();return tts.run;}
async function audioUrl(text,lang){
 const k=lang+'|'+text;
 if(tts.cache.has(k))return tts.cache.get(k);
 const res=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,lang})});
 if(!res.ok)throw Error('Không tải được giọng đọc');
 const url=URL.createObjectURL(await res.blob());
 if(tts.cache.size>=200){const old=tts.cache.keys().next().value;URL.revokeObjectURL(tts.cache.get(old));tts.cache.delete(old);}
 tts.cache.set(k,url);return url;
}
async function speak(text,lang,ready){
 const run=stop();tts.audio ||= new Audio();
 let segments=[{text,lang}];
 if(lang==='vi-VN'){
  segments=tts.segments.get(text);
  if(!segments){
   const res=await fetch('/api/speech-segments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});
   if(!res.ok)throw Error('Không phân tích được giọng đọc. Bấm loa để thử lại.');
   segments=(await res.json()).segments;
   if(!validSegments(text,segments))throw Error('Phân đoạn giọng đọc không hợp lệ');
   if(tts.segments.size>=200)tts.segments.delete(tts.segments.keys().next().value);
   tts.segments.set(text,segments);
  }
 }
 let url;
 const key=lang+'|'+text;
 if(lang==='vi-VN'){
  url=tts.joined.get(key);
  if(!url){
   const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
   if(!Context)throw Error('Trình duyệt không hỗ trợ ghép âm thanh');
   const context=new Context({sampleRate:24000});
   try{
    const parts=[];
    // Two requests at a time: fetch ahead without flooding the TTS provider.
    const audible=segments.filter(s=>hasSpeech(s.text));
    for(let i=0;i<audible.length;i+=2){
     const batch=await Promise.all(audible.slice(i,i+2).map(async segment=>{
      const source=await audioUrl(segment.text,segment.lang);
      const response=await fetch(source);if(!response.ok)throw Error('Không tải được âm thanh');
      const buffer=await context.decodeAudioData(await response.arrayBuffer());
      return buffer.getChannelData(0);
     }));
     if(run!==tts.run)return;
     parts.push(...batch);
    }
    url=URL.createObjectURL(joinSpeech(parts,context.sampleRate));
    if(tts.joined.size>=30){const old=tts.joined.keys().next().value;URL.revokeObjectURL(tts.joined.get(old));tts.joined.delete(old);}
    tts.joined.set(key,url);
   }finally{await context.close();}
  }
 }else{url=await audioUrl(text,lang);}
 if(run!==tts.run)return;
 await new Promise((resolve,reject)=>{
  const finish=error=>{if(tts.cancel===cancel)tts.cancel=null;error?reject(error):resolve();};
  const cancel=()=>finish();tts.cancel=cancel;
  const audio=tts.audio;audio.src=url;audio.playbackRate=lang==='en-US'?0.85:1;
  audio.onended=()=>finish();audio.onerror=()=>finish(Error('Không phát được âm thanh. Bấm loa để thử lại.'));
  audio.play().then(ready).catch(()=>finish(Error('Trình duyệt chặn phát âm thanh. Bấm loa để thử lại.')));
 });
}
export default function SpeakBtn({ text, lang = "en-US", className = "", children = "🔊", ...rest }) {
 const [loading,setLoading]=useState(false),[error,setError]=useState('');
 const click=async()=>{if(loading)return;setLoading(true);setError('');try{await speak(text,lang,()=>setLoading(false));}catch(e){setError(e.message);}finally{setLoading(false);}};
 return <><button type="button" onClick={click} disabled={loading} aria-busy={loading} className={`${className} disabled:cursor-wait disabled:opacity-70`} {...rest}>{loading?<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-white align-middle"/>:children}</button>{error && <span role="alert" className="ml-2 text-xs text-amber-300">{error}</span>}</>;
}
