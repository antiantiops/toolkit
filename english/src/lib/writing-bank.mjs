// ponytail: exact word/phrase forms only; no guessed stemming or semantic synonyms.
export function bankParts(text = '', bank = []) {
  const terms = [...new Set(bank.map(x => String(x?.word || '').trim()).filter(Boolean))].sort((a,b) => b.length-a.length);
  if (!terms.length) return [{ text, matched: false }];
  const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = terms.map(t => escape(t).replace(/\s+/g, '\\s+')).join('|');
  const re = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${pattern})(?![\\p{L}\\p{N}_])`, 'giu');
  const parts = []; let end = 0;
  for (const match of text.matchAll(re)) {
    if (match.index > end) parts.push({ text: text.slice(end, match.index), matched: false });
    parts.push({ text: match[0], matched: true }); end = match.index + match[0].length;
  }
  if (end < text.length) parts.push({ text: text.slice(end), matched: false });
  return parts;
}
