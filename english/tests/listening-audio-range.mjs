import assert from 'node:assert/strict';
function range(header,size){const m=/^bytes=(\d*)-(\d*)$/.exec(header);if(!m)return null;let start=m[1]?Number(m[1]):0,end=m[2]?Number(m[2]):size-1;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||start>=size)return null;return [start,Math.min(end,size-1)];}
assert.deepEqual(range('bytes=100-199',1000),[100,199]);assert.deepEqual(range('bytes=900-',1000),[900,999]);assert.equal(range('bytes=1000-',1000),null);console.log('audio range checks passed');
