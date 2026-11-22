import assert from 'node:assert/strict';
import fs from 'node:fs';
import { transform } from 'sucrase';
import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';

const playbackSrc = fs.readFileSync('src/lib/lookup/oxford-playback.mjs', 'utf8');
const playbackJs = transform(playbackSrc, { transforms: ['imports'] }).code;

const speakSrc = fs.readFileSync('src/app/SpeakBtn.js', 'utf8');
const oxfordSrc = fs.readFileSync('src/app/OxfordPronunciation.js', 'utf8');

const speakJs = transform(speakSrc.replace(/^"use client";\s*/, ''), { transforms: ['jsx'] }).code
  .replace(/import\s+\{([^}]+)\}\s+from\s+"react";/, 'const React = window.__React; const {$1} = React;')
  .replace(/import\s+\{joinSpeech,hasSpeech\}\s+from\s+'\.\.\/lib\/join-speech\.mjs';/, 'const joinSpeech = () => new Blob(); const hasSpeech = () => true;')
  .replace(/import\s+\{validSegments\}\s+from\s+'\.\.\/lib\/speech-segments\.mjs';/, 'const validSegments = () => true;')
  .replace(/import\s+\{([^}]+)\}\s+from\s+'\.\.\/lib\/lookup\/oxford-playback\.mjs';/, 'const {$1} = window.__OxfordPlayback;')
  .replace(/export default function SpeakBtn/, 'window.SpeakBtn = function SpeakBtn');

const oxfordJs = transform(oxfordSrc.replace(/^"use client";\s*/, ''), { transforms: ['jsx'] }).code
  .replace(/import\s+\{([^}]+)\}\s+from\s+'react';/, 'const React = window.__React; const {$1} = React;')
  .replace(/import\s+SpeakBtn\s+from\s+'\.\/SpeakBtn';/, 'const SpeakBtn = window.SpeakBtn;')
  .replace(/import\s+\{([^}]+)\}\s+from\s+'\.\.\/lib\/lookup\/oxford-playback\.mjs';/, 'const {$1} = window.__OxfordPlayback;')
  .replace(/export default function OxfordPronunciation/, 'window.OxfordPronunciation = function OxfordPronunciation');

const reactCode = fs.readFileSync('node_modules/react/cjs/react.development.js', 'utf8');
const reactDomCode = fs.readFileSync('node_modules/react-dom/cjs/react-dom.development.js', 'utf8');
const reactDomClientCode = fs.readFileSync('node_modules/react-dom/cjs/react-dom-client.development.js', 'utf8');
const schedCode = fs.readFileSync('node_modules/scheduler/cjs/scheduler.development.js', 'utf8');

const html = `<!doctype html><html><body><div id="root"></div><script>
window.process = { env: { NODE_ENV: 'development' } };
const modules = {};
function cjs(name, fn) {
  const mod = { exports: {} };
  fn(mod, mod.exports, (id) => modules[id]);
  modules[name] = mod.exports;
}
cjs('scheduler', (module, exports, require) => { ${schedCode} });
cjs('react', (module, exports, require) => { ${reactCode} });
cjs('react-dom', (module, exports, require) => { ${reactDomCode} });
cjs('react-dom/client', (module, exports, require) => { ${reactDomClientCode} });
cjs('oxford-playback', (module, exports, require) => { ${playbackJs} });
window.__React = modules['react'];
window.__ReactDOMClient = modules['react-dom/client'];
window.__OxfordPlayback = modules['oxford-playback'];
</script>
<script>
(() => {
  const events = [];
  const fetchCalls = [];
  window.__events = events;
  window.__fetchCalls = fetchCalls;
  window.__mode = 'lookup-502';

  const origCreateObjectURL = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (blob) => origCreateObjectURL(blob);
  const origRevokeObjectURL = URL.revokeObjectURL.bind(URL);
  URL.revokeObjectURL = (u) => origRevokeObjectURL(u);

  const BaseAudio = window.Audio;
  function wireAudio(el) {
    el.play = function() {
      const src = this.getAttribute('src') || this.src;
      events.push({ type: 'play', src, playbackRate: this.playbackRate });
      if (String(src).startsWith('https://www.oxfordlearnersdictionaries.com/')) {
        return Promise.reject(new Error('403 Forbidden'));
      }
      setTimeout(() => {
        this.dispatchEvent(new Event('playing'));
        this.onended?.();
        this.dispatchEvent(new Event('ended'));
      }, 15);
      return Promise.resolve();
    };
    el.pause = function() {};
    return el;
  }
  window.Audio = function() {
    return wireAudio(new BaseAudio());
  };
  const origCreate = document.createElement.bind(document);
  document.createElement = function(tag, opts) {
    const el = origCreate(tag, opts);
    if (String(tag).toLowerCase() === 'audio') wireAudio(el);
    return el;
  };

  window.fetch = async (url, init) => {
    const body = init?.body ? JSON.parse(init.body) : null;
    fetchCalls.push({ url: String(url), method: init?.method || 'GET', body });
    if (String(url).startsWith('/api/pronunciation')) {
      if (window.__mode === 'lookup-502') {
        return { ok: false, status: 502, json: async () => ({ error: 'Upstream 403' }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          pronunciation: {
            source: 'Oxford',
            uk: '/ˈʃedjuːl/',
            us: '/ˈskedʒuːl/',
            audioUk: 'https://www.oxfordlearnersdictionaries.com/media/uk/schedule.mp3',
            audioUs: 'https://www.oxfordlearnersdictionaries.com/media/us/schedule.mp3',
            sourceUrl: 'https://www.oxfordlearnersdictionaries.com/definition/english/schedule',
          },
        }),
      };
    }
    if (String(url) === '/api/tts') {
      return { ok: true, status: 200, blob: async () => new Blob(['tts'], { type: 'audio/mpeg' }) };
    }
    throw new Error('Unexpected fetch: ' + url);
  };
})();
</script>
<script>(() => {${speakJs}})();</script>
<script>(() => {${oxfordJs}})();</script>
<script>
(() => {
  const React = window.__React;
  const { useState } = React;
  function Harness() {
    const [caseKey, setCaseKey] = useState('lookup-502');
    return React.createElement('div', null,
      React.createElement('button', {
        'data-testid': 'switch-media-403',
        onClick: () => { window.__mode = 'media-403'; setCaseKey('media-403'); }
      }, 'switch-media-403'),
      React.createElement('div', { 'data-testid': 'default-speakbtn' },
        React.createElement(window.SpeakBtn, { text: 'encompass', 'aria-label': 'Default SpeakBtn' })
      ),
      caseKey === 'lookup-502'
        ? React.createElement(window.OxfordPronunciation, { key: 'a', word: 'encompass', ipa: '/ɪnˈkʌmpəs/' })
        : React.createElement(window.OxfordPronunciation, { key: 'b', word: 'schedule', ipa: '/ˈskedʒuːl/' })
    );
  }
  window.__ReactDOMClient.createRoot(document.getElementById('root')).render(React.createElement(Harness));
})();
</script></body></html>`;

