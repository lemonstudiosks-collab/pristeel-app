import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const workflowSrc=fs.readFileSync('pristeel-project-centric-workflow-v1.js','utf8');
const deskSrc=fs.readFileSync('pristeel-opportunities-filter-polish-v1.js','utf8');
const waitingSrc=fs.readFileSync('pristeel-opportunities-waiting-bridge-v1.js','utf8');
const productionSurfaceSrc=fs.readFileSync('pristeel-production-surface-owner-v1.js','utf8');

const dom=new JSDOM(`<!doctype html><html><head></head><body class="pst-ui-v2">
<div class="app-shell"><aside class="sidebar"><div id="pst-v2-sidebar"></div></aside><main class="main"><div class="topbar">legacy topbar</div><div class="content">
<section id="page-workspace-home" class="page" style="display:none">HOME</section>
<section id="page-kek-tenders" class="page active" style="display:block"><div class="pst-kek-layout"><div class="pst-kek-head"><h1 class="pst-kek-title">Legacy</h1></div></div></section>
</div></main></div>
</body></html>`,{url:'https://example.test',runScripts:'outside-only',pretendToBeVisual:true});

const {window}=dom;
window.console=console;
const rows=[];
for(let i=1;i<=45;i++)rows.push({id:'krpp-'+i,title:'Konstruksion metalik '+i,authority:'KRPP',relevance_score:90-i%5,status:'new',published_date:'2026-09-20',payload:{source:'KRPP',notice_phase:'opportunity'}});
rows.push(
 {id:'ted-gc',title:'Structural steel building award',authority:'EU Authority',publication_no:'TED-GC',relevance_score:99,status:'new',published_date:'2026-09-21',payload:{source:'TED',notice_phase:'award',winner:{name:'Example GC GmbH',company_type:'gc_epc'}}},
 {id:'ted-producer',title:'Bridge fabrication award',authority:'EU Authority',publication_no:'TED-P',relevance_score:98,status:'new',published_date:'2026-09-21',payload:{source:'TED',notice_phase:'award',winner:{name:'Example Steel AG',company_type:'producer'}}},
 {id:'ted-other',title:'Energy substation award',authority:'EU Authority',publication_no:'TED-O',relevance_score:97,status:'new',published_date:'2026-09-21',payload:{source:'TED',notice_phase:'award',winner:{name:'Example Consortium',company_type:'unknown'}}},
 {id:'undp-1',title:'UNDP steel supply',authority:'UNDP Kosovo',relevance_score:80,status:'new',published_date:'2026-09-21',payload:{source:'UNDP_KOSOVO',notice_phase:'opportunity'}}
);
window.supaFetch=async path=>{
 if(String(path).startsWith('kek_tender_watch?'))return rows;
 if(String(path).startsWith('pppp_opportunity_outreach_registry_v1?'))return [];
 if(String(path).startsWith('partners?'))return [];
 return [];
};
window.PSTTenderPriorityActionsV1={reason:()=>'',go:async()=>true,review:async()=>true,noGo:async()=>true,prepareDraft:async()=>true,openSource:()=>true};
let homeCalls=0;
window.PSTPrimaryNavResilienceV10={openHome:()=>{homeCalls++;return true;}};

window.eval(workflowSrc);
const api=window.PSTProjectCentricWorkflowV1;
assert(api&&api.version==='8','combined-filter workflow v8 must load');
await api.loadOpportunities(true);
window.eval(waitingSrc);
await new Promise(r=>setTimeout(r,15));
window.eval(deskSrc);
await new Promise(r=>setTimeout(r,50));

