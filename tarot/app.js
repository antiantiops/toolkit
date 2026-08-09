/* ── 78-card Rider-Waite Tarot ── */
const major=[
['The Fool','00-TheFool.png','Khởi đầu, niềm tin, bước đi mới','Kẻ Khờ gợi về một khởi đầu mới. Hãy bước đi với lòng tin, nhưng giữ mắt mở.'],
['The Magician','01-TheMagician.png','Năng lực, tập trung, tạo tác','Bạn đã có đủ công cụ. Tập trung vào một việc và làm nó đến nơi.'],
['The High Priestess','02-TheHighPriestess.png','Trực giác, điều chưa nói','Có điều bạn đã biết trong lòng. Lắng nghe bên trong trước khi tìm bên ngoài.'],
['The Empress','03-TheEmpress.png','Nuôi dưỡng, đủ đầy','Điều tốt đẹp lớn lên khi được chăm sóc đều đặn. Đừng ép nó nở quá sớm.'],
['The Emperor','04-TheEmperor.png','Cấu trúc, ranh giới','Đã đến lúc đặt nguyên tắc rõ ràng. Kỷ luật bảo vệ điều quan trọng.'],
['The Hierophant','05-TheHierophant.png','Niềm tin, truyền thống','Có giá trị cũ vẫn đáng giữ. Nhưng đừng giữ chỉ vì quen.'],
['The Lovers','06-TheLovers.png','Lựa chọn, kết nối','Đừng chọn chỉ vì sợ mất. Chọn điều khớp với giá trị thật của bạn.'],
['The Chariot','07-TheChariot.png','Quyết tâm, tiến lên','Hướng đi đang rõ dần. Giữ tay lái chắc, đừng để cảm xúc kéo lệch.'],
['Strength','08-Strength.png','Can đảm, kiên trì','Sức mạnh không cần gầm lên. Bình tĩnh và bền bỉ sẽ thắng thế.'],
['The Hermit','09-TheHermit.png','Tĩnh lặng, soi xét','Bạn cần một khoảng lùi để nghe mình rõ hơn.'],
['Wheel of Fortune','10-WheelOfFortune.png','Chuyển động, cơ hội','Bánh xe đang xoay. Đón thay đổi, nhưng đừng trao hết cho may rủi.'],
['Justice','11-Justice.png','Sự thật, cân bằng','Hãy nhìn thẳng vào dữ kiện. Công bằng cần sự rõ ràng từ cả hai phía.'],
['The Hanged Man','12-TheHangedMan.png','Tạm dừng, đổi góc nhìn','Đừng vội kéo tình huống đi tiếp. Một góc nhìn khác có thể đổi cả câu trả lời.'],
['Death','13-Death.png','Kết thúc, chuyển hóa','Một chương cần khép lại để chỗ trống xuất hiện. Buông không phải thất bại.'],
['Temperance','14-Temperance.png','Điều độ, hòa hợp','Đi chậm lại một nhịp. Sự cân bằng giúp bạn đi xa hơn cố gắng cực đoan.'],
['The Devil','15-TheDevil.png','Ràng buộc, nhận thức','Gọi đúng tên thứ đang giữ bạn lại. Khi nhìn rõ, bạn đã có nửa con đường.'],
['The Tower','16-TheTower.png','Đổ vỡ, thức tỉnh','Một cấu trúc cũ đang lung lay. Sự thật có thể dữ dội, nhưng giải phóng.'],
['The Star','17-TheStar.png','Hy vọng, chữa lành','Dù đoạn đường vừa qua nặng nề, vẫn còn ánh sáng. Nuôi lại niềm tin nhỏ nhất.'],
['The Moon','18-TheMoon.png','Mơ hồ, cảm xúc','Không phải điều gì cũng đúng như bề ngoài. Đợi sương tan trước khi quyết định lớn.'],
['The Sun','19-TheSun.png','Rõ ràng, niềm vui','Tín hiệu sáng đang đến. Cho phép bản thân nhìn thấy điều tốt.'],
['Judgement','20-Judgement.png','Thức tỉnh, quyết định','Một lời gọi cũ quay lại. Trả lời bằng phiên bản trưởng thành hơn của bạn.'],
['The World','21-TheWorld.png','Hoàn thành, thành tựu','Một vòng tròn sắp khép. Công nhận đoạn đường đã đi trước khi bước sang vòng mới.']
];

