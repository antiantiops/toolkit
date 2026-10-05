import { NextResponse } from "next/server";

const NINEROUTER_URL = process.env.NINEROUTER_URL || "http://192.168.101.36:20128";
const NINEROUTER_KEY = process.env.NINEROUTER_KEY || "";
const MODEL = process.env.NINEROUTER_MODEL || "ag/gemini-3.8-flash-high";

// Model refuses verbatim copies of book pages (finish_reason "recitation"), so ask for a faithful re-write.
const PROMPT = `You are a patient Vietnamese teacher of English WRITING (business / general). The image is a textbook writing page (usually a sample email, letter, paragraph or essay).
Do NOT copy the page verbatim. Re-write the sample text in your own words, keeping the same structure, order, purpose of each part, and B1-B2 business English.
Teach a beginner: show how the text is built, which sentences they can reuse, and why each sentence is written that way.

Return ONLY valid JSON, no markdown:
{
  "title":"English title of the writing task",
  "titleVietnamese":"Tên tiếng Việt",
  "writingType":"email | letter | paragraph | essay | report ... (Vietnamese label ok)",
  "goal":"Sau bài này, người học có thể viết...",
  "situation":{"english":"1-2 sentence scenario of the task","vietnamese":"Bản dịch"},
  "sections":[
    {"label":"Subject / Greeting / Opening / Body 1 / Request / Closing / Sign-off ...","labelVietnamese":"Tên phần bằng tiếng Việt","purpose":"Phần này dùng để làm gì (tiếng Việt, 1-2 câu)","tone":"Giọng văn: trang trọng / lịch sự / thân thiện... (ngắn)",
     "sentences":[{"english":"Re-written sentence of this part","vietnamese":"Dịch tiếng Việt","why":"Vì sao viết thế này, cấu trúc/từ nào đáng học (tiếng Việt, 1-2 câu)"}]}
  ],
  "usefulPhrases":[{"pattern":"Reusable frame with [placeholders], e.g. I appreciate the offer for [Role] at [Company].","meaning":"Nghĩa tiếng Việt","use":"Dùng khi nào (ngắn)"}],
  "checklist":["Tiếng Việt: một việc cần kiểm tra trước khi nộp bài, bắt đầu bằng 'Có ...' hoặc 'Đã ...'"],
  "tips":["Mẹo viết ngắn bằng tiếng Việt"],
  "yourTurn":{"scenario":"Tình huống mới bằng tiếng Việt để người học tự viết cùng loại bài","hints":["Gợi ý ý cần có"]}
}
Rules: keep the order of parts as in the sample. 3-6 sentences max per section. 5-8 usefulPhrases. 5-8 checklist items. If the page has several tasks, use the first main sample.`;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");
    if (!file) return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const dataUrl = `data:${file.type || "image/jpeg"};base64,${base64}`;
    const headers = { "Content-Type": "application/json" };
    if (NINEROUTER_KEY) headers.Authorization = `Bearer ${NINEROUTER_KEY}`;

    const res = await fetch(`${NINEROUTER_URL}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, { type: "image_url", image_url: { url: dataUrl } }] }],
        stream: false,
        max_tokens: 8192,
        temperature: 0.3,
      }),
    });
    if (!res.ok) return NextResponse.json({ error: `9router error: ${res.status} ${(await res.text()).slice(0, 200)}` }, { status: 502 });
    const data = await res.json();
    const choice = data.choices?.[0];
    const content = choice?.message?.content || "";
    if (!content && choice?.finish_reason === "recitation") return NextResponse.json({ error: "AI từ chối chép nguyên văn trang sách. Thử cắt ảnh nhỏ hơn hoặc phân tích lại." }, { status: 502 });
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) return NextResponse.json({ error: "AI response not valid JSON", raw: content.slice(0, 300) }, { status: 502 });
    return NextResponse.json({ writing: JSON.parse(m[0]) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
