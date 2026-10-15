import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'listen-store-'));process.env.CACHE_DIR=root;
const { saveSession,loadSession,deleteSession }=await import('../src/app/api/session/storage.js');
saveSession('owner',{listening:{audio:{id:'id'},result:{segments:[]}}});assert.equal(loadSession('owner').listening.audio.id,'id');
deleteSession('owner','listening');assert.equal(loadSession('owner').listening,undefined);
console.log('listening session storage checks passed');
