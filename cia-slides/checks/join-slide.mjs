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

    await page.clock.install();
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

    // Verify simulation label outside phone mockup exists
    const simCaption = page.locator('.phone-sim-caption');
    await simCaption.waitFor();
    assert.ok(await simCaption.isVisible(), 'phone simulation caption outside phone visible');

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

    // Safe margins assertion: main left/right content bounds >=40px horizontally and >=32px vertically from slide edges in unscaled canvas
    const insets = await page.evaluate(() => {
      const slide = document.querySelector('.join-slide');
      const left = document.querySelector('.join-left');
      const right = document.querySelector('.join-right');
      const canvas = document.querySelector('.deck-canvas');
      const cRect = canvas ? canvas.getBoundingClientRect() : null;
      const scale = cRect ? (cRect.width / 1280) : 1;
      const sRect = slide.getBoundingClientRect();
      const lRect = left.getBoundingClientRect();
      const rRect = right.getBoundingClientRect();
      return {
        leftInsetH: (lRect.left - sRect.left) / scale,
        leftInsetTop: (lRect.top - sRect.top) / scale,
        leftInsetBottom: (sRect.bottom - lRect.bottom) / scale,
        rightInsetH: (sRect.right - rRect.right) / scale,
        rightInsetTop: (rRect.top - sRect.top) / scale,
        rightInsetBottom: (sRect.bottom - rRect.bottom) / scale
      };
    });
    assert.ok(insets.leftInsetH >= 40, `leftInsetH (${insets.leftInsetH}) >= 40`);
    assert.ok(insets.rightInsetH >= 40, `rightInsetH (${insets.rightInsetH}) >= 40`);
    assert.ok(insets.leftInsetTop >= 32, `leftInsetTop (${insets.leftInsetTop}) >= 32`);
    assert.ok(insets.leftInsetBottom >= 32, `leftInsetBottom (${insets.leftInsetBottom}) >= 32`);
    assert.ok(insets.rightInsetTop >= 32, `rightInsetTop (${insets.rightInsetTop}) >= 32`);
    assert.ok(insets.rightInsetBottom >= 32, `rightInsetBottom (${insets.rightInsetBottom}) >= 32`);

    // Stage 0: Camera Scan (0 -> 3200ms)
    await page.locator('.stage-camera').waitFor();
    assert.equal(await page.locator('.stage-camera').count(), 1, 'Initial stage is .stage-camera');
    assert.equal(await page.locator('.stage-presentation').count(), 0, 'No presentation in stage 0');
    // Ensure no real editable input fields exist
    assert.equal(await page.locator('input').count(), 0, 'No real input tags in DOM');
    if (stageScreenshots) {
      await page.screenshot({path: '/root/.openclaw/workspace-nim/media/join-google-0-camera.png'});
    }

    // Advance to Stage 1: cia.nimtechnology.com browser landing (~3200ms)
    await page.clock.fastForward(3300);
    await page.locator('.stage-browser.stage-cia-landing').waitFor();
    assert.equal(await page.locator('.stage-browser.stage-cia-landing').count(), 1, 'Stage 1 reached');
    const stage1Host = await page.locator('.browser-url-pill').textContent();
    assert.ok(stage1Host.includes('cia.nimtechnology.com'), 'Stage 1 host is cia.nimtechnology.com');
    assert.equal(await page.locator('.stage-presentation').count(), 0, 'No presentation in stage 1');
    if (stageScreenshots) {
      await page.screenshot({path: '/root/.openclaw/workspace-nim/media/join-google-1-browser.png'});
    }

    // Advance to Stage 2: accounts.google.com email entry (~6000ms total, +2800ms)
    await page.clock.fastForward(2900);
    await page.locator('.stage-email').waitFor();
    assert.equal(await page.locator('.stage-email').count(), 1, 'Stage 2 reached (email)');
    const stage2Host = await page.locator('.browser-url-pill').textContent();
    assert.ok(stage2Host.includes('accounts.google.com'), 'Stage 2 host is accounts.google.com');
    assert.ok((await page.locator('.stage-email').textContent()).includes('learner@example.com'), 'learner@example.com in email screen');
    assert.equal(await page.locator('.stage-presentation').count(), 0, 'No presentation in stage 2');
    if (stageScreenshots) {
      await page.screenshot({path: '/root/.openclaw/workspace-nim/media/join-google-2-email.png'});
    }

    // Advance to Stage 3: accounts.google.com password entry (~10000ms total, +4000ms)
    await page.clock.fastForward(4100);
    await page.locator('.stage-password').waitFor();
    assert.equal(await page.locator('.stage-password').count(), 1, 'Stage 3 reached (password)');
    const stage3Host = await page.locator('.browser-url-pill').textContent();
    assert.ok(stage3Host.includes('accounts.google.com'), 'Stage 3 host is accounts.google.com');
    assert.ok((await page.locator('.stage-password').textContent()).includes('learner@example.com'), 'learner@example.com in password screen');
    assert.ok((await page.locator('.stage-password').textContent()).includes('••••••••'), 'Masked password bullets present');
    assert.equal(await page.locator('.stage-presentation').count(), 0, 'No presentation in stage 3');
    if (stageScreenshots) {
      await page.screenshot({path: '/root/.openclaw/workspace-nim/media/join-google-3-password.png'});
    }

    // Advance to Stage 4: accounts.google.com consent screen (~14000ms total, +4000ms)
    await page.clock.fastForward(4100);
    await page.locator('.stage-consent').waitFor();
    assert.equal(await page.locator('.stage-consent').count(), 1, 'Stage 4 reached (consent)');
    const stage4Host = await page.locator('.browser-url-pill').textContent();
    assert.ok(stage4Host.includes('accounts.google.com'), 'Stage 4 host is accounts.google.com');
    assert.ok((await page.locator('.stage-consent').textContent()).includes('learner@example.com'), 'learner@example.com in consent screen');
    assert.equal(await page.locator('.stage-presentation').count(), 0, 'Presentation hidden during consent stage');
    if (stageScreenshots) {
      await page.screenshot({path: '/root/.openclaw/workspace-nim/media/join-google-4-consent.png'});
    }

    // Advance to Stage 5: cia.nimtechnology.com miniature presentation (~18000ms total, +4000ms)
    await page.clock.fastForward(4100);
    await page.locator('.stage-presentation').waitFor();
    assert.equal(await page.locator('.stage-presentation').count(), 1, 'Stage 5 reached (presentation visible only after consent)');
    const stage5Host = await page.locator('.browser-url-pill').textContent();
    assert.ok(stage5Host.includes('cia.nimtechnology.com'), 'Stage 5 host is cia.nimtechnology.com');
    const presContent = await page.locator('.stage-presentation').textContent();
    assert.ok(presContent.includes('AI BODY'), 'Miniature presentation has AI BODY header');
    assert.ok(presContent.includes('01 / 12'), 'Miniature presentation has 01 / 12 controls');
    if (stageScreenshots) {
      await page.screenshot({path: '/root/.openclaw/workspace-nim/media/join-google-5-presentation.png'});
    }

    // Verify Replay button resets to camera stage
    const replayBtn = page.locator('.join-replay-btn');
    await replayBtn.click();
    await page.locator('.stage-camera').waitFor();
    assert.equal(await page.locator('.stage-camera').count(), 1, 'Replay resets to .stage-camera');

    // Advance back to stage 5 then check auto-loop to second cycle
    await page.clock.fastForward(18500);
    await page.locator('.stage-presentation').waitFor();
    assert.equal(await page.locator('.stage-presentation').count(), 1, 'Reached presentation again');
    // Hold 5000ms at presentation, then loop back to stage-camera (total 23000ms cycle)
    await page.clock.fastForward(5100);
    await page.locator('.stage-camera').waitFor();
    assert.equal(await page.locator('.stage-camera').count(), 1, 'Auto-loop cycled back to .stage-camera');

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
