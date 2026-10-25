import assert from 'node:assert/strict';
import {speechBounds,joinSpeech} from '../src/lib/join-speech.mjs';
const p=new Float32Array(2400);p.fill(0.1,1000,1400);
assert.deepEqual(speechBounds(p,24000),[712,1688]);
const wav=await joinSpeech([p,p],24000).arrayBuffer(),v=new DataView(wav);
assert.equal(v.getUint32(24,true),24000);assert.equal(v.getUint32(40,true),(976*2+600)*2);
assert.equal(new TextDecoder().decode(wav.slice(0,4)),'RIFF');
assert.equal(v.getUint16(22,true),1);assert.equal(v.getUint32(4,true),wav.byteLength-8);
console.log('PASS silence trim preserves margins, ordered mono WAV, 25ms gap, valid header');
