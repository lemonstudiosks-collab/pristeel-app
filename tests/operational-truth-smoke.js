const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="pst-ws-canonical-nav"><button class="pst-ws-navbtn" data-key="projects">Projects</button><button class="pst-ws-navbtn" data-key="finance">Finance</button><button class="pst-ws-navbtn" data-key="apps">System</button></div>
<div id="page-workspace-home" class="page active"><div id="pst-home-operating-grid-v1"><button class="pst-hog-tile" data-hog-act="projects"><b></b><small></small><em></em></button><button class="pst-hog-tile" data-hog-act="waiting"><b></b><small></small><em></em></button><button class="pst-hog-tile" data-hog-act="tenders"><b>3 tendera prioritarë</b><small></small></button><button class="pst-hog-tile" data-hog-act="events"><b></b><small></small><em></em></button><details id="pst-hog-events"><summary></summary><div></div></details></div></div>
<div id="page-workspace-projects" class="page"><div id="pst-pm-filters"><button class="pst-pm-chip" data-pm-filter="all">Të gjitha <i>0</i></button><button class="pst-pm-chip" data-pm-filter="active">Aktive <i>0</i></button><button class="pst-pm-chip" data-pm-filter="waiting">Në pritje <i>0</i></button><button class="pst-pm-chip" data-pm-filter="postponed">Shtyra <i>0</i></button><button class="pst-pm-chip" data-pm-filter="lost">Të humbura <i>0</i></button><button class="pst-pm-chip" data-pm-filter="won">Të fituara <i>0</i></button><button class="pst-pm-chip" data-pm-filter="archived">Arkivuara <i>0</i></button></div><div id="pst-pm-content"><div class="pst-pm-list"><article class="pst-pm-row" data-project-id="a"><span class="pst-pm-badge"></span></article><article class="pst-pm-row" data-project-id="w"><span class="pst-pm-badge"></span></article><article class="pst-pm-row" data-project-id="x"><span class="pst-pm-badge"></span></article></div></div></div>
<div id="page-finance" class="page" style="display:none"></div><div id="page-workspace-apps" class="page" style="display:none"></div>
<div id="page-kek-tenders" class="page"><input id="pst-kek-search"><select id="pst-kek-source"><option value="all">all</option><option value="KRPP">KRPP</option></select><select id="pst-kek-phase"><option value="focus">focus</option></select><select id="pst-kek-category"><option value="all">all</option></select><select id="pst-kek-fit"><option value="all">all</option></select><select id="pst-kek-status"><option value="open">open</option><option value="review">review</option></select><div id="pst-kek-list"><table><tbody><tr><td><div class="pst-kek-name">A</div></td></tr><tr><td><div class="pst-kek-name">B</div></td></tr><tr><td><div class="pst-kek-name">C</div></td></tr><tr><td><div class="pst-kek-name">D</div></td></tr></tbody></table></div></div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
const w=dom.window;w.scrollTo=()=>{};w.open=()=>{};
w.__pstWorkspaceProjectRows=[
 {id:'a',status:'pritje',operational_state:'action_required'},
 {id:'w',status:'pritje',operational_state:'wait_for_client'},
 {id:'x',status:'Fituar',operational_state:'execution'},
 {id:'l',status:'humbur',operational_state:null},
 {id:'r',status:'realizuar',operational_state:null}
];
w.PSTHomeCanonicalV1={snapshot:()=>({actions:[{key:'1'}]})};
w.supaFetch=async(path)=>{
 if(path.startsWith('project_emails?')) return [
  {id:'1',project_id:'a',subject:'Linked A',sent_at:new Date().toISOString(),needs_review:false,gmail_url:'https://mail.google.com/a'},
  {id:'2',project_id:'w',subject:'Linked W',sent_at:new Date().toISOString(),needs_review:false,gmail_url:'https://mail.google.com/b'},
  {id:'3',project_id:null,subject:'Background',sent_at:new Date().toISOString(),needs_review:false,gmail_url:'https://mail.google.com/c'}
 ];
 if(path.startsWith('projects?select=id,name')) return [{id:'a',name:'A'},{id:'w',name:'W'}];
 return [];
};
w.pstWorkspaceGo=()=>{};let fin=0;w.finShowHub=()=>fin++;
w.pstTenderBizOpenMonitor=()=>{const p=w.document.getElementById('page-kek-tenders');p.classList.add('active');p.style.display='block';};w.pstKekRender=()=>{};
w.PSTTenderPriorityActionsV1={refresh:async()=>[{id:'a',title:'A'},{id:'b',title:'B'},{id:'c',title:'C'},{id:'d',title:'D'}],priorityRows:(x)=>x.slice(0,3)};

w.eval(fs.readFileSync('pristeel-operational-truth-v1.js','utf8'));
const T=w.PSTOperationalTruthV1;assert.ok(T,'Operational Truth API missing');
assert.strictEqual(T.pclass(w.__pstWorkspaceProjectRows[0]),'active');
assert.strictEqual(T.pclass(w.__pstWorkspaceProjectRows[1]),'waiting');
assert.strictEqual(T.pclass(w.__pstWorkspaceProjectRows[2]),'won');
assert.deepStrictEqual(JSON.parse(JSON.stringify(T.counts())),{all:5,operative:3,active:1,waiting:1,postponed:0,lost:1,won:1,archived:1});

(async()=>{
 const pp=w.document.getElementById('page-workspace-projects');pp.classList.add('active');pp.style.display='block';
 T.setProjectFilter('waiting');await new Promise(r=>setTimeout(r,30));
 assert.strictEqual(w.document.querySelector('[data-project-id="a"]').style.display,'none');
 assert.notStrictEqual(w.document.querySelector('[data-project-id="w"]').style.display,'none');
 assert.strictEqual(w.document.querySelector('[data-pm-filter="active"] i').textContent,'1');
 assert.strictEqual(w.document.querySelector('[data-pm-filter="waiting"] i').textContent,'1');
 assert.strictEqual(w.document.querySelector('#pst-opt-operative-chip i').textContent,'3');
 assert.strictEqual(w.document.querySelector('[data-project-id="a"] .pst-pm-badge').textContent,'Kërkon veprim');

 await T.syncHome(true);
 assert.strictEqual(w.document.querySelector('[data-hog-act="projects"] b').textContent,'3 operative');
 assert.strictEqual(w.document.querySelector('[data-hog-act="events"] b').textContent,'2 aktivitete në projekte');
 assert.ok(w.document.querySelector('[data-hog-act="events"] em').textContent.includes('1 emaila të tjerë'));
 await T.openActivity();
 assert.strictEqual(w.document.querySelectorAll('#pst-hog-events .pst-hog-event').length,2);

 T.openFinance();assert.strictEqual(w.document.getElementById('page-finance').style.display,'block');assert.ok(fin>=1);
 T.openSystem();assert.strictEqual(w.document.getElementById('page-workspace-apps').style.display,'block');

 T.openOpportunities(true);await new Promise(r=>setTimeout(r,760));
 const trs=[...w.document.querySelectorAll('#pst-kek-list tbody tr')];
 assert.strictEqual(trs.filter(x=>x.style.display!=='none').length,3,'Home priority mode must show exactly top 3 tenders');
 assert.ok(w.document.getElementById('pst-opt-tender-priority-note'));
 console.log('Operational truth smoke test passed.');dom.window.close();
})().catch(e=>{console.error(e);process.exit(1);});
