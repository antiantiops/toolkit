// Cached jobs and API responses are untrusted, including results from older builds.
export function validateAssessment(result) {
  if (!result || !['feedback','retry'].includes(result.status) ||
      typeof result.heard !== 'string' || typeof result.summary !== 'string' ||
      !Array.isArray(result.tips) || result.tips.some(t => typeof t !== 'string') ||
      (result.score != null && (!Number.isInteger(result.score) || result.score < 0 || result.score > 100)) ||
      (result.segments != null && (!Array.isArray(result.segments) || result.segments.some(s =>
        !s || typeof s.text !== 'string' || !s.text || !['correct','wrong','neutral'].includes(s.status))))) {
    throw Error('Kết quả phát âm không hợp lệ. Bấm Thử đánh giá lại; không cần thu lại.');
  }
  return result;
}
