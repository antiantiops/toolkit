import assert from 'node:assert/strict';
import {validSavedText} from '../src/lib/words/validation.mjs';
for(const text of ['Piece of cake = very easy','and/or','“café” — dễ như ăn bánh…','a+b < c & d > 0','word [noun] {note} @ # $ % ^ * _ | ~ `','123'])assert(validSavedText(text),text);
for(const text of ['', '  ', null, {}, 'x'.repeat(501),'/ˈkeɪk/','/kæt/','/fəʊn/','a 😀','a 🇻🇳','a 👍🏽','a 1️⃣','a ❤️'])assert(!validSavedText(text),JSON.stringify(text));
console.log('PASS Unicode punctuation and text allowed; IPA symbols, emoji, invalid type, empty and oversized input rejected');
