import assert from 'node:assert/strict';
import {validateListeningPage,selectListeningSections} from '../src/lib/listening/sections.js';
const single={title:'15',sentences:[{en:'Hello.',vi:'Xin chào.',speaker:'A'},{en:'Hi.',vi:'Chào.',speaker:'B'}]};
assert.equal(validateListeningPage(single).length,1);
assert.equal(validateListeningPage({sections:[single,single]}).length,2);
assert.equal(selectListeningSections([single,single],[1,0]).sentences.length,4);
assert.equal(selectListeningSections([single],[0]).sentences[0].speaker,'A');
assert.throws(()=>selectListeningSections([single],[]));assert.throws(()=>selectListeningSections([single],[1]));assert.throws(()=>validateListeningPage({sections:[]}));
console.log('PASS single transcript, intact dialogue, ordered multi-select and bounds');
