const redact = s => {
  let out = String(s || '');
  if (process.env.NINEROUTER_KEY) out = out.replaceAll(process.env.NINEROUTER_KEY, '[redacted]');
  return out
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]*)?\b/g, '[redacted]')
    .replace(/(["']?(?:access_?token|refresh_?token|id_?token|api_?key|authorization|x-api-key|token|secret)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s&,;}\]]+)/gi, '$1[redacted]');
};

export async function callJson(content, { requestId, stage, maxTokens = 4096, shape = "array", model = process.env.NINEROUTER_MODEL || 'ag/gemini-3.8-flash-high', fallbackModel, timeoutMs = 120000 } = {}) {
  const started = Date.now();
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.NINEROUTER_KEY) headers.Authorization = 'Bearer ' + process.env.NINEROUTER_KEY;
  const log = (event, details = {}) => console.info('[vocab-ai]', JSON.stringify({ requestId, stage, event, elapsedMs: Date.now() - started, ...details }));
  log('start', { model });
  try {
    const res = await fetch(`${process.env.NINEROUTER_URL || 'http://192.168.101.36:20128'}/v1/chat/completions`, {
      method: 'POST', headers, signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({ model, messages: [{ role: 'user', content }], stream: false, max_tokens: maxTokens, temperature: 0.2 }),
    });
    log('response', { status: res.status });
    const raw = await res.text();
    const trimmed = raw.trim();
    const snippet = trimmed ? redact(trimmed.replace(/\s+/g, ' ')).slice(0, 600) : '';
    let data = null;
    let jsonError = null;
    if (trimmed) {
      try { data = JSON.parse(trimmed); } catch (err) { jsonError = err; }
    }
    if (!res.ok) {
      const rawMsg = data && typeof data === 'object' ? (data.error?.message || data.error || data.message) : null;
      const msg = rawMsg && typeof rawMsg === 'object' ? JSON.stringify(rawMsg) : rawMsg;
      const detail = msg ? redact(String(msg)).slice(0, 600) : (snippet || 'Empty upstream response');
      throw new Error(`9router HTTP ${res.status}: ${detail}`);
    }
    if (!trimmed || jsonError || !data || typeof data !== 'object') {
      throw new Error(`9router invalid JSON response: ${snippet || 'Empty upstream response'}`);
    }
    if (fallbackModel && model.startsWith('ag/') && data.choices?.[0]?.finish_reason === 'recitation') {
      log('fallback', { model, fallbackModel, reason: 'recitation' });
      return await callJson(content, { requestId, stage, maxTokens, shape, model: fallbackModel, timeoutMs });
    }
    const text = data.choices?.[0]?.message?.content || '';
    const match = (shape === "array" ? text.match(/\[[\s\S]*\]/) : text.match(/\{[\s\S]*\}/));
    if (!match) throw new Error(`AI missing JSON array; finish_reason=${data.choices?.[0]?.finish_reason}; length=${text.length}`);
    const result = JSON.parse(match[0]);
    if (shape === "array" && (!Array.isArray(result) || !result.length || result.length > 100 || result.some(w => !w || typeof w.word !== 'string' || !w.word.trim() || w.word.length > 200))) throw new Error('Invalid vocabulary array schema');
    if (shape === 'object' && (!result || Array.isArray(result) || typeof result !== 'object')) throw new Error('Invalid object schema');
    log('complete', { count: shape === 'array' ? result.length : Object.keys(result).length });
    return result;
  } catch (e) {
    const error = new Error(redact(`${e.name}: ${e.message}`));
    log('failed', { error: error.message, causeCode: String(e.cause?.code || '').slice(0, 80), causeName: String(e.cause?.name || '').slice(0, 80), timeoutMs });
    throw error;
  }
}
