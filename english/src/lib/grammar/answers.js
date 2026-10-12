// Only unambiguous negative contractions; 's/'d require grammatical context.
const negatives = {"haven't":"have not","hasn't":"has not","hadn't":"had not","isn't":"is not","aren't":"are not","wasn't":"was not","weren't":"were not","don't":"do not","doesn't":"does not","didn't":"did not","won't":"will not","wouldn't":"would not","can't":"cannot","couldn't":"could not","shouldn't":"should not","mustn't":"must not","needn't":"need not","shan't":"shall not"};
export function normalizeGrammarAnswer(value) {
 return String(value||'').trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\b[a-z]+n't\b/g,word=>negatives[word]||word).replace(/\bcan\s+not\b/g,'cannot').replace(/\s+/g,' ');
}
