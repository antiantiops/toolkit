import assert from "node:assert/strict";
import fs from "node:fs";

// 1. Check page.js source contract
const pageSrc = fs.readFileSync("src/app/page.js", "utf8");
assert.match(pageSrc, /useLanguage\(\)/, "page.js must use useLanguage");
assert.match(pageSrc, /supportedLanguages\[targetLang\]/, "page.js must reference supportedLanguages[targetLang]");
assert.match(pageSrc, /nativeLabel/, "page.js must access nativeLabel");
assert.match(pageSrc, /ja:\s*["']ja-JP["']/, "page.js langmap must have ja-JP");
assert.match(pageSrc, /ko:\s*["']ko-KR["']/, "page.js langmap must have ko-KR");
assert.match(pageSrc, /["']zh-TW["']:\s*["']zh-TW["']/, "page.js langmap must have zh-TW");

// 2. Mock and test POST route
let fetchCalls = [];
globalThis.fetch = async (url, options) => {
  fetchCalls.push({ url, options, body: JSON.parse(options.body) });
  return {
    ok: true,
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  };
};

// 2. Execute route logic under test
// Next.js ESM subpath export resolution workaround under standalone node test runner
const routeCode = fs.readFileSync("src/app/api/tts/route.js", "utf8")
  .replace(/from "next\/server"/g, 'from "next/server.js"');

const testRouteFile = "checks/tmp-tts-route.mjs";
fs.writeFileSync(testRouteFile, routeCode);

const { POST } = await import("./tmp-tts-route.mjs");

function createReq(body) {
  return {
    json: async () => body,
  };
}

// Test validation: invalid inputs
{
  fetchCalls = [];
  const res = await POST(createReq({ text: "" }));
  assert.equal(res.status, 400);
  assert.equal(fetchCalls.length, 0);

  const res2 = await POST(createReq({ text: 123 }));
  assert.equal(res2.status, 400);
  assert.equal(fetchCalls.length, 0);

  const res3 = await POST(createReq({ text: "a".repeat(1001) }));
  assert.equal(res3.status, 400);
  assert.equal(fetchCalls.length, 0);
}

// Test invalid lang rejected 400 with no fetch
{
  fetchCalls = [];
  const res = await POST(createReq({ text: "xin chào", lang: "fr-FR" }));
  assert.equal(res.status, 400);
  assert.equal(fetchCalls.length, 0);
  const data = await res.json();
  assert.match(data.error, /không được hỗ trợ/);
}

// Test default lang when omitted: en-US
{
  fetchCalls = [];
  const res = await POST(createReq({ text: "Hello world" }));
  assert.equal(res.status, 200);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].body.model, "edge-tts/en-US-SaraNeural");
}

// Test all 5 voices
const testCases = [
  { lang: "en-US", expectedModel: "edge-tts/en-US-SaraNeural" },
  { lang: "vi-VN", expectedModel: "edge-tts/vi-VN-HoaiMyNeural" },
  { lang: "ja-JP", expectedModel: "edge-tts/ja-JP-NanamiNeural" },
  { lang: "ko-KR", expectedModel: "edge-tts/ko-KR-SunHiNeural" },
  { lang: "zh-TW", expectedModel: "edge-tts/zh-TW-HsiaoChenNeural" },
];

for (const { lang, expectedModel } of testCases) {
  fetchCalls = [];
  const res = await POST(createReq({ text: "test audio", lang }));
  assert.equal(res.status, 200, `Expected 200 for ${lang}`);
  assert.equal(fetchCalls.length, 1, `Expected fetch called for ${lang}`);
  assert.equal(fetchCalls[0].body.model, expectedModel, `Expected model ${expectedModel} for ${lang}`);
}

try {
  fs.unlinkSync(testRouteFile);
} catch {}

console.log("ALL_CHECKS_PASSED");
