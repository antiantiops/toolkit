import { NextResponse, after } from "next/server";
import { randomUUID } from "crypto";
import { saveSession } from "../session/storage";
import { getUploadedFile } from "../upload/storage";

const NINEROUTER_URL = process.env.NINEROUTER_URL || "http://192.168.101.36:20128";
const NINEROUTER_KEY = process.env.NINEROUTER_KEY || "";
const MODEL = process.env.NINEROUTER_MODEL || "ag/gemini-3.8-flash-high";

const PROMPT = `You are a vocabulary extraction assistant. Analyze this image of a vocabulary page or textbook.
Extract ALL vocabulary words visible in the image.

For each word, provide:
1. word: The English word exactly as shown
2. ipa: IPA pronunciation (e.g. /\u02C8\u00E6p.\u0259l/)
3. meaning: Vietnamese meaning
4. partOfSpeech: Primary part of speech. Use only: noun, verb, adjective, adverb, pronoun, preposition, conjunction, determiner, phrase
5. example: A short example sentence using the word
6. exampleVietnamese: Vietnamese translation of the example sentence
7. definition: Short English dictionary definition. If an English definition is printed beside word in image, preserve its meaning; otherwise write concise accurate definition.
8. definitionVietnamese: Natural Vietnamese translation of definition.
9. easyReading: Phiên âm bồi tiếng Việt chuẩn theo IPA tiếng Anh cho cả 2 giọng Anh - Anh (UK) và Anh - Mỹ (US) (ví dụ: automate -> UK: “ó-tơ-mệt”, US flap-t: “ó-dơ-mệt”; water -> UK: “oá-tờ”, US: “oá-đờr”). Đánh dấu sắc/huyền theo trọng âm. Format: "🇬🇧 UK: “...” • 🇺🇸 US: “...”. <lưu ý ngắn nếu có>".
10. synonyms: If the image prints synonyms, copy them and add concise Vietnamese meaning in parentheses for each word, e.g. "feature (đặc tính), property (thuộc tính)". Otherwise provide 1-2 accurate context-appropriate synonyms with Vietnamese meaning in parentheses, or empty string.
    synonymsInBook: true ONLY if synonyms were printed in the image; false if you generated them yourself.
11. antonyms: If the image prints antonyms, copy them and add concise Vietnamese meaning in parentheses for each word, e.g. "disadvantage (nhược điểm)". Otherwise provide 1-2 accurate context-appropriate antonyms with Vietnamese meaning in parentheses, or empty string.
    antonymsInBook: true ONLY if antonyms were printed in the image; false if you generated them yourself.
12. collocations: 1-3 useful fixed word combinations with this word, especially one from example. Array items: {"phrase":"English phrase","meaning":"Vietnamese meaning","note":"short Vietnamese usage tip"}. Use [] when none.
13. contrastTip: Compare ONLY the main word and EVERY word already listed in this same response’s synonyms and antonyms. NEVER introduce extra comparison words. Give one short Vietnamese line per listed word describing when/context it is used, not just its translation. Group lines under Đồng nghĩa and Trái nghĩa. Include the main word’s use in the supplied example; do not restrict a multi-sense word to one unrelated meaning. Mention non-interchangeability or a different construction where relevant. No 2-4 line limit: cover all listed words, each explanation 3-12 Vietnamese words. If both lists are empty, return empty string.
14. note: A short learning tip or usage note in Vietnamese, or empty string

Respond ONLY with a valid JSON array, no markdown fences, no explanation:
[{"word":"sand","ipa":"/sænd/","meaning":"cát","partOfSpeech":"noun","definition":"A loose substance made of very small pieces of rock.","definitionVietnamese":"Một chất rời gồm những mảnh đá rất nhỏ.","easyReading":"🇬🇧 UK: “xand” • 🇺🇸 US: “sænd”. Âm /s/ rõ ở đầu và /d/ ở cuối.","example":"The children play in the sand.","exampleVietnamese":"Bọn trẻ chơi trong cát.","synonyms":"","synonymsInBook":false,"antonyms":"","antonymsInBook":false,"contrastTip":"","note":"Không đếm được khi nói chung về cát."}]`;

