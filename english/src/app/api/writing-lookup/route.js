import { NextResponse } from "next/server";

const NINEROUTER_URL = process.env.NINEROUTER_URL || "http://192.168.101.36:20128";
const NINEROUTER_KEY = process.env.NINEROUTER_KEY || "";
const MODEL = process.env.NINEROUTER_MODEL || "ag/gemini-3.8-flash-high";

export async function POST(request) {
  try {
    const { word, sentence = "", context = "" } = await request.json();
    if (!word || typeof word !== "string") {
      return NextResponse.json({ error: "Thiếu từ cần tra" }, { status: 400 });
    }

    const headers = { "Content-Type": "application/json" };
    if (NINEROUTER_KEY) headers.Authorization = "Bearer " + NINEROUTER_KEY;

    const prompt = `Bạn là chuyên gia giảng dạy tiếng Anh công sở (Business English Writing) cho người Việt.
Học viên đang đọc một bài email mẫu viết hoàn toàn bằng TIẾNG VIỆT và nhấp vào một từ để học cách dịch và sử dụng sang TIẾNG ANH.

Dữ liệu:
- Từ học viên bấm: "${word}"
- Câu tiếng Việt chứa từ: "${sentence || word}"
- Ngữ cảnh đoạn văn: "${context || sentence || word}"

Nhiệm vụ:
1. Xác định CỤM TỪ tiếng Việt trọn nghĩa chứa từ này trong câu (ví dụ nếu bấm "lương" trong "điều chỉnh mức lương", cụm trọn vẹn là "điều chỉnh mức lương" hoặc "mức lương"; nếu bấm "giữ" trong "giữ chân nhân viên", cụm là "giữ chân nhân viên").
2. Dịch sang cụm từ/cấu trúc tiếng Anh công việc (Business English B1-B2) chuẩn xác nhất theo ngữ cảnh câu này.
3. Cung cấp phiên âm quốc tế IPA chuẩn.
4. Cách đọc bồi chuẩn theo âm IPA tiếng Anh cho cả 2 giọng Anh - Anh (UK) và Anh - Mỹ (US) (ví dụ: automate -> UK: “ó-tơ-mệt”, US: “ó-dơ-mệt”). Đánh dấu sắc/huyền theo trọng âm. Format: "🇬🇧 UK: “...” • 🇺🇸 US: “...”".
5. Loại từ / vai trò ngữ pháp (noun phrase, verb phrase, adj,...).
6. Giải thích chi tiết cách dùng tiếng Anh này trong ngữ cảnh đoạn văn: vị trí câu, giới từ/động từ đi kèm, tại sao dùng trong thư đàm phán/công việc.
7. Câu tiếng Anh hoàn chỉnh tương ứng của câu này trong bài viết.

Trả về DUY NHẤT một JSON hợp lệ, không bọc markdown hay lời giải thích:
{
  "vi": "cụm từ tiếng Việt trọn nghĩa",
  "en": "cụm từ tiếng Anh tương đương",
  "ipa": "/.../",
  "easyReading": "cách đọc bồi chuẩn âm IPA",
  "partOfSpeech": "loại từ / vai trò ngữ pháp",
  "contextUsage": "giải thích ngắn gọn vị trí, giới từ đi kèm và sắc thái đàm phán trong đoạn",
  "sentenceEn": "câu tiếng Anh hoàn chỉnh tương ứng"
}`;

    const res = await fetch(`${NINEROUTER_URL}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        temperature: 0.1,
        max_tokens: 800,
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

    const result = JSON.parse(match[0]);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
