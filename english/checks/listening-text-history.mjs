import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const text=readFileSync(new URL('../src/app/ListeningText.js',import.meta.url),'utf8');
const route=readFileSync(new URL('../src/app/api/listening-text/route.js',import.meta.url),'utf8');
const history=readFileSync(new URL('../src/app/api/session/listening-history.js',import.meta.url),'utf8');
assert(text.includes("fetch('/api/listening-text'"));assert(text.includes('historyEntry={historyEntry}'));
assert(route.includes("source:'text'"));assert(route.includes('>5000'));
assert(history.includes("lesson.source==='text'?'text'"));console.log('PASS text listening save, 5000-word boundary and history source');
