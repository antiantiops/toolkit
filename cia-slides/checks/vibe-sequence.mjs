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

 // Stage 1: chat-human (~6.4s)
 await page.waitForSelector('[data-vibe-stage="chat-human"]', {timeout: 10000});
 assert.equal(await page.locator('.vibe-chat-bubble.human').count(), 1);
 assert.equal(await page.locator('.vibe-chat-bubble.ai').count(), 0);

 // Stage 2: chat-ai (~11.4s)
 await page.waitForSelector('[data-vibe-stage="chat-ai"]', {timeout: 10000});
 assert.equal(await page.locator('.vibe-chat-bubble.human').count(), 1);
 assert.equal(await page.locator('.vibe-chat-bubble.ai').count(), 1);
 const chatRobot = page.locator('.vibe-ai-robot');
 await chatRobot.waitFor();

 // Check robot fly animation trigger before stage 3 coding
 await page.waitForSelector('.vibe-ai-robot.is-flying', {timeout: 4000});
 assert.equal(await page.locator('.vibe-ai-robot.is-flying').count(), 1, 'Chat robot fly-away triggered');

 // Stage 3: coding (~14.4s)
 await page.waitForSelector('[data-vibe-stage="coding"]', {timeout: 10000});
 const terminal = page.locator('.vibe-terminal');
 await terminal.waitFor();

 // Check robot fly-in into VS Code titlebar
 const vscodeRobot = page.locator('.vibe-vscode-robot.is-entering');
 await vscodeRobot.waitFor();
 assert.equal(await vscodeRobot.count(), 1, 'VS Code titlebar robot fly-in present');

 // Assert code lines grow
 await page.waitForFunction(() => {
  const code = document.querySelector('.vibe-terminal code')?.textContent || '';
  return code.includes('export function App()') || code.includes('<!doctype html>');
 });

 // Verify terminal dev server ready logs
 await page.waitForFunction(() => {
  const term = document.querySelector('.vibe-vscode-term-body')?.textContent || '';
  return term.includes('ready in 240ms');
 });

 // Check deploy success toast popup & simulated mouse pointer
 const deployToast = page.locator('.vibe-deploy-toast');
 await deployToast.waitFor({timeout: 10000});
 assert.ok((await deployToast.textContent() || '').includes('Deploy thành công!'), 'Deploy success badge text');

 const simMouse = page.locator('.vibe-sim-mouse');
 await simMouse.waitFor({timeout: 5000});
 assert.equal(await simMouse.count(), 1, 'Simulated mouse cursor appeared');

 // Stage 4: result (~22.2s or after click)
 await page.waitForSelector('[data-vibe-stage="result"]', {timeout: 15000});
 const resultImg = page.locator('.vibe-result-frame img');
 await resultImg.waitFor();
 assert.equal(await resultImg.getAttribute('src'), '/english-home-light.png');
 const imgLoaded = await resultImg.evaluate(img => img.complete && img.naturalWidth > 0);
 assert.ok(imgLoaded, 'English screenshot image loaded');

 // Check fireworks / celebration particles
 const fireworks = page.locator('.vibe-fireworks');
 await fireworks.waitFor();
 const particleCount = await page.locator('.vibe-particle').count();
 assert.ok(particleCount >= 12, `Fireworks particles generated: ${particleCount}`);

 // Test replay button
 const replayBtn = page.locator('.vibe-replay-btn');
 await replayBtn.click();
 assert.equal(await stageContainer.getAttribute('data-vibe-stage'), 'intro', 'Replay resets to stage 0 intro');
 assert.equal(await page.locator('.vibe-deploy-toast').count(), 0, 'Toast reset');
 assert.equal(await page.locator('.vibe-fireworks').count(), 0, 'Fireworks reset');

 // Test back to question reset
 const resetBtn = page.locator('.vibe-reset');
 await resetBtn.click();
 await page.locator('.vibe-prompt').waitFor();
 assert.equal(await page.locator('[data-vibe-stage]').count(), 0, 'Reset returns to pre-reveal question');

 await page.close();

 // Test English language mode
 const enPage = await browser.newPage({viewport: {width: 1280, height: 800}});
 await enPage.addInitScript(() => localStorage.setItem('deck-language', 'en'));
 await enPage.goto(`${BASE_URL}/#10`, {waitUntil: 'networkidle'});
 await enPage.locator('.vibe-explanation button').click();
 await enPage.waitForSelector('[data-vibe-stage="coding"]', {timeout: 18000});
 const enToast = enPage.locator('.vibe-deploy-toast');
 await enToast.waitFor({timeout: 10000});
 assert.ok((await enToast.textContent() || '').includes('Deploy successful!'), 'Deploy badge in English');
 await enPage.close();

 // Test prefers-reduced-motion: reduce
 const rPage = await browser.newPage({reducedMotion: 'reduce'});
 await rPage.goto(`${BASE_URL}/#10`, {waitUntil: 'networkidle'});
 await rPage.locator('.vibe-explanation button').click();
 await rPage.waitForSelector('[data-vibe-stage="coding"]', {timeout: 8000});
 const rToast = rPage.locator('.vibe-deploy-toast');
 await rToast.waitFor();
 const simMouseHidden = await rPage.locator('.vibe-sim-mouse').evaluateAll(es => es.length === 0 || es.every(e => getComputedStyle(e).display === 'none'));
 assert.ok(simMouseHidden, 'Sim mouse hidden under reduced motion');
 await rPage.close();

 console.log('PASS: vibe staged animation sequence, robot flight, deploy click, zoom, fireworks & reduced motion verified');
} finally {
 await browser.close();
}
