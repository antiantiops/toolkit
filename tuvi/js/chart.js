// ============================================================
// chart.js — SVG chart rendering & interactions
// ============================================================

import { PALACES, GRID_POSITIONS, CHI_LABELS, TAM_HOP, XUNG_CHIEU } from './data.js';
import { starTypeClass, brightnessLabel, prefersReducedMotion } from './utils.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CELL_W = 180;
const CELL_H = 140;
const COLS = 4;
const ROWS = 4;
const PAD = 2;
const CHART_W = COLS * CELL_W + PAD * 2;
const CHART_H = ROWS * CELL_H + PAD * 2;

let svg = null;
let selectedPalace = null;
let onSelectCallback = null;

// Build palace position lookup
function buildPositionMap() {
  const map = {};
  PALACES.forEach(p => { map[p.id] = p.position; });
  return map;
}
const posMap = buildPositionMap();

function gridXY(pos) {
  const g = GRID_POSITIONS[pos];
  return { x: PAD + g.col * CELL_W, y: PAD + g.row * CELL_H };
}

function createSVGEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function getTamHopGroup(palaceId) {
  for (const group of TAM_HOP) {
    if (group.includes(palaceId)) return group.filter(id => id !== palaceId);
  }
  return [];
}

function getXungChieu(palaceId) {
  for (const [a, b] of XUNG_CHIEU) {
    if (a === palaceId) return b;
    if (b === palaceId) return a;
  }
  return null;
}

export function initChart(container, onSelect) {
  onSelectCallback = onSelect;
  svg = createSVGEl('svg', {
    viewBox: `0 0 ${CHART_W} ${CHART_H}`,
    class: 'tuvi-chart',
    role: 'img',
    'aria-label': 'Lá số Tử Vi 12 cung'
  });

  // Center decoration
  const cx = PAD + CELL_W;
  const cy = PAD + CELL_H;
  const centerG = createSVGEl('g', { class: 'chart-center' });
  centerG.appendChild(createSVGEl('rect', {
    x: cx, y: cy, width: CELL_W * 2, height: CELL_H * 2,
    rx: 8, class: 'center-bg'
  }));
  const centerText = createSVGEl('text', {
    x: cx + CELL_W, y: cy + CELL_H - 16,
    class: 'center-title', 'text-anchor': 'middle'
  });
  centerText.textContent = 'TỬ VI';
  centerG.appendChild(centerText);
  const centerSub = createSVGEl('text', {
    x: cx + CELL_W, y: cy + CELL_H + 12,
    class: 'center-subtitle', 'text-anchor': 'middle'
  });
  centerSub.textContent = 'ĐẨU SỐ';
  centerG.appendChild(centerSub);
  const centerLine = createSVGEl('line', {
    x1: cx + CELL_W * 0.3, y1: cy + CELL_H + 28,
    x2: cx + CELL_W * 1.7, y2: cy + CELL_H + 28,
    class: 'center-line'
  });
  centerG.appendChild(centerLine);
  svg.appendChild(centerG);

  // Relationship lines layer
  const linesG = createSVGEl('g', { class: 'relationship-lines', id: 'rel-lines' });
  svg.appendChild(linesG);

  // Palace cells
  PALACES.forEach(palace => {
    const pos = palace.position;
    const { x, y } = gridXY(pos);
    const g = createSVGEl('g', {
      class: 'palace-cell',
      'data-palace': palace.id,
      tabindex: '0',
      role: 'button',
      'aria-label': `Cung ${palace.name}`
    });

    // Background
    g.appendChild(createSVGEl('rect', {
      x, y, width: CELL_W, height: CELL_H,
      rx: 4, class: 'palace-bg'
    }));

    // Chi label (top-right corner)
    const chiLabel = createSVGEl('text', {
      x: x + CELL_W - 8, y: y + 16,
      class: 'chi-label', 'text-anchor': 'end'
    });
    chiLabel.textContent = CHI_LABELS[pos];
    g.appendChild(chiLabel);

    // Palace name
    const nameEl = createSVGEl('text', {
      x: x + 10, y: y + 20,
      class: 'palace-name'
    });
    nameEl.textContent = palace.name;
    g.appendChild(nameEl);

    // Stars (compact list)
    palace.stars.forEach((star, i) => {
      if (i >= 4) return; // max 4 visible
      const sy = y + 38 + i * 18;
      const starG = createSVGEl('g', { class: `star-item ${starTypeClass(star.type)}` });

      const starText = createSVGEl('text', {
        x: x + 12, y: sy, class: 'star-name'
      });
      starText.textContent = star.name;
      starG.appendChild(starText);

      if (star.brightness) {
        const bLabel = createSVGEl('text', {
          x: x + CELL_W - 10, y: sy,
          class: 'star-brightness', 'text-anchor': 'end'
        });
        bLabel.textContent = brightnessLabel(star.brightness);
        starG.appendChild(bLabel);
      }
      g.appendChild(starG);
    });

    // Extra stars indicator
    if (palace.stars.length > 4) {
      const moreEl = createSVGEl('text', {
        x: x + 12, y: y + 38 + 4 * 18,
        class: 'star-more'
      });
      moreEl.textContent = `+${palace.stars.length - 4}`;
      g.appendChild(moreEl);
    }

    // Click handler
    g.addEventListener('click', () => selectPalace(palace.id));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectPalace(palace.id);
      }
    });

    svg.appendChild(g);
  });

  container.innerHTML = '';
  container.appendChild(svg);
}

