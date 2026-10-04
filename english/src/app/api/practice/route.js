import { NextResponse } from "next/server";

const URL = process.env.NINEROUTER_URL || "http://192.168.101.36:20128";
const KEY = process.env.NINEROUTER_KEY || "";
const MODEL = process.env.NINEROUTER_MODEL || "ag/gemini-3.8-flash-high";

export async function POST(request) {
  try {
    const { words } = await request.json();
    const items = (words || []).slice(0, 12).map((w) => ({ word: w.word, meaning: w.meaning, example: w.example }));
    if (items.length < 4) return NextResponse.json({ error: "Cần ít nhất 4 từ để tạo bài" }, { status: 400 });
    const headers = { "Content-Type": "application/json" };
    if (KEY) headers.Authorization = "Bearer " + KEY;
    const prompt = `Create one intermediate school practice test from vocabulary: ${JSON.stringify(items)}.
Return ONLY JSON with exactly this shape:
{"groups":[{"words":["often","frequently","regularly","rarely"],"answer":"rarely","explanation":"Rarely means not often; three others describe frequent occurrence."}],"fills":[{"word":"refuse","sentence":"They ____ to accept the truth."}]}
Rules:
- groups: exactly 4 questions; every words has exactly 4 words; exactly 1 answer does not belong. Use common B1 English, clear but not trivial relationship. Answer must be one listed word.
- fills: exactly 5 questions; each sentence contains exactly one literal ____ blank, never show answer word in sentence; answer word must come from supplied vocabulary; word box words are fills words.
- Every fill sentence MUST be a completely new sentence you invent. NEVER reuse, paraphrase closely, or blank out a supplied example sentence. Create a different setting, subject, verb, and context from its card example.
- Make each new sentence give enough context to infer answer. Do not use hints such as "the word means...".
No markdown.`;
    const res = await fetch(`${URL}/v1/chat/completions`, { method: "POST", headers, body: JSON.stringify({ model: MODEL, stream: false, temperature: 0.35, max_tokens: 1800, messages: [{ role: "user", content: prompt }] }) });
    if (!res.ok) return NextResponse.json({ error: `9router error: ${res.status}` }, { status: 502 });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    const match = text.match(/\{[\s\S]*\}/);
    const test = JSON.parse(match?.[0] || "{}");
    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    const usedExamples = items.map((w) => normalize(w.example.replace(new RegExp(`\\b${w.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"), "giantblank")));
    const hasReusedExample = (q) => usedExamples.some((example) => {
      const sentence = normalize(q.sentence.replace("____", "giantblank"));
      const overlap = example.split(" ").filter((word) => word.length > 2 && sentence.includes(word)).length;
      return overlap >= Math.max(3, example.split(" ").filter((word) => word.length > 2).length - 1);
    });
    if (!Array.isArray(test.groups) || test.groups.length !== 4 || test.groups.some((q) => !Array.isArray(q.words) || q.words.length !== 4 || !q.words.includes(q.answer) || !q.explanation) || !Array.isArray(test.fills) || test.fills.length !== 5 || test.fills.some((q) => !q.word || !q.sentence?.includes("____") || hasReusedExample(q))) throw new Error("AI tạo bài không hợp lệ hoặc lặp ví dụ cũ, hãy tạo lại");
    return NextResponse.json(test);
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
