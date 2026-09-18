import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const src=fs.readFileSync('pristeel-project-centric-workflow-v1.js','utf8');
const finalizerSrc=fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');
const bootstrapSrc=fs.readFileSync('pristeel-project-emails.js','utf8');

assert(finalizerSrc.includes("pristeel-project-centric-workflow-v1.js?v='+Date.now()"),'project-centric owner must be cache-busted by the finalizer');
assert(bootstrapSrc.includes('pristeel-redesign-finalizer-v1.js?v=20260913-opportunityfilter1'),'bootstrap must request the fresh Opportunities finalizer revision');

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<section id="page-kek-tenders" style="display:block">
  <div class="pst-kek-head">
    <div>
      <div class="pst-kek-eye">PUBLIC STEEL TENDER MONITOR</div>
      <h1 class="pst-kek-title">Tenderat e çelikut</h1>
      <p class="pst-kek-sub">legacy copy</p>
    </div>
    <div class="pst-kek-actions"><button>KRPP</button><button>APP</button><button>TED</button></div>
  </div>
  <div class="pst-kek-filter"><select><option>Të gjitha burimet</option></select></div>
  <div class="pst-kek-card"><div>LEGACY TABLE</div></div>
  <div id="pst-tender-fit-summary">legacy fit</div>
</section>
</body></html>`,{url:'https://example.test',runScripts:'outside-only',pretendToBeVisual:true});

const {window}=dom;
window.console=console;
window.supaFetch=async path=>{
  if(String(path).startsWith('kek_tender_watch?')) return [
    {
      id:'t-1',
      title:'Blerje rampa metalike',
      authority:'Agjencia e Shërbimeve Publike Urbane',
      procurement_no:'REF-97738-08-26-2026',
      relevance_score:92,
      status:'new',
      published_date:'2026-08-26',
      deadline:'2026-08-27',
      detail_url:'https://e-prokurimi.rks-gov.net/SPIN_PROD/application/ipn/DocumentManagement/DokumentPodaciFrm.aspx?id=4255945',
      match_reasons:['sinjal lënde: metal','FPP shufra/profile'],
      payload:{source:'KRPP',notice_phase:'opportunity'}
    },
    {
      id:'t-3',
      title:'TED structural steelworks award',
      authority:'EU Contracting Authority',
      publication_no:'TED-2026-001',
      relevance_score:94,
      status:'new',
      published_date:'2026-08-24',
      match_reasons:['structural steelworks'],
      payload:{source:'TED',notice_phase:'award',winner:{name:'Example GC GmbH',company_type:'gc_epc'}}
    },
    {
      id:'t-4',
      title:'World Bank road safety works',
      authority:'World Bank / PIU',
      procurement_no:'WB-2026-001',
      relevance_score:90,
      status:'new',
      published_date:'2026-08-23',
      deadline:'2026-09-10',
      match_reasons:['road safety works'],
      payload:{source:'WORLD_BANK',notice_phase:'opportunity'}
    }
  ];
  if(String(path).startsWith('partners?')) return [];
  return [];
};
window.PSTTenderPriorityActionsV1={
  reason:r=>(r.match_reasons||[]).join(' · '),
  go:async()=>true,review:async()=>true,noGo:async()=>true,prepareDraft:async()=>true,
  openSource:()=>true
};
window.pstTenderIntelligence=async()=>null;
window.eval(src);

const api=window.PSTProjectCentricWorkflowV1;
assert(api&&api.version==='5','current project-centric runtime did not load');
assert.equal(typeof api.applyOpportunityFilter,'function','canonical Opportunities owner must expose one filter entry point');
assert.equal(window.document.getElementById('page-kek-tenders').classList.contains('active'),false,'fixture must reproduce a visible page without .active');

await api.loadOpportunities(true);

const page=window.document.getElementById('page-kek-tenders');
assert.equal(page.getAttribute('data-pcw-opportunities-owner'),'2','current whole-card surface did not claim ownership');
assert.equal(window.document.querySelector('.pst-kek-title').textContent,'Mundësitë','page title must be Albanian and operator-oriented');
assert(window.document.querySelector('#pst-opportunities-focus'),'modern opportunity focus surface was not mounted');
assert(window.document.querySelector('.pst-pcw-map-center'),'Opportunities must show a central mindmap node');
assert.equal(window.document.querySelectorAll('.pst-pcw-map-node').length,5,'Mindmap must expose all five lifecycle branches');
assert(src.includes('grid-template-areas:"new center draft" "waiting center replied" ". all ."'),'Desktop Opportunities mindmap must use deterministic grid areas');
assert.equal(window.document.querySelectorAll('.pst-pcw-tender').length,3,'all populated source fixtures should render initially');
assert(window.document.querySelector('[data-pcw-source="TED"]'),'TED source tab must be visible');
assert(window.document.querySelector('[data-pcw-source="KRPP"]'),'KRPP source tab must be visible');
assert(window.document.querySelector('[data-pcw-source="APP_AL"]'),'APP source tab must stay visible even with zero matches');
assert(window.document.querySelector('[data-pcw-source="WORLD_BANK"]'),'World Bank source tab must be visible');

const appTab=window.document.querySelector('[data-pcw-source="APP_AL"]');
assert.equal(appTab.querySelector('i').textContent,'0','APP fixture must reproduce the zero-result production source');
appTab.click();
assert.equal(window.document.querySelectorAll('.pst-pcw-tender').length,0,'zero-result APP source must empty only the opportunity list');
assert(window.document.querySelector('.pst-pcw-empty'),'zero-result APP source must show a safe empty state');
assert(window.document.querySelector('[data-pcw-source="APP_AL"]').classList.contains('on'),'APP source must remain selected after empty render');

window.document.querySelector('[data-pcw-source="TED"]').click();
assert.equal(window.document.querySelectorAll('.pst-pcw-tender').length,1,'TED source tab must recover immediately after an empty APP result');
assert(window.document.querySelector('[data-pcw-tender="t-3"]'),'TED source tab must show the TED fixture');

window.document.querySelector('[data-pcw-source="KRPP"]').click();
assert.equal(window.document.querySelectorAll('.pst-pcw-tender').length,1,'KRPP source tab must remain responsive after rerenders');
assert(window.document.querySelector('[data-pcw-tender="t-1"]'),'KRPP source tab must show the KRPP fixture');

window.document.querySelector('[data-pcw-source="WORLD_BANK"]').click();
assert.equal(window.document.querySelectorAll('.pst-pcw-tender').length,1,'World Bank source tab must remain responsive after repeated filter changes');
assert(window.document.querySelector('[data-pcw-tender="t-4"]'),'World Bank source tab must show the World Bank fixture');

window.document.querySelector('[data-pcw-source="all"]').click();
assert.equal(window.document.querySelectorAll('.pst-pcw-tender').length,3,'all source tab must restore every populated source after repeated filtering');

window.document.querySelector('[data-pcw-source="APP_AL"]').click();
assert.equal(window.document.querySelectorAll('.pst-pcw-tender').length,0,'zero-result source must remain safe on a second pass');
window.document.querySelector('[data-pcw-source="all"]').click();
assert.equal(window.document.querySelectorAll('.pst-pcw-tender').length,3,'all source tab must recover repeatedly without listener loss');

window.document.querySelector('[data-pcw-lifecycle="all"]').click();
assert.equal(window.document.querySelectorAll('.pst-pcw-tender').length,3,'lifecycle filter must remain responsive after source-filter rerenders');
assert.equal(window.document.querySelector('[data-pcw-lifecycle="all"]').getAttribute('aria-pressed'),'true','Active map branch must remain accessible');
window.document.querySelector('[data-pcw-lifecycle="new"]').click();
assert.equal(window.document.querySelectorAll('.pst-pcw-tender').length,3,'new lifecycle filter must restore the current new opportunities');

assert.equal(window.document.querySelector('.pst-kek-filter').style.display,'none','legacy long filters must be retired from the visible surface');
assert.equal(window.document.querySelector('.pst-kek-card').style.display,'none','legacy table must be retired from the visible surface');
assert.equal(window.document.getElementById('pst-tender-fit-summary').style.display,'none','legacy fit strip must be retired');

window.document.querySelector('[data-pcw-tender="t-1"]').click();
const modal=window.document.getElementById('pst-ti-backdrop');
assert(modal,'card click must create an action-console modal without relying on legacy Tender Intelligence');
assert.equal(modal.style.display,'flex','card click must make the action console visible');
const body=window.document.getElementById('pst-ti-body');
assert(body.textContent.includes('Shkarko dosjen'),'popup must explain the dossier-first route');
assert(body.querySelector('[data-pcw-ti="download"]'),'popup must offer dossier ZIP download');
assert(body.querySelector('[data-pcw-ti="dossier"]'),'popup must offer dossier retrieval/analysis');
const create=body.querySelector('[data-pcw-ti="go"]');
assert(create&&create.disabled,'project creation must remain disabled until dossier analysis is ready');
assert(body.querySelector('[data-pcw-ti="nogo"]'),'popup must allow removing the opportunity from the list');
const sourceLink=body.querySelector('a.pst-pcw-source-link');
assert(sourceLink,'KRPP Action Console must expose the official source as a real link');
assert.equal(sourceLink.getAttribute('href'),'https://e-prokurimi.rks-gov.net/SPIN_PROD/application/ipn/DocumentManagement/DokumentPodaciFrm.aspx?id=4255945','official-source link must use the exact row detail_url');
assert.equal(sourceLink.getAttribute('target'),'_blank','official-source link must open in a new tab');
assert(!body.querySelector('#legacy-popup'),'popup must not depend on the legacy Tender Intelligence modal body');
const close=modal.querySelector('[data-pcw-close-modal]');
assert(close,'action console must expose an explicit close button');
close.click();
assert.equal(modal.style.display,'none','close button must hide the action console');

console.log('Visible Opportunities zero-result recovery + runtime freshness: OK');
