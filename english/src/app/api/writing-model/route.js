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

    const prompt = `Bạn là giáo viên chuyên dạy viết tiếng Anh công việc (Business English Writing) cho học viên Việt Nam.
Dựa vào thông tin đề bài Self-Writing:
- Tiêu đề: ${title || task.title || "Self-Writing Task"}
- Tình huống: ${task.scenario || ""}
- Tình huống tiếng Việt: ${task.scenarioVietnamese || ""}
- Người gửi: ${task.sender || "Nhân viên"}
- Người nhận: ${task.recipient || "Sếp / Quản lý"}
- Yêu cầu bắt buộc: ${JSON.stringify(task.requirements || [])}
- Word Bank (các từ cần dùng): ${JSON.stringify(task.wordBank || [])}

Hãy viết một BÀI MẪU TIẾNG VIỆT HOÀN CHỈNH cho bài viết này theo bố cục chuẩn email công việc gồm 4 phần:
1. Tiêu đề email & Lời chào (Subject line & Salutation)
2. Mở đầu: Cảm ơn và ghi nhận thiện chí của sếp (Opening & Appreciation)
3. Thân bài: Đàm phán điều kiện cụ thể & cam kết giá trị (Negotiation, Salary revision & New duties)
4. Cam kết & Kết bài: Thiết lập đánh giá định kỳ hàng quý & hẹn gặp trực tiếp (Quarterly reviews & Sign-off)

QUY TẮC BẮT BUỘC:
- Trong văn bản tiếng Việt của từng phần, hãy đặt tất cả các cụm từ quan trọng (đặc biệt là các từ trong Word Bank và các cụm từ đắt giá dùng để viết sang tiếng Anh) vào trong [dấu ngoặc vuông].
- Với MỖI cụm từ trong [ngoặc vuông], phải có một mục tương ứng trong mảng "phrases":
  + vi: đúng cụm tiếng Việt trong ngoặc
  + en: cụm từ hoặc cấu trúc tiếng Anh tương đương chuẩn Business B1-B2
  + ipa: phiên âm quốc tế chuẩn IPA
  + easyReading: cách đọc bồi chuẩn theo âm IPA cho người Việt (ví dụ: /ˈkwɔːrtərli/ -> "cua-tờ-li")
  + partOfSpeech: loại từ / vai trò ngữ pháp trong câu
  + contextUsage: giải thích chi tiết cách dùng tiếng Anh trong ngữ cảnh đoạn văn này: vị trí trong câu, đi với giới từ/động từ nào, lý do người bản xứ dùng từ này trong đàm phán
  + sentenceEn: câu tiếng Anh hoàn chỉnh trong bài mẫu sử dụng cụm từ này

Trả về DUY NHẤT một JSON hợp lệ, không bọc markdown hay lời giải thích:
{
  "title": "Email mẫu tham khảo tiếng Việt",
  "paragraphs": [
    {
      "part": "1. Tiêu đề & Lời chào",
      "text": "Tiêu đề: [Phản hồi đề xuất giữ chân] và [đề nghị xét lại hợp đồng]\\nKính gửi sếp [Tên sếp],",
      "phrases": [
        {
          "vi": "Phản hồi đề xuất giữ chân",
          "en": "Response to Retention Offer",
          "ipa": "/rɪˈspɑːns tuː rɪˈtenʃn ˈɔːfər/",
          "easyReading": "ri-s-poón-s tu ri-ten-sần ó-phờ",
          "partOfSpeech": "noun phrase (tiêu đề)",
          "contextUsage": "Dùng ở dòng Subject. Cấu trúc Response to + Noun phrase ngắn gọn, thể hiện tính chuyên nghiệp.",
          "sentenceEn": "Subject: Response to Retention Offer and Request for Contract Revision"
        }
      ]
    }
  ]
}`;

    const res = await fetch(`${NINEROUTER_URL}/v1/chat/completions`, {
      method: "POST",
      headers,
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
