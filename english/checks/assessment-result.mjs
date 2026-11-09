import assert from 'node:assert/strict';
import {validateAssessment} from '../src/lib/assessment-result.js';
const good={status:'feedback',score:95,heard:'prove',summary:'OK',segments:[{text:'prove',status:'correct'}],tips:[]};
assert.equal(validateAssessment(good),good);
assert.doesNotThrow(()=>validateAssessment({status:'retry',heard:'',summary:'Thu lại',tips:[]}));
for(const patch of [{segments:[null]},{segments:[{status:'wrong'}]},{heard:{}},{tips:'bad'},{tips:[{}]},{summary:{}},{score:101}])assert.throws(()=>validateAssessment({...good,...patch}),/không hợp lệ/);
console.log('PASS assessment response validation, legacy retry, malformed cached results');
