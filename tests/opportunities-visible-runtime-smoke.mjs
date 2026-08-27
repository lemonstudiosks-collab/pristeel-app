import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const src=fs.readFileSync('pristeel-project-centric-workflow-v1.js','utf8');

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
  if(String(path).startsWith('kek_tender_watch?')) return [{
    id:'t-1',
    title:'Blerje rampa metalike',
    authority:'Agjencia e Shërbimeve Publike Urbane',
    procurement_no:'REF-97738-08-26-2026',
    relevance_score:92,
    status:'new',
    published_date:'2026-08-26',
    deadline:'2026-08-27',
    match_reasons:['sinjal lënde: metal','CPV shufra/profile'],
    payload:{source:'APP_AL',notice_phase:'opportunity'}
  }];
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
assert(api&&api.version==='3','current project-centric runtime did not load');
assert.equal(window.document.getElementById('page-kek-tenders').classList.contains('active'),false,'fixture must reproduce a visible page without .active');

await api.loadOpportunities(true);

const page=window.document.getElementById('page-kek-tenders');
assert.equal(page.getAttribute('data-pcw-opportunities-owner'),'2','current whole-card surface did not claim ownership');
assert.equal(window.document.querySelector('.pst-kek-title').textContent,'Mundësitë','page title must be Albanian and operator-oriented');
assert(window.document.querySelector('#pst-opportunities-focus'),'modern opportunity focus surface was not mounted');
assert.equal(window.document.querySelectorAll('.pst-pcw-tender').length,1,'one whole-card opportunity should render');
assert(window.document.querySelector('.pst-pcw-tender').textContent.includes('Blerje rampa metalike'),'whole card must contain the tender');
assert.equal(window.document.querySelector('.pst-kek-filter').style.display,'none','legacy long filters must be retired from the visible surface');
assert.equal(window.document.querySelector('.pst-kek-card').style.display,'none','legacy table must be retired from the visible surface');
assert.equal(window.document.getElementById('pst-tender-fit-summary').style.display,'none','legacy fit strip must be retired');

window.document.querySelector('.pst-pcw-tender').click();
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
assert(!body.querySelector('#legacy-popup'),'popup must not depend on the legacy Tender Intelligence modal body');
const close=modal.querySelector('[data-pcw-close-modal]');
assert(close,'action console must expose an explicit close button');
close.click();
assert.equal(modal.style.display,'none','close button must hide the action console');

console.log('Visible no-.active Opportunities runtime ownership: OK');