const rankNames=['Ace','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Page','Knight','Queen','King'];
const suitData=[['Wands','Gậy'],['Cups','Cốc'],['Swords','Kiếm'],['Pentacles','Tiền']];
const minorMeanings=['một khởi đầu và hạt mầm cần được nuôi dưỡng','sự cân bằng giữa hai lựa chọn','hợp tác, học hỏi và xây nền','ổn định, giữ nền tảng','một thử thách cần lòng can đảm','điều chỉnh nhịp độ và kiên nhẫn','đánh giá hướng đi trước khi tiếp tục','tin tức hoặc chuyển động đang đến','gần tới điểm chín, đừng vội buông','một chu kỳ sắp hoàn tất','một thông điệp mới để quan sát','hành động có chủ đích, không hấp tấp','sự rõ ràng và ranh giới cần thiết','trách nhiệm, nền tảng và tầm nhìn dài hạn'];

const deck=[
  ...major.map(([name,img,keywords,meaning])=>({name,img:'assets/cards/'+img,keywords,meaning})),
  ...suitData.flatMap(([suit,vn])=>rankNames.map((rank,i)=>({
    name:`${rank} of ${suit}`,
    img:`assets/cards/${suit}${String(i+1).padStart(2,'0')}.png`,
    keywords:`${rank} ${vn}`,
    meaning:`${rank} of ${suit} nói về ${minorMeanings[i]}. Đây là lời mời để quan sát thực tế rồi mới quyết định.`
  })))
];

