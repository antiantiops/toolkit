const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('src/app/ListeningImage.js', 'utf8');
const handler = source.match(/onEnded=\{\(\) => \{ (.*?) \}\} \/>/)[1];
for (const [index, length, repeat, expected] of [[0,2,false,1],[1,2,false,null],[1,2,true,0],[0,1,true,null],[0,1,false,null]]) {
  let next = null, played = false, stopped = false;
  const audio = { current: { currentTime: 99, play() { played = true; return Promise.resolve(); } } };
  const resume = {current:false}, seekTo = {current:9};
  Function('index','clips','repeat','resume','seekTo','audio','setIndex','setElapsed','setPlaying','setError','formatErrorMessage', handler)(index,Array(length),repeat,resume,seekTo,audio,n=>next=n,()=>{},()=>stopped=true,()=>{},e=>e.message);
  assert.equal(next, expected);
  assert.equal(played, length === 1 && repeat);
  assert.equal(stopped, index === length-1 && !repeat);
  if (played) assert.equal(audio.current.currentTime,0);
  if (next !== null) assert.equal(resume.current,true);
}
assert(source.includes('aria-pressed={repeat}'));
console.log('PASS next sentence, repeat full lesson, single clip restart, repeat off, accessible toggle');
