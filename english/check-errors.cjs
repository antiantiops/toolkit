const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const source = fs.readFileSync(`${__dirname}/src/app/fetch-helper.js`, 'utf8');
  const { parseApiResponse, formatErrorMessage, fetchWithRetry } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  await assert.rejects(parseApiResponse(new Response(JSON.stringify({ error: 'AI JSON parse: Unexpected end', requestId: 'test-id', stage: 'ai-json-parse' }), {status: 502})), /HTTP 502: AI JSON parse: Unexpected end\nRequest ID: test-id\nStage: ai-json-parse/);
  await assert.rejects(parseApiResponse(new Response('<html>Login</html>', {headers: {'content-type': 'text/html'}})), /response không phải JSON/);
  assert.match(formatErrorMessage(new TypeError('Cannot read properties of null')), /TypeError: Cannot read properties of null/);
  global.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(fetchWithRetry('/api/analyze', {method:'POST', timeout: 1234}, 0), /POST \/api\/analyze; attempt 1\/1; timeout 1234ms/);
  console.log('PASS: HTTP details, request ID, non-JSON, client TypeError, network context');
})().catch(e => { console.error(e); process.exitCode = 1; });