const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); });
  await page.setContent(html);
  if (pageErrors.length) throw new Error('Page errors: ' + pageErrors.join('\n'));

  const card = page.getByTestId('oxford-pronunciation');

  // 1. Lookup 502: preserves IPA, retry, "Giọng tổng hợp" label, and no fake Oxford link
  await card.getByRole('alert').waitFor({ timeout: 3000 });
  assert.match(await card.textContent(), /\/ɪnˈkʌmpəs\//);
  assert.match(await card.textContent(), /Giọng tổng hợp/);
  assert.equal(await card.getByRole('button', { name: 'Thử lại' }).count(), 1);
  assert.equal(await card.getByRole('link', { name: 'Nguồn: Oxford' }).count(), 0);

  const fallbackBtn = card.getByRole('button', { name: 'Nghe đọc: encompass' });
  assert.equal(await fallbackBtn.getAttribute('preferOxford'), null, 'preferOxford must not leak to DOM');

  // Clicking fallback button skips /api/pronunciation and plays /api/tts directly at 0.85x
  const fetchBefore = await page.evaluate(() => window.__fetchCalls.length);
  const eventsBefore = await page.evaluate(() => window.__events.length);
  await fallbackBtn.click();
  await page.waitForFunction((n) => window.__events.length > n, eventsBefore);
  const calls1 = await page.evaluate((n) => window.__fetchCalls.slice(n), fetchBefore);
  const ev1 = await page.evaluate((n) => window.__events.slice(n), eventsBefore);
  assert.deepEqual(calls1, [{ url: '/api/tts', method: 'POST', body: { text: 'encompass', lang: 'en-US' } }]);
  assert.equal(ev1.length, 1);
  assert.match(ev1[0].src, /^blob:/);
  assert.equal(ev1[0].playbackRate, 0.85);

  // 2. Default SpeakBtn still prefers Oxford first (unchanged behavior for other consumers)
  const fetchDefBefore = await page.evaluate(() => window.__fetchCalls.length);
  await page.getByRole('button', { name: 'Default SpeakBtn' }).click();
  await page.waitForFunction((n) => window.__fetchCalls.length > n, fetchDefBefore);
  const defCalls = await page.evaluate((n) => window.__fetchCalls.slice(n), fetchDefBefore);
  assert.deepEqual(defCalls, [{ url: '/api/pronunciation?word=encompass', method: 'GET', body: null }]);

  // 3. Oxford metadata OK + media 403 -> shows error + labeled TTS fallback playable without Oxford reload
  await page.getByTestId('switch-media-403').click();
  const ukBtn = card.getByRole('button', { name: 'Nghe Oxford UK: schedule' });
  await ukBtn.waitFor({ timeout: 3000 });
  await ukBtn.click();
  await card.getByRole('alert').waitFor({ timeout: 3000 });
  assert.match(await card.textContent(), /Không phát được âm thanh Oxford/);
  assert.match(await card.textContent(), /Giọng tổng hợp/);

  const mediaFallbackBtn = card.getByRole('button', { name: 'Nghe đọc: schedule' });
  const fetchMediaBefore = await page.evaluate(() => window.__fetchCalls.length);
  const evMediaBefore = await page.evaluate(() => window.__events.length);
  await mediaFallbackBtn.click();
  await page.waitForFunction((n) => window.__events.length > n, evMediaBefore);
  const mediaCalls = await page.evaluate((n) => window.__fetchCalls.slice(n), fetchMediaBefore);
  const mediaEv = await page.evaluate((n) => window.__events.slice(n), evMediaBefore);
  assert.deepEqual(mediaCalls, [{ url: '/api/tts', method: 'POST', body: { text: 'schedule', lang: 'en-US' } }]);
  assert.equal(mediaEv.length, 1);
  assert.match(mediaEv[0].src, /^blob:/);
  assert.equal(mediaEv[0].playbackRate, 0.85);

  assert.equal(pageErrors.length, 0, pageErrors.join('\n'));
  console.log('PASS oxford-tts-fallback: lookup 502 and Oxford media 403 play /api/tts directly while preserving IPA, retry, labels, and default Oxford SpeakBtn');
} finally {
  await browser.close();
}
