import fs from 'node:fs';

const flow = fs.readFileSync('pristeel-unified-project-flow-v1.js','utf8');
const nav = fs.readFileSync('pristeel-primary-nav-resilience-v1.js','utf8');

function ok(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exit(1); } }

ok(flow.includes('One project surface: current state -> logical next step -> evidence popups.'),'unified flow ownership comment missing');
ok(flow.includes("project_attachment_links?project_id=eq."),'attachment evidence must be loaded inside project flow');
ok(flow.includes("documents_registry?project_id=eq."),'canonical client offers must be loaded inside project flow');
ok(flow.includes("project_emails?project_id=eq."),'project communication evidence must be loaded inside project flow');
ok(flow.includes("rfq_log?project_id=eq."),'RFQ evidence must be loaded inside project flow');
ok(flow.includes("e.sentOffers=unique"),'sent offer revisions must be projected as first-class evidence');
ok(flow.includes("data-pwf-area','unified"),'unified flow must prevent legacy overview from reclaiming the body');
ok(flow.includes('data-upf-open="suppliers"') || flow.includes("data-upf-open=\"suppliers\""),'supplier evidence must open in popup');
ok(flow.includes('data-upf-revision'),'revision must be reachable from the client-offer popup');
ok(flow.includes('stable.__pstRational=true') && flow.includes('stable.__pf2=true'),'stable opener must stop recursive wrapper re-entry');
ok(flow.includes('maximum call stack') && flow.includes('directOpen'),'project open must recover from call-stack recursion');
ok(!flow.includes("alert('Revisioni nuk u hap"),'unified flow must not use the old dead-end revision alert');

ok(nav.includes('opportunities:1'),'Mundësitë alias must be recognized');
ok(nav.includes("key==='tenders'||key==='opportunities'"),'Mundësitë must route through the same canonical handler');
ok(nav.includes('ensureUnifiedProjectFlow'),'primary navigation must load the unified flow owner');
ok(nav.includes("pristeel-unified-project-flow-v1.js?v=20260829-flow1"),'unified flow cache key missing');

console.log('Unified project flow smoke: OK');
