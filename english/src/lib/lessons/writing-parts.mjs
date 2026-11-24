// ponytail: four fixed schema partitions, two workers; use a durable queue before replicas.
export function writingGroups(dual) {
  return dual ? [
    ['kind','title','titleVietnamese','writingType','sample.title','sample.scenario','sample.scenarioVietnamese'],
    ['task.title','task.scenario','task.scenarioVietnamese','task.sender','task.recipient','task.format','task.minWords','task.requirements'],
    ['sample.sections','sample.usefulPhrases'],
    ['task.strategy','task.suggestedOutline','task.wordBank'],
  ] : [
    ['kind','title','titleVietnamese','writingType','goal','situation'],
    ['task'], ['sections'], ['usefulPhrases','checklist','tips','yourTurn'],
  ];
}
export function grammarGroups() {
  return [
    ['title', 'titleVietnamese', 'learningGoal', 'everydayContext', 'keyIdea'],
    ['rules'],
    ['comparison', 'commonMistakes'],
    ['notes', 'checkYourself', 'summary'],
  ];
}
export function getPath(value, path) { return path.split('.').reduce((v,k) => v?.[k],value); }
export function setPath(value, path, data) {
  const keys=path.split('.'); let target=value;
  for(const key of keys.slice(0,-1)) target=target[key] ||= {};
  target[keys.at(-1)]=data;
}
export function partPrompt(template, fields) {
  const firstBrace = template.indexOf('{'), lastBrace = template.lastIndexOf('}');
  const schema = JSON.parse(template.slice(firstBrace, lastBrace + 1));
  const selected = {};
  for (const field of fields) {
    const value = getPath(schema, field);
    if (value === undefined) throw new Error(`Unknown lesson field: ${field}`);
    setPath(selected, field, value);
  }
  const returnJsonIdx = template.indexOf('Return JSON:');
  const returnOnlyIdx = template.indexOf('Return ONLY');
  const headerIdx = returnJsonIdx !== -1 && returnJsonIdx < firstBrace ? returnJsonIdx : returnOnlyIdx;
  const prefix = template.slice(0, headerIdx).trimEnd();
  const suffixRules = lastBrace + 1 < template.length
    ? template.slice(lastBrace + 1).replace(/Return ONLY[^\n]*/g, '').trim()
    : '';
  return `${prefix}${suffixRules ? `\n\n${suffixRules}` : ''}\nGenerate ONLY this partition. Do not generate other lesson sections. Keep explanations concise without omitting source sentences. Return ONLY valid JSON matching this schema (null allowed for task on a sample-only page):\n${JSON.stringify(selected)}`;
}
