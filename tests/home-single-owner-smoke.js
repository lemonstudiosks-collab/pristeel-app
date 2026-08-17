const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const canonicalSource=fs.readFileSync('pristeel-home-canonical-v1.js','utf8');
 const bridgeSource=fs.readFileSync('pristeel-home-live-fix-v1.js','utf8');
 const stabilitySource=fs.readFileSync('pristeel-home-stability-v2.js','utf8');
 const recoverySource=fs.readFileSync('pristeel-home-project-recovery-v3.js','utf8');
 const taskSource=fs.readFileSync('pristeel-task-source-actions-v1.js','utf8');
 const releaseSource=fs.readFileSync('pristeel-workspace-release-fix-v3.js','utf8');

 assert(!canonicalSource.includes('updated_at.desc'),'Canonical Home must never query projects.updated_at');
 assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(canonicalSource),'Canonical Home must not win by polling or DOM reconciliation');
 assert(!taskSource.includes('pristeel-home-operational-priority-v1.js'),'Task-source decorator must not inject a hidden Home renderer');
 assert(bridgeSource.includes('window.__pstHomeStabilityV2=true'),'Official Home bridge must retire Stability writer before it loads');
 assert(bridgeSource.includes('window.__pstHomeProjectRecoveryV3=true'),'Official Home bridge must retire Recovery writer before it loads');
 assert(/async function patchHomeProjects\(\)[\s\S]*renderCanonical/.test(releaseSource),'Workspace release compatibility must delegate Home refresh to canonical owner');
 assert(!/host\.innerHTML=list\.length/.test(releaseSource),'Workspace release compatibility must never write canonical Home project cards');
 assert(!/key==='home'\)setTimeout\(patchHomeProjects/.test(releaseSource),'Workspace release route must not schedule a competing Home writer');
 assert(!/page-workspace-home[^\n]*setTimeout\(patchHomeProjects/.test(releaseSource),'Workspace release startup must not repaint Home projects');

 const dom=new JSDOM(`<!doctype html><html><head></head><body>
   <button class="pst-ws-navbtn active" data-key="home"></button>
   <div id="page-workspace-home" class="page active" style="display:block">
     <div id="pst-ws-home-actions"></div>
     <div id="pst-ws-home-projects"></div>
   </div>
   <span id="pst-ws-b-home"></span><span id="pst-ws-b-projects"></span>
 </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;
 w.console=console;
 w.scrollTo=()=>{};
 w.PSTHomeCommandCenterV2={decorate(){}};
 w.PSTDashboardTaskCardsV1={decorate(){}};
 w.PSTRedesignFinalizerV1={apply(){}};
 w.pstOpenProjectWorkspace=()=>{};

 const today=new Date();
 const iso=today.toISOString();
 const date=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
 const old=new Date(Date.now()-25*86400000).toISOString().slice(0,10);
 const dukley={id:'dukley',created_at:'2026-08-07T18:30:11Z',name:'ITALIAN STYLE - Dukley Seafront Restoran - BUDVA',client:'ITALIAN STYLE',ref:null,status:'pritje',pipeline_stage:'client_offer'};
 const older={id:'older',created_at:'2026-08-01T10:00:00Z',name:'Projekt i vjeter',client:'OLD',ref:'OLD-1',status:'aktiv',pipeline_stage:'pricing'};
 const request={id:'req',created_at:iso,project_id:'dukley',title:'Urgjent: Drafti PST-OFF-2026-08-024 gati — plotëso montazhin',detail:'Drafti eshte gati; ploteso montazhin dhe afatet.',due_date:date,priority:'e larte',status:'hapur',source:'email_request_auto',source_ref:'gmail-dukley'};
 const jola={id:'jola',created_at:'2026-07-14T10:00:00Z',project_id:null,title:'Jola AH36 — rregullo 4 email bounce + follow-up furnitorë',detail:'Follow-up furnitore',due_date:old,priority:'e larte',status:'hapur',source:'manual',source_ref:null};
 const analysis={id:12,project_id:'dukley',created_at:iso,status:'complete',analysis:{event_source_ref:'gmail-dukley',recommendation:{label:'Përfundo revizionin dhe montazhin',decision:'vepro_tani'}}};
 const email={id:1,project_id:'dukley',subject:'Dukley',sent_at:iso,direction:'incoming',gmail_url:'https://mail.google.com/'};
 const queries=[];
 w.supaFetch=async(path,method,body)=>{
   queries.push(String(path));
   if(method)return [];
   if(path.startsWith('projects?'))return [dukley,older];
   if(path.startsWith('tasks?status=eq.hapur'))return [request,jola];
   if(path.startsWith('project_emails?'))return [email];
   if(path.startsWith('project_analyses?'))return [analysis];
   if(path.startsWith('rfq_log?'))return [];
   if(path.startsWith('dashboard_action_states?'))return [];
   return [];
 };

 w.pstWorkspaceGo=function(key){
   if(String(key)==='home'){
     w.document.getElementById('pst-ws-home-actions').innerHTML='<div class="pst-ws-action"><div class="pst-ws-action-title">Renderer i vjeter</div></div>';
     w.document.getElementById('pst-ws-home-projects').innerHTML='';
   }
 };
 w.renderHome=function(){return w.pstWorkspaceGo('home');};

 const nativeAppend=w.document.head.appendChild.bind(w.document.head);
 w.document.head.appendChild=function(node){
   const result=nativeAppend(node);
   if(node.tagName==='SCRIPT'&&node.getAttribute('data-pst-home-canonical-v1')){
     w.eval(canonicalSource);
     w.setTimeout(()=>node.dispatchEvent(new w.Event('load')),0);
   }
   return result;
 };

 w.eval(bridgeSource);
 w.eval(stabilitySource);
 w.eval(recoverySource);
 assert.strictEqual(w.PSTHomeStabilityV2,undefined,'Legacy Stability writer must not register');
 assert.strictEqual(w.PSTHomeProjectRecoveryV3,undefined,'Legacy Recovery writer must not register');

 await new Promise(r=>w.setTimeout(r,25));
 await w.PSTHomeCanonicalV1.render(true);
 let firstAction=w.document.querySelector('#pst-ws-home-actions>.pst-ws-action');
 let firstProject=w.document.querySelector('#pst-ws-home-projects>.pst-ws-projectcard');
 assert(firstAction,'Canonical Home must render priorities');
 assert.strictEqual(firstAction.querySelector('.pst-ws-action-title').textContent,request.title,'Fresh client request must outrank a 25-day overdue routine task');
 assert.strictEqual(firstAction.querySelector('.pst-ws-action-tag').textContent,'Vepro tani','Fresh client request must be explicitly actionable');
 assert(firstProject,'Canonical Home must render active projects');
 assert.strictEqual(firstProject.getAttribute('data-project-id'),'dukley','Dukley must be the first project by real activity');
 assert(firstProject.textContent.includes('Përfundo revizionin dhe montazhin'),'Project next step must come from latest Project Intelligence analysis');
 assert.strictEqual(w.document.getElementById('page-workspace-home').dataset.pstHomeOwner,'canonical-v1','Home must expose one canonical owner');

 await Promise.resolve(w.renderHome());
 await new Promise(r=>w.setTimeout(r,25));
 firstAction=w.document.querySelector('#pst-ws-home-actions>.pst-ws-action');
 firstProject=w.document.querySelector('#pst-ws-home-projects>.pst-ws-projectcard');
 assert.strictEqual(firstAction.querySelector('.pst-ws-action-title').textContent,request.title,'Later renderHome call must not replace canonical priorities');
 assert.strictEqual(firstProject.getAttribute('data-project-id'),'dukley','Later renderHome call must not empty or replace canonical projects');
 assert(!queries.some(x=>x.startsWith('projects?')&&x.includes('updated_at')),'No canonical project query may reference nonexistent updated_at');

 dom.window.close();
 console.log('Home single-owner smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
