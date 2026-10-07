import { NextResponse } from "next/server";
import { getUploadedFile } from "../upload/storage";

const NINEROUTER_URL = process.env.NINEROUTER_URL || "http://192.168.101.36:20128";
const NINEROUTER_KEY = process.env.NINEROUTER_KEY || "";
const MODEL = process.env.NINEROUTER_MODEL || "ag/gemini-3.8-flash-high";

const DUAL_PROMPT = `You are a patient Vietnamese teacher of English WRITING (business / general).
You are analyzing a complete textbook unit consisting of TWO images:
- Image 1: The SAMPLE writing task (model email / letter / text).
- Image 2: The SELF-WRITING assignment task (direction, scenario, word bank, word count, draft lines).

Do NOT copy either page verbatim (avoid recitation). Re-write and explain in your own words.
Teach the student:
1) Understand the model text from Image 1: breakdown into sections, tone, purpose, and useful sentence frames with [placeholders].
2) Connect to Image 2 (Self-Writing task): explain scenario, required points, word count, and 10 word-bank words with Vietnamese meanings, business examples, and tips for this task.
3) Guide how to apply Image 1's structure to complete Image 2.

Return ONLY valid JSON, no markdown fences:
{
  "kind": "dual",
  "title": "Business Writing Task: Topic Name",
  "titleVietnamese": "Tên chủ đề tiếng Việt",
  "writingType": "Business Email",
  "sample": {
    "title": "Sample Email Title (Bài mẫu)",
    "scenario": "Short English scenario of sample email",
    "scenarioVietnamese": "Giải thích tình huống bài mẫu bằng tiếng Việt",
    "sections": [
      {
        "label": "Subject Line / Salutation / Opening / Value Statement / Counter Request / Closing / Sign-off",
        "labelVietnamese": "Tên phần tiếng Việt",
        "purpose": "Mục đích phần này (tiếng Việt)",
        "tone": "Trang trọng / Lịch sự...",
        "sentences": [
          {
            "english": "Re-written sample sentence",
            "vietnamese": "Dịch tiếng Việt",
            "why": "Vì sao viết thế này, cấu trúc hay (tiếng Việt)"
          }
        ]
      }
    ],
    "usefulPhrases": [
      {
        "pattern": "Reusable frame with [placeholders]",
        "meaning": "Nghĩa tiếng Việt",
        "use": "Dùng khi nào"
      }
    ]
  },
  "task": {
    "title": "Self-Writing Task (Bài tập của bạn)",
    "scenario": "Scenario from Image 2 (paraphrased)",
    "scenarioVietnamese": "Dịch tình huống đề bài bằng tiếng Việt",
    "sender": "Nhân viên hiện tại",
    "recipient": "Sếp trực tiếp",
    "format": "Email công việc",
    "minWords": 100,
    "strategy": "Chiến lược làm bài: Vì sao nên chọn ở lại và cách vận dụng cấu trúc bài mẫu",
    "suggestedOutline": [
      {
        "step": "Phần 1: Cảm ơn & ghi nhận đề nghị tăng lương",
        "advice": "Gợi ý cách viết và từ nên dùng",
        "starter": "Starter sentence frame with [placeholders]"
      }
    ],
    "requirements": ["Yêu cầu bắt buộc 1", "Yêu cầu bắt buộc 2"],
    "wordBank": [
      {
        "word": "quarterly",
        "partOfSpeech": "adj",
        "meaning": "Hàng quý",
        "example": "We conduct quarterly performance reviews.",
        "tipForTask": "Cách dùng từ này vào bài của bạn"
      }
    ]
  }
}`;

