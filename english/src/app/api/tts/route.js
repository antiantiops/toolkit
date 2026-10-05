import { NextResponse } from "next/server";

const URL_ = process.env.NINEROUTER_URL || "http://192.168.101.36:20128";
const KEY = process.env.NINEROUTER_KEY || "";
const VOICES = { "en-US": "en-US-AvaMultilingualNeural", "vi-VN": "vi-VN-HoaiMyNeural" };

export async function POST(request) {
  try {
    const { text, lang = "en-US" } = await request.json();
    if (typeof text !== "string" || !text.trim() || text.length > 1000) return NextResponse.json({ error: "Invalid text" }, { status: 400 });
    const voice = VOICES[lang] || VOICES["en-US"];
    const headers = { "Content-Type": "application/json" };
    if (KEY) headers.Authorization = `Bearer ${KEY}`;
    const res = await fetch(`${URL_}/v1/audio/speech`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: `edge-tts/${voice}`, input: text, response_format: "mp3" }),
    });
    if (!res.ok) return NextResponse.json({ error: `tts ${res.status}` }, { status: 502 });
    return new Response(await res.arrayBuffer(), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
