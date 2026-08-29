import fs from 'node:fs';

const flow = fs.readFileSync('pristeel-operator-flow-v1.js','utf8');
const nav = fs.readFileSync('pristeel-primary-nav-resilience-v1.js','utf8');

function need(text, label){
  if(!flow.includes(text)) throw new Error(`Operator Flow missing: ${label}`);
}

need("tenders:'Mundësitë'", 'Albanian Opportunities label');
need("projects:'Projektet'", 'Albanian Projects label');
need('pst-rational-open', 'project-open progress overlay');
need('Po lexoj gjendjen dhe evidencën reale.', 'loading progress copy');
need('data-pro-back', 'explicit project back control');
need('data-pro-project-back', 'explicit legacy/sub-step back control');
need('GJENDJA TANI', 'current-state block');
need('HAPI I RADHËS', 'single next-step block');
need('ÇFARË KEMI', 'project inventory block');
need('Historia e ofertimit', 'read-only pre-award history');
need("op==='wait_for_client'", 'business-state priority for waiting client');
need('projekti nuk kthehet në RFQ.', 'no RFQ regression after client offer');
need("project_emails?project_id=eq.", 'project-scoped email evidence read');
need('PST[-\\s]?OFF', 'outgoing PRISTEEL offer evidence recovery');
need('supplierOffers', 'supplier offer evidence surface');
need('pst-rational-chat', 'project AI drawer');
need('pst-rational-home', 'compact Home command treatment');
need('MutationObserver', 'final DOM ownership after late runtime rebuilds');

if(flow.includes('setInterval(')) throw new Error('Operator Flow must not poll with setInterval.');
if(flow.includes("'PATCH'") || flow.includes("'POST'")) throw new Error('Operator Flow must remain read/presentation/navigation-only.');
if(!nav.includes('pristeel-operator-flow-v1.js?v=20260829-flow2')) throw new Error('Primary navigation does not load the current Operator Flow cache version.');
if(!nav.includes("document.addEventListener('pst:modules-ready'")) throw new Error('Operator Flow must be loaded after modules-ready.');

console.log('operator-flow smoke: ok');