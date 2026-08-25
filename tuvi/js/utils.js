// ============================================================
// utils.js — Helpers, theme toggle, export
// ============================================================

// Theme management
export function initTheme() {
  const saved = localStorage.getItem('tuvi-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  return saved;
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('tuvi-theme', next);
  return next;
}

// Simple markdown-like bold **text** → <strong>text</strong>
export function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

// Make palace names in text clickable
const PALACE_NAMES = {
  'Mệnh': 'menh', 'Phụ Mẫu': 'phuMau', 'Phúc Đức': 'phucDuc',
  'Điền Trạch': 'dienTrach', 'Quan Lộc': 'quanLoc', 'Nô Bộc': 'noBoc',
  'Thiên Di': 'thienDi', 'Tật Ách': 'tatAch', 'Tài Bạch': 'taiBach',
  'Tử Tức': 'tuTuc', 'Phu Thê': 'phuThe', 'Huynh Đệ': 'huynh'
};

export function linkifyPalaces(html) {
  let result = html;
  // Sort by length desc to match "Phụ Mẫu" before "Mệnh" inside "Phụ Mẫu"
  const sorted = Object.entries(PALACE_NAMES).sort((a, b) => b[0].length - a[0].length);
  for (const [name, id] of sorted) {
    // Don't linkify inside existing tags
    const regex = new RegExp(`(?<![">])\\b(${name})\\b(?![<])`, 'g');
    result = result.replace(regex, `<span class="palace-link" data-palace="${id}" tabindex="0" role="button">$1</span>`);
  }
  return result;
}

// Star type badge class
export function starTypeClass(type) {
  const map = { chinh: 'star-chinh', phu: 'star-phu', sat: 'star-sat', loc: 'star-loc', khoa: 'star-khoa' };
  return map[type] || 'star-phu';
}

// Star brightness label
export function brightnessLabel(b) {
  if (!b) return '';
  const map = { 'miếu': '廟', 'vượng': '旺', 'đắc': '得', 'bình': '平', 'hãm': '陷' };
  return map[b] || b;
}

// Export chart as PNG (uses html2canvas concept — simplified mock)
export function exportChart() {
  const el = document.getElementById('chart-container');
  if (!el) return;
  // Mock export — in production use html2canvas or dom-to-image
  const btn = document.querySelector('.btn-export');
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = 'Đã tải!';
    btn.classList.add('exported');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('exported'); }, 2000);
  }
}

// Debounce
export function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Reduced motion check
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Smooth scroll into view
export function scrollIntoViewSmooth(el) {
  if (!el) return;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
}
