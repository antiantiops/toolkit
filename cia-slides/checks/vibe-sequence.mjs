import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';

const BASE_URL = process.env.BASE_URL || process.env.DECK_URL || 'http://127.0.0.1:8211';
const browser = await chromium.launch({headless: true, args: ['--no-sandbox']});

try {
 const page = await browser.newPage({viewport: {width: 1280, height: 800}});
 await page.addInitScript(() => localStorage.setItem('deck-language', 'vi'));
 await page.goto(`${BASE_URL}/#10`, {waitUntil: 'networkidle'});

 // Check initial pre-reveal state
 await page.locator('.vibe-hook').waitFor();
 assert.equal(await page.locator('[data-vibe-stage]').count(), 0, 'No stages before reveal');
 const revealBtn = page.locator('.vibe-explanation button');
 await revealBtn.click();

 // Stage 0: intro
 const stageContainer = page.locator('[data-vibe-stage]');
 await stageContainer.waitFor();
 assert.equal(await stageContainer.getAttribute('data-vibe-stage'), 'intro');
 assert.equal(await page.locator('.vibe-scene-intro .vibe-hook').textContent(), 'Vibe Coding');
 assert.equal(await page.locator('.vibe-ipa').textContent(), '/vaɪb ˈkoʊdɪŋ/');

 // Fast-forward time / wait for stage progression
 // Stage 1: chat-human (~6.4s)
 await page.waitForSelector('[data-vibe-stage="chat-human"]', {timeout: 10000});
 assert.equal(await page.locator('.vibe-chat-bubble.human').count(), 1);
 assert.equal(await page.locator('.vibe-chat-bubble.ai').count(), 0);

 // Stage 2: chat-ai (~11.4s)
 await page.waitForSelector('[data-vibe-stage="chat-ai"]', {timeout: 10000});
 assert.equal(await page.locator('.vibe-chat-bubble.human').count(), 1);
 assert.equal(await page.locator('.vibe-chat-bubble.ai').count(), 1);

 // Stage 3: coding (~14.4s)
 await page.waitForSelector('[data-vibe-stage="coding"]', {timeout: 10000});
 const terminal = page.locator('.vibe-terminal');
 await terminal.waitFor();
 // Assert code lines grow
 await page.waitForFunction(() => {
  const code = document.querySelector('.vibe-terminal code')?.textContent || '';
  return code.includes('<!doctype html>');
 });

 // Stage 4: result (~20.4s)
 await page.waitForSelector('[data-vibe-stage="result"]', {timeout: 15000});
 const resultImg = page.locator('.vibe-result-frame img');
 await resultImg.waitFor();
 assert.equal(await resultImg.getAttribute('src'), '/english-home-light.png');
 const imgLoaded = await resultImg.evaluate(img => img.complete && img.naturalWidth > 0);
 assert.ok(imgLoaded, 'English screenshot image loaded');

 // Test replay button
 const replayBtn = page.locator('.vibe-replay-btn');
 await replayBtn.click();
 assert.equal(await stageContainer.getAttribute('data-vibe-stage'), 'intro', 'Replay resets to stage 0 intro');

 // Test back to question reset
 const resetBtn = page.locator('.vibe-reset');
 await resetBtn.click();
 await page.locator('.vibe-prompt').waitFor();
 assert.equal(await page.locator('[data-vibe-stage]').count(), 0, 'Reset returns to pre-reveal question');

 console.log('PASS: vibe staged animation sequence verified');
} finally {
 await browser.close();
}
