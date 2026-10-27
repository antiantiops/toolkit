export function usageQuestion(word){
 const text=word.example||'',term=word.word||'';
 const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const pattern=new RegExp('(?<![A-Za-z])'+escaped+'(?![A-Za-z])','i');
 return text&&term&&pattern.test(text)?text.replace(pattern,'_____'):null;
}
