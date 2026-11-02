import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

const URL_ = process.env.NINEROUTER_URL || "http://192.168.101.36:20128";
const KEY = process.env.NINEROUTER_KEY || "";
const VOICES = { "en-US": "en-US-SaraNeural", "vi-VN": "vi-VN-HoaiMyNeural" };

export async function POST(request) {
  const requestId = randomUUID();
  const started = Date.now();
  const log = (event, fields = {}) => console.info("[tts]", JSON.stringify({ requestId, event, elapsedMs: Date.now() - started, ...fields }));
  try {
    const { text, lang = "en-US" } = await request.json();
    if (typeof text !== "string" || !text.trim() || text.length > 1000) {
      log("invalid-input", { type: typeof text, array: Array.isArray(text) });
      return NextResponse.json({ error: "Nội dung giọng đọc phải là văn bản, tối đa 1000 ký tự", requestId }, { status: 400 });
    }
    const voice = VOICES[lang] || VOICES["en-US"];
    const headers = { "Content-Type": "application/json" };
    if (KEY) headers.Authorization = `Bearer ${KEY}`;
    const res = await fetch(`${URL_}/v1/audio/speech`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(90000),
      body: JSON.stringify({ model: `edge-tts/${voice}`, input: text, response_format: "mp3" }),
    });
    if (!res.ok) { log("upstream-error", { status: res.status, voice }); return NextResponse.json({ error: `Dịch vụ giọng đọc trả HTTP ${res.status}`, requestId }, { status: 502 }); }
    const audio = await res.arrayBuffer();
    log("complete", { voice, bytes: audio.byteLength });
    return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400" } });
  } catch (e) {
    log("failed", { name: e.name });
    return NextResponse.json({ error: "Kết nối dịch vụ giọng đọc lỗi. Bấm loa để thử lại.", requestId }, { status: 502 });
  }
}
