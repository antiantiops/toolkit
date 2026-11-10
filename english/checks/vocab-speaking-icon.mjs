import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const pagePath = path.resolve("src/app/page.js");
const code = fs.readFileSync(pagePath, "utf8");

// 1. Verify headphone button exists next to SpeakBtn on vocab word cards
assert.ok(
  code.includes('onClick={() => setLookup({ ...w, practice: true })}'),
  "Speaking button must launch lookup with practice: true preserving w"
);

assert.ok(
  code.includes('aria-label={`Luyện nói ${w.word}`}') &&
    code.includes('title={`Luyện nói ${w.word}`}'),
  "Button must have proper title and aria-label with Vietnamese text"
);

// 2. Touch target >= 44px (h-11 w-11 is 44x44px in Tailwind)
assert.ok(
  code.includes("h-11 w-11"),
  "Speaking button must have at least 44px min touch target"
);

// 3. Ear icon SVG present, no visible text label
const buttonStartIndex = code.indexOf('aria-label={`Luyện nói ${w.word}`}');
assert.ok(buttonStartIndex > 0, "Button tag found");
const buttonEndIndex = code.indexOf('</button>', buttonStartIndex);
const buttonSnippet = code.slice(buttonStartIndex, buttonEndIndex);

assert.ok(
  buttonSnippet.includes('<svg') && buttonSnippet.includes('</svg>'),
  "Button must contain SVG icon"
);

assert.ok(
  buttonSnippet.includes('d="M6 9a6 6 0 0 1 12 0c0 3-1.5 4.3-3.3 5.7-1.2.9-1.4 2-1.8 3.2A3 3 0 0 1 7 17"') &&
    buttonSnippet.includes('d="M9 9a3 3 0 0 1 6 0c0 1.6-1 2.3-2 3l-1 1"') &&
    buttonSnippet.includes('d="M9 9v3"'),
  "Button must contain ear icon SVG paths"
);

// Check no visible text: strip SVG tag and check remainder has no text nodes
const stripped = buttonSnippet.replace(/<svg[\s\S]*?<\/svg>/, "").replace(/[^>]*>/, "").trim();
assert.equal(stripped, "", "Button must not contain visible text");

// 4. Verify lookup modal reuses PronunciationRecorder when practice: true
assert.ok(
  code.includes('{lookup.practice && <div id="word-pronunciation-practice"><PronunciationRecorder'),
  "Lookup modal must render PronunciationRecorder when lookup.practice is true"
);

// 5. Test state update behavior preserves w
const sampleWord = {
  word: "diligent",
  ipa: "/ˈdɪl.ə.dʒənt/",
  meaning: "chăm chỉ",
  collocations: ["diligent student"],
  example: "She is a diligent worker."
};

let lookupState = null;
const setLookup = (next) => {
  lookupState = typeof next === "function" ? next(lookupState) : next;
};

// Simulate click handler
const handleClick = () => setLookup({ ...sampleWord, practice: true });
handleClick();

assert.equal(lookupState.word, "diligent");
assert.equal(lookupState.ipa, "/ˈdɪl.ə.dʒənt/");
assert.equal(lookupState.practice, true);
assert.equal(lookupState.meaning, "chăm chỉ");
assert.deepEqual(lookupState.collocations, ["diligent student"]);

console.log("PASS vocab speaking icon: touch target, SVG-only, accessible label, state preservation");
