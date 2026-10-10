// ponytail: bounded retries for transient failures; abort cancels requests and backoff.
export async function fetchWithRetry(url, options = {}, retries = 2, delay = 1000) {
  const { timeout: timeoutMs = 120000, signal, ...init } = options;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    signal?.throwIfAborted();
    const controller = new AbortController();
    const abort = () => controller.abort(signal.reason);
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      if (![502, 503, 504].includes(res.status) || attempt === retries) return res;
      await res.body?.cancel();
    } catch (err) {
      if (signal?.aborted) throw signal.reason;
      lastErr = new Error(`${err.message} [${init.method || "GET"} ${url}; attempt ${attempt + 1}/${retries + 1}; timeout ${timeoutMs}ms]`, { cause: err });
      if (attempt === retries) throw lastErr;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
    await new Promise((resolve, reject) => {
      const cleanup = () => signal?.removeEventListener('abort', cancel);
      const cancel = () => { clearTimeout(wait); cleanup(); reject(signal.reason); };
      const wait = setTimeout(() => { cleanup(); resolve(); }, delay * 2 ** attempt);
      signal?.addEventListener('abort', cancel, { once: true });
      if (signal?.aborted) cancel();
    });
  }
  throw lastErr;
}

export async function parseApiResponse(res) {
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch {
    throw new Error(`HTTP ${res.status}: response không phải JSON (${res.headers.get("content-type") || "unknown"}). ${res.redirected ? "Request bị redirect; kiểm tra phiên đăng nhập. " : ""}${text.slice(0, 500)}`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${data?.error || data?.message || "API error"}${data?.requestId ? `\nRequest ID: ${data.requestId}` : ""}${data?.stage ? `\nStage: ${data.stage}` : ""}`);
  }
  if (!data || typeof data !== "object") throw new Error(`HTTP ${res.status}: JSON response rỗng hoặc sai kiểu`);
  return data;
}

export function formatErrorMessage(e) {
  if (!e) return "";
  const raw = `${e.name || "Error"}: ${e.message || String(e)}`;
  console.error("[client-api-error]", e);
  return raw + (/Failed to fetch|NetworkError/.test(raw)
    ? "\nTrình duyệt không cung cấp HTTP response. Chưa xác định được lỗi mạng, proxy hay đăng nhập."
    : "");
}

// Shared short-request polling; failed parts retain their job ID for explicit retry.
export async function pollLesson(mode, payload, onProgress) {
  const key = `${mode}-pending-job`;
  let jobId = sessionStorage.getItem(key);
  if (!jobId) {
    const started = await parseApiResponse(await fetchWithRetry(`/api/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), timeout: 15000 }, 0));
    jobId = started.jobId;
    if (!jobId) throw new Error('Missing jobId');
    sessionStorage.setItem(key, jobId);
  }
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    const res = await fetchWithRetry(`/api/${mode}?jobId=${encodeURIComponent(jobId)}`, { timeout: 15000, cache: 'no-store' }, 2);
    if (res.status === 404) sessionStorage.removeItem(key);
    const data = await parseApiResponse(res);
    onProgress(data);
    if (data.status === 'completed') { sessionStorage.removeItem(key); return data; }
    if (['failed', 'partial'].includes(data.status)) {
      sessionStorage.removeItem(key);
      const error = new Error(`${data.error}\nJob ID: ${jobId}\nStage: ${data.stage}`);
      error.jobId = jobId;
      throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  throw new Error(`Task still running; reload to resume. Job ID: ${jobId}`);
}
