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
window.scrollTo=()=>{};
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
const focus=window.document.getElementById('pst-opportunities-focus');
assert(desk&&desk.version==='20260924-compactdesk1','Opportunity Desk must own the visible presentation');
assert.equal(window.document.querySelectorAll('#pst-opp-desk').length,1,'Desk must render once');
const initialDesk=window.document.querySelector('#pst-opp-desk');
desk.apply();
assert.equal(window.document.querySelector('#pst-opp-desk'),initialDesk,'unchanged dashboard data must not replace the visible Desk DOM');
assert(deskSrc.includes("window.scrollTo({top:0,left:0,behavior:'auto'})"),'Opportunity drilldown must reset the viewport to a stable top position');
assert(focus.classList.contains('pst-opp-dashboard'),'initial Opportunities view must be dashboard-only');
assert(!focus.classList.contains('pst-opp-result-page'),'initial view must not be a result page');
assert.equal(window.getComputedStyle(window.document.getElementById('pst-opportunities-list')).display,'none','canonical result list must stay hidden on the initial dashboard');
assert.equal(window.getComputedStyle(window.document.getElementById('pst-pcw-opportunity-tools')).display,'none','search tools must stay hidden until a category opens');
assert.equal(window.document.querySelector('.pst-opp-mini-stats'),null,'passive mini-stat summary row must not render');
const filterToggle=window.document.querySelector('[data-pst-opp-filter-toggle]');
assert(filterToggle,'dashboard must expose one compact filter toggle');
assert.equal(desk.state().filtersOpen,false,'secondary filters must start collapsed');
assert(!window.document.querySelector('.pst-opp-filter-panel').classList.contains('is-open'),'secondary filter panel must be hidden initially');
filterToggle.click();
await new Promise(r=>setTimeout(r,20));
assert.equal(desk.state().filtersOpen,true,'filter toggle must reveal secondary filters');
assert(window.document.querySelector('.pst-opp-filter-panel').classList.contains('is-open'),'secondary filter panel must render open after the toggle');
filterToggle.click();
await new Promise(r=>setTimeout(r,20));
assert.equal(window.document.querySelector('.pst-opp-active'),null,'dashboard must not show active-filter clutter');

assert(window.document.querySelector('[data-pst-opp-mode="all"]'),'all route must exist');
assert(window.document.querySelector('[data-pst-opp-mode="local"]'),'direct tender route must exist');
assert(window.document.querySelector('[data-pst-opp-mode="award"]'),'TED award sales route must exist');
assert(window.document.querySelector('[data-pst-opp-source="KRPP"]'),'active KRPP source must be visible');
assert(window.document.querySelector('[data-pst-opp-source="TED"]'),'active TED source must be visible');
assert.equal(window.document.querySelector('[data-pst-opp-source="TED"] .pst-opp-chip-icon img').getAttribute('src'),'assets/source-icons/ted-eu.svg','TED source must use the local EU/TED asset');
assert.equal(window.document.querySelector('[data-pst-opp-source="KRPP"] .pst-opp-chip-icon img').getAttribute('src'),'assets/source-icons/krpp-kosovo.svg','KRPP source must use the local Kosovo procurement asset');
assert(deskSrc.includes('filtersOpen=false'),'secondary filters must default to collapsed');
assert(deskSrc.includes('pst-opp-status-strip'),'status controls must stay visible in a compact strip');
assert.equal(window.document.querySelector('.pst-opp-guide'),null,'instructional guide clutter must not render on the dashboard');
assert.equal(window.document.querySelector('[data-pst-opp-source="APP_AL"]'),null,'zero-count sources must not clutter the Desk');
assert.equal(window.document.querySelector('[data-pst-opp-source="UNDP_KOSOVO"]'),null,'UNDP Kosovo must not occupy a source chip in the Desk');

async function backToDashboard(){
 const back=window.document.querySelector('[data-pst-opp-back]');
 assert(back,'result page must expose Back to Mundësitë; header='+(window.document.querySelector('#pst-opportunities-focus>header')?.innerHTML||'(missing)'));
 back.click();
 await new Promise(r=>setTimeout(r,35));
 assert.equal(desk.state().resultPage,null,'Back from a category must clear result-page state');
 assert(focus.classList.contains('pst-opp-dashboard'),'Back must restore dashboard-only view');
 assert(window.document.querySelector('#pst-opp-desk'),'dashboard cards must be restored');
 assert.equal(window.getComputedStyle(window.document.getElementById('pst-opportunities-list')).display,'none','list must be hidden again after returning to dashboard');
}

async function openCategory(selector,kind,value){
 const button=window.document.querySelector(selector);
 assert(button,`dashboard control missing: ${selector}`);
 button.click();
 await new Promise(r=>setTimeout(r,35));
 const page=desk.state().resultPage;
 assert(page,`dashboard control did not open a result page: ${selector}`);
 assert.equal(page.kind,kind,`wrong result kind for ${selector}`);
 assert.equal(String(page.value).toLowerCase(),String(value).toLowerCase(),`wrong result value for ${selector}`);
 assert(focus.classList.contains('pst-opp-result-page'),`result-page class missing for ${selector}`);
 assert.equal(window.document.querySelector('#pst-opp-desk'),null,`dashboard must disappear after ${selector}`);
 assert.notEqual(window.getComputedStyle(window.document.getElementById('pst-opportunities-list')).display,'none',`result list must become visible after ${selector}`);
 return page;
}

