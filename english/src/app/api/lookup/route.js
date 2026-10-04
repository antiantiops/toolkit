import { NextResponse } from "next/server";

const URL = process.env.NINEROUTER_URL || "http://192.168.101.36:20128";
const KEY = process.env.NINEROUTER_KEY || "";
const MODEL = process.env.NINEROUTER_MODEL || "ag/gemini-3.8-flash-high";

export async function POST(request) {
  try {
    const form = await request.formData();
    const text = String(form.get("text") || "").trim();
    const direction = String(form.get("direction") || "en-vi").trim(); // "en-vi" or "vi-en"
    const image = form.get("image");
    if (!text && !(image instanceof File)) {
      return NextResponse.json(
        { error: direction === "vi-en" ? "Nhập tiếng Việt hoặc chọn ảnh" : "Nhập tiếng Anh hoặc chọn ảnh" },
        { status: 400 }
      );
    }
    if (text.length > 500) return NextResponse.json({ error: "Nội dung tối đa 500 ký tự" }, { status: 400 });
    if (image instanceof File && image.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Ảnh tối đa 8 MB" }, { status: 400 });

    const headers = { "Content-Type": "application/json" };
    if (KEY) headers.Authorization = `Bearer ${KEY}`;

    let prompt = "";
    if (direction === "vi-en") {
      const source = text ? `Typed Vietnamese: ${JSON.stringify(text)}` : "Read Vietnamese text from the supplied image.";
      prompt = `You help Vietnamese learners translate Vietnamese into natural, modern, idiomatic English.
${source}
If an image is supplied, extract readable Vietnamese text first.
Translate to natural English as a native speaker would say it. If input contains typos, correct them before translating.
Return ONLY valid JSON:
{
  "direction": "vi-en",
  "original": "extracted or typed Vietnamese text",
  "corrected": "natural idiomatic English translation",
  "changed": false,
  "meaning": "natural Vietnamese translation of the English (or same as original)",
  "note": "short Vietnamese explanation of key English phrases/grammar/collocations used"
}
Do not include markdown or extra text. Only JSON.`;
    } else {
      const source = text ? `Typed English: ${JSON.stringify(text)}` : "Read English text from the supplied image.";
      prompt = `You help Vietnamese learners look up English.
${source}
If an image is supplied, extract only readable English text first. Correct only obvious spelling, spacing, capitalization, or grammar mistakes. Keep intended meaning.
Return ONLY valid JSON:
{
  "direction": "en-vi",
  "original": "extracted or typed English",
  "corrected": "correct English text",
  "changed": true,
  "meaning": "natural Vietnamese translation",
  "note": "short Vietnamese explanation of correction or empty string"
}
If input is already correct, corrected must equal original and changed must be false. Do not invent a different meaning. Do not include markdown. Only JSON.`;
    }

    const content = [{ type: "text", text: prompt }];
    if (image instanceof File) {
      const base64 = Buffer.from(await image.arrayBuffer()).toString("base64");
      content.push({ type: "image_url", image_url: { url: `data:${image.type || "image/jpeg"};base64,${base64}` } });
    }

    const res = await fetch(`${URL}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        temperature: 0.1,
        max_tokens: 700,
        messages: [{ role: "user", content }],
      }),
    });

    if (!res.ok) return NextResponse.json({ error: `9router error: ${res.status}` }, { status: 502 });
    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || "";
    const match = rawContent.match(/\{[\s\S]*\}/);
    const result = JSON.parse(match?.[0] || "{}");
    if (!result.original || !result.corrected || !result.meaning) {
      throw new Error("AI trả dữ liệu không hợp lệ");
    }
    result.direction = direction;
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
