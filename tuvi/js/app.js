// ============================================================
// app.js — Main app logic, state management
// ============================================================

import { USER_INFO, TOPICS, TOPIC_PALACES, YEAR_DATA, PALACES } from './data.js';
import { initTheme, toggleTheme, exportChart } from './utils.js';
import { initChart, selectPalace, clearSelection, highlightPalaces, clearHighlights, showYearOverlay, clearYearOverlay } from './chart.js';
import { initPanel, showPalace, setTopic, setYear } from './panel.js';
import { initStory, startStory, endStory, isStoryActive } from './story.js';

// ── State ──
let state = {
  theme: 'dark',
  selectedPalace: null,
  selectedTopic: 'tong-the',
  selectedYear: 2026,
  mode: 'overview' // overview | focus | topic | story
};

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  state.theme = initTheme();
  renderUserInfo();
  setupChart();
  setupPanel();
  setupTopics();
  setupYears();
  setupStory();
  setupHeader();
  setupKeyboard();
  hideLoading();
});

function hideLoading() {
  const loader = document.getElementById('app-loader');
  if (loader) {
    loader.classList.add('fade-out');
    setTimeout(() => loader.remove(), 500);
  }
}

// ── User Info ──
function renderUserInfo() {
  const el = document.getElementById('user-info');
  if (!el) return;
  el.innerHTML = `
    <div class="hero-card">
      <div class="hero-header">
        <h2 class="hero-name">${USER_INFO.name}</h2>
        <p class="hero-meta">${USER_INFO.gender} · ${USER_INFO.birthDate} · ${USER_INFO.lunarYear} · ${USER_INFO.birthHour}</p>
      </div>
      <p class="hero-desc">Lá số của bạn là bản đồ xu hướng cuộc đời, được lập từ thời điểm sinh.</p>
      <div class="hero-summary">
        <div class="summary-item"><span class="summary-label">Mệnh</span><span class="summary-value">${USER_INFO.menh}</span></div>
        <div class="summary-item"><span class="summary-label">Cục</span><span class="summary-value">${USER_INFO.cuc}</span></div>
        <div class="summary-item"><span class="summary-label">Chủ Mệnh</span><span class="summary-value">${USER_INFO.chuMenh}</span></div>
        <div class="summary-item"><span class="summary-label">Chủ Thân</span><span class="summary-value">${USER_INFO.chuThan}</span></div>
      </div>
      <p class="hero-insight">${USER_INFO.summary}</p>
    </div>
  `;
}

// ── Chart ──
function setupChart() {
  const container = document.getElementById('chart-container');
  if (!container) return;
  initChart(container, (palaceId) => {
    state.selectedPalace = palaceId;
    showPalace(palaceId);
    if (palaceId) {
      state.mode = 'focus';
    } else {
      state.mode = state.selectedTopic !== 'tong-the' ? 'topic' : 'overview';
      applyTopicHighlight();
    }
    updateModeIndicator();
  });
}

// ── Panel ──
function setupPanel() {
  const container = document.getElementById('detail-panel');
  if (!container) return;
  initPanel(container, (palaceId) => {
    // Palace link clicked in panel text
    selectPalace(palaceId);
  });
}

// ── Topics ──
function setupTopics() {
  const bar = document.getElementById('topic-bar');
  if (!bar) return;

  bar.innerHTML = TOPICS.map(t =>
    `<button class="topic-btn${t.id === state.selectedTopic ? ' active' : ''}" data-topic="${t.id}" aria-pressed="${t.id === state.selectedTopic}">
      <span class="topic-icon">${t.icon}</span>
      <span class="topic-label">${t.label}</span>
    </button>`
  ).join('');

  bar.addEventListener('click', e => {
    const btn = e.target.closest('.topic-btn');
    if (!btn) return;
    const topicId = btn.dataset.topic;
    state.selectedTopic = topicId;
    state.selectedPalace = null;
    state.mode = topicId === 'tong-the' ? 'overview' : 'topic';

    bar.querySelectorAll('.topic-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.topic === topicId);
      b.setAttribute('aria-pressed', b.dataset.topic === topicId);
    });

    clearSelection();
    setTopic(topicId);
    applyTopicHighlight();
    updateModeIndicator();
  });
}

function applyTopicHighlight() {
  const palaceIds = TOPIC_PALACES[state.selectedTopic];
  if (palaceIds) {
    highlightPalaces(palaceIds);
  } else {
    clearHighlights();
  }
}

// ── Years ──
function setupYears() {
  const bar = document.getElementById('year-bar');
  if (!bar) return;

  const years = Object.keys(YEAR_DATA).map(Number);
  bar.innerHTML = `
    <span class="year-label">Năm xem:</span>
    ${years.map(y =>
      `<button class="year-btn${y === state.selectedYear ? ' active' : ''}" data-year="${y}" aria-pressed="${y === state.selectedYear}">${y}</button>`
    ).join('')}
    <span class="year-note">Lá số gốc không đổi — chỉ lớp diễn biến thay đổi</span>
  `;

  bar.addEventListener('click', e => {
    const btn = e.target.closest('.year-btn');
    if (!btn) return;
    const year = Number(btn.dataset.year);
    state.selectedYear = year;

    bar.querySelectorAll('.year-btn').forEach(b => {
      b.classList.toggle('active', Number(b.dataset.year) === year);
      b.setAttribute('aria-pressed', Number(b.dataset.year) === year);
    });

    setYear(year);
    const yearData = YEAR_DATA[year];
    if (yearData) {
      showYearOverlay(yearData.highlights);
    } else {
      clearYearOverlay();
    }
  });

  // Initial overlay
  const yearData = YEAR_DATA[state.selectedYear];
  if (yearData) showYearOverlay(yearData.highlights);
}

// ── Story Mode ──
function setupStory() {
  const storyContainer = document.getElementById('story-container');
  const storyOverlay = document.getElementById('story-overlay');
  const storyBtn = document.getElementById('btn-story');
  if (!storyContainer || !storyOverlay) return;

  initStory(storyContainer, storyOverlay, {
    onHighlightPalaces: (palaceIds) => {
      if (palaceIds) {
        highlightPalaces(palaceIds);
      } else {
        clearHighlights();
      }
    },
    onStoryClose: () => {
      state.mode = 'overview';
      clearHighlights();
      updateModeIndicator();
    }
  });

  if (storyBtn) {
    storyBtn.addEventListener('click', () => {
      if (isStoryActive()) {
        endStory();
      } else {
        state.mode = 'story';
        state.selectedPalace = null;
        clearSelection();
        startStory();
        updateModeIndicator();
      }
    });
  }
}

// ── Header ──
function setupHeader() {
  const themeBtn = document.getElementById('btn-theme');
  const exportBtn = document.getElementById('btn-export');

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      state.theme = toggleTheme();
      themeBtn.setAttribute('aria-label', state.theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', exportChart);
  }
}

// ── Mode indicator ──
function updateModeIndicator() {
  const el = document.getElementById('mode-indicator');
  if (!el) return;
  const labels = { overview: 'Tổng quan', focus: 'Chi tiết', topic: 'Chủ đề', story: 'Hướng dẫn' };
  el.textContent = labels[state.mode] || '';
  el.className = `mode-indicator mode-${state.mode}`;
}

// ── Keyboard nav ──
function setupKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (isStoryActive()) {
        endStory();
      } else if (state.selectedPalace) {
        clearSelection();
        showPalace(null);
        state.mode = 'overview';
        updateModeIndicator();
      }
    }
  });
}
