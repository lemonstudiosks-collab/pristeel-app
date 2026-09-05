const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync('pristeel-operating-experience-v1.js','utf8');
assert.ok(!/supaFetch\s*\(/.test(source), 'operating experience must not read/write Supabase');
assert.ok(!/\b(POST|PATCH|DELETE)\b/.test(source), 'operating experience must stay presentation-only');
assert.ok(!/MutationObserver/.test(source), 'operating experience must stay bounded/event-driven');

const dom = new JSDOM(`<!doctype html><html><head></head><body>
<div id="pst-ws-sidebar"><div id="pst-ws-canonical-nav">
  <div class="pst-ws-navtitle">Puna</div>
  <div class="pst-ws-nav pst-canon-work">
    <button class="pst-ws-navbtn" data-key="home"><span class="pst-nav-label">Home</span></button>
    <button class="pst-ws-navbtn" data-key="projects"><span class="pst-nav-label">Projektet</span></button>
    <button class="pst-ws-navbtn" data-key="tenders"><span class="pst-nav-label">Tenderat</span></button>
    <button class="pst-ws-navbtn" data-key="contacts"><span class="pst-nav-label">Kontaktet</span></button>
  </div>
  <div class="pst-ws-navtitle pst-canon-tools-title">Mjetet</div>
  <div class="pst-ws-nav pst-canon-tools">
    <button class="pst-ws-navbtn" data-key="inbox"><span class="pst-nav-label">Gmail</span></button>
    <button class="pst-ws-navbtn" data-key="commercial"><span class="pst-nav-label">Komerciale</span></button>
    <button class="pst-ws-navbtn" data-key="finance"><span class="pst-nav-label">Financa</span></button>
    <button class="pst-ws-navbtn" data-key="apps"><span class="pst-nav-label">Modulet</span></button>
  </div>
</div></div>
<div class="content">
  <div id="page-workspace-home" class="page"><section class="pst-ws-card"><div class="pst-ws-card-title">Për mua tani</div><div class="pst-ws-card-sub"></div><div id="pst-ws-home-actions"></div></section></div>
  <div id="page-workspace-project" class="page active" data-pwf-area="execution" data-pwf-stage="comparison">
    <div class="pst-pi-tabs pwf-area-nav"></div>
    <section class="pwf-project-context"><button class="pwf-next" data-pwf-stage="rfq"><span>HAPI I RADHËS</span><b>Përgatit RFQ</b><small>Old procurement suggestion</small></button></section>
    <section class="pwf-procurement-head"><div class="pwf-procurement-title"><span>RRJEDHA E PROKURIMIT</span><b>Old title</b><small>Old copy</small></div><div class="pwf-stage-nav">
      <button data-pwf-stage="bom"></button><button data-pwf-stage="rfq"></button><button data-pwf-stage="offers"></button><button data-pwf-stage="comparison"></button><button data-pwf-stage="pricing"></button><button data-pwf-stage="client_offer"></button>
    </div></section>
  </div>
  <div id="page-workspace-apps" class="page"></div>
  <div id="page-home" class="page"></div>
</div>
</body></html>`, {runScripts:'outside-only', url:'https://example.test'});
const w = dom.window;
w.PSTSectionThemeV1 = { setSection(k){ w.__theme = k; } };
w.__pstIntegrityLastData = { project:{id:'p1',status:'Fituar',pipeline_stage:'production_control',operational_state:'execution'}, rfqs:[], supplierOffers:[], ourOffers:[] };
w.eval(source);
w.PSTOperatingExperienceV1.apply();

const main = [...w.document.querySelectorAll('.pst-canon-work>.pst-business-primary')];
assert.deepStrictEqual(main.map(b=>b.dataset.key), ['home','tenders','projects','contacts','finance','apps'], 'primary navigation order should match the simplified business areas');
assert.deepStrictEqual(main.map(b=>b.querySelector('.pst-nav-label').textContent), ['Home','Opportunities','Projects','Partners','Finance','System']);
assert.strictEqual(w.document.querySelector('[data-key="inbox"]').style.display, 'none', 'Gmail must not remain a primary navigation item');
assert.strictEqual(w.document.querySelector('[data-key="commercial"]').style.display, 'none', 'Commercial tools must not remain a primary navigation item');
assert.strictEqual(w.document.body.dataset.pstBusinessZone, 'projects');

const phaseLabels=[...w.document.querySelectorAll('.pst-phase-btn>b')].map(x=>x.textContent);
assert.deepStrictEqual(phaseLabels,['Përgatitja','Prokurimi','Komerciale','Ekzekutimi','Financa']);
assert.strictEqual(w.document.body.dataset.pstProjectPhase,'execution');
const next=w.document.querySelector('.pwf-next');
assert.strictEqual(next.getAttribute('data-pwf-area'),'execution','won/execution project should route next action to Execution');
assert.strictEqual(next.querySelector('b').textContent,'Vazhdo ekzekutimin');
assert.strictEqual(w.document.querySelector('.pwf-stage-nav [data-pwf-stage="bom"]').classList.contains('pst-procurement-stage'),true);
assert.strictEqual(w.document.querySelector('.pwf-stage-nav [data-pwf-stage="pricing"]').classList.contains('pst-commercial-stage'),true);

const target=w.PSTOperatingExperienceV1._test.homeActionTarget;
assert.strictEqual(target({source:'commercial_intake_review',title:'Shqyrto ofertën e furnitorit'}).workspace,'commercial');
assert.strictEqual(target({source:'execution_release_readiness',title:'Release readiness blocked'}).area,'execution');
assert.strictEqual(target({source:'project_decision_auto',title:'Kontrollo dhe dërgo ofertën'}).stage,'client_offer');
assert.strictEqual(target({source:'semantic_brain_auto',title:'Kontrollo BOM / RFQ para dërgimit'}).stage,'rfq');
assert.strictEqual(target({source:'email_request_auto',title:'Përgjigju klientit'}).area,'communication');

w.__pstIntegrityLastData.project={id:'p1',status:'pritje',pipeline_stage:'client_offer',operational_state:'wait_for_client'};
w.PSTOperatingExperienceV1.rewriteNextAction();
assert.strictEqual(next.classList.contains('pst-next-wait'),true,'waiting project must not look like active work');
assert.strictEqual(next.querySelector('b').textContent,'Nuk kërkohet veprim tani');

w.document.getElementById('page-workspace-project').classList.remove('active');
w.document.getElementById('page-workspace-home').classList.add('active');
w.PSTOperatingExperienceV1.apply();
assert.strictEqual(w.document.querySelector('.pst-ws-card-title').textContent,'Duhet veprimi yt');
assert.strictEqual(w.document.body.dataset.pstBusinessZone,'home');

// A System panel created by a legacy page owner must follow the active canonical System host.
w.document.getElementById('page-workspace-home').classList.remove('active');
w.document.getElementById('page-home').classList.add('active');
w.PSTOperatingExperienceV1.apply();
const systemBox=w.document.getElementById('pst-system-operating-tools');
assert.strictEqual(systemBox.parentNode.id,'page-home','legacy System host should receive the initial panel');
w.document.getElementById('page-home').classList.remove('active');
w.document.getElementById('page-workspace-apps').classList.add('active');
w.PSTOperatingExperienceV1.apply();
assert.strictEqual(systemBox.parentNode.id,'page-workspace-apps','existing System panel must move to the active canonical host');

console.log('Operating experience smoke test passed.');
dom.window.close();