const BACK='assets/cards/CardBacks.png';
const topicSpreads={
  'Tình cảm':['Điều bạn cần nhìn rõ','Điều đang ngăn cách','Nhu cầu chưa nói','Bước nên làm','Thông điệp cho trái tim'],
  'Công việc':['Vị trí hiện tại','Trở ngại chính','Nguồn lực của bạn','Bước đi thực tế','Hướng mở ra'],
  'Quyết định khó':['Điều bạn thật sự muốn','Cái giá cần nhận','Thông tin đang thiếu','Việc cần làm trước','La bàn cho lựa chọn'],
  'Bản thân':['Năng lượng hiện tại','Điều đang cản trở','Điều cần nhận ra','Hướng hành động','Thông điệp cuối']
};
const $=s=>document.querySelector(s);
let selected=[],topic='Bản thân',positions=topicSpreads[topic],phase='question',flipped=[],cardInsights=[],insightQueue=[],insightRunning=false,resultStarted=false;
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function status(message){$('#ritual-status').textContent=message}
function renderSlots(){
  $('#slots').innerHTML=positions.map((position,i)=>{
    const card=selected[i],isFlipped=flipped[i];
    if(!card)return `<div class="slot"><span>${i+1}<br>${position}</span></div>`;
    return `<div class="slot filled"><button class="slot-card ${isFlipped?'is-flipped':'is-face-down'} ${phase==='dealing'?'deal-card':''}" style="--deal-delay:${i*.5}s" type="button" data-card-index="${i}" ${isFlipped?'disabled aria-pressed="true"':'aria-pressed="false"'} aria-label="Lá ${i+1}: ${position}${isFlipped?`, ${card.name}, ${card.reversed?'Ngược':'Xuôi'}`:'. Chạm để lật.'}"><img src="${isFlipped?card.img:BACK}" alt="${isFlipped?card.name:''}" class="${isFlipped&&card.reversed?'reversed':''}"><span class="slot-name">${isFlipped?card.name:`Lá ${i+1}`}</span><small>${position}${isFlipped&&card.reversed?' · Ngược':''}</small></button></div>`;
  }).join('');
  $('#count').textContent=`${flipped.filter(Boolean).length}/5`;
  document.querySelectorAll('.slot-card:not(:disabled)').forEach(el=>el.onclick=()=>flipCard(+el.dataset.cardIndex));
}
function resetRitual(){selected=[];flipped=[];cardInsights=[];insightQueue=[];insightRunning=false;resultStarted=false;phase='breathe';renderSlots();$('#spread-deck').hidden=false;$('#spread-deck').disabled=false;$('#hold-progress').textContent='';status('Hít thở thật sâu. Giữ câu hỏi trong lòng, rồi nhấn nút để trải bài.')}
function openDeck(){if(!$('#question').value.trim())return $('#question').focus();positions=topicSpreads[topic];$('#result').classList.add('hidden');$('#question-panel').classList.add('fade-out');setTimeout(()=>{$('#question-panel').classList.add('hidden');$('#question-panel').classList.remove('fade-out');$('#spread').classList.remove('hidden');$('#spread').classList.add('fade-in');resetRitual();setTimeout(()=>$('#spread').classList.remove('fade-in'),900)},500)}
function completeSpread(){if(phase!=='breathe')return;phase='dealing';$('#spread-deck').hidden=true;selected=shuffle(deck.map((card,deckIdx)=>({...card,deckIdx}))).slice(0,5).map(card=>({...card,reversed:Math.random()<.32}));flipped=[];status('Năm lá đang xuất hiện…');renderSlots();setTimeout(()=>{if(phase!=='dealing')return;phase='flipping';status('Năm lá đã được trải. Chạm từng lá để lật.');renderSlots()},2600)}
function flipCard(index){if(phase!=='flipping'||flipped[index])return;flipped[index]=true;renderSlots();const button=document.querySelector(`.slot-card[data-card-index="${index}"]`);button?.classList.add('just-flipped');setTimeout(()=>button?.classList.remove('just-flipped'),550);renderRevealedCards();insightQueue.push(index);runInsightQueue();const n=flipped.filter(Boolean).length;status(n===5?'Năm lá đã hiện. Đang đọc từng thông điệp…':`Bạn đã lật ${n}/5 lá. Tiếp tục khi sẵn sàng.`)}
async function runInsightQueue(){if(insightRunning)return;insightRunning=true;while(insightQueue.length){const index=insightQueue.shift();const insight=await fetchCardInsight(index);cardInsights[index]=insight;renderRevealedCards();if(flipped.filter(Boolean).length===5)$('#hold-progress').textContent=insight}insightRunning=false;if(flipped.filter(Boolean).length===5&&phase==='flipping'){phase='result';status('Năm lá đã hiện. Đang ghép bản đồ từ trải bài…');setTimeout(showResult,300)}}
function cardRows(){return selected.map((c,i)=>flipped[i]?`<article class="reading-card ${cardInsights[i]?'':'is-reading'}" data-card-index="${i}" title="Nhấn để xem câu chuyện của lá bài"><div class="reading-number">${i+1}</div><img src="${c.img}" alt="${c.name}" class="reading-img ${c.reversed?'reversed':''}"><div class="reading-text"><p class="card-position">${positions[i]}</p><strong>${c.name} <span class="orientation ${c.reversed?'reversed-label':''}">${c.reversed?'Ngược':'Xuôi'}</span></strong><p>${cardInsights[i]||'<span class="ai-loading">✦ Đang đọc lại lá bài này…</span>'}</p></div></article>`:'').join('')}
function renderRevealedCards(){const count=cardInsights.filter(Boolean).length;$('#result-topic').textContent=topic;$('#result-question').textContent=`“${$('#question').value.trim()}”`;$('#reading').innerHTML=`<section class="cards-map"><p class="reading-kicker">NĂM LÁ NÓI GÌ</p><p class="cards-intro">Mỗi lá trả lời một phần khác nhau của câu hỏi. Đọc theo thứ tự 1 đến 5. ${count}/5 lá đã được đọc.</p>${cardRows()}</section>`;if(!resultStarted){resultStarted=true;$('#result').classList.remove('hidden');$('#result').scrollIntoView({behavior:'smooth',block:'start'})}}
const CARD_INSIGHTS_URL='/api/card-insights';
async function fetchCardInsight(index){const card=selected[index];try{const csrf=await fetch('/api/csrf').then(r=>r.json());const res=await fetch(CARD_INSIGHTS_URL,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf.token||''},body:JSON.stringify({question:$('#question').value.trim(),card:{position:positions[index],name:card.name,orientation:card.reversed?'Ngược':'Xuôi',keywords:card.keywords}})});if(!res.ok)throw new Error(`HTTP ${res.status}`);const reader=res.body.getReader(),decoder=new TextDecoder();let text='',buf='';while(true){const {done,value}=await reader.read();if(done)break;buf+=decoder.decode(value,{stream:true});const lines=buf.split('\n');buf=lines.pop();for(const line of lines){const t=line.trim();if(!t.startsWith('data: ')||t==='data: [DONE]')continue;try{const d=JSON.parse(t.slice(6)).choices?.[0]?.delta?.content;if(d)text+=d}catch{}}}return text.trim()||card.meaning}catch(err){console.error('Card insight error:',err);return card.meaning}}
function followUpMarkup(){return `<section class="follow-up"><h3>✦ Bạn muốn hỏi thêm gì về trải bài này?</h3><textarea id="follow-up-question" maxlength="300" rows="3" placeholder="Ví dụ: Điều gì khiến mình chưa thể đưa ra quyết định?"></textarea><button id="follow-up-send" type="button">Hỏi thêm ✦</button><div id="follow-up-result"></div></section>`}
function showResult(){renderRevealedCards();$('#reading').insertAdjacentHTML('beforeend','<div class="ai-section"><p class="ai-loading">✦ Đang ghép các dấu hiệu thành một bản đồ cho bạn…</p></div>'+followUpMarkup());$('#follow-up-send').onclick=sendFollowUp;fetchAIReading($('#question').value.trim())}
const AI_URL='/api/tarot';
const FOLLOW_UP_URL='/api/follow-up';
async function sendFollowUp(){const input=$('#follow-up-question'),out=$('#follow-up-result'),followup=input.value.trim();if(!followup)return input.focus();input.disabled=true;$('#follow-up-send').disabled=true;out.innerHTML='<p class="ai-loading">✦ Đang đọc lại trải bài…</p>';try{const csrf=await fetch('/api/csrf').then(r=>r.json());const res=await fetch(FOLLOW_UP_URL,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf.token||''},body:JSON.stringify({question:$('#question').value.trim(),followup,cards:selected.map((c,i)=>({position:positions[i],name:c.name,orientation:c.reversed?'Ngược':'Xuôi'}))})});if(!res.ok)throw new Error(`HTTP ${res.status}`);const reader=res.body.getReader(),decoder=new TextDecoder();let text='',buf='';while(true){const {done,value}=await reader.read();if(done)break;buf+=decoder.decode(value,{stream:true});const lines=buf.split('\n');buf=lines.pop();for(const line of lines){const t=line.trim();if(!t.startsWith('data: ')||t==='data: [DONE]')continue;try{const d=JSON.parse(t.slice(6)).choices?.[0]?.delta?.content;if(d){text+=d;out.textContent=text}}catch{}}}}catch(err){out.textContent='Không thể đọc thêm lúc này. Hãy thử lại sau ít phút.'}finally{input.disabled=false;$('#follow-up-send').disabled=false}}
function liveMarkup(){const sections=[['Câu trả lời thẳng','answer'],['Mạch bài','thread'],['Sự thật khó nghe','truth'],['Quyết định đề xuất','advice'],['Việc cần làm trong 72 giờ','action'],['Dấu hiệu kiểm chứng trong 2–4 tuần','future']].map(([title,kind],i)=>`<section class="reading-section ${kind}"><h3>✦ ${title}</h3><p data-ai-part="${i}"></p></section>`).join('');return `<div class="ai-result"><strong>✦ Bản đồ từ trải bài</strong><p id="ai-live-text" class="ai-text"></p><div id="ai-sections" class="hidden">${sections}</div></div>`}
function finishText(text,aiEl){const parts=text.trim().split(/\n\s*\n/).filter(Boolean);if(parts.length<6){aiEl.querySelector('#ai-live-text').textContent=text||'Trải bài giúp bạn nhìn rõ hơn trước bước đi tiếp.';return}aiEl.querySelector('#ai-live-text').remove();const sections=aiEl.querySelector('#ai-sections');sections.classList.remove('hidden');sections.querySelectorAll('[data-ai-part]').forEach((el,i)=>el.textContent=parts[i]||'')}
async function fetchAIReading(question){const aiEl=$('.ai-section');try{const csrf=await fetch('/api/csrf').then(r=>r.json());const res=await fetch(AI_URL,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf.token||''},body:JSON.stringify({question,cards:selected.map((c,i)=>({position:positions[i],name:c.name,orientation:c.reversed?'Ngược':'Xuôi',keywords:c.keywords}))})});if(!res.ok)throw new Error(`HTTP ${res.status}`);const reader=res.body.getReader(),decoder=new TextDecoder();let text='',buf='';aiEl.innerHTML=liveMarkup();const live=aiEl.querySelector('#ai-live-text');while(true){const {done,value}=await reader.read();if(done)break;buf+=decoder.decode(value,{stream:true});const lines=buf.split('\n');buf=lines.pop();for(const line of lines){const t=line.trim();if(!t.startsWith('data: ')||t==='data: [DONE]')continue;try{const d=JSON.parse(t.slice(6)).choices?.[0]?.delta?.content;if(d){text+=d;live.textContent=text}}catch{}}}finishText(text,aiEl)}catch(err){console.error('AI error:',err);aiEl.innerHTML='<p class="reading-outro"><strong>Lời nhắn cho bạn:</strong> Trải bài không khóa chặt tương lai. Nó giúp bạn nhìn rõ hơn trước bước đi tiếp.</p>'}}
$('.topic-options').onclick=e=>{const button=e.target.closest('.topic-option');if(!button)return;topic=button.dataset.topic;document.querySelectorAll('.topic-option').forEach(el=>{const active=el===button;el.classList.toggle('is-selected',active);el.setAttribute('aria-pressed',active)})};
$('#start').onclick=openDeck;$('#spread-deck').onclick=completeSpread;$('#question').onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')openDeck()};$('#again').onclick=()=>{$('#spread').classList.add('hidden');$('#result').classList.add('hidden');$('#question-panel').classList.remove('hidden');$('#question').value='';phase='question';window.scrollTo({top:0,behavior:'smooth'})};

