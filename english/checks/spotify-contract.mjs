import assert from 'node:assert/strict';import fs from 'node:fs';
const api=fs.readFileSync('src/app/api/spotify/route.js','utf8'),stream=fs.readFileSync('src/app/api/spotify/[id]/route.js','utf8'),ui=fs.readFileSync('src/app/page.js','utf8');
assert(api.includes("u.hostname==='open.spotify.com'"));assert(api.includes('cacheOwner(request)'));assert(stream.includes('path.join(dir,owner)'));assert(stream.includes("'Accept-Ranges':'bytes'"));assert(ui.includes('["spotify","Spotify"]'));assert(ui.includes('overflow-x-auto'));console.log('PASS Spotify URL/auth/stream/tab contracts');