const desk=window.PSTOpportunitiesDeskV1;
assert(desk&&desk.version==='20260921-opportunity-desk1','Opportunity Desk must own the visible presentation');
assert.equal(window.document.querySelectorAll('#pst-opp-desk').length,1,'Desk must render once');
assert(window.document.querySelector('[data-pst-opp-mode="all"]'),'all route must exist');
assert(window.document.querySelector('[data-pst-opp-mode="local"]'),'direct tender route must exist');
assert(window.document.querySelector('[data-pst-opp-mode="award"]'),'TED award sales route must exist');
assert(window.document.querySelector('[data-pst-opp-source="KRPP"]'),'active KRPP source must be visible');
assert(window.document.querySelector('[data-pst-opp-source="TED"]'),'active TED source must be visible');
assert.equal(window.document.querySelector('[data-pst-opp-source="APP_AL"]'),null,'zero-count sources must not clutter the Desk');
assert.equal(window.document.querySelector('[data-pst-opp-source="UNDP_KOSOVO"]'),null,'UNDP Kosovo must not occupy a source chip in the Desk');

assert.equal(api._test.opportunityRows().length,49,'all canonical matching rows must remain available; no hard 80-row cap may exist');
assert.equal(window.document.querySelectorAll('#pst-opportunities-list [data-pcw-tender]').length,40,'initial render must stay bounded for readability');
const more=window.document.querySelector('[data-pcw-opportunity-more]');
assert(more,'load-more control must appear instead of silently dropping results');
more.click();
await new Promise(r=>setTimeout(r,30));
assert.equal(window.document.querySelectorAll('#pst-opportunities-list [data-pcw-tender]').length,49,'load more must reveal the remaining matches');

window.document.querySelector('[data-pst-opp-mode="award"]').click();
await new Promise(r=>setTimeout(r,30));
assert.equal(api._state.mode,'award');
assert.equal(api._state.source,'TED');
assert.equal(api._test.opportunityRows().length,3,'TED route must isolate award-sales opportunities');

window.document.querySelector('[data-pst-opp-winner="gc_epc"]').click();
await new Promise(r=>setTimeout(r,30));
assert.equal(api._state.winner_group,'gc_epc');
assert.equal(api._state.mode,'award','winner filter must preserve TED route');
assert.equal(api._state.source,'TED','winner filter must stay inside TED');
assert.deepEqual(Array.from(api._test.opportunityRows(),x=>x.id),['ted-gc']);

window.document.querySelector('[data-pst-opp-field="construction"]').click();
await new Promise(r=>setTimeout(r,30));
assert.equal(api._state.field,'construction');
assert.equal(api._state.winner_group,'gc_epc','field filter must combine with winner filter instead of clearing it');
assert.equal(api._state.source,'TED','field filter must combine with source instead of clearing it');
assert.deepEqual(Array.from(api._test.opportunityRows(),x=>x.id),['ted-gc']);

window.document.querySelector('[data-pst-opp-lifecycle="new"]').click();
await new Promise(r=>setTimeout(r,30));
assert.equal(api._state.lifecycle,'new');
assert.equal(api._state.field,'construction','status must combine with field');
assert.equal(api._state.winner_group,'gc_epc','status must combine with winner role');

window.document.querySelector('[data-pst-opp-reset]').click();
await new Promise(r=>setTimeout(r,30));
assert.equal(api._state.mode,'all');
assert.equal(api._state.source,'all');
assert.equal(api._state.lifecycle,'all');
assert.equal(api._state.field,'all');
assert.equal(api._state.winner_group,'all');

window.document.querySelector('[data-pst-opp-density="compact"]').click();
assert.equal(desk.state().density,'compact','compact density must be available');
assert(window.document.getElementById('pst-opportunities-focus').classList.contains('pst-opp-density-compact'));

const back=window.document.querySelector('[data-pst-opp-back]');
assert(back,'Desk must keep a local Kthehu control');
window.eval(productionSurfaceSrc);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
await new Promise(r=>setTimeout(r,25));
assert.notEqual(window.getComputedStyle(back).display,'none','late Production Surface Owner must not hide Kthehu');
back.click();
assert.equal(homeCalls,1,'Kthehu must route to Home exactly once');

await new Promise(r=>setTimeout(r,100));
assert.equal(window.document.querySelectorAll('#pst-opp-desk').length,1,'observer must settle without duplicating the Desk');
console.log('Opportunities Desk interaction smoke: OK');
