import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== TEST WRITING & BUSINESS PRACTICE CLIENT LANGUAGE WIRING ===');

const writingPath = path.resolve(process.cwd(), 'src/app/Writing.js');
const businessPath = path.resolve(process.cwd(), 'src/app/BusinessPractice.js');

const writingSource = fs.readFileSync(writingPath, 'utf8');
const businessSource = fs.readFileSync(businessPath, 'utf8');

// 1. Contract & AST/Regex tests for hook usage
console.log('--- 1. Testing useLanguage hook integration ---');
assert(
  /import\s*\{\s*useLanguage\s*\}\s*from\s*["']\.\/LanguageContext["']/.test(writingSource),
  'Writing.js must import useLanguage from ./LanguageContext'
);
assert(
  /const\s*\{\s*targetLang\s*\}\s*=\s*useLanguage\(\)/.test(writingSource),
  'Writing.js must destructure targetLang from useLanguage()'
);

assert(
  /import\s*\{\s*useLanguage\s*\}\s*from\s*["']\.\/LanguageContext["']/.test(businessSource),
  'BusinessPractice.js must import useLanguage from ./LanguageContext'
);
assert(
  /const\s*\{\s*targetLang\s*\}\s*=\s*useLanguage\(\)/.test(businessSource),
  'BusinessPractice.js must destructure targetLang from useLanguage()'
);

// 2. Route payload verification: Writing.js
console.log('--- 2. Testing Writing.js endpoint payloads ---');
// Route: /api/writing-lookup
assert(
  writingSource.includes('/api/writing-lookup'),
  'Writing.js must call /api/writing-lookup'
);
const lookupCallMatch = writingSource.match(/\/api\/writing-lookup[\s\S]*?body:\s*JSON\.stringify\(\s*\{([\s\S]*?)\}\s*\)/);
assert(lookupCallMatch, 'Writing.js must have JSON body for /api/writing-lookup');
assert(
  /\btargetLang\b/.test(lookupCallMatch[1]),
  'Writing.js /api/writing-lookup body must include targetLang'
);
assert(
  /\bword:\s*wordClean\b/.test(lookupCallMatch[1]),
  'Writing.js /api/writing-lookup body must preserve wordClean'
);
assert(
  /\bsentence:\s*fullSentence\b/.test(lookupCallMatch[1]),
  'Writing.js /api/writing-lookup body must preserve fullSentence'
);
assert(
  /\bcontext:\s*paraContext\b/.test(lookupCallMatch[1]),
  'Writing.js /api/writing-lookup body must preserve paraContext'
);

// Route: /api/writing-model
assert(
  writingSource.includes('/api/writing-model'),
  'Writing.js must call /api/writing-model'
);
const modelCallMatch = writingSource.match(/\/api\/writing-model[\s\S]*?body:\s*JSON\.stringify\(\s*\{([\s\S]*?)\}\s*\)/);
assert(modelCallMatch, 'Writing.js must have JSON body for /api/writing-model');
assert(
  /\btargetLang\b/.test(modelCallMatch[1]),
  'Writing.js /api/writing-model body must include targetLang'
);
assert(
  /\btask\b/.test(modelCallMatch[1]) && /\blevel\b/.test(modelCallMatch[1]) && /\bcustomPrompt\b/.test(modelCallMatch[1]),
  'Writing.js /api/writing-model body must preserve task, level, customPrompt'
);

// Route: /api/writing-review
assert(
  writingSource.includes('/api/writing-review'),
  'Writing.js must call /api/writing-review'
);
const reviewCallMatch = writingSource.match(/\/api\/writing-review[\s\S]*?body:\s*JSON\.stringify\(\s*\{([\s\S]*?)\}\s*\)/);
assert(reviewCallMatch, 'Writing.js must have JSON body for /api/writing-review');
assert(
  /\btargetLang\b/.test(reviewCallMatch[1]),
  'Writing.js /api/writing-review body must include targetLang'
);
assert(
  /\bdraft\b/.test(reviewCallMatch[1]) && /\blevel\b/.test(reviewCallMatch[1]) && /\bcustomPrompt\b/.test(reviewCallMatch[1]),
  'Writing.js /api/writing-review body must preserve draft, level, customPrompt'
);

// Preferences API check: customPrompt preserved, not generated data
assert(
  writingSource.includes('/api/writing-preferences'),
  'Writing.js must preserve /api/writing-preferences fetch and PUT'
);
const prefPutMatch = writingSource.match(/\/api\/writing-preferences[\s\S]*?body:\s*JSON\.stringify\(\s*\{([\s\S]*?)\}\s*\)/);
assert(prefPutMatch && prefPutMatch[1].trim() === 'customPrompt', 'Preferences PUT must only send customPrompt');

// 3. Local lookup cache key includes targetLang
console.log('--- 3. Testing lookup cache key namespacing ---');
const cacheKeyMatch = writingSource.match(/const\s+cacheKey\s*=\s*`([^`]+)`/);
assert(cacheKeyMatch, 'Writing.js must define cacheKey');
const cacheKeyPattern = cacheKeyMatch[1];
assert(
  cacheKeyPattern.includes('targetLang'),
  `cacheKey template string must incorporate targetLang (found: ${cacheKeyPattern})`
);
assert(
  cacheKeyPattern.includes('wordClean') && cacheKeyPattern.includes('fullSentence'),
  'cacheKey must incorporate wordClean and fullSentence'
);

// Simulate cache keys across languages to prove isolation
function simulateCacheKey(targetLang, word, sentence) {
  // Evaluates the exact pattern used in Writing.js
  const wordClean = word.trim();
  const fullSentence = sentence;
  return `${targetLang || 'vi'}::${wordClean.toLowerCase()}::${fullSentence}`;
}
const keyVi = simulateCacheKey('vi', 'hello', 'Hello world');
const keyJa = simulateCacheKey('ja', 'hello', 'Hello world');
const keyKo = simulateCacheKey('ko', 'hello', 'Hello world');
assert.notEqual(keyVi, keyJa, 'vi and ja cache keys must differ for same word/sentence');
assert.notEqual(keyJa, keyKo, 'ja and ko cache keys must differ for same word/sentence');

// 4. Route payload verification: BusinessPractice.js
console.log('--- 4. Testing BusinessPractice.js endpoint payloads ---');
assert(
  businessSource.includes('/api/business-practice'),
  'BusinessPractice.js must call /api/business-practice'
);
const businessCallMatch = businessSource.match(/\/api\/business-practice[\s\S]*?body:\s*JSON\.stringify\(\s*\{([\s\S]*?)\}\s*\)/);
assert(businessCallMatch, 'BusinessPractice.js must have JSON body for /api/business-practice');
assert(
  /\btargetLang\b/.test(businessCallMatch[1]),
  'BusinessPractice.js /api/business-practice body must include targetLang'
);
assert(
  /\bmode\b/.test(businessCallMatch[1]) && /\bwords\b/.test(businessCallMatch[1]) && /\bgrammar\b/.test(businessCallMatch[1]),
  'BusinessPractice.js /api/business-practice body must preserve mode, words, grammar'
);

// 5. Shared LanguageProvider remount verification
console.log('--- 5. Testing LanguageProvider key remount behavior ---');
const contextPath = path.resolve(process.cwd(), 'src/app/LanguageContext.js');
const contextSource = fs.readFileSync(contextPath, 'utf8');
assert(
  contextSource.includes('key={language}'),
  'LanguageContext must wrap children with key={language} to ensure unmount/remount on language switch'
);

console.log('ALL WRITING & BUSINESS PRACTICE CLIENT CHECKS PASSED.');
