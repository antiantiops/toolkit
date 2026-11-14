import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const filesToCheck = [
  'src/app/Account.js',
  'src/app/TranscriptSwitch.js',
  'src/app/ThemeSwitch.js',
  'src/app/WritingProgress.js',
  'src/app/FeatureNotice.js',
  'src/app/ChatWordsNotice.js',
];

for (const relPath of filesToCheck) {
  assert(fs.existsSync(relPath), `File must exist: ${relPath}`);
  const content = fs.readFileSync(relPath, 'utf8');
  assert(
    content.includes("from './LanguageContext'") || content.includes('from "./LanguageContext"'),
    `${relPath} must import from LanguageContext`
  );
  assert(
    content.includes('useLanguage'),
    `${relPath} must use useLanguage hook`
  );
  assert(
    /\bt\s*\(/.test(content),
    `${relPath} must call t(...) for translations`
  );
}

// Assert checks/ui-language.mjs passes
execFileSync(process.execPath, ['checks/ui-language.mjs'], { stdio: 'inherit' });

console.log('PASS checks/minor-ui-language.mjs: all 6 components import useLanguage and call t(), checks/ui-language.mjs passes');