// Source drilldown keeps the source-only content and a dedicated source header.
await openCategory('[data-pst-opp-source="KRPP"]','source','KRPP');
assert.equal(desk.state().sourcePage,'KRPP','source compatibility state must identify KRPP');
assert.equal(api._state.source,'KRPP','KRPP result page must keep the canonical source filter');
assert.match(window.document.querySelector('#pst-opportunities-focus>header h2').textContent,/KRPP/,'source page header must identify KRPP');
assert.equal(window.document.querySelectorAll('#pst-opportunities-list [data-pcw-tender]').length,40,'KRPP page must show its bounded first result batch');
assert(Array.from(window.document.querySelectorAll('#pst-opportunities-list [data-pcw-tender]')).every(el=>String(el.getAttribute('data-pcw-tender')).startsWith('krpp-')),'KRPP page must contain only KRPP results');
await backToDashboard();

// All-results page owns progressive disclosure; the overview never shows it inline.
await openCategory('[data-pst-opp-mode="all"]','mode','all');
assert.equal(api._test.opportunityRows().length,49,'all canonical matching rows must remain available; no hard 80-row cap may exist');
assert.equal(window.document.querySelectorAll('#pst-opportunities-list [data-pcw-tender]').length,40,'all-results page must stay bounded for readability');
const more=window.document.querySelector('[data-pcw-opportunity-more]');
assert(more,'load-more control must appear on the result page instead of the dashboard');
more.click();
await new Promise(r=>setTimeout(r,30));
assert.equal(window.document.querySelectorAll('#pst-opportunities-list [data-pcw-tender]').length,49,'load more must reveal the remaining matches');
const compact=window.document.querySelector('[data-pst-opp-density="compact"]');
assert(compact,'density control must exist on result pages');
compact.click();
assert.equal(desk.state().density,'compact','compact density must remain functional on result pages');
await backToDashboard();

// Every dashboard category family must navigate to the content named by that control.
await openCategory('[data-pst-opp-mode="local"]','mode','local');
assert.equal(api._state.mode,'local','Direct Tender must open the direct-tender result lane');
assert(api._test.opportunityRows().every(r=>String(r.payload?.source||'').toUpperCase()!=='TED'),'Direct Tender page must exclude TED awards');
await backToDashboard();

await openCategory('[data-pst-opp-mode="award"]','mode','award');
assert.equal(api._state.mode,'award','TED Award Sales must open the award result lane');
assert.equal(api._state.source,'TED','TED Award Sales must stay inside TED');
assert.equal(api._test.opportunityRows().length,3,'TED Award Sales must isolate award opportunities');
await backToDashboard();

await openCategory('[data-pst-opp-lifecycle="new"]','lifecycle','new');
assert.equal(api._state.lifecycle,'new','Të reja must open new opportunities');
await backToDashboard();

await openCategory('[data-pst-opp-lifecycle="waiting"]','lifecycle','waiting');
assert.equal(api._state.lifecycle,'waiting','Në pritje must open waiting opportunities even when the result is empty');
assert(window.document.querySelector('.pst-pcw-empty'),'zero-result category must render a safe empty state');
await backToDashboard();

await openCategory('[data-pst-opp-field="construction"]','field','construction');
assert.equal(api._state.field,'construction','Ndërtim must open the construction result category');
await backToDashboard();

await openCategory('[data-pst-opp-winner="gc_epc"]','winner','gc_epc');
assert.equal(api._state.winner_group,'gc_epc','GC / EPC must open only GC/EPC winners');
assert.deepEqual(Array.from(api._test.opportunityRows(),x=>x.id),['ted-gc']);
await backToDashboard();

// Repeated "all" controls are intentionally removed; the top "Të gjitha mundësitë" card owns global all-results navigation.
assert.equal(window.document.querySelector('[data-pst-opp-lifecycle="all"]'),null,'Statusi must not repeat an unnecessary all button');
assert.equal(window.document.querySelector('[data-pst-opp-source="all"]'),null,'Burimi must not repeat an unnecessary all button');
assert.equal(window.document.querySelector('[data-pst-opp-field="all"]'),null,'Fusha must not repeat an unnecessary all button');
assert.equal(window.document.querySelector('[data-pst-opp-winner="all"]'),null,'Fituesi TED must not repeat an unnecessary all button');

const dashboardBack=window.document.querySelector('[data-pst-opp-back]');
assert(dashboardBack,'dashboard must keep a local Kthehu control');
window.eval(productionSurfaceSrc);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
await new Promise(r=>setTimeout(r,25));
assert.notEqual(window.getComputedStyle(dashboardBack).display,'none','late Production Surface Owner must not hide Kthehu');
dashboardBack.click();
assert.equal(homeCalls,1,'dashboard Kthehu must route to Home exactly once');

await new Promise(r=>setTimeout(r,100));
assert.equal(window.document.querySelectorAll('#pst-opp-desk').length,1,'observer must settle without duplicating the dashboard');
console.log('Opportunities dashboard drilldown interaction smoke: OK');
