import {useState,useEffect} from 'react';
import './slide-notes.css';
const titles=['About NIM','My Company & I','Bạn dùng AI nào?','Sử dụng AI','Body + Brain','Thử thách','Truy cập dữ liệu','Vibe Coding','Reading','English · Everyday'];
const pageNumber=()=>Math.min(10,Math.max(1,Number(location.hash.slice(1))||1));
export function SlideNotes(){
 const[page,setPage]=useState(pageNumber),[notes,setNotes]=useState<Record<string,string>>({}),[status,setStatus]=useState('Đang tải ghi chú…');
 useEffect(()=>{const sync=()=>setPage(pageNumber());addEventListener('hashchange',sync);return()=>removeEventListener('hashchange',sync);},[]);
 useEffect(()=>{const c=new AbortController();fetch('/api/notes',{signal:c.signal}).then(r=>r.ok?r.json():Promise.reject()).then(d=>{setNotes(d.notes||{});setStatus('Lưu trên máy chủ');}).catch(e=>{if(e.name!=='AbortError')setStatus('Không tải được ghi chú từ máy chủ.');});return()=>c.abort()},[]);
 const save=(value:string)=>{const next={...notes,[page]:value};setNotes(next);setStatus('Đang lưu…');fetch('/api/notes',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({notes:next})}).then(r=>{if(!r.ok)throw Error();setStatus('Đã lưu trên máy chủ');}).catch(()=>setStatus('Không lưu được. Nội dung vẫn còn trong ô này.'));};
 return <main className="slide-notes"><header><h1>Ghi chú thuyết trình</h1><p>Ghi chú lưu trên máy chủ, dùng chung giữa thiết bị truy cập trang này. Không nhập mật khẩu hoặc thông tin nhạy cảm.</p></header><div className="notes-layout"><nav aria-label="Chọn ghi chú slide">{titles.map((title,i)=><a key={title} href={`#${i+1}`} aria-current={page===i+1?'page':undefined}><b>{String(i+1).padStart(2,'0')}</b> {title}</a>)}</nav><section><h2>Slide {page} · {titles[page-1]}</h2><label htmlFor="speaker-notes">Nội dung trình bày</label><textarea id="speaker-notes" value={notes[page]||''} onChange={e=>save(e.target.value)} placeholder="Viết ý chính, lời dẫn hoặc câu hỏi cho slide này…"/><p role="status">{status}</p></section></div></main>;
}
