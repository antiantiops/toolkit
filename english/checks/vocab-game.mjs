import assert from 'node:assert/strict';
import {gameWords,buildDeck,normalize,choices,retryQueue,prioritizeWords,repairTarget} from '../src/lib/vocab-game.mjs';
const words=gameWords([{word:'  Book ',meaning:'sách'},{word:'book',meaning:'sách'},{word:'pen',meaning:'bút'},{word:'bad',pending:true,meaning:'x'},{word:'no meaning'}]);
assert.equal(words.length,2);assert.equal(normalize('  Hello WORLD!'),'hello world');const deck=buildDeck(words);assert.equal(deck.length,4);assert.equal(deck.filter(q=>q.mode==='recall').length,2);assert(choices(words,0).includes('sách'));const retry=retryQueue(deck,0,deck[0],false);assert.equal(retry.length,5);assert(retry.at(-1).retry);assert.equal(retryQueue(retry,4,retry[4],false).length,5);assert.equal(retryQueue(deck,0,deck[0],true),deck);assert.equal(gameWords(Array.from({length:50},(_,i)=>({word:'w'+i,meaning:'m'+i}))).length,30);console.log('PASS validation, dedupe, recall deck, answer normalization, bounded delayed retry and max 30 words');

const memory={pen:{debt:6}};assert.equal(prioritizeWords(words,memory)[0].word,"pen");const priority=buildDeck(words,memory);assert.equal(priority[0].index,1);assert.equal(priority[2].index,1);console.log("PASS weak words first in Vocabulary and both game rounds");

assert.deepEqual([0,1,2,3,4].map(n=>repairTarget({word:"book",meaning:"sách"},n)),["book","sách","book","sách","book"]);console.log("PASS alternating English/Vietnamese repair targets");
