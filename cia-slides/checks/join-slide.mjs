import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';

const baseUrl = process.env.BASE_URL || 'http://localhost:8283';
const browser = await chromium.launch({headless: true, args: ['--no-sandbox']});

try {
  const configs = [
    {width: 1366, height: 768, lang: 'vi', reduced: false, screenshot: true, stageScreenshots: true},
    {width: 1366, height: 768, lang: 'en', reduced: false, screenshot: false, stageScreenshots: false},
    {width: 390, height: 844, lang: 'vi', reduced: false, screenshot: true, stageScreenshots: false},
    {width: 1366, height: 768, lang: 'vi', reduced: true, screenshot: false, stageScreenshots: false}
  ];

  for (const {width, height, lang, reduced, screenshot, stageScreenshots} of configs) {
    const page = await browser.newPage({
      viewport: {width, height},
      reducedMotion: reduced ? 'reduce' : 'no-preference'
    });

    await page.addInitScript(l => localStorage.setItem('deck-language', l), lang);
    await page.goto(`${baseUrl}/#1`);

    const joinSlide = page.locator('.join-slide');
    await joinSlide.waitFor();

    // Verify QR code image static, square, loaded
    const qrImg = page.locator('.join-qr-img');
    await qrImg.waitFor();
    const qrProps = await qrImg.evaluate(img => ({
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      rectWidth: img.getBoundingClientRect().width,
      rectHeight: img.getBoundingClientRect().height
    }));
    assert.ok(qrProps.complete && qrProps.naturalWidth > 0, 'QR image loaded');
    assert.ok(Math.abs(qrProps.rectWidth - qrProps.rectHeight) < 2, 'QR image square');

    // Verify direct URL link
    const urlLink = page.locator('.join-url-link');
    await urlLink.waitFor();
    assert.equal(await urlLink.getAttribute('href'), 'https://cia.nimtechnology.com');
    const rel = (await urlLink.getAttribute('rel')) || '';
    assert.ok(rel.includes('noopener'), 'rel includes noopener');

    // Verify bounds above footer and outer no overflow
    const layout = await page.evaluate(() => {
      const slide = document.querySelector('.join-slide');
      const footer = document.querySelector('.slide-footer');
      const sRect = slide.getBoundingClientRect();
      const fRect = footer ? footer.getBoundingClientRect() : null;
      const html = document.documentElement;
      return {
        slideBottom: sRect.bottom,
        footerTop: fRect ? fRect.top : window.innerHeight,
        overflowX: html.scrollWidth > window.innerWidth,
        overflowY: html.scrollHeight > window.innerHeight
      };
    });
    assert.ok(layout.slideBottom <= layout.footerTop + 1, 'Join bounds stay above footer');
    assert.ok(!layout.overflowX, 'Outer horizontal no overflow');

    // Check initial stage: stage-camera
    await page.locator('.stage-camera').waitFor();
    assert.equal(await page.locator('.stage-camera').count(), 1, 'Initially .stage-camera');
    if (stageScreenshots) {
      await page.screenshot({path: '/root/.openclaw/workspace-nim/media/join-stage-camera.png'});
    }

    // Observe stage 1: .stage-browser (~3200ms)
    await page.locator('.stage-browser').waitFor({timeout: 6000});
    assert.equal(await page.locator('.stage-browser').count(), 1, '.stage-browser after 3200ms');
    if (stageScreenshots) {
      await page.screenshot({path: '/root/.openclaw/workspace-nim/media/join-stage-browser.png'});
    }

    // Observe stage 2: .stage-auth (~6400ms)
    await page.locator('.stage-auth').waitFor({timeout: 6000});
    assert.equal(await page.locator('.stage-auth').count(), 1, '.stage-auth after 6400ms');
    if (stageScreenshots) {
      await page.screenshot({path: '/root/.openclaw/workspace-nim/media/join-stage-auth.png'});
    }

    // Verify replay button resets to camera stage
    const replayBtn = page.locator('.join-replay-btn');
    await replayBtn.click();
    await page.locator('.stage-camera').waitFor();
    assert.equal(await page.locator('.stage-camera').count(), 1, 'Replay resets to .stage-camera');

    // Screenshots as required
    if (screenshot) {
      if (width === 1366) {
        await page.screenshot({path: '/root/.openclaw/workspace-nim/media/join-desktop.png'});
      } else if (width === 390) {
        await page.screenshot({path: '/root/.openclaw/workspace-nim/media/join-mobile.png'});
      }
    }

    await page.close();
  }

  // Cross-deck navigation and clamping assertions
  const testPage = await browser.newPage({viewport: {width: 1366, height: 768}});
  await testPage.goto(`${baseUrl}/#1`);
  await testPage.locator('.join-slide').waitFor();

  // #2 Intro selector inspect
  await testPage.evaluate(() => { location.hash = '2'; });
  await testPage.locator('.nim-intro').waitFor();
  assert.equal(await testPage.locator('.nim-intro').count(), 1, '#2 Intro selector exists');

  // #12 Bento last next disabled, back 11 forward 12
  await testPage.evaluate(() => { location.hash = '12'; });
  await testPage.locator('.english-bento.bento-ready').waitFor();
  const nextBtn = testPage.locator('.slide-footer button[aria-label="Trang tiếp"], .slide-footer button[aria-label="Next page"]');
  assert.ok(await nextBtn.isDisabled(), '#12 Bento next button is disabled');

  const prevBtn = testPage.locator('.slide-footer button[aria-label="Trang trước"], .slide-footer button[aria-label="Previous page"]');
  await prevBtn.click();
  await testPage.locator('.vibe-slide').waitFor();
  assert.equal(await testPage.evaluate(() => location.hash), '#11', 'Back from 12 goes to #11');

  await testPage.locator('.slide-footer button[aria-label="Trang tiếp"], .slide-footer button[aria-label="Next page"]').click();
  await testPage.locator('.english-bento.bento-ready').waitFor();
  assert.equal(await testPage.evaluate(() => location.hash), '#12', 'Forward from 11 goes to #12');

  // Reload #12 and #13 clamp indicator 12
  await testPage.goto(`${baseUrl}/#12`);
  await testPage.locator('.english-bento.bento-ready').waitFor();
  assert.equal(await testPage.locator('.page-indicator').textContent(), '12 / 12', '#12 indicator is 12 / 12');

  await testPage.goto(`${baseUrl}/#13`);
  await testPage.locator('.english-bento.bento-ready').waitFor();
  assert.equal(await testPage.locator('.page-indicator').textContent(), '12 / 12', '#13 clamps indicator to 12 / 12');

  // /notes#12 heading correct 12 titles (no PUT live)
  await testPage.goto(`${baseUrl}/notes#12`);
  const notesHeading = testPage.locator('.slide-notes section h2');
  await notesHeading.waitFor();
  assert.equal(await notesHeading.textContent(), 'Slide 12 · English · Everyday', '/notes#12 heading title matches');

  await testPage.close();
  console.log('PASS join-slide check: EN/VI, desktop/mobile, motion, stages, replay, clamping, notes');
} finally {
  await browser.close();
}
