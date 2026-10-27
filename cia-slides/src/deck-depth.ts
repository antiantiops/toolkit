// Native layers keep existing shared-object morphs and slide demos intact.
export function animateDeckDepth(frame: HTMLElement, direction: number, reduced: boolean) {
 const deck=frame.closest('.presentation')!;
 document.documentElement.style.setProperty('--deck-direction',String(direction));
 const animations: Animation[]=[];
 if(!reduced){
  const foreground=deck.querySelector<HTMLElement>('.deck-foreground')!;
  const background=deck.querySelector<HTMLElement>('.slide-particles')!;
  animations.push(foreground.animate([
   {transform:`translateX(${direction*150}%) rotate(${-direction*12}deg)`,offset:0},
   {transform:`translateX(0) rotate(${direction*3}deg)`,offset:.48},
   {transform:`translateX(${-direction*150}%) rotate(${direction*16}deg)`,offset:1}
  ],{duration:1200,easing:'cubic-bezier(.45,0,.55,1)'}));
  animations.push(background.animate([
   {transform:'scale(1.03) translateX(0)',opacity:1},
   {transform:`scale(1.13) translateX(${-direction*30}px)`,opacity:.6,offset:.5},
   {transform:'scale(1.03) translateX(0)',opacity:1}
  ],{duration:1200,easing:'ease-in-out'}));
 }
 return {finished:Promise.all(animations.map(a=>a.finished.catch(()=>{}))),cancel:()=>animations.forEach(a=>a.cancel())};
}
