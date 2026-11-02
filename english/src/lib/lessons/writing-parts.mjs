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
export function getPath(value, path) { return path.split('.').reduce((v,k) => v?.[k],value); }
export function setPath(value, path, data) {
  const keys=path.split('.'); let target=value;
  for(const key of keys.slice(0,-1)) target=target[key] ||= {};
  target[keys.at(-1)]=data;
}
export function partPrompt(template, fields) {
  const schema=JSON.parse(template.slice(template.indexOf('{'),template.lastIndexOf('}')+1));
  const selected={};
  for(const field of fields) { const value=getPath(schema,field); if(value===undefined) throw new Error(`Unknown Writing field: ${field}`); setPath(selected,field,value); }
  return `${template.slice(0,template.indexOf('Return ONLY'))}\nGenerate ONLY this partition. Do not generate other lesson sections. Keep explanations concise without omitting source sentences. Return ONLY valid JSON matching this schema (null allowed for task on a sample-only page):\n${JSON.stringify(selected)}`;
}
