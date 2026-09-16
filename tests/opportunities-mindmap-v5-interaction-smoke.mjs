import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const workflowSrc=fs.readFileSync('pristeel-project-centric-workflow-v1.js','utf8');
const mindmapSrc=fs.readFileSync('pristeel-opportunities-filter-polish-v1.js','utf8');

const dom=new JSDOM(`<!doctype html><html><head></head><body class="pst-ui-v2">
<div class="app-shell"><aside class="sidebar"><div id="pst-v2-sidebar"></div></aside><main class="main"><div class="topbar">legacy topbar</div><div class="content">
<section id="page-kek-tenders" class="page active" style="display:block">
  <div class="pst-kek-layout">
    <div class="pst-kek-head"><h1 class="pst-kek-title">Legacy</h1></div>
  </div>
</section>
</div></main></div>
</body></html>`,{url:'https://example.test',runScripts:'outside-only',pretendToBeVisual:true});

const {window}=dom;
window.console=console;
window.supaFetch=async path=>{
  if(String(path).startsWith('kek_tender_watch?')) return [
    {id:'app-1',title:'Materiale ndërtimi dhe furnizim me hekur',authority:'APP Albania',relevance_score:82,status:'new',published_date:'2026-09-16',payload:{source:'APP_AL',notice_phase:'opportunity'}},
    {id:'krpp-1',title:'Konstruksion metalik për objekt publik',authority:'KRPP',relevance_score:91,status:'new',published_date:'2026-09-15',payload:{source:'KRPP',notice_phase:'opportunity'}},
    {id:'ted-1',title:'Structural steelworks award',authority:'EU Authority',publication_no:'TED-1',relevance_score:94,status:'new',published_date:'2026-09-14',payload:{source:'TED',notice_phase:'award',winner:{name:'Example GC GmbH',company_type:'gc_epc'}}},
    {id:'wb-1',title:'World Bank road infrastructure works',authority:'World Bank',relevance_score:88,status:'new',published_date:'2026-09-13',payload:{source:'WORLD_BANK',notice_phase:'opportunity'}}
  ];
  if(String(path).startsWith('partners?')) return [];
  return [];
};
window.PSTTenderPriorityActionsV1={reason:()=>'',go:async()=>true,review:async()=>true,noGo:async()=>true,prepareDraft:async()=>true,openSource:()=>true};
window.pstTenderIntelligence=async()=>null;
let homeCalls=0;
window.PSTPrimaryNavResilienceV10={openHome:()=>{homeCalls++;return true;}};

window.eval(workflowSrc);
const api=window.PSTProjectCentricWorkflowV1;
assert(api,'project-centric workflow must load');
await api.loadOpportunities(true);
window.eval(mindmapSrc);
await new Promise(r=>setTimeout(r,40));

const mindmap=window.PSTOpportunitiesMindmapV5;
assert(mindmap&&mindmap.version==='20260916-mindmap5','mindmap v5 must own the visible Opportunities presentation');
assert.equal(window.document.querySelectorAll('#pst-opp-v4-map').length,1,'mindmap must render exactly once');
assert(window.document.querySelector('[data-pst-opp-source="APP_AL"]'),'APP branch must exist');
assert(window.document.querySelector('[data-pst-opp-source="TED"]'),'TED branch must exist');
assert(window.document.querySelector('[data-pst-opp-source="KRPP"]'),'KRPP branch must exist');

window.document.querySelector('[data-pst-opp-source="APP_AL"]').click();
await new Promise(r=>setTimeout(r,35));
assert.equal(api._state.source,'APP_AL','APP click must update canonical source state');
assert.equal(window.document.querySelectorAll('#pst-opportunities-list [data-pcw-tender]').length,1,'APP click must leave one APP result in this fixture');
assert(window.document.querySelector('[data-pcw-tender="app-1"]'),'APP result must remain interactive after rerender');
assert.equal(window.document.querySelectorAll('#pst-opp-v4-map').length,1,'APP rerender must not duplicate the mindmap');

window.document.querySelector('[data-pst-opp-source="TED"]').click();
await new Promise(r=>setTimeout(r,35));
assert.equal(api._state.source,'TED','TED click must update canonical source state');
assert(window.document.querySelector('[data-pcw-tender="ted-1"]'),'TED click must recover immediately after APP rerender');

window.document.querySelector('[data-pst-opp-source="KRPP"]').click();
await new Promise(r=>setTimeout(r,35));
assert.equal(api._state.source,'KRPP','KRPP click must remain functional after repeated rerenders');
assert(window.document.querySelector('[data-pcw-tender="krpp-1"]'),'KRPP result must render');

window.document.querySelector('[data-pst-opp-source="all"]').click();
await new Promise(r=>setTimeout(r,35));
assert.equal(api._state.source,'all','all-sources control must reset the canonical source state');
assert.equal(window.document.querySelectorAll('#pst-opportunities-list [data-pcw-tender]').length,4,'all sources must restore every fixture');

window.document.querySelector('[data-pst-opp-lifecycle="all"]').click();
await new Promise(r=>setTimeout(r,35));
assert.equal(api._state.lifecycle,'all','lifecycle branch must update canonical lifecycle state');
window.document.querySelector('[data-pst-opp-lifecycle="new"]').click();
await new Promise(r=>setTimeout(r,35));
assert.equal(api._state.lifecycle,'new','new lifecycle branch must remain functional after rerenders');

window.document.querySelector('[data-pst-opp-field="construction"]').click();
await new Promise(r=>setTimeout(r,20));
assert.equal(mindmap.state().field,'construction','field branch must update presentation state');
assert(window.document.querySelector('[data-pst-opp-field="construction"]').classList.contains('on'),'field branch must visibly stay selected');

window.document.querySelector('[data-pst-opp-view="list"]').click();
assert.equal(mindmap.state().view,'list','Listë control must switch presentation mode');
window.document.querySelector('[data-pst-opp-view="mindmap"]').click();
assert.equal(mindmap.state().view,'mindmap','Mindmap control must switch back without losing listeners');

window.document.querySelector('[data-pst-opp-back]').click();
assert.equal(homeCalls,1,'Kthehu must call the final Home navigation owner exactly once');

await new Promise(r=>setTimeout(r,120));
assert.equal(window.document.querySelectorAll('#pst-opp-v4-map').length,1,'observer must settle instead of entering a self-triggering render loop');
assert.equal(window.document.querySelectorAll('#pst-opportunities-filter-polish-v1-css').length,1,'mindmap must keep a single style owner');
console.log('Opportunities mindmap v5 interaction/freeze regression: OK');
