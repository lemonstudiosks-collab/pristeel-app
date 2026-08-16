const fs=require('fs');
const assert=require('assert');

const source=fs.readFileSync('pristeel-projects-modern-v1.js','utf8');

assert(source.includes("function stageForRow(row)"),'Contextual project-stage display helper is missing');
assert(source.includes("s.id==='supplier_selection'&&norm(row&&row.business_type)==='trading'"),'Trading supplier-selection context is not guarded by business_type');
assert(source.includes("name:'Furnitorë'"),'Trading supplier-selection must display Furnitorë');
assert(source.includes("{id:'supplier_selection',name:'Prodhuesi'}"),'Canonical pipeline stage ID/name mapping must remain intact for manufacturing projects');
assert(source.includes("sg=stageForRow(r)"),'Project list must use the contextual stage label');
assert(source.includes("accent=st.group==='lost'?st.c:u.c"),'Lost projects must override only the card accent');
assert(source.includes("style=\"color:'+u.c+'\""),'Deadline text must continue to use deadline urgency, not lost-status color');
assert(source.includes("function boardCard(r){var st=statusInfo(r),u=urgency(r),accent=st.group==='lost'?st.c:u.c;"),'Board cards must use the same lost-status accent rule');
assert(!/pipeline_stage\s*=\s*['\"]supplier_selection/.test(source),'Display fix must not mutate pipeline_stage');

console.log('Trading project phase + lost accent smoke test passed.');
