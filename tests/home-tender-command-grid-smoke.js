const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="page-workspace-home" class="page active"><div class="pst-ws-head"></div><div id="pst-bcc"></div><div class="pst-ws-homegrid"><section class="pst-ws-card"><div id="pst-ws-home-actions"><div class="pst-canonical-action" data-ws-action="a1"><button class="pst-ws-action-open"></button></div></div></section><section class="pst-ws-card"><div id="pst-ws-home-projects"></div></section></div><div id="pst-home-waiting"></div><div id="pst-ws-alertbar"></div></div>
<div id="page-workspace-projects" class="page"><div id="pst-pm-filters"></div><div class="pst-pm-row" data-project-id="p1"><div class="pst-pm-main"><div class="pst-pm-client">Client</div></div></div></div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
const w=dom.window;
w.confirm=()=>true; w.alert=()=>{}; w.open=()=>{};
w.PSTHomeCanonicalV1={snapshot:()=>({actions:[{key:'a1',title:'Veprimi kryesor',why:'Duhet vendim',tag:'Detyrë'}],waiting:[{project_id:'p2',name:'Dukley',text:'Po pritet klienti'}],projects:[]})};
const award={id:'t1',title:'Structural steelworks award',authority:'Buyer',relevance_score:96,category:'steel_structure',status:'new',payload:{source:'TED',notice_phase:'award',capability_fit:'strong',winner:{name:'Winner GmbH',country:'Germany',email:'procurement@winner.de'}}};
const open={id:'t2',title:'Steel supply',authority:'Authority',deadline:'2026-09-14',relevance_score:95,category:'raw_material',status:'new',payload:{source:'KRPP',notice_phase:'opportunity',capability_fit:'strong'}};
w.supaFetch=async(path)=>{
 if(path.startsWith('kek_tender_watch?')) return [award,open];
 return [];
};
w.eval(fs.readFileSync('pristeel-tender-priority-actions-v1.js','utf8'));
const T=w.PSTTenderPriorityActionsV1;
assert.ok(T,'tender priority API missing');
assert.strictEqual(T.priorityRows([open,award]).length,2);
assert.strictEqual(T.workModel(open),'supply');
assert.strictEqual(T.workModel(award),'production');
assert.ok(T.gmailComposeUrl({to:'a@b.com',subject:'Hi',body:'Body'}).includes('mail.google.com'));
assert.ok(!fs.readFileSync('pristeel-tender-priority-actions-v1.js','utf8').match(/messages\.send|GmailApp\.send|sendEmail\s*\(/),'runtime must not auto-send email');

w.eval(fs.readFileSync('pristeel-home-operating-grid-v1.js','utf8'));
const H=w.PSTHomeOperatingGridV1;
assert.ok(H,'home operating grid API missing');
H.renderLoaded({snap:w.PSTHomeCanonicalV1.snapshot(),projects:[{id:'p1',name:'Active',status:'aktiv'},{id:'p2',name:'Dukley',status:'pritje'}],emails:[{id:'e1',project_id:'p1',subject:'New mail',sent_at:new Date().toISOString()}],invoices:[],tenders:[award,open]});
assert.strictEqual(w.document.querySelectorAll('.pst-hog-tile').length,6,'Home must render exactly six command tiles');
assert.ok(w.document.querySelector('.pst-hog-priority'),'priority tender must be above Home tiles');
assert.ok(w.document.body.textContent.includes('TENDER PRIORITAR'));
assert.ok(w.document.body.textContent.includes('PPPP PA & REGJISTROI'));
assert.ok(w.document.getElementById('page-workspace-home').classList.contains('pst-home-grid-final'));

w.__pstWorkspaceProjectRows=[{id:'p1',origin_type:'tender',work_model:'production'}];
w.document.getElementById('page-workspace-home').classList.remove('active');
w.document.getElementById('page-workspace-projects').classList.add('active');
w.eval(fs.readFileSync('pristeel-project-classification-v1.js','utf8'));
w.PSTProjectClassificationV1.decorate();
assert.ok(w.document.body.textContent.includes('TENDER'));
assert.ok(w.document.body.textContent.includes('PRODHIM'));
assert.ok(w.document.querySelector('[data-pc-origin="tender"]'),'origin filter missing');
assert.ok(w.document.querySelector('[data-pc-model="production_installation"]'),'work-model filter missing');

const navSrc=fs.readFileSync('pristeel-primary-nav-resilience-v1.js','utf8');
assert.ok(navSrc.includes('pristeel-home-operating-grid-v1.js'));
assert.ok(navSrc.includes('pristeel-tender-priority-actions-v1.js'));
assert.ok(navSrc.includes('pristeel-project-classification-v1.js'));
console.log('Home/tender command grid smoke test passed.');
dom.window.close();
