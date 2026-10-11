const assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('src/app/api/business-practice/route.js','utf8');
const validate=Function(source.slice(source.indexOf('export function validateTest')).replace('export function','function')+';return validateTest;')();
const vocab={pairs:Array.from({length:5},()=>({left:'accept',right:'reject',answer:'ANT',explanation:'Trái nghĩa'})),bank:['submit'],fills:Array.from({length:5},()=>({sentence:'Please ____ your report.',base:'submit',answer:'submit',explanation:'Động từ nguyên mẫu'}))};
validate(vocab,'vocab');assert.throws(()=>validate({...vocab,pairs:[{...vocab.pairs[0],answer:'BAD'}]},'vocab'));
assert.throws(()=>validate({...vocab,fills:vocab.fills.map(q=>({...q,sentence:'No blank'}))},'vocab'));
const grammar={segments:['Work more ',' than before. ',' ',' ',' ',' .'],blanks:Array.from({length:5},()=>({base:'quick',answer:'quickly',explanation:'Trạng từ'}))};
validate(grammar,'grammar');assert.throws(()=>validate({...grammar,segments:['short']},'grammar'));
console.log('PASS Business SYN/ANT, word bank correct form, cloze segment/blank schema, invalid outputs rejected');