/* ── Card story modal ── */
const STORY_URL='/api/card-story';
function openCardModal(index){const card=selected[index];if(!card)return;const modal=$('#card-modal');$('#modal-card-img').src=card.img;$('#modal-card-img').alt=card.name;$('#modal-card-img').className='card-modal-img'+(card.reversed?' reversed':'');$('#modal-title').textContent=`${card.name}${card.reversed?' · Ngược':''}`;$('#modal-story').innerHTML='<p class="ai-loading">✦ Đang kể câu chuyện của lá bài…</p>';modal.classList.remove('hidden');fetchCardStory(card)}
function closeCardModal(){$('#card-modal').classList.add('hidden')}
async function fetchCardStory(card){const storyEl=$('#modal-story');try{const csrf=await fetch('/api/csrf').then(r=>r.json());const res=await fetch(STORY_URL,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf.token||''},body:JSON.stringify({name:card.name,orientation:card.reversed?'Ngược':'Xuôi'})});if(!res.ok)throw new Error(`HTTP ${res.status}`);const reader=res.body.getReader(),decoder=new TextDecoder();let text='',buf='';while(true){const {done,value}=await reader.read();if(done)break;buf+=decoder.decode(value,{stream:true});const lines=buf.split('\n');buf=lines.pop();for(const line of lines){const t=line.trim();if(!t.startsWith('data: ')||t==='data: [DONE]')continue;try{const d=JSON.parse(t.slice(6)).choices?.[0]?.delta?.content;if(d){text+=d;storyEl.textContent=text}}catch{}}}if(!text.trim())storyEl.textContent='Lá bài này mang nhiều tầng ý nghĩa. Hãy để trực giác dẫn lối khi bạn chiêm nghiệm.'}catch(err){console.error('Story error:',err);storyEl.innerHTML='<p>✦ Lá bài này mang nhiều tầng ý nghĩa sâu sắc. Hãy để trực giác dẫn lối khi bạn chiêm nghiệm từng biểu tượng.</p>'}}
$('#card-modal').onclick=e=>{if(e.target===e.currentTarget||e.target.classList.contains('card-modal-backdrop'))closeCardModal()};$('.card-modal-close').onclick=closeCardModal;document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCardModal()});
// delegate click on reading cards
$('#reading').onclick=e=>{const card=findAncestor(e.target,el=>el.classList.contains('reading-card'));if(!card)return;const idx=+card.dataset.cardIndex;if(idx>=0)openCardModal(idx)};
function findAncestor(el,pred){while(el){if(pred(el))return el;el=el.parentElement}return null}
