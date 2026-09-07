const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const source=fs.readFileSync('pristeel-daily-zones-cleanup-v1.js','utf8');
new Function(source);
assert(!/supaFetch\s*\(/.test(source),'daily-zone cleanup must not read/write Supabase');
assert(!/new\s+MutationObserver|setInterval\s*\(/.test(source),'daily-zone cleanup must remain bounded and event-driven');
assert(!/pstOpenProjectWorkspace|pstWorkspaceGo|showPage\s*\(/.test(source),'daily-zone cleanup must not own navigation');
assert(source.includes('KËRKON MIRATIMIN TËND'),'approval gate must be human-facing');
['1 Përgatitja','2 Prokurimi','3 Komerciale','4 Ekzekutimi','5 Financa'].forEach(x=>assert(source.includes(x),x+' must exist'));

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="page-workspace-contacts" class="page active">
 <header class="pcm-head"><div><h1>Kontaktet</h1><p>Old technical copy</p></div><div class="pcm-head-actions"><button data-pcm-refresh>Rifresko</button><button data-pcm-classic>Pamja klasike</button></div></header>
 <div class="pcm-business-cards"><button class="pcm-business-card" data-pcm-business="client">Klient <b data-pcm-business-count>24</b></button><button class="pcm-business-card" data-pcm-business="supplier">Furnitor <b data-pcm-business-count>18</b></button></div>
 <section class="pcm-card"><div class="pcm-card-head"><b>Contact Master</b><small id="pcm-count">42 kontakte</small></div></section>
</div>
<div id="page-workspace-home" class="page"><div id="pst-native-home-v4"><div class="pn-ask-slot"><input class="pst-live-input" placeholder="Ask PPPP"></div><div class="pn-kpis"><div class="pn-kpi"><span>Automation alerts</span><b>0</b></div><div class="pn-kpi"><span>Priority actions</span><b>3</b></div></div><section class="pn-panel"><h3>Analysis</h3></section></div></div>
<div id="page-workspace-projects" class="page">
 <div class="pst-pm-head"><div><div class="pst-pm-title">Të gjitha projektet</div><div class="pst-pm-sub">old</div></div><div class="pst-pm-head-actions"><button id="pst-pdm-btn">Dublikatat</button><button id="pst-pm-refresh">Rifresko</button><button id="pst-pm-new">+ Projekt i ri</button></div></div>
 <div class="pst-pm-controls"><div class="pst-pm-control-top"><input class="pst-pm-search"><select id="pst-pm-sort"><option>Sort</option></select><div class="pst-pm-toggle"><button>List</button><button>Board</button></div></div><div id="pst-pm-filters"><button data-pm-filter="active">Aktive</button></div></div>
 <article class="pst-pm-row" data-project-id="p1"><div class="pst-pm-main" data-pm-open="p1"><div class="pst-pm-name">EVOSYS · ANF-9203</div><div class="pst-pm-client">EVOSYS</div><div class="pst-pm-desc">description</div></div><div class="pst-pm-meta"><div class="pst-pm-meta-block"><div class="pst-pm-meta-label">Faza</div><div class="pst-pm-meta-value">Ofertë</div></div></div><div class="pst-pm-actions"><button class="pst-pm-open" data-pm-open="p1">Hap</button><button class="pst-pm-more">⋯</button></div></article>
</div>
<div id="page-workspace-project" class="page">
 <div class="pst-pi-tabs pwf-area-nav"><button class="pwf-area-btn" data-pwf-area="overview">Përmbledhja</button><button class="pwf-area-btn" data-pwf-area="procurement">Prokurimi</button><button class="pwf-area-btn" data-pwf-area="execution">Ekzekutimi</button><button class="pwf-area-btn" data-pwf-area="finance">Financat</button><button class="pwf-area-btn" data-pwf-area="files">Skedarët</button><button class="pwf-area-btn" data-pwf-area="communication">Komunikimi</button></div>
 <section class="pwf-project-context"><div class="pwf-project-main"><span>PROJEKTI AKTIV</span><b>EVOSYS · ANF-9203</b><small>old</small></div><div class="pwf-project-kpis">4 RFQ · 3 oferta</div><button class="pwf-next"><span>HAPI I RADHËS</span><b>Oferta është te klienti</b><small>follow-up</small></button></section>
 <section class="pwf-procurement-head"><div class="pwf-procurement-title"><span>RRJEDHA</span><b>Old</b><small>Old</small></div><div class="pwf-stage-nav"><button class="pwf-stage" data-pwf-stage="bom">BOM</button><button class="pwf-stage" data-pwf-stage="rfq">RFQ</button><button class="pwf-stage" data-pwf-stage="offers">Ofertat</button><button class="pwf-stage" data-pwf-stage="comparison">Krahasimi</button><button class="pwf-stage" data-pwf-stage="pricing">Pricing</button><button class="pwf-stage" data-pwf-stage="client_offer">Offer</button></div></section>
 <div id="pst-pi-body"><div class="pf2-gate"><div><span>HUMAN GATE</span><b>Krahasim + marzh + aprovim</b><p>Drafti final dhe follow-up kërkojnë njeriun.</p></div></div></div>
</div>
<div id="page-workspace-apps" class="page"><div class="pst-ws-head"><div><div class="pst-ws-eyebrow">Apps</div><div class="pst-ws-title">Mjetet dhe regjistrat</div><div class="pst-ws-sub">old</div></div></div><section id="pst-system-operating-tools"><button>Gmail</button><button>Automation Health</button></section><div class="pst-ws-appgrid"><button class="pst-ws-app">Tool A</button><button class="pst-ws-app">Tool B</button></div></div>
<div id="page-finance" class="page"></div><div id="page-kek-tenders" class="page"></div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test'});
const w=dom.window;
let healthLoads=0;
w.PSTAutomationHealthV1={load:()=>{healthLoads++;return true;}};
w.__pstWorkspaceProjectRows=[{id:'p1',name:'EVOSYS · ANF-9203',client:'EVOSYS',status:'Në pritje',operational_state:'waiting_for_client',pipeline_stage:'client_offer',next_action:'Rikujto klientin në afat'}];
w.__pstIntegrityLastData={project:{id:'p1',name:'EVOSYS · ANF-9203',client:'EVOSYS',ref:'ANF-9203',status:'Në pritje'}};
w.eval(source);
w.PSTDailyZonesCleanupV1.apply();

const contacts=w.document.getElementById('page-workspace-contacts');
assert.equal(contacts.querySelector('.pcm-head h1').textContent,'Partnerët');
assert.match(contacts.querySelector('.pcm-head p').textContent,/një identitet/i);
assert.equal(contacts.querySelector('.pcm-card-head b').textContent,'Marrëdhëniet');
assert(contacts.querySelector('[data-pcm-refresh]').classList.contains('pst-daily-system-only'));
assert(contacts.querySelector('[data-pcm-classic]').classList.contains('pst-daily-system-only'));
assert([...contacts.querySelectorAll('[data-pcm-business-count],#pcm-count')].every(x=>x.classList.contains('pst-daily-passive-count')));
const css=w.document.getElementById('pst-daily-zones-cleanup-css').textContent;
assert(css.includes('#page-workspace-contacts.active .pst-daily-system-only'));
assert(css.includes('#page-workspace-contacts.active .pst-daily-passive-count'));

contacts.classList.remove('active');
const home=w.document.getElementById('page-workspace-home');home.classList.add('active');
w.PSTDailyZonesCleanupV1.apply();
assert.equal(home.querySelector('.pst-live-input').getAttribute('placeholder'),'Pyet PPPP ose kërko…');
assert(home.querySelector('.pn-kpi').classList.contains('pst-ux-quiet-kpi'),'healthy zero automation KPI should be quiet');
assert(!home.querySelectorAll('.pn-kpi')[1].classList.contains('pst-ux-quiet-kpi'),'real priority KPI must remain visible');
assert(home.querySelector('.pn-panel').classList.contains('pst-ux-home-secondary'),'deep analysis should move out of daily Home');

home.classList.remove('active');
const projects=w.document.getElementById('page-workspace-projects');projects.classList.add('active');
w.PSTDailyZonesCleanupV1.apply();
assert.equal(projects.querySelector('.pst-pm-title').textContent,'Projektet');
assert.match(projects.querySelector('.pst-pm-sub').textContent,/gjendja reale/i);
['#pst-pdm-btn','#pst-pm-refresh'].forEach(sel=>assert(projects.querySelector(sel).classList.contains('pst-daily-project-tool'),sel+' should leave the daily surface'));
['#pst-pm-new','#pst-pm-sort','.pst-pm-toggle','#pst-pm-filters','.pst-pm-search'].forEach(sel=>assert(!projects.querySelector(sel).classList.contains('pst-daily-project-tool'),sel+' must stay available'));
const row=projects.querySelector('.pst-pm-row');
assert.equal(row.getAttribute('role'),'link');
assert.equal(row.getAttribute('tabindex'),'0');
assert.match(row.querySelector('.pst-ux-next-cell b').textContent,/Rikujto klientin/i);
assert(row.querySelector('.pst-pm-desc').classList.contains('pst-ux-project-description'));
assert(css.includes('#page-workspace-projects.active.pst-ux-projects .pst-pm-row'));

projects.classList.remove('active');
const project=w.document.getElementById('page-workspace-project');project.classList.add('active');
project.setAttribute('data-pwf-area','procurement');project.setAttribute('data-pwf-stage','pricing');
w.PSTDailyZonesCleanupV1.apply();
assert(project.querySelector('.pwf-project-kpis').classList.contains('pst-daily-passive-count'));
assert.equal(project.querySelector('[data-pwf-area="overview"]').textContent,'1 Përgatitja');
assert.equal(project.querySelector('[data-pwf-area="procurement"]').textContent,'2 Prokurimi');
assert.equal(project.querySelector('[data-pst-ux-commercial]').textContent,'3 Komerciale');
assert.equal(project.querySelector('[data-pwf-area="execution"]').textContent,'4 Ekzekutimi');
assert.equal(project.querySelector('[data-pwf-area="finance"]').textContent,'5 Financa');
assert(project.querySelector('.pst-ux-project-utils [data-pwf-area="files"]'),'files must be a utility');
assert(project.querySelector('.pst-ux-project-utils [data-pwf-area="communication"]'),'communication must be a utility');
assert(project.classList.contains('pst-ux-commercial-active'));
assert.equal(project.querySelector('.pwf-next span').textContent,'HAPI TJETËR');
assert.match(project.querySelector('.pf2-gate span').textContent,/KËRKON MIRATIMIN TËND/i);
assert(!/HUMAN GATE/i.test(project.textContent));
assert(!/follow-up/i.test(project.textContent));
assert(!/\bdraft\b/i.test(project.textContent));

project.classList.remove('active');
const system=w.document.getElementById('page-workspace-apps');system.classList.add('active');
w.PSTDailyZonesCleanupV1.apply();
assert.equal(system.querySelector('.pst-ws-eyebrow').textContent,'SISTEMI');
assert.equal(system.querySelector('.pst-ws-title').textContent,'Sistemi dhe automatizimet');
assert.match(system.querySelector('.pst-ws-sub').textContent,/përjashtimet|qetë/i);
assert(system.querySelector('#pst-system-operating-tools').classList.contains('pst-daily-system-duplicate'),'duplicate System shortcut strip must be retired');
const advanced=system.querySelector('#pst-system-advanced-tools');
assert(advanced,'technical app grid must be grouped behind one advanced-tools disclosure');
assert.equal(advanced.open,false,'technical tools must be collapsed by default');
assert(advanced.querySelector('.pst-system-advanced-body .pst-ws-appgrid'),'existing System app grid must remain intact inside advanced tools');
assert.equal(system.querySelector('.pst-ws-appgrid').getAttribute('data-pst-system-tools'),'1');
assert(healthLoads>0,'System must hand off to the existing Automation Health engine');

dom.window.close();

const financeSource=fs.readFileSync('pristeel-finance-daily-v1.js','utf8');
new Function(financeSource);
const financeDom=new JSDOM('<!doctype html><html><head></head><body><div id="page-finance" class="page active"><div id="fin-hub"><div id="fin-hub-grid"></div></div></div></body></html>',{runScripts:'outside-only',url:'https://example.test'});
const fw=financeDom.window;
fw.eval(financeSource);
const financeTask=fw.PSTFinanceDailyV1._test.financeTask;
assert.equal(financeTask({source:'invoice_receivable',category:'klient',title:'Pagesë klienti'}),true,'canonical receivable task must stay in Finance');
assert.equal(financeTask({source:'invoice_due_date_missing',category:'furnitor',title:'Plotëso afatin e pagesës'}),true,'canonical supplier invoice task must stay in Finance');
assert.equal(financeTask({source:'commercial_intake_review',category:'furnitor',source_ref:'commercial-intake:project:invoice'}),true,'invoice review must stay in Finance');
assert.equal(financeTask({source:'commercial_intake_review',category:'furnitor',source_ref:'commercial-intake:project:offer',title:'Shqyrto ofertën'}),false,'supplier offer review must not leak into Finance');
assert.equal(financeTask({source:'document_bom_review',category:'intern',title:'Rishiko dokumentin teknik',detail:'SWIFT payment confirmation appears in OCR'}),false,'technical/OCR task must not enter Finance because of finance words in text');
assert.equal(financeTask({source:'document_bom_review',category:'intern',title:'Rishiko dokumentin teknik',detail:'Lista e dokumenteve për analizë financiare'}),false,'technical document review must remain outside Finance');
assert.equal(financeTask({source:'manual',category:'financa',title:'Kontrollo pagesën'}),true,'explicit manual Finance task remains supported');
assert.equal(financeTask({source:'manual',category:'intern',title:'Kontrollo payment në kontratë'}),false,'generic manual/internal task must not be classified from title text');
financeDom.window.close();

console.log('Daily zones cleanup UX smoke test passed.');
