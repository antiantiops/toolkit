"use client";
import {useEffect,useState} from 'react';
import {RobotHead} from 'robot-heads';

const BURSTS=[
  {x:'22%',y:'20%',delay:0},
  {x:'78%',y:'24%',delay:.35},
  {x:'50%',y:'14%',delay:.7},
  {x:'32%',y:'38%',delay:1.1},
  {x:'68%',y:'42%',delay:1.45}
];

const COLORS=['#facc15','#34d399','#c084fc','#38bdf8','#fb7185','#f43f5e'];

export default function PronunciationCelebration({result}) {
  const [visible,setVisible]=useState(false),[reduced,setReduced]=useState(true);
  useEffect(()=>{
    setVisible(false);
    if(result?.status!=='feedback'||!Number.isInteger(result.score)||result.score<=90)return;
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setReduced(media.matches);update();media.addEventListener('change',update);
    setVisible(true);
    const timer=setTimeout(()=>setVisible(false),7000);
    return()=>{clearTimeout(timer);media.removeEventListener('change',update);};
  },[result]);
  if(!visible)return null;
  return <div data-pronunciation-celebration className="celebration" aria-hidden="true">
    <div className="fireworks">{!reduced&&BURSTS.map((b,bi)=><div className="burst" key={bi} style={{left:b.x,top:b.y}}>{Array.from({length:20},(_,i)=>{
      const angle=(i*Math.PI*2)/20;
      const dist=80+((i%3)*45);
      const color=COLORS[(bi+i)%COLORS.length];
      return <i key={i} style={{'--x':`${Math.cos(angle)*dist}px`,'--y':`${Math.sin(angle)*dist}px`,background:color,color,animationDelay:`${b.delay}s`}}/>;
    })}</div>)}</div>
    <div className="robot-flight"><RobotHead state="happy" size={76} color="#a7b8cf" interactive={false} paused={reduced}/></div>
    <p role="status" className="sr-only">Chúc mừng! {result.score}/100. Phát âm xuất sắc!</p>
    <style jsx>{`
      .celebration{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:20;border-radius:16px}
      .fireworks{position:absolute;inset:0;pointer-events:none}
      .burst{position:absolute;width:1px;height:1px}
      .burst i{position:absolute;width:6px;height:6px;border-radius:50%;box-shadow:0 0 10px 2px currentColor;opacity:0;animation:pronunciation-firework 1.8s ease-out 3}
      .robot-flight{position:absolute;top:20%;left:8px;width:76px;height:76px;pointer-events:none;animation:robot-patrol 3.2s ease-in-out infinite alternate}
      @keyframes robot-patrol{
        0%{left:8px;top:18%;transform:translateY(0) rotate(-10deg) scale(0.95)}
        50%{top:28%;transform:translateY(-18px) rotate(8deg) scale(1.05)}
        100%{left:calc(100% - 84px);top:16%;transform:translateY(8px) rotate(-6deg) scale(0.95)}
      }
      @keyframes pronunciation-firework{
        0%{transform:translate(0,0) scale(0.4);opacity:0}
        12%{opacity:1}
        70%{opacity:0.95}
        100%{transform:translate(var(--x),var(--y)) scale(0.2);opacity:0}
      }
      @media(prefers-reduced-motion:reduce){
        .robot-flight{animation:none;left:calc(100% - 84px);top:12%}
        .fireworks{display:none}
      }
    `}</style>
  </div>;
}
