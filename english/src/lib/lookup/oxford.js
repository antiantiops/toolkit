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

export function validateDefinitionUrl(urlStr, base = null) {
  if (!urlStr || typeof urlStr !== 'string') return null;
  try {
    const parsed = base ? new URL(urlStr, base) : new URL(urlStr);
    if (parsed.protocol !== 'https:') return null;
    if (parsed.hostname !== OXFORD_HOST || parsed.port || parsed.username || parsed.password) return null;
    if (!parsed.pathname.startsWith('/us/definition/english/') && !parsed.pathname.startsWith('/definition/english/')) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

async function fetchOxfordHtml(word) {
  const canonicalWord = word.toLowerCase();
  let currentUrl = `https://${OXFORD_HOST}/us/definition/english/${encodeURIComponent(canonicalWord)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const seen = new Set();
  const MAX_REDIRECTS = 3;

  try {
    for (let hops = 0; hops <= MAX_REDIRECTS; hops++) {
      if (seen.has(currentUrl)) {
        throw new Error(`Redirect loop detected: ${currentUrl}`);
      }
      seen.add(currentUrl);

      const res = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });

      if (res.status === 404) {
        if (res.body) {
          try { await res.body.cancel(); } catch {}
        }
        return { html: null, url: currentUrl, status: 404 };
      }

      if ([301, 302, 303, 307, 308].includes(res.status)) {
        if (res.body) {
          try { await res.body.cancel(); } catch {}
        }
        if (hops === MAX_REDIRECTS) {
          throw new Error(`Exceeded max redirects (${MAX_REDIRECTS})`);
        }
        const loc = res.headers.get('location');
        if (!loc) {
          throw new Error(`Redirect ${res.status} missing Location header`);
        }
        const nextUrl = validateDefinitionUrl(loc, currentUrl);
        if (!nextUrl) {
          throw new Error(`Unsafe or invalid redirect location: ${loc}`);
        }
        currentUrl = nextUrl;
        continue;
      }

      if (res.status !== 200) {
        if (res.body) {
          try { await res.body.cancel(); } catch {}
        }
        throw new Error(`Oxford upstream error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        const text = await res.text();
        return { html: text.slice(0, MAX_BYTES), url: currentUrl, status: 200 };
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

      return { html: text, url: currentUrl, status: 200 };
    }
    throw new Error(`Exceeded max redirects (${MAX_REDIRECTS})`);
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
      const { html, url, status } = await fetchOxfordHtml(word);
      if (status === 404) {
        cleanCache();
        cache.set(key, {
          data: null,
          expiresAt: now + NEGATIVE_TTL,
        });
        return null;
      }
      if (!html) {
        throw new Error(`Empty Oxford response for: ${word}`);
      }
      const parsed = parseOxfordHtml(html, url);
      if (!parsed) {
        throw new Error(`Oxford entry parsed with missing phonetics: ${word}`);
      }
      cleanCache();
      cache.set(key, {
        data: parsed,
        expiresAt: now + POSITIVE_TTL,
      });
      return parsed;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}
