import { NextResponse } from "next/server";

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
9. easyReading: Phiên âm bồi tiếng Việt chuẩn theo IPA tiếng Anh (ví dụ: /oʊ/ -> "âu", /ˈpetʃoʊ/ -> "pé-châu", không đọc vẹt mặt chữ như "pê-chô"). Đánh dấu sắc/huyền theo trọng âm IPA. Format: "<word> = <meaning>. Đọc gần như “...”, lưu ý âm ...".
10. synonyms: If the image prints synonyms for this word (labels like "Syn", "Syn.", "Synonym", "Synonyms"), copy them exactly, comma separated. Otherwise give 1-2 accurate synonyms if applicable, or empty string
    synonymsInBook: true ONLY if synonyms were printed in the image; false if you generated them yourself.
11. antonyms: If the image prints antonyms for this word (labels like "Ant", "Ant.", "Antonym", "Opp", "Opposite"), copy them exactly, comma separated. Otherwise give 1-2 accurate antonyms if applicable, or empty string
    antonymsInBook: true ONLY if antonyms were printed in the image; false if you generated them yourself.
12. collocations: 1-3 useful fixed word combinations with this word, especially one from example. Array items: {"phrase":"English phrase","meaning":"Vietnamese meaning","note":"short Vietnamese usage tip"}. Use [] when none.
13. note: A short learning tip or usage note in Vietnamese, or empty string

Respond ONLY with a valid JSON array, no markdown fences, no explanation:
[{"word":"sand","ipa":"/s\u00E6nd/","meaning":"c\u00E1t","partOfSpeech":"noun","definition":"A loose substance made of very small pieces of rock.","definitionVietnamese":"M\u1ED9t ch\u1EA5t r\u1EDDi g\u1ED3m nh\u1EEFng m\u1EA3nh \u0111\u00E1 r\u1EA5t nh\u1ECF.","easyReading":"Sand = c\u00E1t. \u0110\u1ECDc g\u1EA7n nh\u01B0 \u201Cxand\u201D, \u00E2m /s/ r\u00F5 \u1EDF \u0111\u1EA7u v\u00E0 /d/ \u1EDF cu\u1ED1i.","example":"The children play in the sand.","exampleVietnamese":"B\u1ECDn tr\u1EBB ch\u01A1i trong c\u00E1t.","synonyms":"","synonymsInBook":false,"antonyms":"","antonymsInBook":false,"note":"Kh\u00F4ng \u0111\u1EBFm \u0111\u01B0\u1EE3c khi n\u00F3i chung v\u1EC1 c\u00E1t."}]`;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");
    if (!file) return NextResponse.json({ error: "No image uploaded" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mime = file.type || "image/jpeg";
    const dataUrl = `data:${mime};base64,${base64}`;

    const headers = { "Content-Type": "application/json" };
    if (NINEROUTER_KEY) headers["Authorization"] = `Bearer ${NINEROUTER_KEY}`;

    const res = await fetch(`${NINEROUTER_URL}/v1/chat/completions`, {
      method: "POST",
      headers,
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
    return NextResponse.json({ words });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
