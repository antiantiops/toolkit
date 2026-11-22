"use client";
import { useRef, useState } from "react";
import {joinSpeech,hasSpeech} from '../lib/join-speech.mjs';
import {validSegments} from '../lib/speech-segments.mjs';
import { createOxfordAttemptController, oxfordAudioUrl, oxfordPageUrl } from '../lib/lookup/oxford-playback.mjs';
const tts = { audio: null, cache: new Map(), oxfordMeta: new Map(), segments: new Map(), joined: new Map(), run: 0, cancel: null };
function stop(){tts.run++;tts.cancel?.();tts.cancel=null;tts.audio?.pause();globalThis.speechSynthesis?.cancel();return tts.run;}
const OXFORD_WORD = /^[A-Za-z][A-Za-z'-]{0,63}$/;
function cacheSet(k,url){
 if(tts.cache.size>=200){const old=tts.cache.keys().next().value,prev=tts.cache.get(old);if(prev?.startsWith('blob:'))URL.revokeObjectURL(prev);tts.cache.delete(old);tts.oxfordMeta.delete(old);}
 tts.cache.set(k,url);return url;
}
async function audioUrl(text,lang,allowOxford=true){
 const trimmed=String(text??'').trim();
 if(allowOxford&&(lang==='en-US'||lang==='en-GB')&&OXFORD_WORD.test(trimmed)){
  const word=trimmed.toLowerCase(),k='ox|'+lang+'|'+word;
  if(tts.cache.has(k))return tts.cache.get(k);
  const res=await fetch(`/api/pronunciation?word=${encodeURIComponent(word)}`).catch(()=>{throw Error('Không kết nối được phát âm Oxford. Bấm loa để thử lại.');});
  if(!res.ok)throw Error(`Không tải được phát âm Oxford (HTTP ${res.status}). Bấm loa để thử lại.`);
  const p=(await res.json().catch(()=>null))?.pronunciation;
  if(!p||p.source!=='Oxford')throw Error(`Không tìm thấy phát âm Oxford cho "${trimmed}". Bấm loa để thử lại.`);
  const raw=lang==='en-GB'?(p.audioUk||p.audioUs):(p.audioUs||p.audioUk);
  if(!raw)throw Error(`Không có file âm thanh Oxford cho "${trimmed}". Bấm loa để thử lại.`);
  const url=oxfordAudioUrl(raw);
  if(!url)throw Error('URL phát âm Oxford không hợp lệ. Bấm loa để thử lại.');
  const accent=raw===p.audioUk&&lang==='en-GB'?'uk':(raw===p.audioUs?'us':'uk');
  if(!tts.oxfordMeta.has(k)&&tts.oxfordMeta.size>=200)tts.oxfordMeta.delete(tts.oxfordMeta.keys().next().value);
  tts.oxfordMeta.set(k,{rawSourceUrl:p.sourceUrl||'',accent});
  return cacheSet(k,url);
 }
 const k=lang+'|'+text;
 if(tts.cache.has(k))return tts.cache.get(k);
 const res=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,lang})});
 if(!res.ok){const detail=await res.json().catch(()=>({}));throw Error(`Không tải được giọng đọc (HTTP ${res.status}${detail.requestId ? ` · ${detail.requestId}` : ''}). ${detail.error || 'Bấm loa để thử lại.'}`);}
 return cacheSet(k,URL.createObjectURL(await res.blob()));
}
async function speak(text,lang,ready,preferOxford=true){
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
      const source=await audioUrl(segment.text,segment.lang,false);
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
 }else{url=await audioUrl(text,lang,preferOxford);}
 if(run!==tts.run)return;
 const trimmedWord=String(text??'').trim();
 const isOxford=preferOxford&&(lang==='en-US'||lang==='en-GB')&&OXFORD_WORD.test(trimmedWord);
 const oxfordMeta=isOxford?tts.oxfordMeta.get('ox|'+lang+'|'+trimmedWord.toLowerCase()):null;
 await new Promise((resolve,reject)=>{
  let settled=false;
  let ctrl=null;
  const audio=tts.audio;
  const clear=()=>{
   if(tts.cancel===cancel)tts.cancel=null;
   if(audio){
    audio.onplaying=null;
    audio.onended=null;
    audio.onerror=null;
   }
  };
  const finish=error=>{
   if(settled)return;
   settled=true;
   clear();
   error?reject(error):resolve();
  };
  const cancel=()=>{ctrl?.cancel();finish();};
  tts.cancel=cancel;
  audio.src=url;
  audio.playbackRate=!isOxford&&lang==='en-US'?0.85:1;
  if(isOxford){
   const word=trimmedWord.toLowerCase();
   const accent=oxfordMeta?.accent||(lang==='en-GB'?'uk':'us');
   const oxfordHref=oxfordPageUrl(oxfordMeta?.rawSourceUrl||'',word);
   const makeOxfordErr=msg=>{const e=Error(msg);e.oxfordHref=oxfordHref;return e;};
   ctrl=createOxfordAttemptController({
    getAudio:()=>audio,
    onPlaying:()=>{if(run===tts.run)ready?.();},
    onEnded:()=>{if(run===tts.run)finish();},
    onFail:cause=>{
     if(run!==tts.run)return;
     finish(makeOxfordErr(cause==='play-rejected:NotAllowedError'?'Trình duyệt chặn phát âm thanh Oxford. Bấm loa để thử lại.':'Không phát được âm thanh Oxford. Bấm loa để thử lại.'));
    },
   });
   const attempt=ctrl.start({word,accent});
   audio.onplaying=()=>ctrl.handlePlaying(attempt);
   audio.onended=()=>ctrl.handleEnded(attempt);
   audio.onerror=()=>ctrl.handleError(attempt);
   try{
    Promise.resolve(audio.play()).catch(err=>{
     if(run!==tts.run)return;
     ctrl.handlePlayRejected(err,attempt);
    });
   }catch(err){
    if(run===tts.run)ctrl.handlePlayRejected(err,attempt);
   }
   return;
  }
  audio.onplaying=null;
  audio.onended=()=>finish();
  audio.onerror=()=>finish(Error('Không phát được âm thanh. Bấm loa để thử lại.'));
  try{
   Promise.resolve(audio.play()).then(ready).catch(()=>finish(Error('Trình duyệt chặn phát âm thanh. Bấm loa để thử lại.')));
  }catch{
   finish(Error('Trình duyệt chặn phát âm thanh. Bấm loa để thử lại.'));
  }
 });
}
export default function SpeakBtn({ text, lang = "en-US", className = "", children = "🔊", lockWhilePlaying = false, preferOxford = true, ...rest }) {
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[oxfordLink,setOxfordLink]=useState('');
 const busyRef=useRef(false);
 const click=async()=>{
  if(busyRef.current)return;
  busyRef.current=true;
  setLoading(true);
  if(lockWhilePlaying)setBusy(true);
  setError('');
  setOxfordLink('');
  try{
   await speak(text,lang,()=>{
    setLoading(false);
    if(!lockWhilePlaying)busyRef.current=false;
   },preferOxford);
  }catch(e){
   setError(e.message);
   const trimmed=String(text??'').trim();
   if(e?.oxfordHref)setOxfordLink(e.oxfordHref);
   else if(preferOxford&&(lang==='en-US'||lang==='en-GB')&&OXFORD_WORD.test(trimmed))setOxfordLink(oxfordPageUrl('',trimmed));
  }finally{
   setLoading(false);
   if(lockWhilePlaying)setBusy(false);
   busyRef.current=false;
  }
 };
 const isDisabled=loading||busy;
 return <><button type="button" onClick={click} disabled={isDisabled} aria-busy={loading} className={`${className} disabled:cursor-wait disabled:opacity-70`} {...rest}>{loading?<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-white align-middle"/>:children}</button>{error && <span role="alert" className="ml-2 text-xs text-amber-300">{error}{oxfordLink && <> <a href={oxfordLink} className="inline-flex min-h-7 items-center underline text-violet-200 hover:text-white">Nghe trên Oxford</a></>}</span>}</>;
}