async function analyzeImage(request, sessionId) {
  const requestId = randomUUID();
  let stage = "read-image";
  const started = Date.now();
  const log = (event, details = {}) => console.info("[vocab-analyze]", JSON.stringify({ requestId, event, stage, elapsedMs: Date.now() - started, ...details }));
  log("request-start");
  const fail = (error, status, details = {}) => {
    // Never log image data, cookies, auth headers or complete upstream responses.
    const safe = String(error).replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
    console.error("[vocab-analyze]", JSON.stringify({ requestId, stage, elapsedMs: Date.now() - started, error: safe, ...details }));
    return NextResponse.json({ error: safe, requestId, stage }, { status });
  };
  try {
    let base64, mime;
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const id = body.imageId || body.id;
      const item = getUploadedFile(id);
      if (!item) return fail("Ảnh không tồn tại hoặc đã hết hạn trên server", 400);
      base64 = item.buffer.toString("base64");
      mime = item.mime;
    } else {
      const formData = await request.formData();
      const id = formData.get("imageId") || formData.get("id");
      if (id) {
        const item = getUploadedFile(id);
        if (!item) return fail("Ảnh không tồn tại hoặc đã hết hạn trên server", 400);
        base64 = item.buffer.toString("base64");
        mime = item.mime;
      } else {
        const file = formData.get("image") || formData.get("file");
        if (!file) return fail("No image uploaded", 400);
        const bytes = await file.arrayBuffer();
        base64 = Buffer.from(bytes).toString("base64");
        mime = file.type || "image/jpeg";
      }
    }
    log("image-loaded", { imageBytes: Math.floor(base64.length * 3 / 4), mime });
    const dataUrl = `data:${mime};base64,${base64}`;

    const headers = { "Content-Type": "application/json" };
    if (NINEROUTER_KEY) headers["Authorization"] = `Bearer ${NINEROUTER_KEY}`;

    // ponytail: 120s timeout covers slow upstream AI processing on high-res images.
    stage = "ai-request";
    log("ai-request", { model: MODEL });
    const res = await fetch(`${NINEROUTER_URL}/v1/chat/completions`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(120000),
      body: JSON.stringify({
        model: MODEL,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        }],
        stream: false,
        max_tokens: 8192,
        temperature: 0.2,
      }),
    });

    log("ai-response", { upstreamStatus: res.status });
    if (!res.ok) {
      const errText = await res.text();
      let upstream;
      try { upstream = JSON.parse(errText); } catch {}
      const message = upstream?.error?.message || (typeof upstream?.error === "string" ? upstream.error : upstream?.message);
      return fail(`9router HTTP ${res.status}: ${message ? String(message).slice(0, 1000) : "Upstream returned non-JSON/unrecognized error body"}`, 502, { upstreamStatus: res.status, model: MODEL });
    }

    stage = "ai-response";
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return fail(`AI response không có JSON array; finish_reason=${data.choices?.[0]?.finish_reason || "unknown"}; contentLength=${content.length}`, 502, { model: MODEL });
    }

    stage = "ai-json-parse";
    let words;
    try { words = JSON.parse(jsonMatch[0]); } catch (e) {
      return fail(`AI JSON parse: ${e.message}`, 502, { finishReason: data.choices?.[0]?.finish_reason, contentLength: content.length });
    }
    if (!Array.isArray(words) || !words.length || words.some(w => !w || typeof w.word !== "string")) return fail("AI trả danh sách từ rỗng hoặc sai schema", 502);
    stage = "save-session";

    // Cookie session management:
    let sid = sessionId || request.cookies.get("vocab_sid")?.value;
    const isNewSid = !sid;
    if (isNewSid) sid = randomUUID();

    // Cache words and preview on server for 24 hours
    saveSession(sid, { words, preview: dataUrl });

    const response = NextResponse.json({ words, requestId });
    if (isNewSid) {
      response.cookies.set("vocab_sid", sid, {
        maxAge: 86400,
        path: "/",
        sameSite: "lax",
        httpOnly: true,
      });
    }

    log("request-complete", { words: words.length, responseBytes: Buffer.byteLength(JSON.stringify({ words, requestId })) });
    response.headers.set("X-Request-ID", requestId);
    return response;
  } catch (e) {
    return fail(`${e.name}: ${e.message}${e.cause?.code ? `; cause=${e.cause.code}` : ""}`, stage.startsWith("ai-") ? 502 : 500);
  }
}

// ponytail: single persistent Node process. Use durable worker queue before scaling replicas.
const jobs = globalThis.vocabAnalysisJobs ||= new Map();
const TTL = 2 * 60 * 60 * 1000;
export async function POST(request) {
  let body;
  try { body = await request.clone().json(); } catch { return NextResponse.json({ error: "Expected JSON { imageId }" }, { status: 400 }); }
  if (typeof body.imageId !== "string" || !/^[a-f0-9-]{36}\.[a-z0-9]{1,10}$/.test(body.imageId)) return NextResponse.json({ error: "Invalid imageId" }, { status: 400 });
  const sid = request.cookies.get("vocab_sid")?.value || randomUUID();
  for (const [id, job] of jobs) if (Date.now() - job.createdAt > TTL && job.status !== "running") jobs.delete(id);
  let job = [...jobs.values()].find(j => j.owner === sid && j.imageId === body.imageId && j.status !== "failed");
  if (!job) {
    if ([...jobs.values()].filter(j => j.status === "running").length >= 3) return NextResponse.json({ error: "AI đang xử lý 3 tác vụ. Thử lại sau ít phút." }, { status: 429 });
    job = { id: randomUUID(), owner: sid, imageId: body.imageId, status: "running", createdAt: Date.now() };
    jobs.set(job.id, job);
    const task = job;
    after(async () => {
      try {
        const res = await analyzeImage(request, sid);
        task.result = await res.json();
        task.status = res.ok ? "completed" : "failed";
      } catch (e) {
        task.status = "failed";
        task.result = { error: `${e.name}: ${e.message}`, stage: "background-task" };
        console.error("[vocab-job]", task.id, e.name, e.message);
      }
    });
  }
  const res = NextResponse.json({ jobId: job.id, status: job.status }, { status: 202 });
  res.cookies.set("vocab_sid", sid, { maxAge: 86400, path: "/", sameSite: "lax", httpOnly: true });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
export async function GET(request) {
  const id = new URL(request.url).searchParams.get("jobId");
  const job = jobs.get(id);
  if (!job || job.owner !== request.cookies.get("vocab_sid")?.value) return NextResponse.json({ error: "Tác vụ không tồn tại, hết hạn hoặc server đã khởi động lại. Chọn ảnh và phân tích lại." }, { status: 404 });
  return NextResponse.json({ jobId: id, status: job.status, elapsedMs: Date.now() - job.createdAt, ...(job.status !== "running" ? job.result : {}) }, { headers: { "Cache-Control": "no-store" } });
}
