export function parseAudioTranscript(text) {
  if (typeof text !== 'string' || !text.trim() || text.length > 100000) throw new Error('STT transcript rỗng hoặc quá dài');
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let turns;
  try { turns = JSON.parse(cleaned).segments; } catch {
    if (/^[{[]/.test(cleaned)) throw new Error('STT JSON không hợp lệ');
    turns = [{ speaker: '', text: cleaned }];
  }
  if (!Array.isArray(turns) || !turns.length || turns.length > 500) throw new Error('STT lượt thoại không hợp lệ');
  const splitter = new Intl.Segmenter('en', { granularity: 'sentence' });
  const result = turns.flatMap(turn => {
    if (!turn || typeof turn.text !== 'string' || !turn.text.trim() || typeof turn.speaker !== 'string' || turn.speaker.length > 100) throw new Error('STT lượt thoại không hợp lệ');
    return [...splitter.segment(turn.text)].map(s => ({ en: s.segment.trim(), speaker: turn.speaker.trim() }));
  });
  if (result.length > 500) throw new Error('Transcript vượt 500 đoạn');
  return result;
}
