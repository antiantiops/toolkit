import assert from 'node:assert/strict';
import { parseAudioTranscript } from '../src/lib/lessons/audio-transcript.js';
const out=parseAudioTranscript(JSON.stringify({segments:[{speaker:'Speaker 1',text:'Hello. How are you?'},{speaker:'Speaker 2',text:'Fine, thanks.'}]}));
assert.deepEqual(out.map(s=>s.en),['Hello.','How are you?','Fine, thanks.']);
assert.deepEqual(out.map(s=>s.speaker),['Speaker 1','Speaker 1','Speaker 2']);
assert.equal(parseAudioTranscript('Hello. Bye.').length,2);
assert.throws(()=>parseAudioTranscript('{"segments":[] }'));
assert.throws(()=>parseAudioTranscript('{broken'));
assert.throws(()=>parseAudioTranscript(JSON.stringify({segments:[{speaker:3,text:'Hi'}]})));
console.log('audio transcript checks passed');

const { validateTimedTranscript } = await import('../src/lib/lessons/audio-transcript.js');
const valid={segments:[{speaker:'Speaker 1',start:1,end:2,text:'Hi.'}]};
assert.equal(validateTimedTranscript(valid)[0].en,'Hi.');
for (const patch of [{start:-1},{end:1},{end:902},{speaker:3},{text:''},{start:'1'}]) assert.throws(()=>validateTimedTranscript({segments:[{...valid.segments[0],...patch}]}));
assert.throws(()=>validateTimedTranscript({segments:[{...valid.segments[0],start:5,end:6},valid.segments[0]]}));
console.log('timed transcript checks passed');
