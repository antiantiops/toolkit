import {useId,useEffect,useState,useRef} from 'react';
import {AppWindow,BrainCircuit,UserRound} from 'lucide-react';
export function CiaAgentLoop({english,spotlight='off'}:{english:boolean;spotlight?:string}) {
 const [stage,setStage]=useState(0);
 const motion=useRef<SVGAnimateMotionElement>(null);
 const [processing,setProcessing]=useState(false);
 const [resultReady,setResultReady]=useState(false);
 const steps=[
  ['M72 88V148','Bạn giao nhiệm vụ','You assign a task'],
  ['M265 165H336','Agent hỏi model','Agent asks model'],
  ['M336 200H265','Model bảo Agent mở Chrome trước','Model tells Agent to open Chrome first'],
  ['M85 213V263H127V325','Gửi lệnh tới Chrome','Send command to Chrome'],
  ['', 'Chrome mở cửa sổ','Chrome opens'],
  ['', 'Nhập địa chỉ web CIA','Enter CIA website address'],
  ['', 'Xem và đọc lịch học','View and read schedule'],
  ['', 'Đọc xong · đóng Chrome','Reading complete · close Chrome'],
  ['M127 325V263H85V213','Chrome gửi dữ liệu về Agent','Chrome returns data to Agent'],
  ['M265 165H336','Agent gửi lịch về model','Agent sends schedule to model'],
  ['M336 200H265','Model yêu cầu kiểm tra và tính giờ','Model requests checks and calculations'],
  ['M150 213V263H217V325','Gửi lệnh tới Terminal','Send command to Terminal'],
  ['', 'Terminal mở · chạy kiểm tra','Terminal opens · runs checks'],
  ['', 'Kiểm tra xong · đóng Terminal','Checks complete · close Terminal'],
  ['M217 325V263H150V213','Terminal trả kết quả về Agent','Terminal returns results to Agent'],
  ['M265 165H336','Agent gửi kết quả về model','Agent sends results to model'],
  ['M336 200H265','Model trả timetable · bạn duyệt','Model returns timetable · you review'],
 ];
 const final=steps.length-1;
 const incoming=[1,9,15].includes(stage);
 useEffect(()=>{
  setProcessing(false);
  setResultReady(false);
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setStage(final);setResultReady(true);return;}
  motion.current?.beginElement();
  const arrival=stage===final?window.setTimeout(()=>setResultReady(true),1700):undefined;
  const glow=incoming?window.setTimeout(()=>setProcessing(true),1700):undefined;
  const next=window.setTimeout(()=>setStage(s=>(s+1)%steps.length),stage===12?7200:stage===final?4500:incoming?5900:2400);
  return()=>{window.clearTimeout(arrival);window.clearTimeout(glow);window.clearTimeout(next)};
 },[stage]);
 const activeApp=stage>=3&&stage<=8?'Chrome':stage>=11&&stage<=14?'Terminal':'';
 const windowApp=stage>=4&&stage<=7?'Chrome':stage>=12&&stage<=13?'Terminal':'';
 const closing=[7,13].includes(stage);
 const id=useId().replace(/:/g,'');const t=(vi:string,en:string)=>english?en:vi;
 const arrow=(d:string)=> <path d={d} className="flow-wire" markerEnd={`url(#${id})`}/>;
 const app=(x:number,y:number,title:string)=>{
  const icons:Record<string,string>={Chrome:'chrome',Terminal:'terminal',Files:'finder','VS Code':'vscode',Mail:'mail',Calendar:'calendar',Notes:'notes',Photos:'photos'};
  return <g data-app-icon={title} className={activeApp===title?'cia-app-active':''}>
   <image href={`/app-icons/${icons[title]}.webp`} x={x+30} y={y-1} width="48" height="48"/>
   <text x={x+54} y={y+54} textAnchor="middle" className="flow-title" style={{fontSize:11}}>{title==='Files'?'Finder':title}</text>
  </g>;
 };

 return <svg data-stage={stage} className="cia-agent-loop" viewBox="0 0 520 530" role="img" aria-label={t('Agent trên PC trao đổi với model OpenAI và mở ứng dụng Chrome và Terminal','PC agent exchanges messages with OpenAI model and opens Chrome và Terminal')}><defs><marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
 <path d="M24 12H288Q300 12 300 24V275H496Q508 275 508 287V454Q508 466 496 466H24Q12 466 12 454V24Q12 12 24 12Z" fill="#f0fdfa" stroke="#8bbab1" strokeDasharray="5 4"/>
 <text x="156" y="34" textAnchor="middle" className="workflow-zone">{t('MÁY TÍNH CỦA BẠN','YOUR PC')}</text>
 <UserRound x="55" y="51" width="34" height="34"/><text x="105" y="71" className="flow-title">{t('Người dùng','User')}</text>
 <text x="156" y="103" textAnchor="middle" className="flow-sub">{t('“Xem lịch CIA, tạo timetable giúp tôi”','“Check CIA; create my timetable”')}</text>
 {arrow('M72 88V143')}
 <rect x="35" y="148" width="230" height="65" rx="9" className="flow-node"/><AppWindow x="47" y="166" width="23" height="23"/><text x="158" y="173" textAnchor="middle" className="flow-title">Agent</text><text x="150" y="194" textAnchor="middle" className="flow-sub">{t('Nhận yêu cầu · mở ứng dụng','Receives task · opens applications')}</text>
 <rect className="cia-cloud-box" x="336" y="111" width="172" height="153" rx="12" fill="#faf5ff" stroke="#a78bba" strokeWidth="1.8"/>
 <defs><clipPath id={`${id}-minion-peek`}><rect x="400" y="65" width="44" height="46"/></clipPath></defs><g clipPath={`url(#${id}-minion-peek)`} aria-hidden="true">{processing&&<g className="cia-reading-minion"><image href="/mascots/minion-reading-v2.webp" x="412" y="78" width="20" height="32" preserveAspectRatio="xMidYMax meet"/></g>}</g>
 {processing&&<g className="cia-model-thought" aria-label={t('Model chọn ứng dụng tiếp theo','Model selects next application')}><rect x="305" y="16" width="207" height="49" rx="12" fill="white" stroke="#a78bba"/><circle cx="421" cy="70" r="3" fill="white" stroke="#a78bba"/><circle cx="422" cy="76" r="1.5" fill="#a78bba"/><text x="408" y="35" textAnchor="middle" style={{fontSize:10,fill:'#64748b'}}>{t('Nên mở ứng dụng gì?','Which application next?')}</text><text x="408" y="53" textAnchor="middle" style={{fontSize:11,fontWeight:700,fill:'#6b21a8'}}>{stage===1?t('Agent, mở Chrome trước.','Agent, open Chrome first.'):stage===9?t('Agent, mở Terminal kiểm tra.','Agent, open Terminal to check.'):t('Đủ dữ liệu. Trả timetable.','Enough data. Return timetable.')}</text></g>}
 <text x="422" y="137" textAnchor="middle" className="workflow-zone">OPENAI · CLOUD</text><g key={`brain-${stage}-${processing}`} className={processing?"cia-brain-processing":""}><circle cx="422" cy="167" r="26" className="cia-brain-halo"/><BrainCircuit x="404" y="151" width="36" height="32"/></g><text x="422" y="207" textAnchor="middle" className="flow-title">Model</text><text x="422" y="230" textAnchor="middle" className="flow-sub">{t('Phân tích · chọn bước','Analyze · select next step')}</text>
 {arrow('M265 165H336')}{arrow('M336 200H265')}
 <text x="300" y="154" textAnchor="middle" className="flow-sub">{t('Yêu cầu','Request')}</text><text x="300" y="222" textAnchor="middle" className="flow-sub">{t('Chỉ dẫn','Instructions')}</text>
 <rect x="24" y="286" width="472" height="168" rx="12" fill="#f8fafc" stroke="#8bbab1"/>
 <text x="265" y="310" textAnchor="middle" className="workflow-zone">{t('ỨNG DỤNG TRÊN PC · AGENT MỞ VÀ SỬ DỤNG','PC APPLICATIONS · OPENED AND USED BY AGENT')}</text>
 <g data-testid="cia-app-links">
 {stage>=3&&stage<=8&&arrow('M85 213V263H127V325')}
 {stage>=11&&stage<=14&&arrow('M150 213V263H217V325')}
 </g>

 {app(73,325,'Chrome')}
 {app(163,325,'Terminal')}
 {app(253,325,'Files')}
 {app(343,325,'VS Code')}
 {app(73,387,'Mail')}
 {app(163,387,'Calendar')}
 {app(253,387,'Notes')}
 {app(343,387,'Photos')}
 {windowApp&&<g key={`${windowApp}-${closing}`} data-app-window={windowApp} className={closing?'cia-window cia-window-closing':'cia-window'} style={{transformOrigin:windowApp==='Chrome'?'127px 344px':'217px 344px'}}>
 <rect x="30" y="285" width="470" height="177" rx="10" fill={windowApp==='Terminal'?'#172033':'white'} stroke="#0f766e" strokeWidth="2"/>
 <path d="M31 313H499" stroke="#cbd5e1"/><text x="48" y="304" style={{fontSize:12,fill:'#0f766e',fontWeight:700}}>{windowApp}</text><text x="477" y="304" fill="#dc2626">×</text>
 {windowApp==='Chrome'?<>
 <rect x="45" y="321" width="440" height="22" rx="6" fill="#f1f5f9"/><text x="57" y="337" className="flow-sub">{stage===4?'about:blank':'https://cia.example/timetable'}</text>
 {stage>=6&&<g><text x="55" y="367" className="flow-title">CIA · {t('Lịch học','Class schedule')}</text><path d="M50 376H480M50 404H480M50 432H480M185 376V432" stroke="#cbd5e1"/><text x="60" y="395" className="flow-sub">09:00–09:45</text><text x="202" y="395" className="flow-sub">Speaking</text><text x="60" y="423" className="flow-sub">10:00–10:45</text><text x="202" y="423" className="flow-sub">Listening</text><rect x="50" y="378" width="430" height="25" fill="#14b8a6" opacity=".13"/></g>}
 </>:<g fontFamily="monospace" fontSize="12">
 <defs><clipPath id={`${id}-typing`}><rect x="45" y="322" width="440" height="20" className={closing?"":"cia-terminal-typing"}/></clipPath><clipPath id={`${id}-terminal`}><rect x="45" y="321" width="440" height="112"/></clipPath></defs>
 <g clipPath={`url(#${id}-terminal)`}>
 <g className={closing?'':'cia-terminal-scroll'} style={closing?{transform:"translateY(-175px)"}:undefined} fill="#86efac">
 <text x="50" y="338" clipPath={`url(#${id}-typing)`}>$ <tspan>python check_schedule.py --input cia.json</tspan></text>
 {['[init] Loading CIA schedule...', '[read] Speaking   09:00 - 09:45', '[read] Listening  10:00 - 10:45', '[parse] 2 classes normalized', '[check] Timezone: Asia/Manila', '[check] Checking overlapping slots...', '[pass] Speaking / Listening: no overlap', '[calc] Free slot: 09:45 - 10:00', '[calc] Break: 15 min', '[calc] Total lessons: 90 min', '[build] Exporting timetable.json...', '[done] 2 classes checked', 'Conflicts: 0 · Free slot: 15 min'].map((line,i)=><text key={line} className={closing?'':'cia-terminal-line'} style={{animationDelay:`${1.3+i*.34}s`}} x="50" y={358+i*18}>{line}</text>)}
 </g>
 </g>
 <rect x="50" y="436" width="420" height="3" rx="1.5" fill="#334155"/><rect x="50" y="436" width="420" height="3" rx="1.5" fill="#2dd4bf" className={closing?'':'cia-terminal-progress'}/>
 </g>}
 <text x="260" y="451" textAnchor="middle" className="flow-sub">{t('Mô phỏng · dữ liệu giả lập','Simulation · fictional data')}</text>
 </g>}
 {stage===final&&resultReady&&<g className="cia-result-reveal" data-result-location="agent"><rect x="35" y="148" width="230" height="115" rx="9" fill="white" stroke="#0f766e" strokeWidth="2"/><text x="150" y="166" textAnchor="middle" className="flow-title" style={{fontSize:12}}>Agent · Timetable</text><path d="M45 174H255M45 201H255M45 228H255M140 174V228" stroke="#cbd5e1"/><text x="48" y="192" className="flow-sub" style={{fontSize:11}}>09:00–09:45</text><text x="148" y="192" className="flow-sub" style={{fontSize:11}}>Speaking</text><text x="48" y="219" className="flow-sub" style={{fontSize:11}}>10:00–10:45</text><text x="148" y="219" className="flow-sub" style={{fontSize:11}}>Listening</text><text x="150" y="242" textAnchor="middle" className="flow-sub" style={{fontSize:10}}>{t('Bản nháp · chờ bạn duyệt','Draft · awaiting your review')}</text><text x="150" y="256" textAnchor="middle" className="flow-sub" style={{fontSize:9}}>{t('Dữ liệu giả lập','Fictional data')}</text></g>}
 <g key={stage} className="cia-story-packet" style={{visibility:processing||(stage===final&&resultReady)||!steps[stage][0]?"hidden":"visible"}} aria-hidden="true"><animateMotion ref={motion} begin="indefinite" path={steps[stage][0]} dur="1.7s" fill="freeze"/><rect x="-10" y="-7" width="20" height="14" rx="4" fill="#0f766e" stroke="white" strokeWidth="2"/><path d="M-6-3L0 1L6-3" fill="none" stroke="white"/></g>
 <rect x="24" y="477" width="472" height="25" rx="8" fill={stage===final?'#dcfce7':'#e0f2fe'}/><text x="260" y="494" textAnchor="middle" style={{fontSize:12,fontWeight:700,fill:'#0f172a'}}>{stage+1}/{steps.length} · {t(steps[stage][1],steps[stage][2])}</text>

 <text x="260" y="520" textAnchor="middle" className="flow-title" style={{fontSize:12}}>{t('Model hướng dẫn · Agent thao tác · Bạn duyệt timetable','Model guides · Agent acts · You review timetable')}</text>
 {spotlight!=='off'&&<><defs><mask id={`${id}-spotlight-mask`}><rect width="520" height="530" fill="white"/>{spotlight==='pc'?<path d="M24 12H288Q300 12 300 24V275H496Q508 275 508 287V454Q508 466 496 466H24Q12 466 12 454V24Q12 12 24 12Z" fill="black"/>:<rect x="336" y="111" width="172" height="153" rx="12" fill="black"/>}</mask><filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#f59e0b" floodOpacity="0.75"/><feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#fbbf24" floodOpacity="0.9"/></filter></defs><rect width="520" height="530" fill="#0f172a" fillOpacity="0.55" mask={`url(#${id}-spotlight-mask)`} className="flow-spotlight-overlay"/>{spotlight==='pc'?<path d="M24 12H288Q300 12 300 24V275H496Q508 275 508 287V454Q508 466 496 466H24Q12 466 12 454V24Q12 12 24 12Z" fill="none" stroke="#f59e0b" strokeWidth="3" filter={`url(#${id}-glow)`} className="flow-spotlight-glow"/>:<rect x="336" y="111" width="172" height="153" rx="12" fill="none" stroke="#f59e0b" strokeWidth="3" filter={`url(#${id}-glow)`} className="flow-spotlight-glow"/>}</>}
 </svg>;
}
