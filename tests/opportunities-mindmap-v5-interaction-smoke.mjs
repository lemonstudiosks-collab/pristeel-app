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
const rows=[
 {id:'krpp-1',title:'Konstruksion metalik',authority:'KRPP',relevance_score:90,status:'new',published_date:'2026-09-20',payload:{source:'KRPP',notice_phase:'opportunity'}},
 {id:'ted-gc',title:'Structural steel building award',authority:'EU Authority',publication_no:'TED-GC',relevance_score:99,status:'new',published_date:'2026-09-21',payload:{source:'TED',notice_phase:'award',winner:{name:'Example GC GmbH',email:'sales@example-gc.de',company_type:'gc_epc'}}},
 {id:'ted-gc-duplicate',title:'Second award by same company',authority:'EU Authority',publication_no:'TED-GC-2',relevance_score:96,status:'new',published_date:'2026-09-19',payload:{source:'TED',notice_phase:'award',winner:{name:'Example GC GmbH',email:'procurement@example-gc.de',company_type:'gc_epc'}}},
 {id:'ted-producer',title:'Bridge fabrication award',authority:'EU Authority',publication_no:'TED-P',relevance_score:98,status:'new',published_date:'2026-09-21',payload:{source:'TED',notice_phase:'award',winner:{name:'Example Steel AG',email:'office@example-steel.de',company_type:'producer'}}},
 {id:'ted-canonical',title:'Canonical contact award',authority:'EU Authority',publication_no:'TED-C',relevance_score:97,status:'new',published_date:'2026-09-18',payload:{source:'TED',notice_phase:'award',winner:{name:'Canonical Contact GmbH',company_type:'gc_epc'}}},
 {id:'ted-ambiguous',title:'Multi-winner award',authority:'EU Authority',publication_no:'TED-A',relevance_score:95,status:'new',published_date:'2026-09-17',payload:{source:'TED',notice_phase:'award',winner:{name:'Selected Winner GmbH',names:['Selected Winner GmbH','Other Winner AB'],emails:['office@selected.example','sales@other.example'],identity_version:'ted-winner-canonical-v2',identifier:'winner-1',company_type:'gc_epc'}}}
];
let registry=[];
window.supaFetch=async path=>{
 if(String(path).startsWith('kek_tender_watch?'))return rows;
 if(String(path).startsWith('pppp_opportunity_outreach_registry_v1?'))return registry;
 if(String(path).startsWith('pppp_opportunity_communication_state_v1?'))return [];
 if(String(path).startsWith('project_emails?'))return [];
 if(String(path).startsWith('partners?'))return [];
 return [];
};
window.PSTTenderPriorityActionsV1={
 reason:()=>'',go:async()=>true,review:async()=>true,noGo:async()=>true,prepareDraft:async()=>true,openSource:()=>true,
 enrichedContacts:r=>r?.payload?.winner?.email?[{email:r.payload.winner.email}]:[]
};
window.PSTTenderPriorityActionsV2=window.PSTTenderPriorityActionsV1;
let homeCalls=0;
const toasts=[];
window.pstToast=(message,type)=>toasts.push({message,type});
window.PSTPrimaryNavResilienceV10={openHome:()=>{homeCalls++;return true;}};

window.eval(workflowSrc);
const api=window.PSTProjectCentricWorkflowV1;
assert(api&&api.version==='9','coalesced-render workflow v9 must load');
await api.loadOpportunities(true);
window.eval(waitingSrc);
await new Promise(r=>setTimeout(r,15));
window.eval(deskSrc);
await new Promise(r=>setTimeout(r,60));

const desk=window.PSTOpportunitiesDeskV1;
const focus=window.document.getElementById('pst-opportunities-focus');
assert(desk&&desk.version==='20261004-action-buttons-v1','current Opportunity Desk must own the visible presentation');
assert.doesNotMatch(deskSrc,/new\s+MutationObserver|desk\.replaceWith/,'Opportunity Desk must not use a persistent observer or replace the whole visible desk');
assert.match(deskSrc,/function selectInPlace\(id\)/,'Opportunity selection must have an in-place update path');
assert.equal(window.document.querySelectorAll('#pst-opp-desk').length,1,'Desk must render once');
assert(focus.classList.contains('pst-opp-dashboard'),'Opportunities stays on one working surface');
assert(!focus.classList.contains('pst-opp-result-page'),'filters must not navigate to separate result pages');
assert.equal(window.getComputedStyle(window.document.getElementById('pst-opportunities-list')).display,'none','legacy canonical result cards stay backstage');

