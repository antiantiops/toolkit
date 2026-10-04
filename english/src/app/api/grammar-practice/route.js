import { NextResponse } from "next/server";

const URL = process.env.NINEROUTER_URL || "http://192.168.101.36:20128";
const KEY = process.env.NINEROUTER_KEY || "";
const MODEL = process.env.NINEROUTER_MODEL || "ag/gemini-3.8-flash-high";

export async function POST(request) {
  try {
    const { grammar } = await request.json();
    if (!grammar?.rules?.length) return NextResponse.json({ error: "Cần grammar data" }, { status: 400 });
    const headers = { "Content-Type": "application/json" };
    if (KEY) headers.Authorization = "Bearer " + KEY;
    const prompt = `Create a grammar practice test based on this grammar topic:
Title: ${grammar.title}
Rules: ${JSON.stringify(grammar.rules.map(r => ({ rule: r.rule, ruleVietnamese: r.ruleVietnamese })))}

Create exactly 2 exercise types:
1. "rewrite": 4 sentence rewrite questions. Give an input sentence and ask student to rewrite using the grammar structure. Provide the correct answer.
2. "choose": 5 multiple choice questions. Each has a sentence with a blank ____, 4 options (A/B/C/D), and the correct answer letter.

Return ONLY JSON:
{"rewrite":[{"input":"It rains. I stay home.","instruction":"Viết lại câu dùng If...will...","answer":"If it rains, I will stay home."}],"choose":[{"sentence":"If she ____ hard, she will pass the exam.","options":["A. study","B. studies","C. studied","D. will study"],"answer":"B","explanation":"Mệnh đề If dùng present simple → studies."}]}
No markdown.`;
    const res = await fetch(`${URL}/v1/chat/completions`, { method: "POST", headers, body: JSON.stringify({ model: MODEL, stream: false, temperature: 0.35, max_tokens: 2000, messages: [{ role: "user", content: prompt }] }) });
    if (!res.ok) return NextResponse.json({ error: `9router error: ${res.status}` }, { status: 502 });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    const match = text.match(/\{[\s\S]*\}/);
    const test = JSON.parse(match?.[0] || "{}");
    if (!Array.isArray(test.rewrite) || !Array.isArray(test.choose)) throw new Error("AI tạo bài không hợp lệ, thử lại");
    return NextResponse.json(test);
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
