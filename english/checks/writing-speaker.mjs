import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('src/app/Writing.js','utf8');
assert.doesNotMatch(source,/text=\{bankText\(/,'speaker/copy must receive plain text, never React nodes');
assert.match(source,/<SpeakBtn text=\{selectedSentence.en\}/);
assert.match(source,/\{bankText\(selectedSentence.en\)\}/,'keep visual highlighting');
console.log('PASS all Writing speaker/copy payloads plain text; highlighting preserved');
