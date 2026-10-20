export function transcriptParagraph(segments, language) {
 const turns=[];
 for(const segment of segments){
  const speaker=segment.speaker||'';
  const previous=turns.at(-1);
  if(previous&&previous.speaker===speaker)previous.text+=' '+segment[language];
  else turns.push({speaker,text:segment[language]});
 }
 return turns.map(({speaker,text})=>speaker?`${speaker}: ${text}`:text).join('\n\n');
}
