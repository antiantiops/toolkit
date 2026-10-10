const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const source = fs.readFileSync('src/app/fetch-helper.js','utf8');
  const {fetchWithRetry} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const original = global.fetch;
  try {
    let calls = 0;
    global.fetch = async () => { calls++; return new Response('{}'); };
    const pre = new AbortController(); pre.abort();
    await assert.rejects(fetchWithRetry('/test',{signal:pre.signal}), {name:'AbortError'});
    assert.equal(calls,0);
    global.fetch = async () => { calls++; return new Response('{}',{status:calls === 1 ? 503 : 200}); };
    assert.equal((await fetchWithRetry('/test',{},1,1)).status,200);
    assert.equal(calls,2);
    global.fetch = async (_, options) => new Promise((_, reject) => options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));
    await assert.rejects(fetchWithRetry('/test',{timeout:5},0), /Request timed out.*timeout 5ms/);
    calls = 0;
    const controller = new AbortController();
    global.fetch = async () => { calls++; setTimeout(()=>controller.abort(),5); return new Response('{}',{status:503}); };
    await assert.rejects(fetchWithRetry('/test',{signal:controller.signal},2,1000), {name:'AbortError'});
    assert.equal(calls,1);
    console.log('PASS pre-abort, transient retry, timeout, abort during backoff');
  } finally { global.fetch = original; }
})().catch(e=>{console.error(e);process.exitCode=1;});
