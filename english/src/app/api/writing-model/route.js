import { NextResponse } from "next/server";

const NINEROUTER_URL = process.env.NINEROUTER_URL || "http://192.168.101.36:20128";
const NINEROUTER_KEY = process.env.NINEROUTER_KEY || "";
const MODEL = process.env.NINEROUTER_MODEL || "ag/gemini-3.8-flash-high";

export async function POST(request) {
  try {
    const { task, title } = await request.json();
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
Write a SIMPLE, CLEAR, SHORT model email (~100-130 words) at A2-B1 level.
CRITICAL RULES FOR LANGUAGE:
1. DO NOT use fancy, overly formal C1/C2 words. Avoid words like "formally request", "sudden complications", "furthermore", "hereby", "undertake".
2. Use SIMPLE, direct everyday workplace English (Subject + Verb + Object).
   - BAD: "I am writing to formally request urgent sick leave due to sudden health complications."
   - GOOD: "I am writing to ask for sick leave today because I am sick." or "I need to take today off because I caught a bad cold."
3. Natural business structure with 4 short parts:
   - Part 1: Subject Line & Greeting
   - Part 2: Main reason / Direct request (simple sentence)
   - Part 3: Details & coverage plan (who covers, work status)
   - Part 4: Next step & Sign-off
4. Naturally use words from the Word Bank in simple sentences.

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
    return NextResponse.json({ modelDraft });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
