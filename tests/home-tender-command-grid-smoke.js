const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="page-workspace-home" class="page active">
  <div class="pst-ws-head">Legacy Home header</div>
  <div id="pst-bcc">Legacy command center</div>
  <div class="pst-ws-homegrid">
    <section class="pst-ws-card"><div id="pst-ws-home-actions"><div class="pst-canonical-action" data-ws-action="a1"><button class="pst-ws-action-open">open</button></div></div></section>
    <section class="pst-ws-card"><div id="pst-ws-home-projects">Passive project count</div></section>
  </div>
  <div id="pst-home-waiting">Passive waiting lane</div>
  <div id="pst-ws-alertbar">Passive alert bar</div>
</div>
<div id="page-workspace-projects" class="page"><div id="pst-pm-filters"></div><div class="pst-pm-row" data-project-id="p1"><div class="pst-pm-main"><div class="pst-pm-client">Client</div></div></div></div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
const w=dom.window;
w.confirm=()=>true; w.alert=()=>{}; w.open=()=>{};
let canonicalOpen=0;
w.document.querySelector('.pst-ws-action-open').onclick=()=>{canonicalOpen++;};
w.PSTHomeCanonicalV1={snapshot:()=>({actions:[
  {key:'a1',title:'Shqyrto përgjigjen e klientit',why:'Ka ardhur përgjigje e re që kërkon vendim.',tag:'VEPRIM',project_name:'SSP - EWAS'}
],waiting:[{project_id:'p2',name:'Dukley',text:'Po pritet klienti'}],projects:[{id:'p1',name:'Active'}]})};

// Tender logic remains tested independently. It is no longer duplicated as a passive Home cockpit.
const award={id:'t1',title:'Denmark – Structural steelworks – FMV2 - Smedeentreprise - Bassin Folemarksvej',authority:'HOFOR',relevance_score:96,category:'steel_structure',status:'new',payload:{source:'TED',notice_phase:'award',workflow:'winner_outreach',capability_fit:'strong',winner:{name:'Holmskov Rustfri A/S',country:'DNK',email:'th@holmskov.dk'}}};
const open={id:'t2',title:'Steel supply',authority:'Authority',deadline:null,relevance_score:100,category:'raw_material',status:'new',payload:{source:'KRPP',notice_phase:'opportunity',capability_fit:'strong'}};
const otherOpen={id:'t3',title:'Another steel opportunity',authority:'Authority',deadline:null,relevance_score:99,category:'steel_structure',status:'new',payload:{source:'TED',notice_phase:'opportunity',capability_fit:'strong'}};
w.supaFetch=async(path)=>path.startsWith('kek_tender_watch?')?[award,open,otherOpen]:[];
w.eval(fs.readFileSync('pristeel-tender-priority-actions-v1.js','utf8'));
const T=w.PSTTenderPriorityActionsV1;
assert.ok(T,'tender priority API missing');
const priority=T.priorityRows([otherOpen,award,open]);
assert.strictEqual(priority.length,3);
assert.strictEqual(priority[0].id,'t2','strongest direct bid must remain the main tender decision');
assert.strictEqual(priority[1].id,'t1','unfinished award outreach must remain a tender priority');
assert.ok(T.openOutreach(award));
assert.strictEqual(T.workModel(open),'supply');
assert.strictEqual(T.workModel(award),'production');
const tenderSrc=fs.readFileSync('pristeel-tender-priority-actions-v1.js','utf8');
assert.ok(tenderSrc.includes('/users/me/drafts'),'outreach must create Gmail drafts, not send directly');
assert.ok(!tenderSrc.match(/messages\/send|GmailApp\.send|sendEmail\s*\(/),'runtime must never auto-send email');

// Final Home presentation must be action-only and reuse Canonical Home state/click ownership.
w.eval(fs.readFileSync('pristeel-home-operating-grid-v1.js','utf8'));
const H=w.PSTHomeOperatingGridV1;
assert.ok(H,'home action-only API missing');
assert.ok(H.renderLoaded({snap:w.PSTHomeCanonicalV1.snapshot()}));
const page=w.document.getElementById('page-workspace-home');
assert.ok(page.classList.contains('pst-home-action-only'),'Home must enter action-only mode');
assert.strictEqual(w.document.querySelectorAll('.pst-hao-card').length,1,'only canonical human-needed actions should render');
assert.strictEqual(w.document.querySelectorAll('.pst-hog-tile').length,0,'passive command tiles must be retired');
assert.strictEqual(w.document.querySelectorAll('.pst-hog-priority').length,0,'tender cockpit must not be duplicated on Home');
assert.ok(w.document.body.textContent.includes('Duhet veprimi yt'));
assert.ok(w.document.getElementById('pst-home-operating-grid-v1').textContent.includes('Shqyrto përgjigjen e klientit'));
assert.ok(w.document.getElementById('pst-home-operating-grid-v1').textContent.includes('Pse tani?'));
assert.ok(!w.document.getElementById('pst-home-operating-grid-v1').textContent.includes('Projektet në pritje'),'waiting lane must not be visible on action-only Home');
assert.ok(!w.document.getElementById('pst-home-operating-grid-v1').textContent.includes('aktive'),'passive active-project counters must not be visible');
assert.ok(w.document.getElementById('pst-home-action-only-css').textContent.includes('> :not(#pst-home-operating-grid-v1){display:none!important}'),'all legacy/passive direct Home children must be visually retired');
w.document.querySelector('.pst-hao-go').click();
assert.strictEqual(canonicalOpen,1,'Vepro must proxy the existing canonical action click instead of inventing a second action engine');

const homeSrc=fs.readFileSync('pristeel-home-operating-grid-v1.js','utf8');
assert.ok(homeSrc.includes("A(snap.actions).slice(0,5)"),'Home must cap visible work at five actions');
assert.ok(!homeSrc.includes('supaFetch'),'final Home presentation must not perform its own data reads');
assert.ok(!/setInterval\s*\(|MutationObserver/.test(homeSrc),'Home must remain event-driven');
assert.ok(homeSrc.includes("pst:home-canonical-rendered"),'Home must refresh from canonical render events');

// Project classification stays separate from Home simplification.
w.__pstWorkspaceProjectRows=[{id:'p1',origin_type:'tender',work_model:'production'}];
page.classList.remove('active');
w.document.getElementById('page-workspace-projects').classList.add('active');
w.eval(fs.readFileSync('pristeel-project-classification-v1.js','utf8'));
w.PSTProjectClassificationV1.decorate();
assert.ok(w.document.body.textContent.includes('TENDER'));
assert.ok(w.document.body.textContent.includes('PRODHIM'));

const navSrc=fs.readFileSync('pristeel-primary-nav-resilience-v1.js','utf8');
assert.ok(navSrc.includes('pristeel-home-operating-grid-v1.js'));
assert.ok(navSrc.includes('pristeel-tender-priority-actions-v1.js'));
assert.ok(navSrc.includes('pristeel-project-classification-v1.js'));
console.log('Home action-only and tender priority smoke test passed.');
dom.window.close();
