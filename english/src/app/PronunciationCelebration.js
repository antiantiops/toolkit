"use client";
import {useEffect,useState} from 'react';
import {RobotHead} from 'robot-heads';

export default function PronunciationCelebration({result}) {
  const [visible,setVisible]=useState(false),[reduced,setReduced]=useState(true);
  useEffect(()=>{
    setVisible(false);
    if(result?.status!=='feedback'||!Number.isInteger(result.score)||result.score<=90)return;
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setReduced(media.matches);update();media.addEventListener('change',update);
    setVisible(true);
    const timer=setTimeout(()=>setVisible(false),6500);
    return()=>{clearTimeout(timer);media.removeEventListener('change',update);};
  },[result]);
  if(!visible)return null;
  return <div data-pronunciation-celebration className="celebration">
    <div className="fireworks" aria-hidden="true">{!reduced&&[0,1,2].map(burst=><div className="burst" key={burst} style={{left:`${20+burst*30}%`,top:`${25+(burst%2)*18}%`}}>{Array.from({length:12},(_,i)=><i key={i} style={{'--x':`${Math.cos(i*Math.PI/6)*85}px`,'--y':`${Math.sin(i*Math.PI/6)*85}px`,background:['#fbbf24','#34d399','#a78bfa','#38bdf8'][i%4],animationDelay:`${burst*.45}s`}}/>)}</div>)}</div>
    <div className="robot-party">
      <div aria-hidden="true"><RobotHead state="happy" size={90} color="#a7b8cf" interactive={false} paused={reduced}/></div>
      <p role="status" className="congrats"><strong>Chúc mừng! {result.score}/100</strong><br/>Phát âm xuất sắc!</p>
      <button type="button" aria-label="Đóng lời chúc mừng" onClick={()=>setVisible(false)}>×</button>
    </div>
    <style jsx>{`
      .celebration{position:relative;margin-top:20px;isolation:isolate}
      .fireworks{position:absolute;inset:-140px 0 0;pointer-events:none;overflow:hidden;z-index:0}
      .burst{position:absolute;width:1px;height:1px}
      .burst i{position:absolute;width:5px;height:5px;border-radius:50%;opacity:0;animation:pronunciation-firework 1.7s ease-out 3}
      .robot-party{position:relative;display:flex;align-items:center;justify-content:center;gap:8px;min-height:108px;padding:8px 26px 8px 4px;border:1px solid #34d39966;border-radius:16px;background:#064e3bcc;animation:robot-arrive .8s cubic-bezier(.2,.8,.3,1) both;overflow:hidden}
      .congrats{color:#a7f3d0;font-size:13px;line-height:1.6}
      button{position:absolute;right:0;top:0;width:44px;height:44px;color:#a7f3d0;font-size:22px}
      button:focus-visible{outline:2px solid #a7f3d0;outline-offset:-3px;border-radius:8px}
      @keyframes robot-arrive{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
      @keyframes pronunciation-firework{0%{transform:translate(0,0) scale(.3);opacity:0}12%{opacity:1}85%,100%{transform:translate(var(--x),var(--y)) scale(.3);opacity:0}}
      @media(prefers-reduced-motion:reduce){.robot-party{animation:none}.fireworks{display:none}}
    `}</style>
  </div>;
}
