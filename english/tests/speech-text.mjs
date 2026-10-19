import assert from 'node:assert/strict';
import { speechText } from '../src/lib/listening/speech-text.mjs';
assert.equal(speechText('R & D centres'), 'R &amp; D centres');
assert.equal(speechText('A < B > C & D'), 'A &lt; B &gt; C &amp; D');
assert.equal(speechText("Lenovo’s sales worldwide."), "Lenovo’s sales worldwide.");
assert.equal(speechText('&amp;'), '&amp;amp;');
console.log('speech text checks passed');
