import assert from 'node:assert/strict';
import fs from 'node:fs';
import { transform } from 'sucrase';
import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';

const playbackSrc = fs.readFileSync('src/lib/lookup/oxford-playback.mjs', 'utf8');
const playbackJs = transform(playbackSrc, { transforms: ['imports'] }).code;

const oxfordSrc = fs.readFileSync('src/app/OxfordPronunciation.js', 'utf8');
const oxfordJs = transform(oxfordSrc.replace(/^"use client";\s*/, ''), { transforms: ['jsx'] }).code;
const oxfordBundled = oxfordJs
  .replace(/import\s+\{([^}]+)\}\s+from\s+'react';/, 'const React = window.__React; const {$1} = React;')
  .replace(/import\s+SpeakBtn\s+from\s+'\.\/SpeakBtn';/, 'const SpeakBtn = () => null;')
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
  HTMLMediaElement.prototype.play = function() {
    events.push({ type: 'play', src: this.getAttribute('src') || this.src });
    this._pausedByTest = false;
    setTimeout(() => {
      if (!this._pausedByTest) this.dispatchEvent(new Event('playing'));
    }, 30);
    return Promise.resolve();
  };
  HTMLMediaElement.prototype.pause = function() {
    this._pausedByTest = true;
    events.push({ type: 'pause', src: this.getAttribute('src') || this.src });
    this.dispatchEvent(new Event('pause'));
  };
  window.__audioEvents = events;
})();
</script>
<script>
(() => {
${oxfordBundled}
})();
</script>
<script>
(() => {
  const React = window.__React;
  const { useState } = React;
  const OxfordPronunciation = window.OxfordPronunciation;

  const oxPayload = {
    source: 'Oxford',
    uk: '/ˈʃedjuːl/',
    us: '/ˈskedʒuːl/',
    audioUk: 'https://www.oxfordlearnersdictionaries.com/media/uk/schedule.mp3',
    audioUs: 'https://www.oxfordlearnersdictionaries.com/media/us/schedule.mp3',
    sourceUrl: 'https://www.oxfordlearnersdictionaries.com/definition/english/schedule'
  };

  window.fetch = async () => ({
    ok: true,
    json: async () => ({ pronunciation: { ...oxPayload } })
  });

  function Harness() {
    const [lookup, setLookup] = useState({ word: 'schedule', pronunciation: undefined, detailLoading: true });
    return React.createElement('div', null,
      React.createElement('button', {
        'data-testid': 'detail-update',
        onClick: () => setLookup(c => ({ ...c, detailLoading: false, pronunciation: { ...oxPayload } }))
      }, 'detail-update'),
      React.createElement('button', {
        'data-testid': 'word-change-same-key',
        onClick: () => setLookup({ word: 'enclose', pronunciation: undefined, detailLoading: true })
      }, 'word-change-same-key'),
      React.createElement('button', {
        'data-testid': 'unmount-btn',
        onClick: () => setLookup(null)
      }, 'unmount'),
      lookup && React.createElement(OxfordPronunciation, {
        word: lookup.word,
        pronunciation: lookup.pronunciation,
        ipa: lookup.ipa,
        onLoaded: (wordKey, value) => setLookup(current =>
          current && (current.word || '').trim().toLowerCase() === wordKey && current.pronunciation !== value
            ? { ...current, pronunciation: value }
            : current
        )
      })
    );
  }
  const root = window.__ReactDOMClient.createRoot(document.getElementById('root'));
  root.render(React.createElement(Harness));
})();
</script></body></html>`;

const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  await page.setContent(html);

  const ukBtn = page.getByRole('button', { name: 'Nghe Oxford UK: schedule' });
  await ukBtn.waitFor({ timeout: 3000 });

  // 1. Fresh lookup first tap while enrichment/detail update replaces pronunciation object on same word
  const n1 = await page.evaluate(() => window.__audioEvents.length);
  await ukBtn.click();
  await page.getByTestId('detail-update').click();
  await page.waitForTimeout(80);
  const ev1 = await page.evaluate((n) => window.__audioEvents.slice(n), n1);
  assert.deepEqual(ev1, [{ type: 'play', src: 'https://www.oxfordlearnersdictionaries.com/media/uk/schedule.mp3' }], 'First tap must play without pause when same-word pronunciation metadata updates');
  assert.equal(await ukBtn.getAttribute('aria-busy'), 'false', 'Playing state must stay active (not stuck loading/reset)');

  await page.evaluate(() => document.querySelector('audio')?.dispatchEvent(new Event('ended')));
  await page.waitForTimeout(20);

  // 2. US tap + same-word metadata replacement -> still plays without pause
  const usBtn = page.getByRole('button', { name: 'Nghe Oxford US: schedule' });
  const n2 = await page.evaluate(() => window.__audioEvents.length);
  await usBtn.click();
  await page.getByTestId('detail-update').click();
  await page.waitForTimeout(80);
  const ev2 = await page.evaluate((n) => window.__audioEvents.slice(n), n2);
  assert.deepEqual(ev2, [{ type: 'play', src: 'https://www.oxfordlearnersdictionaries.com/media/us/schedule.mp3' }], 'US tap must play without pause on same-word metadata update');

  // 3. Word change while playing -> MUST pause previous audio
  const n3 = await page.evaluate(() => window.__audioEvents.length);
  await page.getByTestId('word-change-same-key').click();
  await page.waitForTimeout(80);
  const ev3 = await page.evaluate((n) => window.__audioEvents.slice(n), n3);
  assert.ok(ev3.some(e => e.type === 'pause' && e.src === 'https://www.oxfordlearnersdictionaries.com/media/us/schedule.mp3'), 'Word change must pause previous playback');

  // 4. Unmount while playing -> MUST pause audio
  const ukEnclose = page.getByRole('button', { name: 'Nghe Oxford UK: enclose' });
  await ukEnclose.waitFor({ timeout: 3000 });
  const n4 = await page.evaluate(() => window.__audioEvents.length);
  await ukEnclose.click();
  await page.getByTestId('unmount-btn').click();
  await page.waitForTimeout(80);
  const ev4 = await page.evaluate((n) => window.__audioEvents.slice(n), n4);
  assert.deepEqual(ev4, [
    { type: 'play', src: 'https://www.oxfordlearnersdictionaries.com/media/uk/schedule.mp3' },
    { type: 'pause', src: 'https://www.oxfordlearnersdictionaries.com/media/uk/schedule.mp3' }
  ], 'Unmount must pause active playback');

  assert.equal(pageErrors.length, 0, pageErrors.join('\n'));
  console.log('PASS oxford-first-tap: same-word metadata update keeps UK/US playback alive; word change and unmount still pause');
} finally {
  await browser.close();
}
