import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const workflowSrc=fs.readFileSync('pristeel-project-centric-workflow-v1.js','utf8');
const mindmapSrc=fs.readFileSync('pristeel-opportunities-filter-polish-v1.js','utf8');
const waitingSrc=fs.readFileSync('pristeel-opportunities-waiting-bridge-v1.js','utf8');

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
async function waitForSelector(selector,timeout=400){
  const until=Date.now()+timeout;
  while(Date.now()<until){
    const el=window.document.querySelector(selector);
    if(el)return el;
    await new Promise(r=>setTimeout(r,10));
  }
  return null;
}
window.supaFetch=async path=>{
  if(String(path).startsWith('kek_tender_watch?')) return [
    {id:'app-1',title:'Materiale ndërtimi dhe furnizim me hekur',authority:'APP Albania',relevance_score:82,status:'new',published_date:'2026-09-16',payload:{source:'APP_AL',notice_phase:'opportunity'}},
    {id:'krpp-1',title:'Konstruksion metalik për objekt publik',authority:'KRPP',relevance_score:91,status:'new',published_date:'2026-09-15',payload:{source:'KRPP',notice_phase:'opportunity'}},
    {id:'ted-1',title:'Structural steelworks award',authority:'EU Authority',publication_no:'TED-1',relevance_score:94,status:'new',published_date:'2026-09-14',payload:{source:'TED',notice_phase:'award',winner:{name:'Example GC GmbH',company_type:'gc_epc'}}},
    {id:'ted-other',title:'Bridge rehabilitation award',authority:'EU Authority',publication_no:'TED-2',relevance_score:93,status:'new',published_date:'2026-09-14',payload:{source:'TED',notice_phase:'award',winner:{name:'Example Consortium',company_type:'unknown'}}},
    {id:'ted-producer',title:'Steel structure fabrication award',authority:'EU Authority',publication_no:'TED-3',relevance_score:99,status:'new',published_date:'2026-09-14',payload:{source:'TED',notice_phase:'award',winner:{name:'Example Steelworks AG',company_type:'producer'}}},
    {id:'mca-1',title:'MCA procurement package',authority:'MCA Kosovo',relevance_score:87,status:'new',published_date:'2026-09-13',payload:{source:'MCA_KOSOVO',notice_phase:'opportunity'}},
    {id:'kcf-1',title:'KCF procurement package',authority:'KCF',relevance_score:86,status:'new',published_date:'2026-09-13',payload:{source:'KCF',notice_phase:'opportunity'}},
    {id:'rcf-1',title:'RCF procurement package',authority:'RCF',relevance_score:85,status:'new',published_date:'2026-09-13',payload:{source:'RCF',notice_phase:'opportunity'}},
    {id:'ebrd-1',title:'EBRD procurement package',authority:'EBRD',relevance_score:84,status:'new',published_date:'2026-09-13',payload:{source:'EBRD_ECEPP',notice_phase:'opportunity'}},
    {id:'wb-1',title:'World Bank road infrastructure works',authority:'World Bank',relevance_score:88,status:'new',published_date:'2026-09-13',payload:{source:'WORLD_BANK',notice_phase:'opportunity'}},
    {id:'ungm-1',title:'UNGM procurement package',authority:'UNGM',relevance_score:83,status:'new',published_date:'2026-09-13',payload:{source:'UNGM',notice_phase:'opportunity'}},
    {id:'undp-1',title:'UNDP Kosovo procurement package',authority:'UNDP Kosovo',relevance_score:82,status:'new',published_date:'2026-09-13',payload:{source:'UNDP_KOSOVO',notice_phase:'opportunity'}},
    {id:'euoffice-1',title:'EU Office Kosovo procurement package',authority:'EU Office Kosovo',relevance_score:81,status:'new',published_date:'2026-09-13',payload:{source:'EU_OFFICE_KOSOVO',notice_phase:'opportunity'}}
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
window.eval(waitingSrc);
await new Promise(r=>setTimeout(r,15));
window.eval(mindmapSrc);
await new Promise(r=>setTimeout(r,40));

const mindmap=window.PSTOpportunitiesMindmapV5;
assert(mindmap&&mindmap.version==='20260919-tedroles-canonicalfilters2','mindmap v5 must own the visible Opportunities presentation');
assert.equal(window.document.querySelectorAll('#pst-opp-v4-map').length,1,'mindmap must render exactly once');
assert(window.document.querySelector('[data-pst-opp-source="APP_AL"]'),'APP branch must exist');
assert(window.document.querySelector('[data-pst-opp-source="TED"]'),'TED branch must exist');
assert(window.document.querySelector('[data-pst-opp-source="KRPP"]'),'KRPP branch must exist');
assert.equal(window.document.querySelector('.pst-opp-v4-status-side .pst-opp-v4-side-title')?.textContent,'Sipas statusit','left side must be owned by lifecycle/status filters');
assert.equal(window.document.querySelectorAll('.pst-opp-v4-status-side [data-pst-opp-source]').length,0,'left side must not contain source filters');
assert.equal(window.document.querySelector('.pst-opp-v4-source-core .pst-opp-v4-core-title')?.textContent,'Sipas burimit','center must be the source mindmap');
assert(window.document.querySelector('.pst-opp-v4-source-map'),'center source area must render as a connected mindmap canvas');
assert(window.document.querySelector('.pst-opp-v4-source-lines line'),'source mindmap must include connector lines from the central hub');
assert.equal(window.document.querySelectorAll('.pst-opp-v4-source-grid').length,0,'source filters must not fall back to a rectangular card grid');
assert.equal(window.document.querySelectorAll('.pst-opp-v4-source-node').length,11,'all source branches must render as floating mindmap nodes');
const sourceOrder=[...window.document.querySelectorAll('.pst-opp-v4-source-node')].map(n=>n.getAttribute('data-pst-opp-source'));
assert.deepEqual(sourceOrder,['TED','KRPP','APP_AL','MCA_KOSOVO','KCF','RCF','EBRD_ECEPP','WORLD_BANK','UNGM','UNDP_KOSOVO','EU_OFFICE_KOSOVO'],'source nodes must follow the canonical source order around the ring');
for(const [key,[x,y]] of Object.entries(mindmap._test.sourcePositions)){
  const radius=Math.hypot((x-50)/44,(y-50)/45);
  assert(radius>0.95&&radius<1.1,key+' must stay on the same outer mindmap ring instead of drifting inward');
}

assert(window.document.querySelector('.pst-opp-v4-source-core [data-pst-opp-source="TED"]'),'TED must render inside the center source mindmap');
assert(window.document.querySelector('.pst-opp-v4-source-core [data-pst-opp-source="KRPP"]'),'KRPP must render inside the center source mindmap');
assert(window.document.querySelector('.pst-opp-v4-source-core [data-pst-opp-source="APP_AL"]'),'APP must render inside the center source mindmap');
const rightTitles=[...window.document.querySelectorAll('.pst-opp-v4-field-side .pst-opp-v4-side-title')].map(x=>x.textContent);
assert.deepEqual(rightTitles,['Sipas fituesit TED','Sipas fushës'],'right side must separate TED winner role from opportunity field');
assert(window.document.querySelector('[data-pst-opp-winner="gc_epc"]'),'GC/EPC winner filter must exist');
assert(window.document.querySelector('[data-pst-opp-winner="other"]'),'other/review winner filter must exist');
assert(window.document.querySelector('[data-pst-opp-winner="producer"]'),'steel-producer winner filter must exist');

api._state.lifecycle='waiting';
api._state.query='steel';
window.document.querySelector('[data-pst-opp-field="infrastructure"]').click();
await new Promise(r=>setTimeout(r,35));
assert.equal(api._state.field,'infrastructure','field click must update canonical opportunity state');
assert.equal(api._state.source,'all','field click must clear source filtering');
assert.equal(api._state.lifecycle,'all','field click must clear lifecycle filtering');
assert.equal(api._test.opportunityRows().length,1,'canonical opportunityRows must really apply the field filter');
assert(window.document.querySelector('[data-pcw-tender="wb-1"]'),'infrastructure field must show the matching World Bank opportunity');
assert.equal(window.document.querySelectorAll('#pst-opportunities-list [data-pcw-tender]').length,1,'field filter must rerender the dataset instead of only highlighting a branch');
const mindmapViewAfterField=await waitForSelector('[data-pst-opp-view="mindmap"]');
assert(mindmapViewAfterField,'mindmap view control must return after field rerender');
mindmapViewAfterField.click();
const appNodeBefore=window.document.querySelector('[data-pst-opp-source="APP_AL"]');
const appStyleBefore=appNodeBefore.getAttribute('style');
window.document.querySelector('[data-pst-opp-source="APP_AL"]').click();
await new Promise(r=>setTimeout(r,35));
assert.equal(api._state.source,'APP_AL','APP click must update canonical source state');
assert.equal(api._state.lifecycle,'all','source click must clear lifecycle filtering so its displayed source count can be shown');
assert.equal(api._state.query,'','source click must clear a stale search query instead of silently compounding filters');
assert.equal(mindmap.state().field,'all','source click must clear a stale field filter instead of hiding valid source results');
assert.equal(api._state.field,'all','canonical field state must reset on source drilldown');
assert.equal(api._state.winner_group,'all','source drilldown must clear TED winner-role filtering');
assert.equal(mindmap.state().view,'mindmap','source click must keep the mindmap in place');
assert.equal(window.document.querySelectorAll('#pst-opportunities-list [data-pcw-tender]').length,1,'APP click must leave one APP result in this fixture');
assert.match(window.document.querySelector('.pst-opp-v4-results-head')?.textContent||'',/1 rezultate të shfaqura.*APP/,'APP click must expose the active source and visible result count');
const appNodeAfter=window.document.querySelector('[data-pst-opp-source="APP_AL"]');
assert.equal(appNodeAfter,appNodeBefore,'source activation must preserve the same DOM node instead of rebuilding the mindmap');
assert.equal(appNodeAfter.getAttribute('style'),appStyleBefore,'source activation must not change the node position');
assert(appNodeAfter.classList.contains('on'),'source activation must be visible without moving the node');
assert(window.document.querySelector('[data-pcw-tender="app-1"]'),'APP result must remain interactive after rerender');
assert.equal(window.document.querySelectorAll('#pst-opp-v4-map').length,1,'APP rerender must not duplicate the mindmap');

window.document.querySelector('[data-pst-opp-source="TED"]').click();
await new Promise(r=>setTimeout(r,35));
assert.equal(api._state.source,'TED','TED click must update canonical source state');
assert.equal(api._state.lifecycle,'all','repeated source drilldown must keep lifecycle reset');
assert.equal(window.document.querySelectorAll('#pst-opportunities-list [data-pcw-tender]').length,3,'TED source must show all three winner-role groups in this fixture');
const tedOrder=[...window.document.querySelectorAll('#pst-opportunities-list [data-pcw-tender]')].map(x=>x.getAttribute('data-pcw-tender'));
assert.deepEqual(tedOrder,['ted-1','ted-other','ted-producer'],'TED must order GC first, other/review second and steel producers last');

window.document.querySelector('[data-pst-opp-winner="gc_epc"]').click();
await new Promise(r=>setTimeout(r,35));
assert.equal(api._state.source,'TED');
assert.equal(api._state.winner_group,'gc_epc','GC winner filter must update canonical state');
assert.deepEqual(Array.from(api._test.opportunityRows(),x=>x.id),['ted-1'],'GC winner filter must return only GC/EPC winners');
assert(window.document.querySelector('[data-pcw-tender="ted-1"]'));

window.document.querySelector('[data-pst-opp-winner="other"]').click();
await new Promise(r=>setTimeout(r,35));
assert.equal(api._state.winner_group,'other','other/review winner filter must update canonical state');
assert.deepEqual(Array.from(api._test.opportunityRows(),x=>x.id),['ted-other'],'other/review must exclude known producers and GC winners');

window.document.querySelector('[data-pst-opp-winner="producer"]').click();
await new Promise(r=>setTimeout(r,35));
assert.equal(api._state.winner_group,'producer','producer filter must update canonical state');
assert.deepEqual(Array.from(api._test.opportunityRows(),x=>x.id),['ted-producer'],'producer filter must isolate steel producers/competitors');
assert(window.document.querySelector('[data-pcw-tender="ted-producer"]'));

window.document.querySelector('[data-pst-opp-source="TED"]').click();
await new Promise(r=>setTimeout(r,35));
assert.equal(api._state.winner_group,'all','returning to TED source must clear winner subfilter');
assert(window.document.querySelector('[data-pcw-tender="ted-1"]'),'TED click must recover immediately after winner-role rerenders');

const sourceExpectations=[
  ['TED',3],
  ['KRPP',1],
  ['APP_AL',1],
  ['MCA_KOSOVO',1],
  ['KCF',1],
  ['RCF',1],
  ['EBRD_ECEPP',1],
  ['WORLD_BANK',1],
  ['UNGM',1],
  ['UNDP_KOSOVO',1],
  ['EU_OFFICE_KOSOVO',1]
];
for(const [source,expectedCount] of sourceExpectations){
  const node=window.document.querySelector('[data-pst-opp-source="'+source+'"]');
  assert(node,source+' source node must exist before click');
  node.click();
  await new Promise(r=>setTimeout(r,35));
  assert.equal(api._state.source,source,source+' click must update canonical source state');
  assert.equal(api._state.lifecycle,'all',source+' click must clear lifecycle filtering');
  assert.equal(api._state.field,'all',source+' click must clear field filtering');
  assert.equal(api._state.winner_group,'all',source+' click must clear TED winner-role filtering');
  const canonicalRows=Array.from(api._test.opportunityRows());
  assert.equal(canonicalRows.length,expectedCount,source+' canonical filter must return the expected source rows');
  assert(canonicalRows.every(r=>api._test.tenderSource(r)===source),source+' canonical rows must belong only to the selected source');
  assert.equal(window.document.querySelectorAll('#pst-opportunities-list [data-pcw-tender]').length,expectedCount,source+' click must rerender the visible dataset');
  const selected=window.document.querySelector('[data-pst-opp-source="'+source+'"]');
  assert(selected&&selected.classList.contains('on'),source+' node must visibly stay selected after rerender');
}
window.document.querySelector('[data-pst-opp-source="all"]').click();
await new Promise(r=>setTimeout(r,35));
assert.equal(api._state.source,'all','all-sources control must reset the canonical source state');
assert.equal(window.document.querySelectorAll('#pst-opportunities-list [data-pcw-tender]').length,13,'all sources must restore every fixture');

window.document.querySelector('[data-pst-opp-lifecycle="all"]').click();
await new Promise(r=>setTimeout(r,35));
assert.equal(api._state.lifecycle,'all','lifecycle branch must update canonical lifecycle state');
window.document.querySelector('[data-pst-opp-lifecycle="new"]').click();
await new Promise(r=>setTimeout(r,35));
assert.equal(api._state.lifecycle,'new','new lifecycle branch must remain functional after rerenders');

window.document.querySelector('[data-pst-opp-field="construction"]').click();
await new Promise(r=>setTimeout(r,35));
assert.equal(mindmap.state().field,'construction','field branch must update presentation state');
assert.equal(api._state.field,'construction','field branch must update canonical state');
assert(api._test.opportunityRows().every(r=>api._test.opportunityField(r)==='construction'),'canonical result set must satisfy the selected field');
assert(window.document.querySelector('[data-pst-opp-field="construction"]').classList.contains('on'),'field branch must visibly stay selected');
for(let cycle=0;cycle<3;cycle++){
  window.document.querySelector('[data-pst-opp-source="APP_AL"]').click();
  await new Promise(r=>setTimeout(r,35));
  window.document.querySelector('[data-pst-opp-source="TED"]').click();
  await new Promise(r=>setTimeout(r,35));
  window.document.querySelector('[data-pst-opp-field="construction"]').click();
  await new Promise(r=>setTimeout(r,20));
  window.document.querySelector('[data-pst-opp-field="all"]').click();
  await new Promise(r=>setTimeout(r,20));
  assert.equal(mindmap.state().field,'all','All fields must reset after repeated source rerenders');
  assert.equal(window.document.querySelectorAll('#pst-opp-v4-map').length,1,'Repeated cycles must retain one mindmap');
}

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
