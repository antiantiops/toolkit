// ponytail: retry 2 times on transient network fail or 502/503/504. Exponential backoff 1s, 2s.
export async function fetchWithRetry(url, options = {}, retries = 2, delay = 1000) {
  const timeoutMs = options.timeout || 120000;
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    if (options.signal) {
      options.signal.addEventListener("abort", () => controller.abort());
    }

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if ([502, 503, 504].includes(res.status) && attempt < retries) {
        await new Promise((r) => setTimeout(r, delay * Math.pow(2, attempt)));
        continue;
      }

      return res;
    } catch (err) {
      clearTimeout(timer);
      err.message = `${err.message} [${options.method || "GET"} ${url}; attempt ${attempt + 1}/${retries + 1}; timeout ${timeoutMs}ms]`;
      lastErr = err;
      if (options.signal?.aborted) throw err;

      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delay * Math.pow(2, attempt)));
        continue;
      }
    }
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
