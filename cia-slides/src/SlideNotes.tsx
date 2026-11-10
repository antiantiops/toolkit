import {useState,useEffect} from 'react';
import {Copy,Check} from 'lucide-react';
import './slide-notes.css';
const titles=['About NIM','My Company & I','Which AI Do You Use?','Objectives','Using AI','Body + Brain','Challenges','Data Access','Reading','Vibe Coding','English · Everyday'];
const pageNumber=()=>Math.min(11,Math.max(1,Number(location.hash.slice(1))||1));
export function SlideNotes(){
 const[page,setPage]=useState(pageNumber),[notes,setNotes]=useState<Record<string,string>>({}),[status,setStatus]=useState('Loading notes…'),[copied,setCopied]=useState(false);
 useEffect(()=>{const sync=()=>setPage(pageNumber());addEventListener('hashchange',sync);return()=>removeEventListener('hashchange',sync);},[]);
 useEffect(()=>{const c=new AbortController();fetch('/api/notes',{signal:c.signal}).then(r=>r.ok?r.json():Promise.reject()).then(d=>{setNotes(d.notes||{});setStatus('Saved on server');}).catch(e=>{if(e.name!=='AbortError')setStatus('Could not load notes from server.');});return()=>c.abort()},[]);
 const save=(value:string)=>{const next={...notes,[page]:value};setNotes(next);setStatus('Saving…');fetch('/api/notes',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({notes:next})}).then(r=>{if(!r.ok)throw Error();setStatus('Saved on server');}).catch(()=>setStatus('Could not save. Your text is still in this box.'));};
 const copyAll=async()=>{
  const all=titles.map((title,i)=>{const body=(notes[i+1]||'').trim();return body?`# Slide ${i+1} — ${title}\n\n${body}`:'';}).filter(Boolean).join('\n\n---\n\n');
  try{await navigator.clipboard.writeText(all);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{setStatus('Could not copy to clipboard.');}
 };
 return <main className="slide-notes"><header><div className="notes-header-row"><div><h1>Presentation Notes</h1><p>Notes are saved on the server and shared across devices accessing this page. Do not enter passwords or sensitive information.</p></div><button type="button" className="copy-all-btn" onClick={copyAll}>{copied?<Check size={16}/>:<Copy size={16}/>} <span>{copied?'Copied all':'Copy all script'}</span></button></div></header><div className="notes-layout"><nav aria-label="Select slide notes">{titles.map((title,i)=><a key={title} href={`#${i+1}`} aria-current={page===i+1?'page':undefined}><b>{String(i+1).padStart(2,'0')}</b> {title}</a>)}</nav><section><h2>Slide {page} · {titles[page-1]}</h2><label htmlFor="speaker-notes">Presentation script</label><textarea id="speaker-notes" value={notes[page]||''} onChange={e=>save(e.target.value)} placeholder="Write key points, script, or questions for this slide…"/><p role="status">{status}</p></section></div></main>;
}
