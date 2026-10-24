const fs=require('fs'),assert=require('assert');
const src=fs.readFileSync('pristeel-home-canonical-v1.js','utf8');
assert(src.includes('var evidence=taskEvidence(ctx,t);if(!evidence)return;'),'Attention requires positive evidence');
assert(!src.includes('return age<=2?970:880'),'Discovery age alone is not a priority');
assert(!src.includes("title:'Ndiq furnitorin:"),'No automatic follow-up from missing reply');
assert(src.includes("if(!detail||!ref||due===null"),'Source, reason and current due date are mandatory');
assert(src.includes('if(age>14&&due<0)return null'),'Old overdue instructions stay in Tasks');
console.log('Home human-needed priority smoke: OK');
