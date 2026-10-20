import assert from 'node:assert/strict';
import { transcriptParagraph } from './src/lib/transcript-paragraph.mjs';
const segments=[{speaker:'Speaker 1',en:'Hello.',vi:'Chào.'},{speaker:'Speaker 1',en:'How are you?',vi:'Bạn khỏe không?'},{speaker:'Speaker 2',en:'Fine.',vi:'Khỏe.'},{speaker:'Speaker 1',en:'Good.',vi:'Tốt.'}];
assert.equal(transcriptParagraph(segments,'en'),'Speaker 1: Hello. How are you?\n\nSpeaker 2: Fine.\n\nSpeaker 1: Good.');
assert.equal(transcriptParagraph(segments,'vi'),'Speaker 1: Chào. Bạn khỏe không?\n\nSpeaker 2: Khỏe.\n\nSpeaker 1: Tốt.');
assert.equal(transcriptParagraph([{en:'First.\nSecond.'},{en:'Third.'}],'en'),'First.\nSecond. Third.');
assert.equal(transcriptParagraph([],'en'),'');
console.log('transcript paragraph checks passed');
