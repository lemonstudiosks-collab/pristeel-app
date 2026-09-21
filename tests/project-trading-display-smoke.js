const fs=require('fs');
const assert=require('assert');

const source=fs.readFileSync('pristeel-projects-modern-v1.js','utf8');

assert(source.includes("function typeLabel(r)"),'Contextual business-type display helper is missing');
assert(source.includes("/trading|trade|furniz/.test(x))return'Furnizim'"),'Trading projects must display as Furnizim');
assert(source.includes("/fabric|prodh|manufact/.test(x))return'Fabrikim'"),'Fabrication projects must display as Fabrikim');
assert(source.includes("type=typeLabel(r)"),'Project rows must derive their business-type label from canonical project data');
assert(source.includes("class=\\\"ppd-type\\\""),'Project rows must render the contextual business-type label');
assert(source.includes("supplier_selection:'Mblidh / krahaso ofertat'"),'Supplier-selection action must remain a sourcing/comparison action');
assert(!/pipeline_stage\s*=\s*['\"]supplier_selection/.test(source),'Presentation must not mutate pipeline_stage');
assert(!source.includes('Board')&&!source.includes('Mindmap'),'Trading/fabrication display must use the single Operator Desk surface');

console.log('Trading/fabrication Operator Desk display smoke test passed.');
