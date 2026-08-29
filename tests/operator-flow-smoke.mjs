import fs from 'node:fs';

const flow = fs.readFileSync('pristeel-operator-flow-v1.js','utf8');
const nav = fs.readFileSync('pristeel-primary-nav-resilience-v1.js','utf8');

function need(text, label){
  if(!flow.includes(text)) throw new Error(`Operator Flow missing: ${label}`);
}

need("tenders:'Mundësitë'", 'Albanian Opportunities label');
need("projects:'Projektet'", 'Albanian Projects label');
need('pst-project-open-overlay', 'project-open progress overlay');
need('Po lexoj gjendjen dhe dokumentet e projektit.', 'loading progress copy');
need('data-pst-of-back', 'explicit back control');
need('GJENDJA TANI', 'current-state block');
need('HAPI I RADHËS', 'single next-step block');
need('ÇFARË KEMI', 'project inventory block');
need('Historia e ofertimit', 'read-only pre-award history');
need("if(won){html+=b('execution','Ekzekutimi')+b('finance','Financat')+b('files','Skedarët')+b('communication','Komunikimi');}", 'post-award navigation without procurement/commercial actions');
need("if(postAward(p)&&(area==='procurement'||stage)){area='execution';stage=undefined;}", 'post-award route lock');
need('pst-operator-ai-drawer', 'project AI drawer');
need('pst-of-home', 'compact Home command treatment');

if(flow.includes('MutationObserver')) throw new Error('Operator Flow must not use a persistent MutationObserver.');
if(flow.includes('setInterval(')) throw new Error('Operator Flow must not poll with setInterval.');
if(flow.includes("supaFetch(") || flow.includes("'PATCH'") || flow.includes("'POST'")) throw new Error('Operator Flow must remain presentation/navigation-only.');
if(!nav.includes("pristeel-operator-flow-v1.js?v=20260829-flow1")) throw new Error('Primary navigation does not load Operator Flow.');
if(!nav.includes("document.addEventListener('pst:modules-ready'")) throw new Error('Operator Flow must be loaded after modules-ready.');

console.log('operator-flow smoke: ok');
