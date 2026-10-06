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
  const text = await res.text().catch(() => "");
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {}
  if (!res.ok) {
    const msg =
      data?.error ||
      data?.message ||
      (text ? `HTTP ${res.status}: ${text.slice(0, 200)}` : `Lỗi HTTP ${res.status}`);
    throw new Error(msg);
  }
  return data || {};
}

export function formatErrorMessage(e) {
  if (!e) return "";
  const msg = e.message || String(e);
  if (msg === "Failed to fetch" || e.name === "TypeError") {
    return "Mất kết nối máy chủ (Failed to fetch).\n• Mạng chậm hoặc chập chờn (hệ thống đã tự thử lại 2 lần).\n• Hoặc hết hạn phiên Google → Bấm 'Tải lại trang'.";
  }
  if (e.name === "TimeoutError" || e.name === "AbortError" || /timeout|aborted/i.test(msg)) {
    return "Quá thời gian xử lý (Timeout >120s).\nĐường truyền quốc tế bị nghẽn hoặc ảnh quá lớn. Hãy bấm thử lại.";
  }
  return msg;
}