assert(window.document.querySelector('.pst-opp-side'),'left filter column must remain visible');
assert(window.document.querySelector('.pst-opp-work-list'),'active opportunities list must be the main work area');
assert.equal(window.document.querySelector('.pst-opp-detail'),null,'company details must stay closed until a row is clicked');
assert.equal(window.document.querySelector('.pst-opp-contacted'),null,'contacted companies must not occupy a permanent side list');
assert(window.document.querySelector('[data-pst-opp-contacted-toggle]'),'contacted companies must remain reachable from a compact control');
assert.equal(window.document.querySelector('[data-pst-opp-mode]'),null,'old top route cards must be removed');
assert.equal(window.document.querySelector('[data-pst-opp-lifecycle]'),null,'old top lifecycle row must be removed');
assert(window.document.querySelector('[data-pst-opp-source="TED"]'),'TED must remain available as a left-side filter');
assert(window.document.querySelector('[data-pst-opp-field="construction"]'),'field filters must remain available');
assert(window.document.querySelector('[data-pst-opp-winner="gc_epc"]'),'winner-type filters must remain available');
assert.match(window.document.querySelector('[data-pst-opp-select="ted-ambiguous"]').textContent,/Pa kontakt/,'a company without a safe contact must be visibly marked');
assert(window.document.querySelector('[data-pst-opp-select="ted-ambiguous"] .status.no-contact'),'the missing-contact marker must use a distinct status badge');

let activeIds=Array.from(window.document.querySelectorAll('.pst-opp-work-row'),x=>x.getAttribute('data-pst-opp-select'));
assert(activeIds.includes('ted-gc')&&activeIds.includes('ted-gc-duplicate'),'same company can be visible before first outreach is prepared');
assert.equal(window.document.querySelectorAll('.pst-opp-contact-row').length,0,'contacted view starts closed');

registry=[{
 tender_watch_id:'ted-gc',
 recipient_email:'sales@example-gc.de',
 status:'draft_created',
 draft_created_at:'2026-09-24T06:00:00Z',
 gmail_thread_id:'thread-gc',
 updated_at:'2026-09-24T06:00:00Z'
}];
window.document.dispatchEvent(new window.CustomEvent('pst:tender-gmail-drafts-ready',{detail:{tender_id:'ted-gc'}}));
await new Promise(r=>setTimeout(r,220));

activeIds=Array.from(window.document.querySelectorAll('.pst-opp-work-row'),x=>x.getAttribute('data-pst-opp-select'));
assert(!activeIds.includes('ted-gc'),'drafted opportunity must leave the active list immediately');
assert(!activeIds.includes('ted-gc-duplicate'),'all duplicate opportunities for the same contacted company must be suppressed');
window.document.querySelector('[data-pst-opp-contacted-toggle]').click();
await new Promise(r=>setTimeout(r,25));
const contacted=window.document.querySelectorAll('.pst-opp-contact-row');
assert.equal(contacted.length,1,'contacted company must appear once in the dedicated contacted list');
assert.match(contacted[0].textContent,/Example GC GmbH/,'contacted list must identify the contacted company');
assert.match(contacted[0].textContent,/Draft gati/,'draft creation must be visible as the parking state before send');
assert.equal(rows.find(r=>r.id==='ted-gc').project_id,undefined,'creating a draft must not create a Project');
window.document.querySelector('[data-pst-opp-contacted-toggle]').click();
await new Promise(r=>setTimeout(r,25));

