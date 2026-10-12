import assert from 'node:assert/strict';
import { normalizeGrammarAnswer as normal } from './src/lib/grammar/answers.js';
for (const [typed,key] of [["Haven't approved","have not approved"],["Haven’t sent","have not sent"],["HAS NOT UPDATED","hasn't updated"],["can't go","cannot go"],["can not go","cannot go"],["  have   not sent  ","haven't sent"]]) assert.equal(normal(typed),normal(key));
for (const [typed,key] of [["hasn't sent","have not sent"],["hadn't sent","have not sent"],["haven't send","have not sent"],["approved","have approved"],["he's sent","he has sent"]]) assert.notEqual(normal(typed),normal(key));
console.log('PASS contractions, curly apostrophes, whitespace; wrong agreement/tense/form rejected');
