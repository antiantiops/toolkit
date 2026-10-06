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
- Word Bank (10 từ cần dùng): ${JSON.stringify(task.wordBank || [])}

Hãy viết một BÀI MẪU HOÀN CHỈNH BẰNG TIẾNG VIỆT TỰ NHIÊN (không bọc dấu ngoặc vuông [], viết thành văn trôi chảy, liền mạch như một email công việc thực thụ).
Bố cục email gồm 4 phần:
1. Tiêu đề email & Lời chào (Subject line & Salutation)
2. Mở đầu: Cảm ơn và ghi nhận thiện chí giữ chân của sếp
3. Thân bài: Đàm phán điều kiện cụ thể (đề xuất xét lại mức lương, trách nhiệm mới, báo cáo)
4. Cam kết & Kết bài: Thiết lập đánh giá định kỳ hàng quý, hẹn trao đổi trực tiếp & Chào kết

YÊU CẦU:
- Văn phong chuyên nghiệp, lịch sự, đúng chuẩn Business.
- Tự nhiên lồng ghép đầy đủ ý nghĩa của 10 từ trong Word Bank vào bài viết tiếng Việt.
- Đồng thời cung cấp trước mảng "keyPhrases" cho các cụm từ đắt giá và 10 từ Word Bank để hỗ trợ học viên tra cứu nhanh:
  + vi: cụm từ tiếng Việt trong bài
  + en: cụm từ/cấu trúc tiếng Anh tương đương chuẩn Business
  + ipa: phiên âm IPA
  + easyReading: cách đọc bồi chuẩn âm IPA cho cả 2 giọng Anh - Anh (UK) và Anh - Mỹ (US) (Format: 🇬🇧 UK: “...” • 🇺🇸 US: “...”)
  + partOfSpeech: loại từ / vai trò ngữ pháp
  + contextUsage: cách dùng tiếng Anh trong ngữ cảnh câu này
  + sentenceEn: câu tiếng Anh hoàn chỉnh tương ứng trong bài

Trả về DUY NHẤT một JSON hợp lệ, không bọc markdown hay lời giải thích:
{
  "title": "Email mẫu hoàn chỉnh bằng tiếng Việt",
  "paragraphs": [
    {
      "part": "1. Tiêu đề email & Lời chào",
      "text": "Tiêu đề: Phản hồi đề xuất giữ chân và đề nghị điều chỉnh mức lương\\nKính gửi Quản lý,",
      "keyPhrases": [
        {
          "vi": "Phản hồi đề xuất giữ chân",
          "en": "Response to Retention Offer",
          "ipa": "/rɪˈspɑːns tuː rɪˈtenʃn ˈɔːfər/",
          "easyReading": "🇬🇧 UK: “ri-s-poón-s tu ri-ten-sần ó-phờ” • 🇺🇸 US: “ri-s-pán-s tu ri-ten-sần á-phơr”",
          "partOfSpeech": "noun phrase (tiêu đề)",
          "contextUsage": "Dùng ở dòng Subject. Cấu trúc Response to + Noun phrase ngắn gọn, lịch sự.",
          "sentenceEn": "Subject: Response to Retention Offer and Request for Salary Revision"
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