const producerRow=window.document.querySelector('[data-pst-opp-select="ted-producer"]');
assert(producerRow,'another uncontacted TED company must remain available');
const deskNodeBefore=window.document.getElementById('pst-opp-desk');
const sideNodeBefore=window.document.querySelector('.pst-opp-side');
const mainNodeBefore=window.document.querySelector('#pst-opp-desk>main');
producerRow.click();
await new Promise(r=>setTimeout(r,25));
assert.strictEqual(window.document.getElementById('pst-opp-desk'),deskNodeBefore,'selecting an Opportunity must preserve the visible desk node');
assert.strictEqual(window.document.querySelector('.pst-opp-side'),sideNodeBefore,'selecting an Opportunity must preserve an unchanged filter column');
assert.strictEqual(window.document.querySelector('#pst-opp-desk>main'),mainNodeBefore,'selecting an Opportunity must preserve the entire 60-row center column');
assert.strictEqual(window.document.querySelector('[data-pst-opp-select="ted-producer"]'),producerRow,'selecting an Opportunity must preserve the clicked row node');
assert(window.document.querySelector('#pst-opp-modal-bg'),'clicking a company must open a modal overlay');
assert.match(window.document.querySelector('.pst-opp-detail').textContent,/Example Steel AG/,'clicking a company must hydrate its popup details');
assert(window.document.querySelector('[data-pst-opp-close]'),'popup must expose a clear close action');
assert(window.document.querySelector('[data-pst-opp-draft="ted-producer"]'),'uncontacted TED company with verified email must expose Krijo draft emaili');
const gmailDraftButton=window.document.querySelector('[data-pst-opp-draft="ted-producer"]');
assert(gmailDraftButton.classList.contains('pst-gmail-create-btn'),'visible Opportunities draft action must use the Gmail-branded button style');
assert(gmailDraftButton.querySelector('svg.pst-gmail-draft-icon'),'visible Opportunities draft action must render a resolution-independent Gmail SVG');
assert.match(gmailDraftButton.textContent,/Krijo draft në Gmail/,'visible Opportunities draft action must use the canonical Gmail label');
assert(gmailDraftButton.classList.contains('pst-opp-action-gmail'),'Gmail draft action must use the vivid primary-button treatment');
assert(gmailDraftButton.querySelector('.pst-opp-action-icon-gmail'),'Gmail draft action must keep its icon inside a dedicated chip');
const sourceButton=window.document.querySelector('.pst-opp-action-source');
assert(sourceButton&&sourceButton.querySelector('svg.pst-opp-action-svg'),'official source must use the illustrated external-link action');
const removeButton=window.document.querySelector('[data-pst-opp-remove="ted-producer"]');
assert(removeButton.classList.contains('pst-opp-action-remove')&&removeButton.querySelector('svg.pst-opp-action-svg'),'remove action must use the illustrated danger treatment');
const analyzeTender=window.document.querySelector('[data-pst-opp-open="ted-producer"]');
assert(analyzeTender,'TED award detail must expose Analizo tenderin');
assert.match(analyzeTender.textContent,/Analizo tenderin/,'TED analysis action must be clearly labelled');
assert.doesNotMatch(window.document.querySelector('.pst-opp-detail-grid').textContent,/Referenca|CPV/,'Opportunity detail must omit reference and CPV cards');
assert(window.document.querySelector('[data-pst-opp-remove="ted-producer"]'),'uncontacted TED company must expose Hiqe without opening the legacy console first');
analyzeTender.click();
await new Promise(r=>setTimeout(r,25));
assert.equal(window.document.getElementById('pst-opp-modal-bg'),null,'opening analysis must close Dosja e plotë first');
assert.equal(window.document.getElementById('pst-ti-backdrop').style.display,'flex','Action Console must become the visible modal');
assert.match(window.document.getElementById('pst-ti-backdrop').textContent,/Bridge fabrication award/,'Action Console must retain the selected tender identity');
api.closeTenderModal();

