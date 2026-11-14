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

    // Verify title and copy according to lang
    const joinTitle = await page.locator('.join-title').textContent();
    const expectedTitle = lang === 'vi' ? 'Mở bài thuyết trình' : 'Open Presentation';
    assert.equal(joinTitle, expectedTitle, `Title matches expected for lang ${lang}`);

    // Verify DataFlowBridge canvas, SVG overlay, HUD corners, and slide background
    const canvasCount = await page.locator('canvas.join-particle-canvas').count();
    assert.equal(canvasCount, 1, 'canvas.join-particle-canvas exists');
    const canvasWidth = await page.locator('canvas.join-particle-canvas').evaluate(el => el.width);
    assert.ok(canvasWidth >= 100, `canvas.join-particle-canvas width (${canvasWidth}) >= 100`);

    assert.equal(await page.locator('svg.join-circuit-overlay').count(), 1, 'svg.join-circuit-overlay exists');
    assert.equal(await page.locator('.join-circuit-chevrons').count(), 1, '.join-circuit-chevrons exists');
    assert.equal(await page.locator('.join-qr-card .hud-corner').count(), 4, '.join-qr-card .hud-corner count === 4');

    const slideBg = await joinSlide.evaluate(el => window.getComputedStyle(el).backgroundColor);
    assert.equal(slideBg, 'rgb(6, 13, 24)', '.join-slide computed backgroundColor is rgb(6, 13, 24)');

    // Verify prominent conduit connector checks
    const connMetrics = await page.evaluate(() => {
      const conn = document.querySelector('.join-gap-connector');
      const canvas = document.querySelector('.deck-canvas');
      const scale = canvas ? (canvas.getBoundingClientRect().width / 1280) : 1;
      return {
        width: conn ? conn.getBoundingClientRect().width / scale : 0,
        opacity: conn ? parseFloat(window.getComputedStyle(conn).opacity) : 0
      };
    });
    assert.ok(connMetrics.width >= 50, `Connector width (${connMetrics.width}) >= 50px`);
    assert.equal(connMetrics.opacity, 1, 'Connector opacity is 1');

    const gapMetrics = await page.evaluate(() => {
      const qr = document.querySelector('.join-qr-card');
      const bridge = document.querySelector('.join-gap-connector');
      const timeline = document.querySelector('.join-timeline');
      const canvas = document.querySelector('.deck-canvas');
      const scale = canvas ? (canvas.getBoundingClientRect().width / 1280) : 1;
      const qrRect = qr.getBoundingClientRect();
      const bridgeRect = bridge.getBoundingClientRect();
      const timelineRect = timeline.getBoundingClientRect();
      return {
        qrToBridge: (bridgeRect.left - qrRect.right) / scale,
        bridgeToTimeline: (timelineRect.left - bridgeRect.right) / scale
      };
    });
    assert.ok(gapMetrics.qrToBridge >= 16 && gapMetrics.qrToBridge <= 24, `qrToBridge (${gapMetrics.qrToBridge}) in 16..24px`);
    assert.ok(gapMetrics.bridgeToTimeline >= 16 && gapMetrics.bridgeToTimeline <= 24, `bridgeToTimeline (${gapMetrics.bridgeToTimeline}) in 16..24px`);
    assert.ok(Math.abs(gapMetrics.qrToBridge - gapMetrics.bridgeToTimeline) <= 2, `gap diff (${Math.abs(gapMetrics.qrToBridge - gapMetrics.bridgeToTimeline)}) <= 2px`);

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

    // Helper to settle CSS animations strictly inside current phone screen without global pauses
    async function settlePhoneScreen(stageSelector) {
      await page.evaluate(() => {
        const screen = document.querySelector('.phone-screen');
        if (!screen) return;
        const anims = document.getAnimations().filter(a => {
          const target = a.effect && a.effect.target;
          return target && screen.contains(target);
        });
        for (const a of anims) {
          const timing = a.effect.getComputedTiming ? a.effect.getComputedTiming() : null;
          const duration = (timing && typeof timing.duration === 'number') ? timing.duration : 1000;
          const iterations = (timing && typeof timing.iterations === 'number') ? timing.iterations : 1;
          if (iterations !== Infinity) {
            a.pause();
            a.currentTime = Math.min(duration, 1800);
          }
        }
      });
      const opacity = await page.locator(stageSelector).evaluate(el => parseFloat(window.getComputedStyle(el).opacity));
      assert.ok(opacity >= 0.99, `${stageSelector} opacity (${opacity}) >= 0.99 after settling`);
    }

    async function resumePhoneScreen() {
      await page.evaluate(() => {
        const screen = document.querySelector('.phone-screen');
        if (!screen) return;
        const anims = document.getAnimations().filter(a => {
          const target = a.effect && a.effect.target;
          return target && screen.contains(target);
        });
        for (const a of anims) {
          if (a.playState === 'paused') a.play();
        }
      });
    }

    // Stage 0: Camera Scan (0 -> 3200ms)
    await page.locator('.stage-camera').waitFor();
    assert.equal(await page.locator('.stage-camera').count(), 1, 'Initial stage is .stage-camera');
    assert.equal(await page.locator('.stage-presentation').count(), 0, 'No presentation in stage 0');
    assert.equal(await page.locator('.join-step-node.is-active').count(), 1, 'Stage 0 has exactly 1 active step');
    assert.ok(await page.locator('.join-step-node').nth(0).evaluate(el => el.classList.contains('is-active')), 'Stage 0 active step is Step 1');
    // Ensure no real editable input fields exist
    assert.equal(await page.locator('input').count(), 0, 'No real input tags in DOM');
    if (stageScreenshots) {
      await settlePhoneScreen('.stage-camera');
      await page.screenshot({path: '/root/.openclaw/workspace-nim/media/join-google-0-camera.png'});
      await resumePhoneScreen();
    }

    // Advance to Stage 1: cia.nimtechnology.com browser landing (~3200ms)
    await page.clock.fastForward(3300);
    await page.locator('.stage-browser.stage-cia-landing').waitFor();
    assert.equal(await page.locator('.stage-browser.stage-cia-landing').count(), 1, 'Stage 1 reached');
    assert.equal(await page.locator('.join-step-node.is-active').count(), 1, 'Stage 1 has exactly 1 active step');
    assert.ok(await page.locator('.join-step-node').nth(1).evaluate(el => el.classList.contains('is-active')), 'Stage 1 active step is Step 2');
    const stage1Host = await page.locator('.browser-url-pill').textContent();
    assert.ok(stage1Host.includes('cia.nimtechnology.com'), 'Stage 1 host is cia.nimtechnology.com');
    const stage1Title = await page.locator('.browser-page-title').textContent();
    const expectedPageTitle = lang === 'vi' ? 'AI BODY — Bài thuyết trình' : 'AI BODY — Presentation';
    assert.equal(stage1Title, expectedPageTitle, `Stage 1 page title matches expected for lang ${lang}`);
    assert.equal(await page.locator('.stage-presentation').count(), 0, 'No presentation in stage 1');
    if (stageScreenshots) {
      await settlePhoneScreen('.stage-browser.stage-cia-landing');
      await page.screenshot({path: '/root/.openclaw/workspace-nim/media/join-google-1-browser.png'});
      await resumePhoneScreen();
    }

    // Advance to Stage 2: accounts.google.com email entry (~6000ms total, +2800ms)
    await page.clock.fastForward(2900);
    await page.locator('.stage-email').waitFor();
    assert.equal(await page.locator('.stage-email').count(), 1, 'Stage 2 reached (email)');
    assert.equal(await page.locator('.join-step-node.is-active').count(), 1, 'Stage 2 has exactly 1 active step');
    assert.ok(await page.locator('.join-step-node').nth(1).evaluate(el => el.classList.contains('is-active')), 'Stage 2 active step is Step 2');
    const stage2Host = await page.locator('.browser-url-pill').textContent();
    assert.ok(stage2Host.includes('accounts.google.com'), 'Stage 2 host is accounts.google.com');
    assert.ok((await page.locator('.stage-email').textContent()).includes('learner@example.com'), 'learner@example.com in email screen');
    assert.equal(await page.locator('.stage-presentation').count(), 0, 'No presentation in stage 2');
    if (stageScreenshots) {
      await settlePhoneScreen('.stage-email');
      await page.screenshot({path: '/root/.openclaw/workspace-nim/media/join-google-2-email.png'});
      await resumePhoneScreen();
    }

    // Advance to Stage 3: accounts.google.com password entry (~10000ms total, +4000ms)
    await page.clock.fastForward(4100);
    await page.locator('.stage-password').waitFor();
    assert.equal(await page.locator('.stage-password').count(), 1, 'Stage 3 reached (password)');
    assert.equal(await page.locator('.join-step-node.is-active').count(), 1, 'Stage 3 has exactly 1 active step');
    assert.ok(await page.locator('.join-step-node').nth(1).evaluate(el => el.classList.contains('is-active')), 'Stage 3 active step is Step 2');
    const stage3Host = await page.locator('.browser-url-pill').textContent();
    assert.ok(stage3Host.includes('accounts.google.com'), 'Stage 3 host is accounts.google.com');
    assert.ok((await page.locator('.stage-password').textContent()).includes('learner@example.com'), 'learner@example.com in password screen');
    assert.ok((await page.locator('.stage-password').textContent()).includes('••••••••'), 'Masked password bullets present');
    assert.equal(await page.locator('.stage-presentation').count(), 0, 'No presentation in stage 3');
    if (stageScreenshots) {
      await settlePhoneScreen('.stage-password');
      await page.screenshot({path: '/root/.openclaw/workspace-nim/media/join-google-3-password.png'});
      await resumePhoneScreen();
    }

    // Advance to Stage 4: accounts.google.com consent screen (~14000ms total, +4000ms)
    await page.clock.fastForward(4100);
    await page.locator('.stage-consent').waitFor();
    assert.equal(await page.locator('.stage-consent').count(), 1, 'Stage 4 reached (consent)');
    assert.equal(await page.locator('.join-step-node.is-active').count(), 1, 'Stage 4 has exactly 1 active step');
    assert.ok(await page.locator('.join-step-node').nth(1).evaluate(el => el.classList.contains('is-active')), 'Stage 4 active step is Step 2');
    const stage4Host = await page.locator('.browser-url-pill').textContent();
    assert.ok(stage4Host.includes('accounts.google.com'), 'Stage 4 host is accounts.google.com');
    assert.ok((await page.locator('.stage-consent').textContent()).includes('learner@example.com'), 'learner@example.com in consent screen');
    assert.equal(await page.locator('.stage-presentation').count(), 0, 'Presentation hidden during consent stage');
    if (stageScreenshots) {
      await settlePhoneScreen('.stage-consent');
      await page.screenshot({path: '/root/.openclaw/workspace-nim/media/join-google-4-consent.png'});
      await resumePhoneScreen();
    }

    // Advance to Stage 5: cia.nimtechnology.com miniature presentation (~18000ms total, +4000ms)
    await page.clock.fastForward(4100);
    await page.locator('.stage-presentation').waitFor();
    assert.equal(await page.locator('.stage-presentation').count(), 1, 'Stage 5 reached (presentation visible only after consent)');
    assert.equal(await page.locator('.join-step-node.is-active').count(), 1, 'Stage 5 has exactly 1 active step');
    assert.ok(await page.locator('.join-step-node').nth(2).evaluate(el => el.classList.contains('is-active')), 'Stage 5 active step is Step 3');
    const stage5Host = await page.locator('.browser-url-pill').textContent();
    assert.ok(stage5Host.includes('cia.nimtechnology.com'), 'Stage 5 host is cia.nimtechnology.com');
    const presContent = await page.locator('.stage-presentation').textContent();
    assert.ok(presContent.includes('AI BODY'), 'Miniature presentation has AI BODY header');
    assert.ok(presContent.includes('01 / 12'), 'Miniature presentation has 01 / 12 controls');
    if (stageScreenshots) {
      await settlePhoneScreen('.stage-presentation');
      await page.screenshot({path: '/root/.openclaw/workspace-nim/media/join-google-5-presentation.png'});
      await resumePhoneScreen();
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
