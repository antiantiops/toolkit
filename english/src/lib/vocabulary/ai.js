export async function callJsonArray(content, { requestId, stage, maxTokens = 4096 } = {}) {
  const started = Date.now();
  const model = process.env.NINEROUTER_MODEL || 'ag/gemini-3.8-flash-high';
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.NINEROUTER_KEY) headers.Authorization = `Bearer ${process.env.NINEROUTER_KEY}`;
  const log = (event, details = {}) => console.info('[vocab-ai]', JSON.stringify({ requestId, stage, event, elapsedMs: Date.now() - started, ...details }));
  log('start', { model });
  try {
    const res = await fetch(`${process.env.NINEROUTER_URL || 'http://192.168.101.36:20128'}/v1/chat/completions`, {
      method: 'POST', headers, signal: AbortSignal.timeout(120000),
      body: JSON.stringify({ model, messages: [{ role: 'user', content }], stream: false, max_tokens: maxTokens, temperature: 0.2 }),
    });
    log('response', { status: res.status });
    const data = await res.json();
    if (!res.ok) throw new Error(`9router HTTP ${res.status}: ${String(data.error?.message || data.error || data.message || 'Unknown upstream error').slice(0, 600)}`);
    const text = data.choices?.[0]?.message?.content || '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error(`AI missing JSON array; finish_reason=${data.choices?.[0]?.finish_reason}; length=${text.length}`);
    const result = JSON.parse(match[0]);
    if (!Array.isArray(result) || !result.length || result.length > 100 || result.some(w => !w || typeof w.word !== 'string' || !w.word.trim() || w.word.length > 200)) throw new Error('Invalid vocabulary array schema');
    log('complete', { count: result.length });
    return result;
  } catch (e) {
    const error = new Error(`${e.name}: ${e.message}`.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]'));
    log('failed', { error: error.message });
    throw error;
  }
}
