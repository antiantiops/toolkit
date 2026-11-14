import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { history, archiveListening } from '../src/app/api/session/listening-history.js';

// Setup temp CACHE_DIR
const tempCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-lang-test-'));
process.env.CACHE_DIR = tempCacheDir;

// Dynamic import with source-bound transform to resolve extensionless imports
const storageFilePath = path.resolve('src/app/api/session/storage.js');
const rawStorageSrc = fs.readFileSync(storageFilePath, 'utf8');
const transformedSrc = rawStorageSrc.replace(
  /import\s*\{archiveListening\}\s*from\s*['\"]\.\/listening-history['\"];/,
  "import {archiveListening} from './listening-history.js';"
);
const transformedModulePath = path.resolve('src/app/api/session/.storage-transformed.mjs');
fs.writeFileSync(transformedModulePath, transformedSrc, 'utf8');

let saveSession, loadSession, deleteSession;
try {
  const mod = await import(transformedModulePath);
  saveSession = mod.saveSession;
  loadSession = mod.loadSession;
  deleteSession = mod.deleteSession;
} finally {
  if (fs.existsSync(transformedModulePath)) {
    fs.unlinkSync(transformedModulePath);
  }
}

console.log('Testing session-language persistence & isolation...');

const realOwner = 'account_' + 'f'.repeat(64);
const otherOwner = 'account_' + 'e'.repeat(64);
const allLocales = ['vi', 'en', 'ja', 'ko', 'zh-TW'];

// 1. Invalid locale - no writes
{
  const testSid = realOwner;
  const invalidPatch = {
    words: [{ word: 'invalid' }],
    wordsTargetLang: 'fr-FR', // unsupported
  };
  saveSession(testSid, invalidPatch);
  assert.equal(loadSession(testSid), null, 'Invalid locale in patch must prevent write');
  assert.equal(fs.existsSync(path.join(tempCacheDir, `${testSid}.json`)), false);
}

// 2. Vi legacy seed & restore
{
  const legacySid = 'account_' + '1'.repeat(64);
  const filePath = path.join(tempCacheDir, `${legacySid}.json`);
  const legacyData = {
    words: [{ word: 'apple', meaning: 'táo' }],
    preview: 'data:img-apple',
    grammar: { title: 'Past simple' },
    gPreview: 'data:img-grammar',
    writing: { task: 'Write essay' },
    wPreview1: 'data:img-w1',
    targetLang: 'vi',
  };
  fs.writeFileSync(filePath, JSON.stringify({ savedAt: Date.now(), data: legacyData }), 'utf8');

  // Load without targetLang (legacy compatibility)
  const flat = loadSession(legacySid);
  assert.equal(flat.words[0].word, 'apple');
  assert.equal(flat._locales, undefined, 'Must not leak _locales to legacy caller');

  // Load with targetLang = 'vi'
  const viSession = loadSession(legacySid, 'vi');
  assert.equal(viSession.words[0].word, 'apple');
  assert.equal(viSession.grammar.title, 'Past simple');
  assert.equal(viSession._locales, undefined, 'Must not leak _locales to locale caller');

  // Load with targetLang = 'ja' (should have nothing, no cross-language restore)
  const jaSession = loadSession(legacySid, 'ja');
  assert.deepEqual(jaSession, {}, 'Must not restore vi legacy data into ja');
}

// 3. All five locales switch & restore isolation across modes
{
  const sid = realOwner;
  for (const lang of allLocales) {
    saveSession(sid, {
      words: [{ word: `word-${lang}` }],
      wordsTargetLang: lang,
    });
    saveSession(sid, {
      grammar: { title: `grammar-${lang}` },
      grammarTargetLang: lang,
    });
    saveSession(sid, {
      writing: { task: `writing-${lang}` },
      writingTargetLang: lang,
    });
    saveSession(sid, {
      listening: { title: `listening-${lang}`, sentences: [{ en: `Hi ${lang}`, vi: `Chào ${lang}` }] },
      listeningTargetLang: lang,
    });
  }

  // Verify each locale isolated
  for (const lang of allLocales) {
    const s = loadSession(sid, lang);
    assert.equal(s.words[0].word, `word-${lang}`);
    assert.equal(s.grammar.title, `grammar-${lang}`);
    assert.equal(s.writing.task, `writing-${lang}`);
    assert.equal(s.listening.title, `listening-${lang}`);
    assert.equal(s._locales, undefined);
  }

  // Verify loadSession(sid) returns latest flat fields without _locales
  const flat = loadSession(sid);
  assert.ok(flat.words);
  assert.ok(flat.grammar);
  assert.ok(flat.writing);
  assert.ok(flat.listening);
  assert.equal(flat._locales, undefined);
}

// 4. Mode tags & nested lesson.targetLang detection
{
  const sid = 'account_' + '2'.repeat(64);
  // Nested targetLang in lesson object
  saveSession(sid, {
    listening: { targetLang: 'ko', title: 'Korean Listening', sentences: [{ en: 'A', vi: 'B' }] },
  });
  assert.equal(loadSession(sid, 'ko').listening.title, 'Korean Listening');
  assert.equal(loadSession(sid, 'vi').listening, undefined);

  // New patch lacking mode tag defaults to vi, not stale tag
  saveSession(sid, {
    grammar: { title: 'Default Vietnamese Grammar' },
  });
  assert.equal(loadSession(sid, 'vi').grammar.title, 'Default Vietnamese Grammar');
  assert.equal(loadSession(sid, 'ko').grammar, undefined);
}

// 5. Independently stored modelDraft
{
  const sid = 'account_' + '3'.repeat(64);
  saveSession(sid, {
    writing: { task: 'Essay 1' },
    writingTargetLang: 'ja',
  });
  saveSession(sid, {
    modelDraft: 'Sample draft in ja',
    modelDraftTargetLang: 'ja',
  });
  saveSession(sid, {
    modelDraft: 'Sample draft in zh-TW',
    modelDraftTargetLang: 'zh-TW',
  });

  const ja = loadSession(sid, 'ja');
  assert.equal(ja.writing.task, 'Essay 1');
  assert.equal(ja.modelDraft, 'Sample draft in ja');

  const zh = loadSession(sid, 'zh-TW');
  assert.equal(zh.writing, undefined); // Writing was ja, not zh-TW
  assert.equal(zh.modelDraft, 'Sample draft in zh-TW');
}

// 6. Delete isolation
{
  const sid = 'account_' + '4'.repeat(64);
  saveSession(sid, { words: [{ word: 'vi-w' }], wordsTargetLang: 'vi' });
  saveSession(sid, { words: [{ word: 'en-w' }], wordsTargetLang: 'en' });

  // Delete vocab for 'en' only
  deleteSession(sid, 'vocab', 'en');
  assert.equal(loadSession(sid, 'en').words, undefined);
  assert.equal(loadSession(sid, 'vi').words[0].word, 'vi-w');

  // Flat latest fields check: if latest flat was en, it got cleared
  const flat = loadSession(sid);
  assert.equal(flat.words, undefined);

  // Legacy deleteSession(sid, 'vocab') deletes vocab across all locales
  saveSession(sid, { words: [{ word: 'ko-w' }], wordsTargetLang: 'ko' });
  deleteSession(sid, 'vocab');
  assert.equal(loadSession(sid, 'ko').words, undefined);
  assert.equal(loadSession(sid, 'vi').words, undefined);
}

// 7. Owner isolation & ArchiveListening owner remains real owner
{
  const sidA = 'account_' + 'a'.repeat(64);
  const sidB = 'account_' + 'b'.repeat(64);

  const lessonA = { title: 'Audio A', sentences: [{ en: 'One', vi: 'Một' }] };
  const lessonB = { title: 'Audio B', sentences: [{ en: 'Two', vi: 'Hai' }] };

  saveSession(sidA, { listening: lessonA, listeningTargetLang: 'ja' });
  saveSession(sidB, { listening: lessonB, listeningTargetLang: 'ja' });

  const histA = history(sidA);
  const histB = history(sidB);
  assert.equal(histA.length, 1);
  assert.equal(histB.length, 1);
  assert.equal(histA[0].title, 'Audio A');
  assert.equal(histB[0].title, 'Audio B');
  assert.notEqual(histA[0].key, histB[0].key);
}

// 8. TTL behavior check
{
  const sid = 'account_' + '5'.repeat(64);
  saveSession(sid, { words: [{ word: 'test' }] });
  const file = path.join(tempCacheDir, `${sid}.json`);
  assert.ok(fs.existsSync(file));

  // Modify savedAt to expire
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  raw.savedAt = Date.now() - (24 * 60 * 60 * 1000 + 1000);
  fs.writeFileSync(file, JSON.stringify(raw), 'utf8');

  assert.equal(loadSession(sid), null, 'Expired session must return null and be cleaned up');
  assert.equal(fs.existsSync(file), false, 'Expired file must be unlinked');
}

// Cleanup
fs.rmSync(tempCacheDir, { recursive: true, force: true });
console.log('PASS checks/session-language.mjs: all checks passed.');
