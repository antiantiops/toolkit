import htmlParser from 'next/dist/compiled/node-html-parser/index.js';

const parse = htmlParser.parse || htmlParser.default?.parse || htmlParser;

const WORD_REGEX = /^[A-Za-z][A-Za-z'-]{0,63}$/;
const OXFORD_HOST = 'www.oxfordlearnersdictionaries.com';
const TIMEOUT_MS = 8000;
const MAX_BYTES = 1024 * 1024; // 1MB
const CACHE_MAX = 500;
const POSITIVE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const NEGATIVE_TTL = 10 * 60 * 1000; // 10 minutes

const cache = new Map();
const inflight = new Map();

export function validateWord(word) {
  return typeof word === 'string' && WORD_REGEX.test(word);
}

export function validateMediaUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return null;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:') return null;
    if (parsed.hostname !== OXFORD_HOST || parsed.port || parsed.username || parsed.password) return null;
    if (!parsed.pathname.startsWith('/us/media/') && !parsed.pathname.startsWith('/media/')) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function extractRegionPhonetics(regionEl) {
  if (!regionEl) return { ipa: null, audio: null };
  const phonEls = regionEl.querySelectorAll('.phon');
  let ipa = null;
  if (phonEls.length > 0) {
    const list = phonEls
      .map(el => el.text.trim())
      .filter(Boolean);
    if (list.length > 0) {
      ipa = Array.from(new Set(list)).join(', ');
    }
  }
  const soundEl = regionEl.querySelector('[data-src-mp3]');
  const rawMp3 = soundEl?.getAttribute('data-src-mp3');
  const audio = validateMediaUrl(rawMp3);
  return { ipa, audio };
}

export function parseOxfordHtml(html, sourceUrl) {
  if (!html || typeof html !== 'string') return null;
  const root = parse(html);

  // Main entry first .phonetics only
  const entry = root.querySelector('#entryContent .entry') || root.querySelector('.entry') || root;
  const phonetics = entry.querySelector('.phonetics');
  if (!phonetics) return null;

  const br = extractRegionPhonetics(phonetics.querySelector('.phons_br'));
  const nam = extractRegionPhonetics(phonetics.querySelector('.phons_n_am'));

  if (!br.ipa && !br.audio && !nam.ipa && !nam.audio) {
    return null;
  }

  return {
    uk: br.ipa,
    us: nam.ipa,
    audioUk: br.audio,
    audioUs: nam.audio,
    source: 'Oxford',
    sourceUrl,
  };
}

async function fetchOxfordHtml(word) {
  const canonicalWord = word.toLowerCase();
  const targetUrl = `https://${OXFORD_HOST}/us/definition/english/${encodeURIComponent(canonicalWord)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (res.status !== 200) {
      return { html: null, url: targetUrl };
    }

    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      return { html: text.slice(0, MAX_BYTES), url: targetUrl };
    }

    const decoder = new TextDecoder();
    let text = '';
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();

    return { html: text, url: targetUrl };
  } finally {
    clearTimeout(timeoutId);
  }
}

function cleanCache() {
  if (cache.size >= CACHE_MAX) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

export async function lookupOxford(word) {
  if (!validateWord(word)) return null;

  const key = word.toLowerCase();
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const promise = (async () => {
    try {
      const { html, url } = await fetchOxfordHtml(word);
      const parsed = html ? parseOxfordHtml(html, url) : null;
      cleanCache();
      cache.set(key, {
        data: parsed,
        expiresAt: now + (parsed ? POSITIVE_TTL : NEGATIVE_TTL),
      });
      return parsed;
    } catch {
      cleanCache();
      cache.set(key, {
        data: null,
        expiresAt: now + NEGATIVE_TTL,
      });
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}