export function selectPalace(palaceId) {
  if (selectedPalace === palaceId) {
    clearSelection();
    return;
  }
  selectedPalace = palaceId;
  updateHighlights();
  drawRelationshipLines(palaceId);
  if (onSelectCallback) onSelectCallback(palaceId);
}

export function clearSelection() {
  selectedPalace = null;
  svg.querySelectorAll('.palace-cell').forEach(g => {
    g.classList.remove('selected', 'tam-hop', 'xung-chieu', 'dimmed', 'topic-highlight');
  });
  clearRelationshipLines();
  if (onSelectCallback) onSelectCallback(null);
}

function updateHighlights() {
  const tamHop = getTamHopGroup(selectedPalace);
  const xungChieu = getXungChieu(selectedPalace);

  svg.querySelectorAll('.palace-cell').forEach(g => {
    const id = g.getAttribute('data-palace');
    g.classList.remove('selected', 'tam-hop', 'xung-chieu', 'dimmed', 'topic-highlight');

    if (id === selectedPalace) {
      g.classList.add('selected');
    } else if (tamHop.includes(id)) {
      g.classList.add('tam-hop');
    } else if (id === xungChieu) {
      g.classList.add('xung-chieu');
    } else {
      g.classList.add('dimmed');
    }
  });
}

export function highlightPalaces(palaceIds) {
  svg.querySelectorAll('.palace-cell').forEach(g => {
    const id = g.getAttribute('data-palace');
    g.classList.remove('selected', 'tam-hop', 'xung-chieu', 'dimmed', 'topic-highlight');
    if (palaceIds && palaceIds.length > 0) {
      if (palaceIds.includes(id)) {
        g.classList.add('topic-highlight');
      } else {
        g.classList.add('dimmed');
      }
    }
  });
  clearRelationshipLines();
}

export function clearHighlights() {
  svg.querySelectorAll('.palace-cell').forEach(g => {
    g.classList.remove('selected', 'tam-hop', 'xung-chieu', 'dimmed', 'topic-highlight');
  });
  clearRelationshipLines();
}

function palaceCenter(palaceId) {
  const pos = posMap[palaceId];
  const { x, y } = gridXY(pos);
  return { x: x + CELL_W / 2, y: y + CELL_H / 2 };
}

function drawRelationshipLines(palaceId) {
  clearRelationshipLines();
  const linesG = svg.querySelector('#rel-lines');
  const origin = palaceCenter(palaceId);
  const reduced = prefersReducedMotion();

  // Tam hợp lines
  const tamHop = getTamHopGroup(palaceId);
  tamHop.forEach(tid => {
    const target = palaceCenter(tid);
    const line = createSVGEl('line', {
      x1: origin.x, y1: origin.y, x2: target.x, y2: target.y,
      class: `rel-line rel-tam-hop${reduced ? '' : ' animate-line'}`
    });
    linesG.appendChild(line);
  });

  // Xung chiếu line
  const xc = getXungChieu(palaceId);
  if (xc) {
    const target = palaceCenter(xc);
    const line = createSVGEl('line', {
      x1: origin.x, y1: origin.y, x2: target.x, y2: target.y,
      class: `rel-line rel-xung-chieu${reduced ? '' : ' animate-line'}`
    });
    linesG.appendChild(line);
  }
}

function clearRelationshipLines() {
  const linesG = svg.querySelector('#rel-lines');
  if (linesG) linesG.innerHTML = '';
}

// Year transit overlay
export function showYearOverlay(highlights) {
  svg.querySelectorAll('.year-marker').forEach(el => el.remove());
  if (!highlights || highlights.length === 0) return;

  highlights.forEach(palaceId => {
    const pos = posMap[palaceId];
    if (pos === undefined) return;
    const { x, y } = gridXY(pos);
    const marker = createSVGEl('rect', {
      x: x + 1, y: y + 1,
      width: CELL_W - 2, height: CELL_H - 2,
      rx: 4, class: 'year-marker'
    });
    svg.appendChild(marker);
  });
}

export function clearYearOverlay() {
  svg.querySelectorAll('.year-marker').forEach(el => el.remove());
}
