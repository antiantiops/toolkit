import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const ui=readFileSync(new URL('../src/app/LessonChat.js',import.meta.url),'utf8');
const api=readFileSync(new URL('../src/app/api/chat/route.js',import.meta.url),'utf8');
for(const term of ['giữ nguyên câu hiện tại','tự gửi lại đáp án đúng hoàn chỉnh','lượt sửa không tính là câu mới','Chấp nhận cách diễn đạt khác'])assert(ui.includes(term));
for(const term of ['SAME question','require a revised complete answer','all task requirements','Accept valid natural alternatives','Correction attempts do not count'])assert(api.includes(term));
console.log('PASS export request and tutor policy require complete learner correction before advancing');
