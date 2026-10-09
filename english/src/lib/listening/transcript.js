export function validateTranscript(value) {
  if (!value || typeof value.title !== 'string' || !value.title.trim() || value.title.length > 200 || !Array.isArray(value.sentences) || !value.sentences.length || value.sentences.length > 30) throw new Error('Invalid listening transcript');
  for (const s of value.sentences) if (!s || typeof s.en !== 'string' || !s.en.trim() || s.en.length > 600 || typeof s.vi !== 'string' || !s.vi.trim() || s.vi.length > 1000) throw new Error('Invalid listening sentence');
  if (value.sentences.reduce((n, s) => n + s.en.length, 0) > 6000) throw new Error('Listening text too long');
  return { title: value.title.trim(), sentences: value.sentences.map(s => ({ en: s.en.trim(), vi: s.vi.trim() })) };
}
const synchsafe = n => new Uint8Array([(n >>> 21) & 127, (n >>> 14) & 127, (n >>> 7) & 127, n & 127]);
export function stripId3(bytes) {
  let start = 0, end = bytes.length;
  if (bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51 && bytes.length >= 10) {
    start = 10 + ((bytes[6] & 127) * 2097152 + (bytes[7] & 127) * 16384 + (bytes[8] & 127) * 128 + (bytes[9] & 127));
    if (bytes[5] & 16) start += 10;
    if (start > end) throw new Error('Invalid ID3 size');
  }
  if (end - start >= 128 && bytes[end - 128] === 84 && bytes[end - 127] === 65 && bytes[end - 126] === 71) end -= 128;
  return bytes.slice(start, end);
}
export function lyricsTag(text) {
  // ID3v2.4 USLT, UTF-8, language eng, empty description. No invented timestamps.
  const lyrics = new TextEncoder().encode(text);
  const body = new Uint8Array(5 + lyrics.length); body.set([3, 101, 110, 103, 0]); body.set(lyrics, 5);
  const tag = new Uint8Array(20 + body.length);
  tag.set([73, 68, 51, 4, 0, 0]); tag.set(synchsafe(10 + body.length), 6);
  tag.set([85, 83, 76, 84], 10); tag.set(synchsafe(body.length), 14); tag.set(body, 20);
  return tag;
}
export function measuredLrc(sentences, durations) {
  if (durations.length !== sentences.length || durations.some(d => !Number.isFinite(d) || d <= 0)) throw new Error('Missing measured durations');
  let time = 0;
  return sentences.map((s, i) => {
    const centiseconds = Math.round(time * 100), minutes = Math.floor(centiseconds / 6000), seconds = Math.floor(centiseconds % 6000 / 100), fraction = centiseconds % 100;
    const line = `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(fraction).padStart(2, '0')}]${s.en}`;
    time += durations[i]; return line;
  }).join('\n');
}
