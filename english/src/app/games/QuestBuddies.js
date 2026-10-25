import { useEffect, useState } from "react";
export default function QuestBuddies({feedback,repair,combo,done,started,position}) {
 const [keyboard,setKeyboard]=useState(false);
 useEffect(()=>{
  const viewport=window.visualViewport;
  const update=()=>setKeyboard(Boolean(viewport && window.innerHeight-viewport.height>140 && /INPUT|TEXTAREA/.test(document.activeElement?.tagName||'')));
  viewport?.addEventListener('resize',update);document.addEventListener('focusin',update);document.addEventListener('focusout',update);
  return()=>{viewport?.removeEventListener('resize',update);document.removeEventListener('focusin',update);document.removeEventListener('focusout',update);};
 },[]);
 const mood=done?'celebrate':feedback?.correct?(combo>=3?'celebrate':'happy'):feedback?.correct===false?'encourage':repair!==null?'coach':started?'waiting':'welcome';
 const lines={welcome:['Cùng chinh phục từ mới nhé!','Tụi mình luôn ở đây cổ vũ bạn.'],waiting:['Đang hóng đáp án của bạn…','Cứ suy nghĩ, không cần vội!'],happy:['Đúng rồi! Đập tay nào!','Một bước nữa, giỏi lắm!'],celebrate:[done?'Về đích rồi! Bạn đã rất cố gắng!':`Combo ${combo}! Đỉnh quá!`,'Ăn mừng chút rồi đi tiếp nào!'],encourage:['Chưa đúng thôi, không sao cả.','Tụi mình cùng thử lại nhé!'],coach:[repair>0?`Đã đúng ${repair}/5 lượt! Tiếp nào!`:'Nhìn kỹ từ rồi thử lại cùng mình.','Mỗi lần thử là một bước tiến.']};
 return <div className={`quest-buddies ${started?"buddy-docked":""} ${keyboard?"buddy-keyboard":""} mood-${mood}`} data-buddy-mood={mood}>
  <div className="buddy-pair" aria-hidden="true">{['cat','blob'].map((kind,i)=><svg key={kind} viewBox="0 0 120 120" className={`quest-buddy buddy-${kind}`}>
   <ellipse cx="60" cy="111" rx="30" ry="5" fill="#020617" opacity=".4"/>
   <g className="buddy-body">
    {i===0?<><path d="M25 47 22 15 48 33M72 33 98 15 95 48" fill="#a78bfa" stroke="#ddd6fe" strokeWidth="3"/><path d="m28 26 3 17 10-8m51-9-3 17-10-8" fill="#f9a8d4"/></>:<path d="M50 31 Q31 5 52 13 Q65 16 61 34 Q75 6 85 18 Q91 29 68 36" fill="#5eead4"/>}
    <rect x="23" y="32" width="74" height="69" rx={i===0?'29':'35'} fill={i===0?'#a78bfa':'#2dd4bf'} stroke={i===0?'#ddd6fe':'#99f6e4'} strokeWidth="3"/>
    <ellipse cx="60" cy="89" rx="20" ry="10" fill="white" opacity=".18"/>
    <g className="buddy-arm left"><path d="M25 72 Q7 58 13 79" fill="none" stroke={i===0?'#c4b5fd':'#5eead4'} strokeWidth="9" strokeLinecap="round"/></g>
    <g className="buddy-arm right"><path d="M95 72 Q113 58 107 79" fill="none" stroke={i===0?'#c4b5fd':'#5eead4'} strokeWidth="9" strokeLinecap="round"/></g>
    {['happy','celebrate'].includes(mood)?<g fill="none" stroke="#172554" strokeWidth="4" strokeLinecap="round"><path d="M36 57 Q42 47 48 57M72 57 Q78 47 84 57"/><path d="M49 69 Q60 87 71 69Z" fill="#fda4af"/></g>:<><g className="buddy-eyes" fill="#172554"><ellipse cx="43" cy="57" rx="5" ry={mood==='encourage'?'5':'7'}/><ellipse cx="77" cy="57" rx="5" ry={mood==='encourage'?'5':'7'}/><circle cx="45" cy="54" r="2" fill="white"/><circle cx="79" cy="54" r="2" fill="white"/></g><path d={mood==='encourage'?'M52 77 Q60 69 68 77':mood==='waiting'?'M56 74 Q60 79 64 74':'M50 72 Q60 82 70 72'} stroke="#172554" strokeWidth="3" fill="none" strokeLinecap="round"/>{mood==='encourage'&&<path d="m36 44 12 3m24 0 12-3" stroke="#172554" strokeWidth="2"/>}</>}
    <ellipse cx="34" cy="70" rx="7" ry="4" fill="#fda4af" opacity=".65"/><ellipse cx="86" cy="70" rx="7" ry="4" fill="#fda4af" opacity=".65"/>
   </g>
   {mood==='celebrate'&&<g fill="#fcd34d"><path d="m14 20 2 6 6 2-6 2-2 6-2-6-6-2 6-2ZM105 36l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/></g>}
  </svg>)}</div>
  <div key={`${mood}-${position}-${repair}`} className="buddy-speech" aria-live="polite"><p className="font-semibold text-slate-100">{lines[mood][0]}</p><p className="mt-1 text-xs text-slate-400">{lines[mood][1]}</p></div>
 </div>;
}