const SINGLE_PROMPT = `You are a patient Vietnamese teacher of English WRITING (business / general). The image is a textbook writing page (usually a sample email, letter, paragraph or essay).
Do NOT copy the page verbatim. Re-write the sample text in your own words, keeping the same structure, order, purpose of each part, and B1-B2 business English.
Teach a beginner: show how the text is built, which sentences they can reuse, and why each sentence is written that way.

First decide "kind": "sample" if the page shows a finished model text; "task" if it is a homework/self-writing assignment the student must write (instructions, word count, word bank, blank lines).
For kind "task": do NOT write the answer for the student. "sections" are a suggested outline whose "sentences" are only starter frames with [placeholders] (not complete answers). Fill the "task" object from the page (paraphrase, keep every fact, number, name and the required word count).
For kind "sample": omit "task" (or set null) and rewrite the model text as described.

Return ONLY valid JSON, no markdown:
{
  "kind":"sample | task",
  "task":{"scenario":"Task scenario in English (paraphrased)","scenarioVietnamese":"Dịch tiếng Việt, rõ ràng","sender":"Who writes (role)","recipient":"Who receives (role)","format":"email / letter / paragraph ...","minWords":100,"requirements":["Tiếng Việt: một yêu cầu bắt buộc của đề, ví dụ 'Nhắc lại cuộc nói chuyện giữ chân'"],"givenFacts":["Tiếng Việt: dữ kiện đề cho"],"wordBank":[{"word":"quarterly","partOfSpeech":"adj","meaning":"Nghĩa tiếng Việt","example":"Short business example sentence"}]},
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
}`;

async function resolveImageData(fileOrId) {
  if (!fileOrId) return null;
  if (typeof fileOrId === "string") {
    const item = getUploadedFile(fileOrId);
    if (!item) return null;
    return {
      base64: item.buffer.toString("base64"),
      mime: item.mime,
    };
  }
  if (fileOrId instanceof File) {
    const buf = Buffer.from(await fileOrId.arrayBuffer());
    return {
      base64: buf.toString("base64"),
      mime: fileOrId.type || "image/jpeg",
    };
  }
  return null;
}

export async function POST(request) {
  try {
    let img1Ref = null;
    let img2Ref = null;

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json();
      img1Ref = body.image1Id || body.imageId1 || body.image1;
      img2Ref = body.image2Id || body.imageId2 || body.image2;
    } else {
      const formData = await request.formData();
      img1Ref = formData.get("image1Id") || formData.get("image1") || formData.get("image");
      img2Ref = formData.get("image2Id") || formData.get("image2");
    }

    const data1 = await resolveImageData(img1Ref);
    const data2 = await resolveImageData(img2Ref);

    if (!data1 && !data2) {
      return NextResponse.json({ error: "Chưa chọn ảnh nào hoặc ảnh tải lên không tồn tại" }, { status: 400 });
    }

    const hasBoth = Boolean(data1 && data2);
    const content = [];

    if (hasBoth) {
      content.push({ type: "text", text: DUAL_PROMPT });
      content.push({ type: "image_url", image_url: { url: `data:${data1.mime};base64,${data1.base64}` } });
      content.push({ type: "image_url", image_url: { url: `data:${data2.mime};base64,${data2.base64}` } });
    } else {
      const single = data1 || data2;
      content.push({ type: "text", text: SINGLE_PROMPT });
      content.push({ type: "image_url", image_url: { url: `data:${single.mime};base64,${single.base64}` } });
    }

    const headers = { "Content-Type": "application/json" };
    if (NINEROUTER_KEY) headers.Authorization = `Bearer ${NINEROUTER_KEY}`;

    const res = await fetch(`${NINEROUTER_URL}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content }],
        stream: false,
        max_tokens: 8192,
        temperature: 0.25,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `9router error: ${res.status} ${(await res.text()).slice(0, 200)}` }, { status: 502 });
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const textOut = choice?.message?.content || "";
    if (!textOut && choice?.finish_reason === "recitation") {
      return NextResponse.json({ error: "AI từ chối chép nguyên văn trang sách. Thử chụp lại hoặc phân tích lại." }, { status: 502 });
    }

    const m = textOut.match(/\{[\s\S]*\}/);
    if (!m) {
      return NextResponse.json({ error: "AI trả dữ liệu không hợp lệ", raw: textOut.slice(0, 300) }, { status: 502 });
    }

    return NextResponse.json({ writing: JSON.parse(m[0]) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
