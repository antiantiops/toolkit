import {useState,useEffect} from 'react';
import './slide-notes.css';
const titles=['About NIM','My Company & I','Bạn dùng AI nào?','Sử dụng AI','Body + Brain','Thử thách','Truy cập dữ liệu','Vibe Coding','Reading','English · Everyday'];
const pageNumber=()=>Math.min(10,Math.max(1,Number(location.hash.slice(1))||1));
export function SlideNotes(){
 const[page,setPage]=useState(pageNumber),[text,setText]=useState(''),[status,setStatus]=useState('');
 useEffect(()=>{const sync=()=>setPage(pageNumber());addEventListener('hashchange',sync);return()=>removeEventListener('hashchange',sync);},[]);
 useEffect(()=>{try{setText(localStorage.getItem(`deck-notes-${page}`)||'');setStatus('Lưu trên trình duyệt này');}catch{setText('');setStatus('Không đọc được bộ nhớ trình duyệt');}},[page]);
 const save=(value:string)=>{setText(value);try{localStorage.setItem(`deck-notes-${page}`,value);setStatus('Đã lưu trên trình duyệt này');}catch{setStatus('Không lưu được. Hãy sao chép nội dung trước khi đóng tab.');}};
 return <main className="slide-notes"><header><h1>Ghi chú thuyết trình</h1><p>Ghi chú riêng trên trình duyệt này, không đồng bộ giữa thiết bị. Không nhập mật khẩu hoặc thông tin nhạy cảm.</p></header><div className="notes-layout"><nav aria-label="Chọn ghi chú slide">{titles.map((title,i)=><a key={title} href={`#${i+1}`} aria-current={page===i+1?'page':undefined}><b>{String(i+1).padStart(2,'0')}</b> {title}</a>)}</nav><section><h2>Slide {page} · {titles[page-1]}</h2><label htmlFor="speaker-notes">Nội dung trình bày</label><textarea id="speaker-notes" value={text} onChange={e=>save(e.target.value)} placeholder="Viết ý chính, lời dẫn hoặc câu hỏi cho slide này…"/><p role="status">{status}</p></section></div></main>;
}
