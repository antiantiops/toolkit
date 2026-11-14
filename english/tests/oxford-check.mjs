import assert from 'node:assert/strict';
import {
  parseOxfordHtml,
  validateWord,
  validateMediaUrl,
} from '../src/lib/lookup/oxford.js';
import fs from 'node:fs';

console.log('Running Oxford parser tests...');

// 1. validateWord test
assert.strictEqual(validateWord('vulnerable'), true);
assert.strictEqual(validateWord("mother-in-law"), true);
assert.strictEqual(validateWord("o'clock"), true);
assert.strictEqual(validateWord(''), false);
assert.strictEqual(validateWord('123'), false);
assert.strictEqual(validateWord('word with spaces'), false);
assert.strictEqual(validateWord('a'.repeat(65)), false);

// 2. validateMediaUrl test
assert.strictEqual(
  validateMediaUrl('https://www.oxfordlearnersdictionaries.com/us/media/english/uk_pron/t/tes/test__gb_1.mp3'),
  'https://www.oxfordlearnersdictionaries.com/us/media/english/uk_pron/t/tes/test__gb_1.mp3'
);
assert.strictEqual(validateMediaUrl('http://www.oxfordlearnersdictionaries.com/us/media/test.mp3'), null); // not https
assert.strictEqual(validateMediaUrl('https://evil.com/us/media/test.mp3'), null); // wrong domain
assert.strictEqual(validateMediaUrl('https://www.oxfordlearnersdictionaries.com/api/steal'), null); // not media path
assert.strictEqual(validateMediaUrl('not-a-url'), null);
assert.strictEqual(validateMediaUrl('https://user:pass@www.oxfordlearnersdictionaries.com/us/media/test.mp3'), null);
assert.strictEqual(validateMediaUrl('https://www.oxfordlearnersdictionaries.com:8443/us/media/test.mp3'), null);

// 3. Unrelated audio outside .phonetics ignored
const unrelatedAudioHtml = `
<div id="entryContent">
  <div class="entry">
    <div class="sound audio_play_button" data-src-mp3="https://www.oxfordlearnersdictionaries.com/us/media/other.mp3"></div>
    <span class="phonetics">
      <div class="phons_br">
        <span class="phon">/test/</span>
      </div>
    </span>
  </div>
</div>
`;
const unrelatedRes = parseOxfordHtml(unrelatedAudioHtml, 'https://test');
assert.strictEqual(unrelatedRes.audioUk, null);
assert.strictEqual(unrelatedRes.uk, '/test/');

// 4. Missing region
const missingRegionHtml = `
<div id="entryContent">
  <div class="entry">
    <span class="phonetics">
      <div class="phons_n_am">
        <div class="sound" data-src-mp3="https://www.oxfordlearnersdictionaries.com/us/media/us.mp3"></div>
        <span class="phon">/us-only/</span>
      </div>
    </span>
  </div>
</div>
`;
const missingRes = parseOxfordHtml(missingRegionHtml, 'https://test');
assert.strictEqual(missingRes.uk, null);
assert.strictEqual(missingRes.audioUk, null);
assert.strictEqual(missingRes.us, '/us-only/');
assert.strictEqual(missingRes.audioUs, 'https://www.oxfordlearnersdictionaries.com/us/media/us.mp3');

// 5. Variants & nested spans inside .phon
const variantsHtml = `
<div id="entryContent">
  <div class="entry">
    <span class="phonetics">
      <div class="phons_br">
        <span class="phon">/v<span>æ</span>n/</span>
        <span class="phon">/vɑːn/</span>
      </div>
    </span>
  </div>
</div>
`;
const variantsRes = parseOxfordHtml(variantsHtml, 'https://test');
assert.strictEqual(variantsRes.uk, '/væn/, /vɑːn/');

// 6. Real HTML snapshot check
if (fs.existsSync('/tmp/oxford-sam.html')) {
  const realHtml = fs.readFileSync('/tmp/oxford-sam.html', 'utf8');
  const realRes = parseOxfordHtml(realHtml, 'https://www.oxfordlearnersdictionaries.com/us/definition/english/vulnerable');
  assert.strictEqual(realRes.source, 'Oxford');
  assert.strictEqual(realRes.uk, '/ˈvʌlnərəbl/');
  assert.strictEqual(realRes.us, '/ˈvʌlnərəbl/');
  assert.strictEqual(
    realRes.audioUk,
    'https://www.oxfordlearnersdictionaries.com/us/media/english/uk_pron/v/vul/vulne/vulnerable__gb_1.mp3'
  );
  assert.strictEqual(
    realRes.audioUs,
    'https://www.oxfordlearnersdictionaries.com/us/media/english/us_pron/v/vul/vulne/vulnerable__us_1.mp3'
  );
}

// 7. Malformed / empty HTML returns null
assert.strictEqual(parseOxfordHtml('', 'https://test'), null);
assert.strictEqual(parseOxfordHtml('<div>No phonetics here</div>', 'https://test'), null);

console.log('All tests passed!');
