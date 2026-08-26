// ============================================================
// panel.js — Detail panel, tabs, content switching
// ============================================================

import { PALACES, YEAR_DATA, TOPIC_KEY_MAP } from './data.js';
import { renderMarkdown, linkifyPalaces, starTypeClass, brightnessLabel } from './utils.js';

let panelEl = null;
let currentPalace = null;
let currentTab = 'overview';
let currentTopic = 'tong-the';
let currentYear = 2026;
let onPalaceLinkClick = null;

const TABS = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'stars', label: 'Sao trong cung' },
  { id: 'interpret', label: 'Luận giải' },
  { id: 'year', label: 'Năm hiện tại' }
];

export function initPanel(container, onLinkClick) {
  panelEl = container;
  onPalaceLinkClick = onLinkClick;
  showEmpty();
}

const TOPIC_EXPLANATIONS = {
  'su-nghiep': {
    title: 'Sự nghiệp',
    lead: 'Các ô sáng là các cung thường được đọc cùng nhau khi xét công việc. Đây là bản đồ điểm cần xem, không phải kết luận nghề nghiệp tự động.',
    reasons: { menh: 'năng lực và cách làm việc', quanLoc: 'con đường nghề nghiệp, vị trí công việc', taiBach: 'thu nhập và nguồn lực', thienDi: 'cơ hội bên ngoài, môi trường và di chuyển' }
  },
  'tai-loc': {
    title: 'Tài lộc', lead: 'Các ô sáng gom phần thu nhập, tích lũy, nền tảng tài sản và cách công việc tạo ra nguồn lực.',
    reasons: { taiBach: 'thu nhập và dòng tiền', dienTrach: 'tài sản nền tảng, nơi ở', phucDuc: 'hậu thuẫn và mức độ bền vững', quanLoc: 'công việc tạo nguồn thu' }
  },
  'tinh-duyen': {
    title: 'Tình duyên', lead: 'Các ô sáng liên quan quan hệ đôi lứa, bản thân, nền tảng cảm xúc và gia đình nhỏ.',
    reasons: { phuThe: 'hôn nhân và đối tác', menh: 'cách bạn hiện diện trong quan hệ', phucDuc: 'đời sống tinh thần và nền tảng cảm xúc', tuTuc: 'gia đình nhỏ, con cái và sáng tạo' }
  },
  'gia-dao': {
    title: 'Gia đạo', lead: 'Các ô sáng liên quan gia đình gốc, anh chị em, gia đình nhỏ và không gian sống.',
    reasons: { phuMau: 'cha mẹ và nền tảng gia đình', tuTuc: 'con cái và gia đình nhỏ', huynh: 'anh chị em, người gần gũi', dienTrach: 'nhà cửa và môi trường sống' }
  },
  'suc-khoe': {
    title: 'Sức khỏe', lead: 'Các ô sáng được dùng để xem trạng thái thân tâm trong tổng thể lá số. Không thay thế tư vấn hay chẩn đoán y khoa.',
    reasons: { tatAch: 'trạng thái sức khỏe', menh: 'thể chất và thói quen cá nhân', phucDuc: 'tinh thần và khả năng hồi phục', dienTrach: 'môi trường sống' }
  },
  'quan-he': {
    title: 'Quan hệ', lead: 'Các ô sáng liên quan bạn bè, đồng nghiệp, môi trường bên ngoài, người thân và cách bạn kết nối.',
    reasons: { noBoc: 'bạn bè, đồng nghiệp và mạng lưới', thienDi: 'môi trường xã hội bên ngoài', huynh: 'người thân, bạn bè gần', menh: 'cách bạn tạo kết nối' }
  }
};

export function setTopic(topicId) {
  currentTopic = topicId;
  if (currentPalace) renderPanel();
  else showTopic(topicId);
}

export function setYear(year) {
  currentYear = year;
  if (currentPalace && currentTab === 'year') renderPanel();
}

export function showPalace(palaceId) {
  if (!palaceId) { showEmpty(); return; }
  currentPalace = palaceId;
  currentTab = 'overview';
  renderPanel();
}

