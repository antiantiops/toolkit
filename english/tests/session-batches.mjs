import assert from 'node:assert/strict';
for (const count of [0, 1, 10, 11, 25, 100]) {
  const words = Array.from({ length: count }, (_, i) => ({ word: String(i) }));
  let offset = 0, restored = [];
  do {
    restored.push(...words.slice(offset, offset + 10));
    offset = offset + 10 < words.length ? offset + 10 : null;
  } while (offset !== null);
  assert.deepEqual(restored, words);
}
console.log('Session batch boundaries passed');
