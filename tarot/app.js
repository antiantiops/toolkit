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
const positions=['Năng lượng hiện tại','Điều đang cản trở','Điều cần nhận ra','Hướng hành động','Thông điệp cuối'];
const $=s=>document.querySelector(s);
let selected=[];

/* ── shuffle deck order ── */
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

/* ── open deck after question — mystic transition ── */
function openDeck(){
  if(!$('#question').value.trim())return $('#question').focus();
  selected=[];
  const panel=$('#question-panel');
  const spread=$('#spread');
  $('#result').classList.add('hidden');
  /* fade-out question panel */
  panel.classList.add('fade-out');
  setTimeout(()=>{
    panel.classList.add('hidden');
    panel.classList.remove('fade-out');
    /* fade-in spread */
    spread.classList.remove('hidden');
    spread.classList.add('fade-in');
    renderSlots();
    renderDeck();
    setTimeout(()=>spread.classList.remove('fade-in'),900);
  },700);
}

/* ── five target slots on top — only animate newest ── */
function renderSlots(){
  const newIdx=selected.length-1;
  $('#slots').innerHTML=positions.map((p,i)=>{
    const card=selected[i];
    const isNew=card&&i===newIdx;
    return `<div class="slot ${card?'filled':''} ${isNew?'slot-new':''}">
      ${card
        ?`<div class="slot-card"><img src="${card.img}" alt="${card.name}"><span class="slot-name">${card.name}</span><small>${p}</small></div>`
        :`<span>${i+1}<br>${p}</span>`
      }
    </div>`;
  }).join('');
  $('#count').textContent=`${selected.length}/5`;
}

/* ── 78 face-down cards ── */
let shuffledDeck=[];
function renderDeck(){
  if(selected.length===0) shuffledDeck=shuffle(deck.map((c,i)=>({...c,deckIdx:i})));
  $('#deck').innerHTML=shuffledDeck.map(card=>{
    const chosen=selected.some(x=>x.deckIdx===card.deckIdx);
    const disabled=chosen||selected.length>=5;
    return `<button class="deck-card ${chosen?'chosen':''}" data-idx="${card.deckIdx}" type="button" ${disabled?'disabled':''} aria-label="Chọn lá bài">
      <img src="${chosen?card.img:BACK}" alt="${chosen?card.name:'Lá bài úp'}" class="deck-card-img ${chosen?'flipped':''}">
    </button>`;
  }).join('');
  document.querySelectorAll('.deck-card:not(:disabled)').forEach(b=>{
    b.onclick=()=>choose(+b.dataset.idx,b);
  });
}

/* ── select a card: flip then move to slot ── */
function choose(idx,btn){
  const card={...deck[idx],deckIdx:idx,reversed:Math.random()<0.32};
  selected.push(card);

  /* flip animation on the deck card */
  const img=btn.querySelector('.deck-card-img');
  img.src=card.img;
  img.alt=card.name;
  img.classList.add('flipped');
  btn.disabled=true;
  btn.classList.add('chosen');

  /* disable remaining cards if 5 selected */
  if(selected.length>=5){
    document.querySelectorAll('.deck-card:not(:disabled)').forEach(b=>b.disabled=true);
  }

  /* update only slots (no full deck re-render → old cards stay still) */
  setTimeout(()=>{
    renderSlots();
    if(selected.length===5) setTimeout(showResult,700);
  },400);
}

/* ── AI config — server-side proxy, no key exposed ── */
const AI_URL='/api/tarot';

/* ── show result + call AI for interpretation ── */
function showResult(){
  const q=$('#question').value.trim();
  $('#result-question').textContent=`"${q}"`;

  /* render card list first */
  const cardsHtml=selected.map((c,i)=>
    `<div class="reading-card">
      <img src="${c.img}" alt="${c.name}" class="reading-img">
      <div class="reading-text">
        <strong>${positions[i]} — ${c.name} ${c.reversed?'(Ngược)':'(Xuôi)'}</strong>
        <p>${c.meaning}${c.reversed?' Khi ở chiều ngược, lá bài nhắc bạn chậm lại và nhìn phần chưa cân bằng.':''}</p>
      </div>
    </div>`
  ).join('');

  $('#reading').innerHTML=cardsHtml+'<div class="ai-section"><p class="ai-loading">✦ Đang kết nối năng lượng vũ trụ để luận giải...</p></div>';
  $('#result').classList.remove('hidden');
  $('#result').scrollIntoView({behavior:'smooth',block:'start'});

  /* call AI */
  fetchAIReading(q);
}

async function fetchAIReading(question){
  const aiEl=$('.ai-section');

  try{
    // get fresh CSRF token before each reading
    const csrfRes=await fetch('/api/csrf');
    const csrfData=await csrfRes.json();
    const csrfToken=csrfData.token||'';

    const res=await fetch(AI_URL,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'X-CSRF-Token':csrfToken
      },
      body:JSON.stringify({
        question,
        cards:selected.map((c,i)=>({
          position:positions[i], name:c.name, orientation:c.reversed?'Ngược':'Xuôi', keywords:c.keywords
        }))
      })
    });

    if(!res.ok) throw new Error(`HTTP ${res.status}`);

    /* streaming SSE */
    const reader=res.body.getReader();
    const decoder=new TextDecoder();
    let text='';
    aiEl.innerHTML='<div class="ai-result"><strong>✦ Lời nhắn cho bạn</strong><p class="ai-text"></p></div>';
    const textEl=aiEl.querySelector('.ai-text');

    while(true){
      const{done,value}=await reader.read();
      if(done) break;
      const chunk=decoder.decode(value,{stream:true});
      for(const line of chunk.split('\n')){
        if(!line.startsWith('data: ')||line==='data: [DONE]') continue;
        try{
          const j=JSON.parse(line.slice(6));
          const delta=j.choices?.[0]?.delta?.content;
          if(delta){text+=delta;textEl.textContent=text;}
        }catch(e){/* skip parse errors */}
      }
    }
    /* final: convert newlines to <br> for display */
    textEl.innerHTML=text.replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>');
  }catch(err){
    console.error('AI error:',err);
    aiEl.innerHTML='<p class="reading-outro"><strong>Lời nhắn cho bạn:</strong> Trải bài không khóa chặt tương lai. Nó giúp bạn nhìn rõ hơn trước bước đi tiếp.</p>';
  }
}

/* ── reset ── */
$('#start').onclick=openDeck;
$('#question').onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')openDeck()};
$('#again').onclick=()=>{
  selected=[];shuffledDeck=[];
  $('#spread').classList.add('hidden');$('#result').classList.add('hidden');
  $('#question-panel').classList.remove('hidden');$('#question').value='';
  window.scrollTo({top:0,behavior:'smooth'});
};
