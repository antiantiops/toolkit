import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transcriptParagraph } from './src/lib/transcript-paragraph.mjs';
const segments=[{speaker:'Speaker 1',en:'Hello.',vi:'Chào.'},{speaker:'Speaker 1',en:'How are you?',vi:'Bạn khỏe không?'},{speaker:'Speaker 2',en:'Fine.',vi:'Khỏe.'},{speaker:'Speaker 1',en:'Good.',vi:'Tốt.'}];
assert.equal(transcriptParagraph(segments,'en'),'Speaker 1: Hello. How are you?\nSpeaker 2: Fine.\nSpeaker 1: Good.');
assert.equal(transcriptParagraph(segments,'vi'),'Speaker 1: Chào. Bạn khỏe không?\nSpeaker 2: Khỏe.\nSpeaker 1: Tốt.');
assert.equal(transcriptParagraph([{en:'First.\nSecond.'},{en:'Third.'}],'en'),'First.\nSecond. Third.');
assert.equal(transcriptParagraph([],'en'),'');
console.log('transcript paragraph checks passed');

const audio=readFileSync(new URL('./src/app/ListeningAudio.js',import.meta.url),'utf8');
const page=readFileSync(new URL('./src/app/page.js',import.meta.url),'utf8');
assert.ok(page.includes('clickableText={clickableText}'));
assert.ok(audio.includes("clickableText(transcriptParagraph(result.segments,'en'))"));
assert.ok(audio.includes('clickableText(s.en)'));
assert.ok(audio.includes('aria-label={`Nghe lại câu ${i+1}`}'));
assert.ok(!audio.includes('map((s,i)=><button'));

const image=readFileSync(new URL('./src/app/ListeningImage.js',import.meta.url),'utf8');
assert.ok(image.includes('data-image-transcript-paragraph'));
assert.ok(image.includes('if(paragraphView)return;'));
assert.ok(image.includes("clickableText(transcriptParagraph(lesson.sentences,'en'))"));
assert.ok(page.includes('<ListeningImage onContextChange={setImageChatContext} clickableText={clickableText} />'));
