import assert from 'node:assert/strict';
import {readdir,stat,readFile} from 'node:fs/promises';
let bytes=0;for(const name of await readdir('public/app-icons'))if(name.endsWith('.webp'))bytes+=(await stat(`public/app-icons/${name}`)).size;
assert.ok(bytes<40000,`Icon budget exceeded: ${bytes}`);
const scene=await readFile('src/CiaAgentLoop.tsx','utf8');assert.ok(scene.includes('minion-reading-v2.webp'));assert.ok(!scene.includes('minions-reading.gif'));assert.ok(scene.includes('visibility:processing?"visible":"hidden"'));
console.log(`PASS icons ${bytes} bytes; static reading mascot follows processing state`);
