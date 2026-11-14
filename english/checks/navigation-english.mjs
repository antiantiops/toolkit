import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync(new URL('../src/app/page.js', import.meta.url), 'utf8');
const navigation = page.match(/<div role="navigation"[\s\S]*?<\/div>/)?.[0];
assert(navigation, 'Main skill navigation must exist');
const buttons = [...navigation.matchAll(/<button\b[\s\S]*?<\/button>/g)].map(([button]) => button);
assert.equal(buttons.length, 5);
for (const [index, label] of ['Vocabulary', 'Grammar', 'Writing', 'Listening', 'My Words'].entries()) {
  assert(buttons[index].includes(`${label}</button>`), `Keep ${label} in English for every locale`);
  assert(!buttons[index].includes('t('), 'Do not translate main skill buttons');
}
assert(page.includes('Main skill navigation stays English in every current/future locale.'));
console.log('PASS main skill labels stay English for all current/future locales');
