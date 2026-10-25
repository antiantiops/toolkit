export function hasSpeech(text){return /[\p{L}\p{N}]/u.test(text);}
// ponytail: trim only near-silent edges; keep internal pauses and all spoken content.
export function speechBounds(samples,rate){
 const threshold=0.002,keep=Math.round(rate*0.012);let start=0,end=samples.length;
 while(start<end && Math.abs(samples[start])<threshold)start++;
 while(end>start && Math.abs(samples[end-1])<threshold)end--;
 return [Math.max(0,start-keep),Math.min(samples.length,end+keep)];
}
export function joinSpeech(parts,rate){
 const gap=Math.round(rate*0.025),clips=parts.map(p=>{const[a,b]=speechBounds(p,rate);return p.subarray(a,b);});
 const count=clips.reduce((n,p)=>n+p.length,0)+Math.max(0,clips.length-1)*gap;
 const bytes=new ArrayBuffer(44+count*2),view=new DataView(bytes);
 const str=(at,s)=>{for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i));};
 str(0,'RIFF');view.setUint32(4,36+count*2,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,count*2,true);
 let offset=44;clips.forEach((p,i)=>{for(let j=0;j<p.length;j++){const fade=Math.max(1,Math.round(rate*0.003));const gain=Math.min(1,j/fade,(p.length-1-j)/fade);const x=Math.max(-1,Math.min(1,p[j]*gain));view.setInt16(offset,x<0?x*32768:x*32767,true);offset+=2;}if(i<clips.length-1)offset+=gap*2;});
 return new Blob([bytes],{type:'audio/wav'});
}
