import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base = process.env.BASE_URL || 'http://127.0.0.1:3097';
const outDir = '/root/.openclaw/workspace-nim/artifacts/english-compact';
fs.mkdirSync(outDir, { recursive: true });

const fixtureWords = [
  {
    word: 'Encompass',
    partOfSpeech: 'verb',
    meaning: 'bao gồm, chứa đựng toàn bộ',
    pronunciation: {
      source: 'Oxford',
      uk: '/ɪnˈkʌm.pəs/',
      us: '/ɪnˈkʌm.pəs/',
      audioUk: 'https://example.com/encompass-uk.mp3',
      audioUs: 'https://example.com/encompass-us.mp3',
      sourceUrl: 'https://www.oxfordlearnersdictionaries.com/definition/english/encompass'
    },
    definition: 'to include a large number or range of things',
    definitionVietnamese: 'bao gồm một phạm vi rộng các sự vật',
    easyReading: 'in-KUM-puhs',
    example: 'The festival is to encompass everything from music to theatre.',
    exampleVietnamese: 'Lễ hội bao gồm mọi thứ từ âm nhạc đến sân khấu.'
  },
  {
    word: 'Engrave',
    partOfSpeech: 'verb',
    meaning: 'khắc, trổ, ghi sâu vào tâm trí',
    pronunciation: {
      source: 'Oxford',
      uk: '/ɪnˈɡreɪv/',
      us: '/ɪnˈɡreɪv/',
      audioUk: 'https://example.com/engrave-uk.mp3',
      audioUs: 'https://example.com/engrave-us.mp3',
      sourceUrl: 'https://www.oxfordlearnersdictionaries.com/definition/english/engrave'
    },
    definition: 'to cut words or designs on wood, stone, metal, etc.',
    definitionVietnamese: 'khắc chữ hoặc hoa văn lên gỗ, đá, kim loại',
    easyReading: 'in-GRAYV',
    example: 'Her name was engraved on the silver trophy.',
    exampleVietnamese: 'Tên cô ấy được khắc trên chiếc cúp bạc.'
  },
  {
    word: 'Electroencephalographically-monitored',
    partOfSpeech: 'adjective',
    meaning: 'được theo dõi bằng điện não đồ liên tục với nhiều điện cực ghi nhận sóng não chi tiết trong suốt quá trình đánh giá lâm sàng',
    pronunciation: {
      source: 'Oxford',
      uk: '/ɪˌlek.trəʊ.enˌsef.ə.ləˈɡræf.ɪ.kəl.i/',
      us: '/ɪˌlek.troʊ.enˌsef.ə.ləˈɡræf.ɪ.kəl.i/',
      audioUk: 'https://example.com/electro-uk.mp3',
      audioUs: 'https://example.com/electro-us.mp3',
      sourceUrl: 'https://www.oxfordlearnersdictionaries.com/definition/english/electroencephalographically'
    },
    definition: 'observed and recorded through multi-channel brainwave sensors during extended clinical analysis',
    definitionVietnamese: 'được quan sát và ghi lại thông qua cảm biến sóng não đa kênh',
    easyReading: 'ee-lek-troh-en-sef-uh-lo-GRAF-ih-klee',
    example: 'Electroencephalographically-monitored sleep trials revealed clear REM phases.',
    exampleVietnamese: 'Các thử nghiệm giấc ngủ có theo dõi điện não đồ cho thấy rõ các pha REM.'
  }
];

const browser = await chromium.launch({ args: ['--no-sandbox'] });

