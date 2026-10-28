import assert from 'node:assert/strict';
import {validSavedText} from '../src/lib/words/validation.mjs';
for(const text of ['Piece of cake = very easy','and/or','“café” — dễ như ăn bánh…','a+b < c & d > 0','word [noun] {note} @ # $ % ^ * _ | ~ `','123'])assert(validSavedText(text),text);
for(const text of ['', '  ', null, {}, 'x'.repeat(501),'/ˈkeɪk/','/kæt/','/fəʊn/','a 😀','a 🇻🇳','a 👍🏽','a 1️⃣','a ❤️'])assert(!validSavedText(text),JSON.stringify(text));
console.log('PASS Unicode punctuation and text allowed; IPA symbols, emoji, invalid type, empty and oversized input rejected');

const {readFileSync}=await import('node:fs');
for(const endpoint of ['word','quick-word','my-words']){
 const route=readFileSync(new URL(`../src/app/api/${endpoint}/route.js`,import.meta.url),'utf8');
 assert(route.includes('validSavedText('),endpoint);
 assert(!route.includes('{0,199}'),endpoint);
}
console.log('PASS save and both meaning endpoints share validation');
