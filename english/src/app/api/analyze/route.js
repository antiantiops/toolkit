import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { saveSession } from "../session/storage";
import { getUploadedFile } from "../upload/storage";

const NINEROUTER_URL = process.env.NINEROUTER_URL || "http://192.168.101.36:20128";
const NINEROUTER_KEY = process.env.NINEROUTER_KEY || "";
const MODEL = process.env.NINEROUTER_MODEL || "ag/gemini-3.8-flash-high";

const PROMPT = `You are a vocabulary extraction assistant. Analyze this image of a vocabulary page or textbook.
Extract ALL vocabulary words visible in the image.

For each word, provide:
1. word: The English word exactly as shown
2. ipa: IPA pronunciation (e.g. /\u02C8\u00E6p.\u0259l/)
3. meaning: Vietnamese meaning
4. partOfSpeech: Primary part of speech. Use only: noun, verb, adjective, adverb, pronoun, preposition, conjunction, determiner, phrase
5. example: A short example sentence using the word
6. exampleVietnamese: Vietnamese translation of the example sentence
7. definition: Short English dictionary definition. If an English definition is printed beside word in image, preserve its meaning; otherwise write concise accurate definition.
8. definitionVietnamese: Natural Vietnamese translation of definition.
9. easyReading: Phiên âm bồi tiếng Việt chuẩn theo IPA tiếng Anh cho cả 2 giọng Anh - Anh (UK) và Anh - Mỹ (US) (ví dụ: automate -> UK: “ó-tơ-mệt”, US flap-t: “ó-dơ-mệt”; water -> UK: “oá-tờ”, US: “oá-đờr”). Đánh dấu sắc/huyền theo trọng âm. Format: "🇬🇧 UK: “...” • 🇺🇸 US: “...”. <lưu ý ngắn nếu có>".
10. synonyms: If the image prints synonyms, copy them and add concise Vietnamese meaning in parentheses for each word, e.g. "feature (đặc tính), property (thuộc tính)". Otherwise provide 1-2 accurate context-appropriate synonyms with Vietnamese meaning in parentheses, or empty string.
    synonymsInBook: true ONLY if synonyms were printed in the image; false if you generated them yourself.
11. antonyms: If the image prints antonyms, copy them and add concise Vietnamese meaning in parentheses for each word, e.g. "disadvantage (nhược điểm)". Otherwise provide 1-2 accurate context-appropriate antonyms with Vietnamese meaning in parentheses, or empty string.
    antonymsInBook: true ONLY if antonyms were printed in the image; false if you generated them yourself.
12. collocations: 1-3 useful fixed word combinations with this word, especially one from example. Array items: {"phrase":"English phrase","meaning":"Vietnamese meaning","note":"short Vietnamese usage tip"}. Use [] when none.
13. contrastTip: A very short Vietnamese memory aid distinguishing the main word from its synonyms and antonyms in this context. Use 2-4 lines "word = sắc thái riêng" (3-8 Vietnamese words per line), then at most one short usage contrast or warning. Explain differences, not repeated translations. Avoid absolute claims about words with multiple senses. Empty string if no meaningful comparison.
14. note: A short learning tip or usage note in Vietnamese, or empty string

Respond ONLY with a valid JSON array, no markdown fences, no explanation:
[{"word":"sand","ipa":"/sænd/","meaning":"cát","partOfSpeech":"noun","definition":"A loose substance made of very small pieces of rock.","definitionVietnamese":"Một chất rời gồm những mảnh đá rất nhỏ.","easyReading":"🇬🇧 UK: “xand” • 🇺🇸 US: “sænd”. Âm /s/ rõ ở đầu và /d/ ở cuối.","example":"The children play in the sand.","exampleVietnamese":"Bọn trẻ chơi trong cát.","synonyms":"","synonymsInBook":false,"antonyms":"","antonymsInBook":false,"contrastTip":"sand = cát rời; gravel = sỏi nhỏ","note":"Không đếm được khi nói chung về cát."}]`;

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

    // ponytail: 120s timeout covers slow upstream AI processing on high-res images.
    const res = await fetch(`${NINEROUTER_URL}/v1/chat/completions`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(120000),
      body: JSON.stringify({
        model: MODEL,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        }],
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

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI response not valid JSON", raw: content.slice(0, 300) }, { status: 502 });
    }

    const words = JSON.parse(jsonMatch[0]);

    // Cookie session management:
    let sid = request.cookies.get("vocab_sid")?.value;
    const isNewSid = !sid;
    if (isNewSid) sid = randomUUID();

    // Cache words and preview on server for 24 hours
    saveSession(sid, { words, preview: dataUrl });

    const response = NextResponse.json({ words, preview: dataUrl });
    if (isNewSid) {
      response.cookies.set("vocab_sid", sid, {
        maxAge: 86400,
        path: "/",
        sameSite: "lax",
        httpOnly: true,
      });
    }

    return response;
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