export function showTopic(topicId) {
  currentPalace = null;
  const topic = TOPIC_EXPLANATIONS[topicId];
  if (!topic) { showEmpty(); return; }
  const items = Object.entries(topic.reasons).map(([id, reason]) => {
    const palace = getPalace(id);
    if (!palace) return '';
    return `<button class="topic-palace-card" data-palace="${id}"><strong>${palace.name}</strong><span>${reason}</span></button>`;
  }).join('');
  panelEl.innerHTML = `
    <div class="panel-header"><div class="panel-palace-name">${topic.title}</div><div class="panel-palace-meaning">Vì sao các cung này được làm nổi bật?</div></div>
    <div class="panel-content">
      <div class="panel-section"><p class="panel-text">${topic.lead}</p></div>
      <div class="panel-section"><h4 class="panel-section-title">Các cung đang được đánh dấu</h4><div class="topic-palace-list">${items}</div></div>
      <div class="panel-section"><p class="panel-text-small">Bấm một cung để xem sao được an tại cung đó. Cần đọc kết hợp tam hợp, xung chiếu và bối cảnh thực tế.</p></div>
    </div>`;
  panelEl.querySelectorAll('.topic-palace-card').forEach(btn => btn.addEventListener('click', () => onPalaceLinkClick?.(btn.dataset.palace)));
}

function showEmpty() {
  currentPalace = null;
  panelEl.innerHTML = `
    <div class="panel-empty">
      <div class="panel-empty-icon">◎</div>
      <p class="panel-empty-text">Chọn một cung trên lá số<br>để xem chi tiết</p>
      <p class="panel-empty-hint">hoặc chọn chủ đề bên trên để khám phá theo hướng bạn quan tâm</p>
    </div>
  `;
}

function getPalace(id) {
  return PALACES.find(p => p.id === id);
}

function renderPanel() {
  const palace = getPalace(currentPalace);
  if (!palace) { showEmpty(); return; }

  const tabsHtml = TABS.map(t =>
    `<button class="panel-tab${t.id === currentTab ? ' active' : ''}" data-tab="${t.id}" aria-pressed="${t.id === currentTab}">${t.label}</button>`
  ).join('');

  let contentHtml = '';
  switch (currentTab) {
    case 'overview': contentHtml = renderOverview(palace); break;
    case 'stars': contentHtml = renderStars(palace); break;
    case 'interpret': contentHtml = renderInterpret(palace); break;
    case 'year': contentHtml = renderYear(palace); break;
  }

  panelEl.innerHTML = `
    <div class="panel-header">
      <div class="panel-palace-name">${palace.name}</div>
      <div class="panel-palace-meaning">${palace.meaning}</div>
    </div>
    <div class="panel-tabs" role="tablist">${tabsHtml}</div>
    <div class="panel-content">${contentHtml}</div>
  `;

  // Tab click handlers
  panelEl.querySelectorAll('.panel-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      renderPanel();
    });
  });

  // Palace link click handlers
  panelEl.querySelectorAll('.palace-link').forEach(link => {
    const handler = () => {
      if (onPalaceLinkClick) onPalaceLinkClick(link.dataset.palace);
    };
    link.addEventListener('click', handler);
    link.addEventListener('keydown', e => { if (e.key === 'Enter') handler(); });
  });
}

function renderOverview(palace) {
  const text = linkifyPalaces(renderMarkdown(palace.overview));
  return `
    <div class="panel-section">
      <p class="panel-text">${text}</p>
    </div>
    <div class="panel-section">
      <h4 class="panel-section-title">Điều nên lưu ý</h4>
      <p class="panel-text panel-advice">${linkifyPalaces(renderMarkdown(palace.advice))}</p>
    </div>
    <div class="panel-section panel-stars-preview">
      <h4 class="panel-section-title">Sao chính</h4>
      <div class="star-chips">
        ${palace.stars.map(s => `<span class="star-chip ${starTypeClass(s.type)}">${s.name}${s.brightness ? ` <small>${brightnessLabel(s.brightness)}</small>` : ''}</span>`).join('')}
      </div>
    </div>
  `;
}

