import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text=readFileSync('src/app/ListeningText.js','utf8');
const audio=readFileSync('src/app/ListeningAudio.js','utf8');
const image=readFileSync('src/app/ListeningImage.js','utf8');
for(const source of [text,audio,image]){
 assert.match(source,/const \{ targetLang \} = useLanguage\(\)/);
 assert.match(source,/historyEntry\?\.lesson\?\.targetLang \|\| historyEntry\?\.targetLang \|\| 'vi'/);
 assert.match(source,/=== targetLang \? historyEntry : null/);
}
assert.match(text,/JSON.stringify\(\{title:'Bài nghe từ văn bản',sentences,targetLang\}\)/);
assert.match(audio,/body.set\('targetLang',targetLang\)/);
assert.match(audio,/file\?targetLang=/);
assert.match(audio,/'&history='\+encodeURIComponent\(historyEntry.id\)/);
assert.match(image,/\{ imageId: id, targetLang \} : \{ targetLang \}/);
assert.match(image,/targetLang === 'vi' \? 'listening-image-pending-job' : `listening-image-pending-job-\$\{targetLang\}`/);
assert.doesNotMatch(image,/sessionStorage\.(?:getItem|removeItem)\('listening-image-pending-job'\)/);
for(const source of [audio,image]) assert.match(source,/session\?type=listening&targetLang=/);
assert.match(image,/session\?type=previews&targetLang=/);
console.log('PASS Listening clients: payloads, locale-scoped pending keys/session URLs, history gate; source contracts only');
