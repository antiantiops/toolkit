import assert from 'node:assert/strict';
import {normalizeRepair as n} from '../src/lib/vocab-game.mjs';
for(const [a,b] of [['gây nguy hiểm, đe dọa','gây nguy hiểm, đe doạ'],['hòa','hoà'],['hóa','hoá'],['khỏe','khoẻ'],['thủy','thuỷ'],['HỌA','hoạ'],['đe dọa'.normalize('NFD'),'đe doạ']])assert.equal(n(a),n(b),`${a} / ${b}`);
for(const [a,b] of [['dọa','doa'],['dọa','dóa'],['hòa','hoa'],['thủy','thụy'],['nguy hiểm','nguy hiếm'],['Jeopardize','Jeopardise']])assert.notEqual(n(a),n(b));
console.log('PASS alternate oa/oe/uy tone placement and Unicode; wrong letters/tones rejected');
