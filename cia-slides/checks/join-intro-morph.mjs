import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';

const baseUrl = process.env.BASE_URL || 'http://localhost:8283';
const matrix = [
  [1366, 768, 'en', false],
  [1366, 768, 'vi', false],
  [390, 844, 'en', false],
  [390, 844, 'vi', true],
];

const browser = await chromium.launch({args: ['--no-sandbox']});
try {
  for (const [width, height, lang, reduced] of matrix) {
    const page = await browser.newPage({
      viewport: {width, height},
      reducedMotion: reduced ? 'reduce' : 'no-preference',
    });
    await page.addInitScript(l => localStorage.setItem('deck-language', l), lang);
    await page.goto(`${baseUrl}/#1`);
    await page.locator('.join-slide').waitFor();
    await page.evaluate(() => document.fonts.ready);

    // 1 -> 2
    await page.keyboard.press('ArrowRight');
    if (!reduced) {
      await page.waitForFunction(() => document.documentElement.classList.contains('deck-join-intro-morph'));
      await page.waitForFunction(() =>
        document.getAnimations().some(
          a => a.effect?.pseudoElement === '::view-transition-group(join-intro-pillar)'
            && a.effect.getComputedTiming().progress > 0
            && a.effect.getComputedTiming().progress < 1
        )
      );
      const {anims, hasBackdrop} = await page.evaluate(() => {
        const all = document.getAnimations();
        return {
          anims: all
            .filter(a => a.effect?.pseudoElement === '::view-transition-group(join-intro-pillar)')
            .map(a => {
              const t = a.effect.getComputedTiming();
              return {progress: t.progress, frames: a.effect.getKeyframes()};
            }),
          hasBackdrop: all.some(a => a.effect?.pseudoElement === '::view-transition-group(join-intro-backdrop)'),
        };
      });
      assert.equal(anims.length, 1);
      assert.ok(anims[0].progress > 0 && anims[0].progress < 1);
      assert.ok(hasBackdrop, 'join-intro-backdrop animation must exist');
      await page.screenshot({path: `/root/.openclaw/workspace-nim/media/join-intro-morph-${width}-${lang}-fwd.png`});
    } else {
      assert.equal(await page.evaluate(() => document.documentElement.classList.contains('deck-join-intro-morph')), false);
    }
    await page.locator('.nim-intro').waitFor();
    await page.locator('.slide-transition[aria-busy="false"]').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('deck-join-intro-morph')), false);

    // 2 -> 1
    await page.keyboard.press('ArrowLeft');
    if (!reduced) {
      await page.waitForFunction(() => document.documentElement.classList.contains('deck-join-intro-morph'));
      await page.waitForFunction(() =>
        document.getAnimations().some(
          a => a.effect?.pseudoElement === '::view-transition-group(join-intro-pillar)'
            && a.effect.getComputedTiming().progress > 0
            && a.effect.getComputedTiming().progress < 1
        )
      );
      const {anims, hasBackdrop} = await page.evaluate(() => {
        const all = document.getAnimations();
        return {
          anims: all
            .filter(a => a.effect?.pseudoElement === '::view-transition-group(join-intro-pillar)')
            .map(a => {
              const t = a.effect.getComputedTiming();
              return {progress: t.progress, frames: a.effect.getKeyframes()};
            }),
          hasBackdrop: all.some(a => a.effect?.pseudoElement === '::view-transition-group(join-intro-backdrop)'),
        };
      });
      assert.equal(anims.length, 1);
      assert.ok(anims[0].progress > 0 && anims[0].progress < 1);
      assert.ok(hasBackdrop, 'join-intro-backdrop animation must exist');
      await page.screenshot({path: `/root/.openclaw/workspace-nim/media/join-intro-morph-${width}-${lang}-rev.png`});
    } else {
      assert.equal(await page.evaluate(() => document.documentElement.classList.contains('deck-join-intro-morph')), false);
    }
    await page.locator('.join-slide').waitFor();
    await page.locator('.slide-transition[aria-busy="false"]').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('deck-join-intro-morph')), false);

    await page.close();
  }
} finally {
  await browser.close();
}

console.log('PASS 1/2 join-intro View Transition morph, both directions, EN/VI, desktop/mobile, reduced motion');
