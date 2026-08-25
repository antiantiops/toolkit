import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../vendor/iztro-v2.6.0.min.js', import.meta.url), 'utf8');
const context = { self: {} };
vm.runInNewContext(source, context);
const chart = context.self.iztro.astro.bySolar('1999-02-02', 0, '男', true, 'zh-CN');
const expected = {
  lunar: [1998, 12, 17], soulBranch: '丑', bodyBranch: '丑', bureau: '金四局',
  major: { '命宫':['天府'], '父母':['天机','太阴'], '福德':['紫微','贪狼'], '田宅':['巨门'], '官禄':['天相'], '仆役':['天梁'], '迁移':['廉贞','七杀'], '子女':['天同'], '夫妻':['武曲','破军'], '兄弟':['太阳'] }
};
assert.deepEqual([chart.rawDates.lunarDate.lunarYear, chart.rawDates.lunarDate.lunarMonth, chart.rawDates.lunarDate.lunarDay], expected.lunar);
assert.equal(chart.earthlyBranchOfSoulPalace, expected.soulBranch);
assert.equal(chart.earthlyBranchOfBodyPalace, expected.bodyBranch);
assert.equal(chart.fiveElementsClass, expected.bureau);
for (const palace of chart.palaces) if (expected.major[palace.name]) assert.deepEqual([...palace.majorStars.map(s => s.name)], expected.major[palace.name]);
console.log('golden Nim: passed');
