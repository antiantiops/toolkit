export const normalize = value => String(value || '').normalize('NFKC').toLowerCase().trim().replace(/\s+/g,' ').replace(/[.!?]+$/,'');
export function gameWords(input) {
 const seen=new Set();
 return (Array.isArray(input)?input:[]).filter(w=>w && !w.pending && typeof w.word==='string' && typeof w.meaning==='string' && w.word.trim() && w.meaning.trim()).filter(w=>{const key=normalize(w.word);if(seen.has(key))return false;seen.add(key);return true;}).slice(0,30);
}
export function shuffle(items,random=Math.random){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
export function buildDeck(words){const order=shuffle(words.map((_,i)=>i));return [...order.map(index=>({index,mode:'choose'})),...shuffle(order).map(index=>({index,mode:'recall'}))];}
export function choices(words,index){return shuffle([...new Set([words[index].meaning,...shuffle(words.filter((_,i)=>i!==index).map(w=>w.meaning)).filter(m=>m!==words[index].meaning).slice(0,3)])]);}
export function retryQueue(queue,position,question,correct){if(correct || question.retry)return queue;const result=[...queue];result.splice(Math.min(position+4,result.length),0,{...question,mode:'recall',retry:true});return result;}
