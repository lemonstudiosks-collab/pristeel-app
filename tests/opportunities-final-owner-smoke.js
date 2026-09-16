const fs=require('fs');
const assert=require('assert');

const polish=fs.readFileSync('pristeel-opportunities-filter-polish-v1.js','utf8');

assert(polish.includes('#page-kek-tenders #pst-pcw-lifecycle-tabs{position:relative;display:grid!important;'),'Lifecycle surface must remain a mindmap grid');
assert(polish.includes('grid-template-areas:"new center waiting" "replied center all"!important;'),'Visible lifecycle branches must occupy deterministic mindmap areas');
assert(polish.includes("button[data-pcw-lifecycle='draft']{display:none!important}"),'Draft-ready opportunities stay folded into Waiting by the existing lifecycle rule');
assert(polish.includes('#page-kek-tenders #pst-pcw-opportunity-tabs{position:relative;display:flex!important;'),'Source filters may remain a compact flex row');
assert(!polish.includes('#page-kek-tenders #pst-pcw-lifecycle-tabs,\n#page-kek-tenders #pst-pcw-opportunity-tabs{position:relative;display:flex!important;'),'Source-filter polish must never collapse the lifecycle mindmap into a pill row');
assert(polish.includes('PSTPrimaryNavResilienceV10'),'Projects Kthehu must target the current final navigation owner');
assert(/window\.addEventListener\('click',[\s\S]*data-pmm-back[\s\S]*stopImmediatePropagation/.test(polish),'Projects Kthehu must intercept before older document-level handlers');

console.log('Opportunities final owner + Projects Kthehu smoke passed.');
