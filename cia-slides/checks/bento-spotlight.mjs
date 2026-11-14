import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';

const browser = await chromium.launch({args: ['--no-sandbox']});
const baseUrl = process.env.BASE_URL || 'http://localhost:8283';

try {
  const configs = [
    {width: 1366, height: 768, lang: 'en', reduced: false},
    {width: 1366, height: 768, lang: 'vi', reduced: false},
    {width: 390, height: 844, lang: 'en', reduced: false},
    {width: 1200, height: 800, lang: 'vi', reduced: true}
  ];

  const visibleTileIds = ['hero', 'listening', 'words', 'writing', 'chat', 'vocabulary'];

  for (const {width, height, lang, reduced} of configs) {
    const page = await browser.newPage({
      viewport: {width, height},
      reducedMotion: reduced ? 'reduce' : 'no-preference'
    });

    await page.addInitScript(l => localStorage.setItem('deck-language', l), lang);
    await page.goto(`${baseUrl}/#12`);
    await page.locator('.english-bento.bento-ready').waitFor();
    await page.waitForTimeout(1000);

    const zoomButtons = page.locator('.bento-spotlight-btn');
    assert.ok((await zoomButtons.count()) >= 6, `Expected at least 6 zoom buttons, got ${await zoomButtons.count()}`);

    const heroBtnLabel = await page.locator('.bento-hero .bento-spotlight-btn').getAttribute('aria-label');
    assert.ok(
      lang === 'en' ? heroBtnLabel.includes('Zoom into') : heroBtnLabel.includes('Phóng to'),
      `Accessible label should match lang: ${heroBtnLabel}`
    );

    for (const tileId of visibleTileIds) {
      const tile = page.locator(`.bento-${tileId}`);
      assert.equal(await tile.count(), 1, `Tile .bento-${tileId} should exist`);

      if (tileId === 'listening') {
        await tile.locator('.bento-spotlight-btn').click();
      } else {
        await tile.click({position: {x: 20, y: 20}});
      }

      await page.locator('.bento-spotlight-active').waitFor();
      await page.waitForTimeout(500);

      assert.equal(await tile.getAttribute('role'), 'dialog');
      assert.equal(await tile.getAttribute('aria-modal'), 'true');
      assert.ok(await page.locator('.bento-spotlight-backdrop').isVisible());

      if (['hero', 'listening', 'writing', 'chat'].includes(tileId) || width === 390) {
        await page.screenshot({path: `/tmp/bento-spotlight-${tileId}-${width}-${lang}.png`});
      }

      const geo = await page.evaluate((id) => {
        const main = document.querySelector('.english-bento');
        const activeTile = document.querySelector(`.bento-${id}`);
        const backdrop = document.querySelector('.bento-spotlight-backdrop');
        const mRect = main.getBoundingClientRect();
        const tRect = activeTile.getBoundingClientRect();
        const mainCenter = {x: mRect.left + mRect.width / 2, y: mRect.top + mRect.height / 2};
        const tileCenter = {x: tRect.left + tRect.width / 2, y: tRect.top + tRect.height / 2};
        const deltaX = Math.abs(mainCenter.x - tileCenter.x);
        const deltaY = Math.abs(mainCenter.y - tileCenter.y);
        const fitsHoriz = tRect.left >= 0 && tRect.right <= window.innerWidth;
        const fitsVert = tRect.top >= 0 && tRect.bottom <= window.innerHeight;
        const isDimmed = backdrop && window.getComputedStyle(backdrop).opacity > '0';
        return {deltaX, deltaY, fitsHoriz, fitsVert, isDimmed};
      }, tileId);

      assert.ok(geo.isDimmed, 'Backdrop should be visible/dimming');
      assert.ok(geo.deltaX < 30, `Tile ${tileId} should be centered horizontally (deltaX=${geo.deltaX})`);
      assert.ok(geo.deltaY < 30, `Tile ${tileId} should be centered vertically (deltaY=${geo.deltaY})`);
      assert.ok(geo.fitsHoriz, `Tile ${tileId} should fit horizontally in viewport`);
      assert.ok(geo.fitsVert, `Tile ${tileId} should fit vertically in viewport`);

      if (tileId === 'writing') {
        const applyBtn = tile.locator('.coach-suggestion button').first();
        if (await applyBtn.isVisible()) {
          await applyBtn.click();
          assert.ok((await applyBtn.innerText()).includes('Applied'));
        }
      } else if (tileId === 'chat') {
        const replayBtn = tile.locator('.demo-chat-footer button');
        if (await replayBtn.isVisible()) {
          await replayBtn.click();
        }
      }

      if (tileId === 'hero' || tileId === 'words') {
        await page.keyboard.press('Escape');
      } else if (tileId === 'listening' || tileId === 'chat') {
        await page.locator('.bento-spotlight-close').click();
      } else {
        const corner=await page.locator('.english-bento').boundingBox();
        await page.mouse.click(corner.x+5,corner.y+5);
      }

      await page.waitForFunction(() => !document.querySelector('.bento-spotlight-active'));
      await page.waitForTimeout(400);
      assert.equal(await page.locator('.bento-spotlight-active').count(), 0);
    }

    await page.locator('.bento-hero .bento-spotlight-btn').click();
    await page.locator('.bento-spotlight-active').waitFor();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => location.hash), '#12', 'ArrowRight should not navigate away during spotlight');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => location.hash), '#12', 'ArrowLeft should not navigate away during spotlight');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.bento-spotlight-active'));

    await page.close();
  }

  console.log('PASS Bento spotlight geometry, backdrop, escape/close/backdrop return, inner controls, EN/VI, mobile, reduced motion');
} finally {
  await browser.close();
}
