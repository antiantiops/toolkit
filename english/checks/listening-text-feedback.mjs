import assert from 'node:assert/strict';import fs from 'node:fs';
const ui=fs.readFileSync(new URL('../src/app/ListeningText.js',import.meta.url),'utf8'),route=fs.readFileSync(new URL('../src/app/api/listening-text/route.js',import.meta.url),'utf8');
assert.match(ui,/preparing/);assert.match(ui,/Đang dịch bài nghe/);assert.match(ui,/disabled=\{preparing\|\|!!lesson/);assert.match(route,/callJson/);assert.match(route,/translations\.length!==sentences\.length/);console.log('PASS text button waits; Vietnamese translations required before synthesis');