try {
  for (const [label, width, height, reduced] of [
    ['desktop', 1280, 900, false],
    ['mobile', 390, 844, false],
    ['desktop-reduced', 1280, 900, true]
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: reduced ? 'reduce' : 'no-preference'
    });

    await page.route('**/api/auth**', r => r.fulfill({ json: { authenticated: true, user: 'test-learner' } }));
    await page.route('**/api/me**', r => r.fulfill({ json: { user: 'test-learner' } }));
    await page.route('**/api/game-memory**', r => r.fulfill({ json: { memory: {} } }));
    await page.route('**/api/my-words**', r => r.fulfill({ json: { words: [], next: null, weeks: [] } }));
    await page.route('**/api/feature-notices**', r => r.fulfill({ json: { show: false } }));
    await page.route('**/api/chat-words**', r => r.fulfill({ json: { enabled: false } }));
    await page.route('**/api/chat**', r => r.fulfill({ json: { messages: [] } }));
    await page.route('**/api/writing-preferences**', r => r.fulfill({ json: { customPrompt: '' } }));
    await page.route('**/api/pronunciation**', r => r.fulfill({ json: { pronunciation: null } }));
    await page.route('**/api/session**', r => {
      const url = new URL(r.request().url());
      const type = url.searchParams.get('type');
      if (type === 'manifest') {
        return r.fulfill({ json: { available: { vocab: true, grammar: false, writing: false, listening: false } } });
      }
      if (type === 'vocab') {
        return r.fulfill({ json: { session: { words: fixtureWords }, next: null, total: fixtureWords.length } });
      }
      if (type === 'previews') {
        return r.fulfill({ json: { session: {} } });
      }
      return r.fulfill({ json: { session: null } });
    });

    await page.goto(base, { waitUntil: 'domcontentloaded' });

    const list = page.locator('#vocab-word-list');
    const toggle = page.locator('[data-vocab-compact-toggle]');
    const cards = page.locator('[data-vocab-card]');

    await list.waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelectorAll('[data-vocab-card]').length === 3);
    assert.equal(await cards.count(), 3);
    assert.equal(await list.getAttribute('data-compact'), 'false');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(await toggle.getAttribute('aria-controls'), 'vocab-word-list');
    assert.match(await toggle.innerText(), /Thu gọn · Ôn nhanh/);

    // Verify full mode content initially visible
    for (const w of fixtureWords) {
      await page.getByText(w.word, { exact: true }).first().waitFor({ state: 'visible' });
      await page.getByText(w.meaning, { exact: true }).first().waitFor({ state: 'visible' });
    }
    assert.equal(await page.getByText('English definition').first().isVisible(), true);
    assert.equal(await page.getByText('Xem ví dụ, mẹo dùng').first().isVisible(), true);
    assert.equal(await page.locator('[aria-label="Luyện nói Encompass"]').isVisible(), true);

    const beforeHeight = (await list.boundingBox()).height;
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${label} full mode horizontal overflow`);

    if (!reduced) {
      await list.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${outDir}/before-${label}.png` });
    }

    // Check transition property in normal vs reduced motion
    const collapseTransition = await page.locator('.vocab-collapse').first().evaluate(el => getComputedStyle(el).transitionDuration);
    if (reduced) {
      assert.equal(collapseTransition, '0s');
    } else {
      assert.notEqual(collapseTransition, '0s');
    }

    // Keyboard toggle: focus and press Enter
    await toggle.focus();
    const focused = await toggle.evaluate(el => document.activeElement === el);
    assert.equal(focused, true);
    await page.keyboard.press('Enter');

    await page.waitForFunction(() => document.querySelector('#vocab-word-list')?.getAttribute('data-compact') === 'true');
    await page.waitForTimeout(reduced ? 50 : 350);

    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.match(await toggle.innerText(), /Mở rộng · Xem đầy đủ/);

    // Word, UK/US IPA, and Vietnamese meaning retained
    for (const w of fixtureWords) {
      assert.equal(await page.getByText(w.word, { exact: true }).first().isVisible(), true);
      assert.equal(await page.getByText(w.meaning, { exact: true }).first().isVisible(), true);
    }
    assert.equal(await page.getByText('UK: /ɪnˈkʌm.pəs/').isVisible(), true);
    assert.equal(await page.getByText('US: /ɪnˈkʌm.pəs/').isVisible(), true);
    assert.equal(await page.getByText('UK: /ɪˌlek.trəʊ.enˌsef.ə.ləˈɡræf.ɪ.kəl.i/').isVisible(), true);

    // Secondary elements hidden
    assert.equal(await page.locator('.vocab-collapse').first().evaluate(el => el.getBoundingClientRect().height < 2), true);
    assert.equal(await page.locator('.vocab-secondary-inline').first().isVisible(), false);
    assert.equal(await page.locator('.vocab-practice-btn').first().isVisible(), false);

    // Total height significantly reduced & single-column dense rows
    const compactHeight = (await list.boundingBox()).height;
    assert(compactHeight < beforeHeight * 0.75, `Expected compact height (${compactHeight}) < 75% of full height (${beforeHeight})`);

    const cardBoxes = await cards.evaluateAll(els => els.map(e => e.getBoundingClientRect()));
    assert(cardBoxes[1].top >= cardBoxes[0].bottom - 1, 'Compact rows must stack single-column');
    assert(cardBoxes[2].top >= cardBoxes[1].bottom - 1, 'Compact rows must stack single-column');

    // No horizontal overflow even with long word/meaning
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${label} compact mode horizontal overflow`);

    if (!reduced) {
      await list.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${outDir}/compact-${label}.png` });
    }

    // Expand restores content
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelector('#vocab-word-list')?.getAttribute('data-compact') === 'false');
    await page.waitForTimeout(reduced ? 50 : 350);
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.getByText('English definition').first().isVisible(), true);
    assert.equal(await page.locator('.vocab-practice-btn').first().isVisible(), true);
    const restoredHeight = (await list.boundingBox()).height;
    assert(Math.abs(restoredHeight - beforeHeight) < 5, `Restored height (${restoredHeight}) matches original (${beforeHeight})`);

    // Rapid toggle (3 clicks -> compact)
    await toggle.click();
    await toggle.click();
    await toggle.click();
    await page.waitForTimeout(reduced ? 50 : 350);
    assert.equal(await list.getAttribute('data-compact'), 'true');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');

    await page.close();
  }
  console.log('PASS vocab compact toggle: full/compact, UK/US IPA, height reduction, keyboard & rapid toggle, reduced motion, desktop & mobile no overflow');
} finally {
  await browser.close();
}