const canonicalRow=window.document.querySelector('[data-pst-opp-select="ted-canonical"]');
assert(canonicalRow,'TED company backed only by canonical contacts must remain selectable');
canonicalRow.click();
await new Promise(r=>setTimeout(r,25));
assert(window.document.querySelector('[data-pst-opp-draft="ted-canonical"]').disabled,'draft stays disabled before canonical contacts arrive');
const canonicalModalBefore=window.document.getElementById('pst-opp-modal-bg');
const canonicalBodyBefore=canonicalModalBefore.querySelector('.pst-opp-modal-body');
canonicalBodyBefore.scrollTop=120;
window.document.dispatchEvent(new window.CustomEvent('pst:opportunity-canonical-contacts',{detail:{tender_id:'ted-canonical',company:{legal_name:'Canonical Contact GmbH',domain:'canonical.example'},contacts:[{email:'procurement@canonical.example',verification_status:'verified',draft_eligible:true,do_not_contact:false,functional_role:'procurement'}]}}));
await new Promise(r=>setTimeout(r,25));
assert.strictEqual(window.document.getElementById('pst-opp-modal-bg'),canonicalModalBefore,'canonical contacts must patch the open modal instead of recreating it');
assert.strictEqual(window.document.querySelector('.pst-opp-modal-body'),canonicalBodyBefore,'contact hydration must preserve the scrolling element');
assert.match(window.document.querySelector('.pst-opp-detail').textContent,/procurement@canonical\.example/,'canonical email must appear in the visible company detail');
assert.equal(window.document.querySelector('[data-pst-opp-draft="ted-canonical"]').disabled,false,'verified canonical email must enable draft review');
window.document.dispatchEvent(new window.CustomEvent('pst:opportunity-canonical-contacts',{detail:{tender_id:'ted-canonical',company:{legal_name:'Canonical Contact GmbH',domain:'canonical.example'},contacts:[{email:'blocked@canonical.example',verification_status:'verified',draft_eligible:true,do_not_contact:true}]}}));
await new Promise(r=>setTimeout(r,25));
assert.doesNotMatch(window.document.querySelector('.pst-opp-detail').textContent,/blocked@canonical\.example/,'do-not-contact email must not be shown as draft-eligible');
assert(window.document.querySelector('[data-pst-opp-draft="ted-canonical"]').disabled,'do-not-contact email must not enable draft review');

const ambiguousRow=window.document.querySelector('[data-pst-opp-select="ted-ambiguous"]');
assert(ambiguousRow,'multi-winner TED award must remain selectable');
ambiguousRow.click();
await new Promise(r=>setTimeout(r,25));
assert.doesNotMatch(window.document.querySelector('.pst-opp-detail').textContent,/@(?:selected|other)\.example/,'unattributed multi-winner emails must not leak into the selected company detail');
assert(window.document.querySelector('[data-pst-opp-draft="ted-ambiguous"]').disabled,'unattributed multi-winner emails must not enable draft review');

const tedFilter=window.document.querySelector('[data-pst-opp-source="TED"]');
tedFilter.click();
await new Promise(r=>setTimeout(r,30));
assert.equal(api._state.source,'TED','left-side source filter must update the canonical filter state');
assert(window.document.querySelector('#pst-opp-desk'),'filtering must remain on the same workdesk');

window.PSTTenderPriorityActionsV1.prepareDraft=window.PSTTenderPriorityActionsV2.prepareDraft=async()=>({results:[{event:'outreach_ready',recipients:3,created:3}]});
window.document.querySelector('[data-pst-opp-select="ted-producer"]').click();
await new Promise(r=>setTimeout(r,20));
window.document.querySelector('[data-pst-opp-draft="ted-producer"]').click();
await new Promise(r=>setTimeout(r,30));
assert.equal(window.document.getElementById('pst-opp-modal-bg'),null,'successful draft completion must close the Opportunity modal immediately');
assert.equal(homeCalls,0,'successful draft completion must remain in Opportunities instead of returning to Home');
assert(window.document.getElementById('page-kek-tenders').classList.contains('active'),'successful draft completion must preserve the current Opportunities context');
assert(toasts.some(x=>x.type==='ok'&&/Draftet u krijuan në Gmail/.test(x.message)),'successful draft completion must show a clear confirmation without implying the emails were sent');

let dashboardBack=window.document.querySelector('[data-pst-opp-back],[data-pcw-opportunities-back]');
assert(dashboardBack,'workdesk must keep a functional Kthehu control even during canonical rerenders');
window.eval(productionSurfaceSrc);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
await new Promise(r=>setTimeout(r,25));
dashboardBack=window.document.querySelector('[data-pst-opp-back],[data-pcw-opportunities-back]');
assert(dashboardBack,'late Production Surface Owner must preserve a live Kthehu control');
assert.notEqual(window.getComputedStyle(dashboardBack).display,'none','late Production Surface Owner must not hide Kthehu');
dashboardBack.click();
assert.equal(homeCalls,1,'Kthehu must remain the only explicit route from Opportunities to Home');

console.log('Opportunities contacted-company workdesk smoke: OK');
