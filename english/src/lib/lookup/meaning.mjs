import fs from 'node:fs';
import htmlParser from 'next/dist/compiled/node-html-parser/index.js';
import { DatabaseSync } from 'node:sqlite';

const MAX_MEANING_LEN = 1600;
const VDICT_CACHE_LIMIT = 500;
const vdictMemoryCache = new Map();

let lacvietDbInstance = null;
let lacvietDbPathChecked = null;

export function formatPosGroups(groups, maxLen = MAX_MEANING_LEN) {
  if (!Array.isArray(groups) || groups.length === 0) return '';
  const lines = [];
  for (const group of groups) {
    const pos = (group.pos || '').trim();
    const senses = (group.senses || []).map(s => String(s).trim()).filter(Boolean);
    if (senses.length === 0) continue;
    const prefix = pos ? `(${pos}) ` : '';
    lines.push(`${prefix}${senses.join('; ')}`);
  }
  let result = lines.join('\n').trim();
  if (result.length > maxLen) {
    result = result.slice(0, maxLen - 3).trimEnd() + '...';
  }
  return result;
}

export function parseVDictHtml(html, requestedWord) {
  if (!html || typeof html !== 'string') return null;

  const root = htmlParser.parse(html);
  const norm = value => value.normalize('NFKC').normalize('NFKC').trim().toLowerCase();
  if (norm(root.querySelector('h1')?.text || '') !== norm(requestedWord)) return null;
  const groups = (root.querySelector('#entryDefinition')?.querySelectorAll('.unified-senses') || []).map(section => ({
    pos: section.querySelector('.word-type')?.text.trim() || '',
    senses: section.querySelectorAll('.meaning-value.unified-translation').map(el => el.text.replace(/\s+/g, ' ').trim()).filter(Boolean),
  })).filter(group => group.senses.length);
  return groups.length ? groups : null;
}

export function lookupLacViet(word, dbPathOverride = null) {
  try {
    const norm = (word || '').normalize('NFKC').trim().toLowerCase();
    if (!norm) return null;
    const dbPath = dbPathOverride || process.env.LACVIET_DB_PATH || '/data/dictionaries/lacviet.sqlite';

    // Check if database exists, DO NOT create on miss
    if (!fs.existsSync(dbPath)) {
      return null;
    }

    if (!lacvietDbInstance || lacvietDbPathChecked !== dbPath) {
      lacvietDbInstance = new DatabaseSync(dbPath, { readOnly: true });
      lacvietDbPathChecked = dbPath;
    }

    const stmt = lacvietDbInstance.prepare('SELECT entries FROM words WHERE word = ?');
    const row = stmt.get(norm);
    if (!row || !row.entries) return null;

    const parsed = JSON.parse(row.entries);
    const meaning = formatPosGroups(parsed);
    if (!meaning) return null;

    return {
      meaning,
      source: 'lacviet',
      senses: parsed,
    };
  } catch {
    // Graceful error fallback
    return null;
  }
}

export async function lookupVDict(word, fetchImpl = fetch) {
  const norm = (word || '').normalize('NFKC').trim().toLowerCase();
  // Valid English word/phrase regex <= 100 chars, avoid traversal/injection
  if (!norm || norm.length > 100 || !/^[a-z0-9]+([ '-][a-z0-9]+)*$/i.test(norm)) {
    return null;
  }

  if (vdictMemoryCache.has(norm)) {
    return vdictMemoryCache.get(norm);
  }

  try {
    const url = `https://vdict.com/${encodeURIComponent(norm)},1,0,0.html`;
    const res = await fetchImpl(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(3000),
    });

    // Manual redirect reject -> fallback AI
    if (res.status >= 300 && res.status < 400) {
      return null;
    }

    if (!res.ok) {
      return null;
    }

    // Stream read max 1MB
    const reader = res.body?.getReader ? res.body.getReader() : null;
    let html = '';
    if (reader) {
      let receivedBytes = 0;
      const maxBytes = 1024 * 1024;
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        receivedBytes += value.length;
        if (receivedBytes > maxBytes) {
          await reader.cancel();
          return null;
        }
        html += decoder.decode(value, { stream: true });
      }
      html += decoder.decode();
    } else {
      const fullText = await res.text();
      html = fullText.slice(0, 1024 * 1024);
    }

    const groups = parseVDictHtml(html, norm);
    if (!groups || groups.length === 0) {
      return null;
    }

    const meaning = formatPosGroups(groups);
    if (!meaning) return null;

    const result = {
      meaning,
      source: 'vdict',
      senses: groups,
    };

    if (vdictMemoryCache.size >= VDICT_CACHE_LIMIT) {
      vdictMemoryCache.delete(vdictMemoryCache.keys().next().value);
    }
    vdictMemoryCache.set(norm, result);
    return result;
  } catch {
    return null;
  }
}

export async function lookupMeaning({
  word,
  context = '',
  definition = '',
  lacvietDbPath = null,
  localLookup = lookupLacViet,
  onlineLookup = lookupVDict,
  aiLookup = null,
}) {
  const norm = (word || '').trim();
  if (!norm) return null;

  // 1. Strict Local First (even with context, even if old AI cached)
  const localRes = localLookup(norm, lacvietDbPath);
  if (localRes && localRes.meaning) {
    return localRes;
  }

  // 2. Strict Online VDict Second
  const vdictRes = await onlineLookup(norm);
  if (vdictRes && vdictRes.meaning) {
    return vdictRes;
  }

  // 3. AI Fallback Third (only when both dictionaries miss/error)
  if (aiLookup) {
    const aiRes = await aiLookup({ word: norm, context, definition });
    if (aiRes && aiRes.meaning) {
      return {
        ...aiRes,
        source: 'ai',
      };
    }
  }

  return null;
}
