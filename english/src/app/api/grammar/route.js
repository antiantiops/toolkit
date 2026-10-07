import { NextResponse } from "next/server";
import { getUploadedFile } from "../upload/storage";

const NINEROUTER_URL = process.env.NINEROUTER_URL || "http://192.168.101.36:20128";
const NINEROUTER_KEY = process.env.NINEROUTER_KEY || "";
const MODEL = process.env.NINEROUTER_MODEL || "ag/gemini-3.8-flash-high";

const PROMPT = `You are a grammar extraction assistant. Analyze this image of a grammar page or textbook.
Extract ALL grammar rules, structures, and examples visible in the image.

Create a patient Vietnamese teacher-led lesson for a beginner. Do NOT only summarize. Teach from meaning to form to use, using a small number of simple examples and clear contrasts.

Return JSON:
{
  "title":"English grammar topic",
  "titleVietnamese":"Tên tiếng Việt",
  "learningGoal":"Sau bài này, người học có thể...",
  "everydayContext":{"english":"Short 1-2 sentence mini situation using topic","vietnamese":"Bản dịch tiếng Việt","question":"Câu hỏi gợi ý: các từ in đậm/ý chính dùng để làm gì?"},
  "keyIdea":"Giải thích ý nghĩa cốt lõi bằng tiếng Việt dễ hiểu, 2-4 câu. Nói rõ lúc nào dùng và điều người học muốn diễn đạt.",
  "rules":[{"stepTitle":"Bước 1: ...","rule":"English structure/formula","ruleVietnamese":"Giải thích thật chậm từng thành phần công thức: phần nào bắt buộc, phần nào không dùng, vì sao.","examples":[{"english":"English example","vietnamese":"Dịch tự nhiên","highlight":"key words"}]}],
  "comparison":{"title":"Phân biệt dễ nhầm","items":[{"left":"Form A","right":"Form B","explanation":"Khác nhau thế nào, khi nào chọn mỗi form, kèm 1 ví dụ ngắn."}]},
  "commonMistakes":[{"wrong":"Wrong English sentence","right":"Correct English sentence","reason":"Giải thích bằng tiếng Việt vì sao sai."}],
  "notes":["Mẹo nhớ thực tế, ngắn gọn"],
  "checkYourself":[{"question":"Câu hỏi kiểm tra hiểu bài bằng tiếng Việt","answer":"Đáp án và lý do ngắn"}],
  "summary":"Tóm tắt 3-5 câu, không ngắn hơn."
}

Rules: preserve facts/examples from image. Write at least 2 rule steps when topic has more than one form. Include comparison and 2 common mistakes whenever relevant. Keep B1-level English examples. Return ONLY valid JSON, no markdown fences.`;

export async function POST(request) {
  try {
    let base64, mime;
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const id = body.imageId || body.id;
      const item = getUploadedFile(id);
      if (!item) return NextResponse.json({ error: "Ảnh không tồn tại hoặc đã hết hạn trên server" }, { status: 400 });
      base64 = item.buffer.toString("base64");
      mime = item.mime;
    } else {
      const formData = await request.formData();
      const id = formData.get("imageId") || formData.get("id");
      if (id) {
        const item = getUploadedFile(id);
        if (!item) return NextResponse.json({ error: "Ảnh không tồn tại hoặc đã hết hạn trên server" }, { status: 400 });
        base64 = item.buffer.toString("base64");
        mime = item.mime;
      } else {
        const file = formData.get("image") || formData.get("file");
        if (!file) return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
        const bytes = await file.arrayBuffer();
        base64 = Buffer.from(bytes).toString("base64");
        mime = file.type || "image/jpeg";
      }
    }
    const dataUrl = `data:${mime};base64,${base64}`;

    const headers = { "Content-Type": "application/json" };
    if (NINEROUTER_KEY) headers["Authorization"] = `Bearer ${NINEROUTER_KEY}`;

    const res = await fetch(`${NINEROUTER_URL}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, { type: "image_url", image_url: { url: dataUrl } }] }],
        stream: false,
        max_tokens: 8192,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `9router error: ${res.status} ${errText.slice(0, 200)}` }, { status: 502 });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "AI response not valid JSON", raw: content.slice(0, 300) }, { status: 502 });

    const grammar = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ grammar });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
