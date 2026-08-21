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
 const interactionSource=fs.readFileSync('pristeel-home-canonical-interaction-v1.js','utf8');

 assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(canonicalSource),'Canonical Home must not win by polling or DOM reconciliation');
 assert(!/MutationObserver\s*\(|setInterval\s*\(|supaFetch\s*\(/.test(interactionSource),'Home interaction layer must stay presentation-only');
 assert(!taskSource.includes('pristeel-home-operational-priority-v1.js'),'Task-source decorator must not inject a hidden Home renderer');
 assert(bridgeSource.includes('window.__pstHomeStabilityV2=true'),'Official Home bridge must retire Stability writer before it loads');
 assert(bridgeSource.includes('window.__pstHomeProjectRecoveryV3=true'),'Official Home bridge must retire Recovery writer before it loads');
 assert(/async function patchHomeProjects\(\)[\s\S]*renderCanonical/.test(releaseSource),'Workspace release compatibility must delegate Home refresh to canonical owner');
 assert(!/host\.innerHTML=list\.length/.test(releaseSource),'Workspace release compatibility must never write canonical Home project cards');
 assert(!/key==='home'\)setTimeout\(patchHomeProjects/.test(releaseSource),'Workspace release route must not schedule a competing Home writer');
 assert(!/page-workspace-home[^\n]*setTimeout\(patchHomeProjects/.test(releaseSource),'Workspace release startup must not repaint Home projects');

 const dom=new JSDOM(`<!doctype html><html><head></head><body>
   <div class="pst-ws-card"><div id="pst-ws-home-actions"></div></div>
   <button class="pst-ws-navbtn active" data-key="home"></button>
   <div id="page-workspace-home" class="page active" style="display:block">
     <div class="pst-ws-card-title"></div><div class="pst-ws-card-sub"></div>
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
 const dukley={id:'dukley',created_at:'2026-08-07T18:30:11Z',name:'ITALIAN STYLE - Dukley',client:'ITALIAN STYLE',ref:null,status:'pritje',pipeline_stage:'client_offer',operational_state:'action_required',last_activity_at:iso};
 const waiting={id:'waiting',created_at:'2026-08-05T10:00:00Z',name:'Projekt ne pritje',client:'CLIENT W',ref:'W-1',status:'pritje',pipeline_stage:'client_offer',operational_state:'wait_for_client',operational_state_at:iso,last_activity_at:iso};
 const work={id:'work',created_at:'2026-08-01T10:00:00Z',name:'Projekt ne pune',client:'WORK',ref:'WORK-1',status:'pritje',pipeline_stage:'pricing',operational_state:'active_work',last_activity_at:'2026-08-20T10:00:00Z'};
 const execution={id:'execution',created_at:'2026-07-01T10:00:00Z',name:'Projekt ne ekzekutim',client:'EXEC',ref:'EX-1',status:'Fituar',pipeline_stage:'production_control',operational_state:'execution',last_activity_at:'2026-08-19T10:00:00Z'};
 const request={id:'req',created_at:iso,project_id:'dukley',title:'Urgjent: përpuno kërkesën e klientit',detail:'Kërkon veprim sot.',due_date:date,priority:'e larte',status:'hapur',source:'email_request_auto',source_ref:'gmail-dukley'};
 const waitingOffer={id:88,project_id:'waiting',created_at:'2026-08-10T10:00:00Z',doc_nr:'PST-OFF-WAIT',offer_state:{pst_sent_at:'2026-08-10T11:00:00Z'}};
 const analysis={id:12,project_id:'dukley',created_at:iso,status:'complete',analysis:{event_source_ref:'gmail-dukley',recommendation:{label:'Përpuno kërkesën',decision:'vepro_tani'}}};
 const email={id:1,project_id:'dukley',subject:'Dukley',sent_at:iso,direction:'incoming',gmail_url:'https://mail.google.com/'};
 const queries=[];
 w.supaFetch=async(path,method)=>{
   queries.push(String(path));
   if(method)return [];
   if(path.startsWith('projects?'))return [dukley,waiting,work,execution];
   if(path.startsWith('tasks?status=eq.hapur'))return [request];
   if(path.startsWith('project_emails?'))return [email];
   if(path.startsWith('project_analyses?'))return [analysis];
   if(path.startsWith('rfq_log?'))return [];
   if(path.startsWith('documents_registry?'))return [waitingOffer];
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
 const action=w.document.querySelector('#pst-ws-home-actions>.pst-ws-action');
 assert(action,'Canonical Home must render priorities');
 assert.strictEqual(action.getAttribute('data-project-id'),'dukley','Action lane must contain the actionable project');
 assert.strictEqual(action.querySelector('.pst-ws-action-title').textContent,request.title,'Fresh client request must stay the concrete action');

 const waitItem=w.document.querySelector('#pst-home-waiting .pst-home-wait-item');
 assert(waitItem,'Canonical Home must render explicit waiting projects');
 assert.strictEqual(waitItem.getAttribute('data-project-id'),'waiting','Waiting lane must be driven by operational_state=wait_for_client');

 const projectIds=[...w.document.querySelectorAll('#pst-ws-home-projects>.pst-ws-projectcard')].map(x=>x.getAttribute('data-project-id'));
 assert(projectIds.includes('work'),'Active work must stay in Projects in work');
 assert(projectIds.includes('execution'),'Won execution must stay in Projects in work');
 assert(!projectIds.includes('dukley'),'Actionable project must not be duplicated in Projects in work');
 assert(!projectIds.includes('waiting'),'Waiting project must not be duplicated in Projects in work');
 assert.strictEqual(new Set(['dukley','waiting',...projectIds]).size,4,'Every active project must occupy exactly one Home lane');
 assert.strictEqual(w.document.getElementById('page-workspace-home').dataset.pstHomeOwner,'canonical-v3','Home must expose the current canonical owner');

 await Promise.resolve(w.renderHome());
 await new Promise(r=>w.setTimeout(r,25));
 assert.strictEqual(w.document.querySelector('#pst-ws-home-actions>.pst-ws-action').getAttribute('data-project-id'),'dukley','Later renderHome call must not replace canonical priorities');
 assert.strictEqual(w.document.querySelector('#pst-home-waiting .pst-home-wait-item').getAttribute('data-project-id'),'waiting','Later renderHome call must preserve waiting lane');
 assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(canonicalSource),'Canonical owner must remain event-driven');
 assert(queries.some(x=>x.startsWith('projects?')&&x.includes('operational_state')),'Canonical project query must read operational truth directly');

 dom.window.close();
 console.log('Home single-owner operational lanes smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
