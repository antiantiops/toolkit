import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const s=readFileSync(new URL('../src/app/LessonChat.js',import.meta.url),'utf8');
const header=s.slice(s.indexOf('<header data-chat-compact-header'),s.indexOf('<div role="log"'));
assert(header.includes('h-11'));assert(!header.includes('checkbox'));assert(!header.includes('Lưu 7 ngày'));
const menu=s.slice(s.indexOf('id="lesson-chat-tools"'));
assert(menu.includes('data-chat-settings'));assert(menu.includes('checked={autoWords}'));assert(menu.includes('onChange={changeAutoWords}'));
console.log('PASS 44px header; auto-save and retention moved to existing accessible tools menu');
