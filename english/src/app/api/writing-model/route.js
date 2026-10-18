import { cacheOwner } from '../session/owner';
import { NextResponse } from "next/server";
import { saveSession } from "../session/storage";

const NINEROUTER_URL = process.env.NINEROUTER_URL || "http://192.168.101.36:20128";
const NINEROUTER_KEY = process.env.NINEROUTER_KEY || "";
const MODEL = process.env.NINEROUTER_MODEL || "ag/gemini-3.8-flash-high";

export async function POST(request) {
 if (!cacheOwner(request)) return NextResponse.json({error:"Cần đăng nhập qua Kong"},{status:401});
  try {
    const { task, title, level = "A2" } = await request.json();
    if (!["A1", "A2", "B1", "B2", "C1", "C2"].includes(level)) return NextResponse.json({ error: "Trình độ CEFR không hợp lệ" }, { status: 400 });
    const sid = cacheOwner(request);
    if (!task) {
      return NextResponse.json({ error: "Thiếu dữ liệu bài tập" }, { status: 400 });
    }

    const headers = { "Content-Type": "application/json" };
    if (NINEROUTER_KEY) headers.Authorization = "Bearer " + NINEROUTER_KEY;

    const prompt = `You are an English writing teacher helping Vietnamese adult beginners write simple, clear business emails.

Task Information:
- Title: ${title || task.title || "Self-Writing Task"}
- Scenario: ${task.scenario || ""}
- Scenario (Vietnamese): ${task.scenarioVietnamese || ""}
- Sender: ${task.sender || "Employee"}
- Recipient: ${task.recipient || "Manager"}
- Requirements: ${JSON.stringify(task.requirements || [])}
- Word Bank (Required vocabulary): ${JSON.stringify(task.wordBank || [])}

GOAL:
Write a clear model email at CEFR ${level}. Respect the task's word count; if absent use about 100-130 words.
Use vocabulary, sentence complexity and grammar appropriate to ${level}, with a natural workplace tone. A1/A2: short sentences and common vocabulary. B1/B2: increasingly varied structures. C1/C2: nuanced, precise language without needless jargon.
Preserve all task facts and requirements; never add unsupported facts. Use the provided Word Bank naturally. Organize subject, greeting, opening, body and closing appropriately.

MAPPING REQUIREMENT:
Break the email down sentence-by-sentence. For every single sentence:
- Provide "en": clear, simple English sentence.
- Provide "vi": natural, accurate Vietnamese translation of that exact sentence.
- Provide "phrases": list of key vocabulary/chunks mapped between English and Vietnamese in this sentence (including any word from Word Bank used).
  Format of each phrase: { "en": "ask for sick leave", "vi": "xin nghỉ ốm", "note": "cụm từ thông dụng" }

Return ONLY valid JSON matching this exact structure:
{
  "title": "Simple Model Email",
  "totalWords": 110,
  "paragraphs": [
    {
      "part": "1. Tiêu đề & Lời chào",
      "sentences": [
        {
          "id": "s1",
          "en": "Subject: Sick Leave Request - [Your Name]",
          "vi": "Tiêu đề: Đơn xin nghỉ ốm - [Tên bạn]",
          "phrases": [
            { "en": "Sick Leave Request", "vi": "Đơn xin nghỉ ốm", "note": "Tiêu đề email xin nghỉ" }
          ]
        },
        {
          "id": "s2",
          "en": "Dear Mr. Davis,",
          "vi": "Kính gửi anh Davis,",
          "phrases": []
        }
      ]
    },
    {
      "part": "2. Lý do xin nghỉ",
      "sentences": [
        {
          "id": "s3",
          "en": "I am writing to ask for sick leave today because I have a high fever.",
          "vi": "Tôi viết thư này để xin nghỉ ốm hôm nay vì tôi bị sốt cao.",
          "phrases": [
            { "en": "ask for sick leave", "vi": "xin nghỉ ốm", "note": "cấu trúc đơn giản, trực tiếp" },
            { "en": "have a high fever", "vi": "bị sốt cao", "note": "triệu chứng ốm" }
          ]
        }
      ]
    }
  ]
}`;

    const res = await fetch(`${NINEROUTER_URL}/v1/chat/completions`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(120000),
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        temperature: 0.2,
        max_tokens: 3500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `9router error: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "";
    const clean = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ error: "AI không trả về JSON hợp lệ" }, { status: 502 });
    }

    const modelDraft = JSON.parse(match[0]);
    if (sid) saveSession(sid, { modelDraft });
    return NextResponse.json({ modelDraft });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
