// ============================================================
// story.js — Story mode / Guided reading
// ============================================================

import { STORY_STEPS } from './data.js';
import { renderMarkdown, linkifyPalaces, prefersReducedMotion } from './utils.js';

let storyEl = null;
let overlayEl = null;
let currentStep = -1; // -1 = not active
let onHighlight = null;
let onClose = null;

export function initStory(container, overlay, { onHighlightPalaces, onStoryClose }) {
  storyEl = container;
  overlayEl = overlay;
  onHighlight = onHighlightPalaces;
  onClose = onStoryClose;
}

export function startStory() {
  currentStep = 0;
  overlayEl.classList.add('active');
  document.body.classList.add('story-active');
  renderStep();
}

export function endStory() {
  currentStep = -1;
  overlayEl.classList.remove('active');
  document.body.classList.remove('story-active');
  storyEl.innerHTML = '';
  if (onHighlight) onHighlight(null);
  if (onClose) onClose();
}

export function isStoryActive() {
  return currentStep >= 0;
}

function renderStep() {
  const step = STORY_STEPS[currentStep];
  if (!step) { endStory(); return; }

  const isFirst = currentStep === 0;
  const isLast = currentStep === STORY_STEPS.length - 1;
  const progress = ((currentStep + 1) / STORY_STEPS.length) * 100;

  const content = linkifyPalaces(renderMarkdown(step.content));

  storyEl.innerHTML = `
    <div class="story-card${prefersReducedMotion() ? '' : ' animate-in'}">
      <button class="story-dismiss" aria-label="Đóng hướng dẫn" title="Đóng">×</button>
      <div class="story-progress">
        <div class="story-progress-bar" style="width: ${progress}%"></div>
        <span class="story-progress-text">${currentStep + 1} / ${STORY_STEPS.length}</span>
      </div>
      <h3 class="story-title">${step.title}</h3>
      <div class="story-content">${content}</div>
      <div class="story-nav">
        ${!isFirst ? '<button class="story-btn story-btn-prev" aria-label="Bước trước">← Quay lại</button>' : '<div></div>'}
        ${isLast
          ? '<button class="story-btn story-btn-close" aria-label="Kết thúc">Hoàn tất ✓</button>'
          : '<button class="story-btn story-btn-next" aria-label="Bước tiếp">Tiếp tục →</button>'
        }
      </div>
    </div>
  `;

  // Highlight relevant palaces
  if (onHighlight) onHighlight(step.palaces);

  // Nav handlers
  const dismissBtn = storyEl.querySelector('.story-dismiss');
  const prevBtn = storyEl.querySelector('.story-btn-prev');
  const nextBtn = storyEl.querySelector('.story-btn-next');
  if (dismissBtn) dismissBtn.addEventListener('click', endStory);
  const closeBtn = storyEl.querySelector('.story-btn-close');

  if (prevBtn) prevBtn.addEventListener('click', () => { currentStep--; renderStep(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { currentStep++; renderStep(); });
  if (closeBtn) closeBtn.addEventListener('click', endStory);

  // Palace link handlers
  storyEl.querySelectorAll('.palace-link').forEach(link => {
    link.addEventListener('click', () => {
      if (onHighlight) onHighlight([link.dataset.palace]);
    });
  });

  // Keyboard
  const card = storyEl.querySelector('.story-card');
  if (card) {
    card.setAttribute('tabindex', '0');
    card.focus();
    card.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' && !isLast) { currentStep++; renderStep(); }
      if (e.key === 'ArrowLeft' && !isFirst) { currentStep--; renderStep(); }
      if (e.key === 'Escape') endStory();
    });
  }
}
