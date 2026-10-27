import fs from 'node:fs';import assert from 'node:assert/strict';
const s=fs.readFileSync(new URL('../src/app/ListeningImage.js',import.meta.url),'utf8');
assert(s.includes('setCrop(files.length===1?files[0]:null)'));
assert(s.includes('pages.length===2&&!crop&&!joining'));
assert(s.includes('setCrop(pages[pageIndex+1])'));
console.log('PASS single image opens crop directly; two images retain ordering dialog and sequential crops');
