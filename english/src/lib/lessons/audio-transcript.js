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

export function validateTimedTranscript(data) {
  const segments=data?.segments;
  if (!Array.isArray(segments) || !segments.length || segments.length>500) throw new Error('Transcript phải có 1–500 câu');
  let lastStart=-1, total=0;
  return segments.map(s=>{
    if (!s || typeof s.text!=='string' || !s.text.trim() || typeof s.speaker!=='string' || s.speaker.length>100 || !Number.isFinite(s.start) || !Number.isFinite(s.end) || s.start<0 || s.end<=s.start || s.end>901 || s.start<lastStart) throw new Error('Transcript hoặc timestamp không hợp lệ');
    lastStart=s.start; total+=s.text.length;
    if(total>100000) throw new Error('Transcript quá dài');
    return {en:s.text.trim(),speaker:s.speaker.trim(),start:s.start,end:s.end};
  });
}
