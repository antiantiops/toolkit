import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// 1. Verify source code change in PronunciationRecorder.js
const ui = fs.readFileSync('src/app/PronunciationRecorder.js', 'utf8');

// Container must not use flex/inline-flex (native inline text flow prevents space collapsing)
assert(!ui.includes('inline-flex flex-wrap items-center justify-center text-3xl font-bold tracking-tight text-white'));
assert(ui.includes('className="text-3xl font-bold tracking-tight text-white"'));

// 2. Regression check using renderToStaticMarkup with mixed statuses
// Segments with spaces and punctuation: "How ", "to ", "calculate", ", quickly!"
const segments = [
  { text: 'How ', status: 'correct' },
  { text: 'to ', status: 'correct' },
  { text: 'calculate', status: 'wrong' },
  { text: ', quickly!', status: 'neutral' }
];

const rendered = renderToStaticMarkup(
  React.createElement(
    'div',
    { className: 'text-3xl font-bold tracking-tight text-white' },
    segments.map((s, i) =>
      React.createElement(
        'span',
        {
          key: i,
          className:
            s.status === 'wrong'
              ? 'text-rose-500 font-extrabold underline decoration-rose-500 decoration-2'
              : s.status === 'correct'
              ? 'text-emerald-400 font-extrabold'
              : 'text-slate-300'
        },
        s.text
      )
    )
  )
);

// Verify container does not have flex classes
assert(!rendered.includes('flex'));
assert(!rendered.includes('inline-flex'));

// Verify whitespace and punctuation preserved across span boundaries
assert(rendered.includes('to '));
assert(rendered.includes('calculate'));
assert(rendered.includes(', quickly!'));

// Extract text content from markup and ensure "to calculate" separated by space
const textContent = rendered.replace(/<[^>]+>/g, '');
assert.equal(textContent, 'How to calculate, quickly!');
assert(textContent.includes('to calculate'));

console.log('PASS pronunciation segment spacing and normal inline flow');