function renderStars(palace) {
  const rows = palace.stars.map(s => `
    <div class="star-row">
      <div class="star-row-name">
        <span class="star-dot ${starTypeClass(s.type)}"></span>
        <span>${s.name}</span>
      </div>
      <div class="star-row-meta">
        <span class="star-type-label">${starTypeLabel(s.type)}</span>
        ${s.brightness ? `<span class="star-bright-label">${s.brightness} ${brightnessLabel(s.brightness)}</span>` : ''}
      </div>
    </div>
  `).join('');

  return `
    <div class="panel-section">
      <p class="panel-text-small">Các sao hiện diện trong cung ${palace.name}, ảnh hưởng đến ý nghĩa và xu hướng của cung này.</p>
    </div>
    <div class="panel-section star-list">${rows}</div>
    <div class="panel-section">
      <div class="star-legend">
        <span class="star-legend-item"><span class="star-dot star-chinh"></span> Chính tinh</span>
        <span class="star-legend-item"><span class="star-dot star-phu"></span> Phụ tinh</span>
        <span class="star-legend-item"><span class="star-dot star-sat"></span> Sát tinh</span>
        <span class="star-legend-item"><span class="star-dot star-loc"></span> Lộc tinh</span>
        <span class="star-legend-item"><span class="star-dot star-khoa"></span> Khoa tinh</span>
      </div>
    </div>
  `;
}

function renderInterpret(palace) {
  const topicKey = TOPIC_KEY_MAP[currentTopic];
  if (topicKey && palace.topics[topicKey]) {
    const topicLabel = {
      career: 'Sự nghiệp', wealth: 'Tài lộc', love: 'Tình duyên',
      family: 'Gia đạo', health: 'Sức khỏe', social: 'Quan hệ xã hội'
    }[topicKey];
    return `
      <div class="panel-section">
        <div class="panel-topic-badge">${topicLabel}</div>
        <p class="panel-text">${linkifyPalaces(renderMarkdown(palace.topics[topicKey]))}</p>
      </div>
      <div class="panel-section">
        <h4 class="panel-section-title">Tổng quan cung</h4>
        <p class="panel-text">${linkifyPalaces(renderMarkdown(palace.overview))}</p>
      </div>
    `;
  }

  // Default: show all topic snippets
  const topicHtml = Object.entries(palace.topics).map(([key, text]) => {
    const label = { career: 'Sự nghiệp', wealth: 'Tài lộc', love: 'Tình duyên', family: 'Gia đạo', health: 'Sức khỏe', social: 'Quan hệ xã hội' }[key];
    return `
      <div class="interpret-topic">
        <span class="interpret-topic-label">${label}</span>
        <p class="panel-text-small">${linkifyPalaces(renderMarkdown(text))}</p>
      </div>
    `;
  }).join('');

  return `<div class="panel-section">${topicHtml}</div>`;
}

function renderYear(palace) {
  const yearData = YEAR_DATA[currentYear];
  if (!yearData) return '<p class="panel-text">Chưa có dữ liệu cho năm này.</p>';

  const events = yearData.events.filter(e => e.palace === palace.id);
  const isLuuNien = yearData.luuNienCung === palace.id;

  return `
    <div class="panel-section">
      <div class="panel-year-header">
        <span class="panel-year-badge">${currentYear}</span>
        <span class="panel-year-lunar">${yearData.luuNien}</span>
      </div>
      ${isLuuNien ? '<div class="panel-luu-nien-badge">★ Lưu Niên đi qua cung này</div>' : ''}
    </div>
    ${events.length > 0 ? `
      <div class="panel-section">
        <h4 class="panel-section-title">Diễn biến tại cung ${palace.name}</h4>
        ${events.map(e => `<p class="panel-text">${linkifyPalaces(renderMarkdown(e.text))}</p>`).join('')}
      </div>
    ` : `
      <div class="panel-section">
        <p class="panel-text-small">Không có diễn biến đặc biệt tại cung ${palace.name} trong năm ${currentYear}.</p>
      </div>
    `}
    <div class="panel-section">
      <h4 class="panel-section-title">Tổng quan năm ${currentYear}</h4>
      <p class="panel-text">${linkifyPalaces(renderMarkdown(yearData.summary))}</p>
    </div>
  `;
}

function starTypeLabel(type) {
  const map = { chinh: 'Chính tinh', phu: 'Phụ tinh', sat: 'Sát tinh', loc: 'Lộc tinh', khoa: 'Khoa tinh' };
  return map[type] || type;
}
