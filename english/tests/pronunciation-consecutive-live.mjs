import assert from 'node:assert/strict';
import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';

const base = process.env.BASE_URL || 'http://127.0.0.1:3100';
const b = await chromium.launch({
  args: [
    '--no-sandbox',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    `--unsafely-treat-insecure-origin-as-secure=${base}`
  ]
});

const p = await b.newPage({ viewport: { width: 412, height: 915 } });
await p.context().grantPermissions(['microphone'], { origin: base });

let posts = 0;
const errors = [];
p.on('pageerror', e => errors.push(e.message));

await p.route('**/api/**', async r => {
  const u = new URL(r.request().url());
  if (u.pathname === '/api/pronunciation-assess') {
    if (r.request().method() === 'POST') {
      posts++;
      assert.ok(r.request().postDataBuffer().includes(Buffer.from('RIFF')));
      return r.fulfill({ json: { jobId: String(posts).repeat(64), status: 'queued' } });
    }
    return r.fulfill({
      json: {
        status: 'completed',
        result: {
          status: 'feedback',
          heard: posts === 1 ? 'proof' : 'prove',
          score: posts === 1 ? 45 : 95,
          segments: [{ text: 'prove', status: posts === 1 ? 'wrong' : 'correct' }],
          summary: 'Kết quả lần ' + posts,
          tips: []
        }
      }
    });
  }
  if (u.pathname === '/api/word') return r.fulfill({ json: { word: { word: 'prove', meaning: 'chứng minh' } } });
  return r.fulfill({ json: { words: [], weeks: [], meaning: 'chứng minh', pronunciation: { us: '/pruːv/' } } });
});

await p.goto(base);
const input = p.getByRole('combobox', { name: 'Từ hoặc câu cần tra' });
await input.fill('prove');
await input.press('Enter');
await p.getByRole('button', { name: 'Luyện nói', exact: true }).click();

for (let n = 1; n <= 3; n++) {
  const mic = p.getByRole('button', { name: 'Bắt đầu ghi âm', exact: true });
  await mic.click();
  await p.waitForTimeout(500);

  // Take screenshot while recording to verify the wave animation button
  if (n === 1) {
    await p.getByTestId('pronunciation-recorder').screenshot({ path: '/root/.openclaw/workspace-nim/media/coach-recording-state.png' });
  }

  const stopBtn = p.getByRole('button', { name: 'Dừng ghi âm và gửi AI đánh giá' });
  await stopBtn.click();

  await p.getByText('Kết quả lần ' + n, { exact: true }).waitFor({ timeout: 15000 });
  assert.equal(posts, n);

  // Wait for count-up animation to complete
  await p.waitForTimeout(1100);

  // Verify "Tiếp tục / Đọc lại" is NOT present
  assert.equal(await p.getByText('Tiếp tục / Đọc lại').count(), 0, 'No Đọc lại button');

  // Verify mismatch display: only on mismatch (n === 1)
  if (n === 1) {
    const heardEl = p.getByTestId('pronunciation-heard');
    assert.equal(await heardEl.count(), 1);
    const text = (await heardEl.innerText()).replace(/\n+/g, '\n');
    assert.equal(text, 'Bạn đọc nghe như: proof\nTừ cần đọc: prove');
  } else {
    assert.equal(await p.getByTestId('pronunciation-heard').count(), 0, 'No heard comparison on match');
  }

  // Screenshot final result
  await p.getByTestId('pronunciation-recorder').screenshot({ path: '/root/.openclaw/workspace-nim/media/consecutive-' + n + '.png' });
  console.log('PASS recording', n, 'POST count', posts);
}

assert.deepEqual(errors, []);
await b.close();
console.log('PASS all test assertions');
