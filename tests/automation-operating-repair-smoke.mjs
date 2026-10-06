import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {normalizeTedAward,preserveWinnerIntelligence} from '../scripts/ted-award-winner-sync.mjs';

function loadEdge(path,db,names,env={},overrides=''){
  const source=fs.readFileSync(path,'utf8').replace(/^import[^\n]*\n/gm,'');
  const js=stripTypeScriptTypes(source,{mode:'strip'});
  const context={createClient:()=>db,Deno:{env:{get:k=>env[k]||''},serve:()=>{}},console,
    crypto:globalThis.crypto,fetch:()=>{throw new Error('external calls forbidden in test');},
    Request,Response,URL,TextEncoder,TextDecoder,Buffer,setTimeout,clearTimeout};
  vm.runInNewContext(js+'\n'+overrides+'\nglobalThis.testExports={'+names.join(',')+'};',context);
  return context.testExports;
}

const raw={'publication-number':'685611-2026','notice-type':'can-standard',
  'notice-title':{eng:'Poland – Construction work – Termomodernizacja'},
  'classification-cpv':['45000000'],'buyer-name':{eng:'Miasto Łódź'}};
const missing=normalizeTedAward(raw);
assert.equal(missing.currency,'XXX','missing currency must satisfy storage without inventing EUR');
assert.equal(missing.payload.ted_details.value_currency,null,'missing source evidence stays missing');
preserveWinnerIntelligence([missing],[{source_key:missing.source_key,currency:'PLN',estimated_value:1200,payload:{}}]);
assert.equal(missing.currency,'PLN');
assert.equal(missing.estimated_value,1200,'do not attach unknown-currency amounts to a previous currency');

let scans=0;
const memory=loadEdge('supabase/functions/pppp-project-memory-synthesis/index.ts',
  {from(){scans++;throw new Error('provider-off must not query projects');}},['run']);
const skipped=await memory.run(new Request('https://example.test/?limit=1'));
assert.equal(skipped.status,'blocked');assert.equal(skipped.projects_checked,0);assert.equal(scans,0);

let receiptReads=0;
const bridgeDb={from(table){assert.equal(table,'pppp_chatgpt_command_receipts');receiptReads++;
  return{select(){return this;},in(_key,ids){return Promise.resolve({data:ids.map(id=>({command_id:id,project_id:null,status:'succeeded',attempts:1})),error:null});}};
}};
const bridge=loadEdge('supabase/functions/chatgpt-command-bridge/worker.ts',bridgeDb,
  ['commandReceipts','permanentValidationError','validateRepresentationModel']);
const commands=Array.from({length:296},(_,n)=>({command_id:'cmd-'+n,approval:'approved'}));
commands.push({command_id:'never-read',approval:'pending'});
assert.equal((await bridge.commandReceipts(commands)).size,296);assert.equal(receiptReads,2,'296 receipts use two bounded reads');
assert.equal(bridge.permanentValidationError(new Error('exchange_rate_to_eur_required')),true);
assert.equal(bridge.permanentValidationError({code:'23514',message:'constraint'}),true);
assert.equal(bridge.permanentValidationError(new Error('network timeout')),false);
assert.throws(()=>bridge.validateRepresentationModel({target_model:'dealer'}),/target_model must be/);
bridge.validateRepresentationModel({target_model:'commercial_agent'});
bridge.validateRepresentationModel({});

let reconcileReads=0;const written=[];
const invalidCsv='command_id,approval,action_type,value_json\nbad-1,approved,dach_steel_target,"{""source_key"":""mt:de:example.org"",""company_name"":""Example"",""contact_status"":""verified_public""}"\nbad-1,approved,dach_steel_target,"{}"';
const reconcileDb={from(){return{
 select(){reconcileReads++;return this;},
 in(){return Promise.resolve({data:[],error:null});},
 upsert(value){written.push(value);return Promise.resolve({error:null});}
};}};
const validationRun=loadEdge('supabase/functions/chatgpt-command-bridge/worker.ts',reconcileDb,['reconcile'],{},
 'exportCommandsCsv=async()=>'+JSON.stringify(invalidCsv)+';');
const validationSummary=await validationRun.reconcile();
assert.equal(validationSummary.failed,1);assert.equal(validationSummary.skipped,1);
assert.equal(reconcileReads,1,'receipt reads must stay batched through all receipt writes');
assert.equal(written.at(-1).attempts,3,'permanent validation failures must stop automatic retries');
assert.equal(written.at(-1).result.human_review_required,true);

const p1={id:'p1',name:'Alpha Station',ref:'ALPHA-2026',status:'hapur'};
const p2={id:'p2',name:'Beta Station',ref:'BETA-2026',status:'hapur'};
const threadLinks=[
 {gmail_thread_id:'mixed',project_id:'p1'},{gmail_thread_id:'mixed',project_id:'closed-project'},
 {gmail_thread_id:'single',project_id:'p1'},{gmail_thread_id:'closed',project_id:'closed-project'}];
const intake=loadEdge('supabase/functions/gmail-project-intake/index.ts',
 {from(){return{select(){return this;},in(){return this;},not(){return this;},limit(){return Promise.resolve({data:threadLinks,error:null});}};}},
 ['threadProjectMap','classify','buildIndex']);
const mapped=await intake.threadProjectMap(['mixed','single','closed'].map(gmail_thread_id=>({gmail_thread_id})),[p1,p2]);
assert.equal(mapped.get('mixed'),null,'active plus terminal project thread must stay ambiguous');
assert.equal(mapped.get('single').id,'p1');
assert.equal(mapped.get('closed'),null,'terminal-only thread cannot be inherited into another project');
const index=intake.buildIndex([p1,p2]);
assert.equal(intake.classify({subject:'BETA-2026',snippet:''},index).project.id,'p2');

let fromCalls=0,noiseFilter=false;
const raceDb={from(table){
 fromCalls++;const builder={
  select(){return this;},order(){return this;},gte(){return this;},eq(){return this;},
  is(){return this;},not(column,op,value){if(column==='subject'){assert.equal(op,'ilike');assert.match(value,/Report Domain/);noiseFilter=true;}return this;},
  update(){this.write=true;return this;},
  limit(){return this;},
  then(resolve){return Promise.resolve({data:table==='projects'?[p1]:[{id:'e1',gmail_message_id:'m1',gmail_thread_id:null,subject:'ALPHA-2026',snippet:'',direction:'incoming'}],error:null}).then(resolve);},
  maybeSingle(){return Promise.resolve({data:null,error:null});}
 };return builder;
}};
const race=loadEdge('supabase/functions/gmail-project-intake/index.ts',raceDb,['reconcile']);
const raced=await race.reconcile(2,20);
assert.equal(raced.concurrent_skipped,1);assert.equal(raced.linked,0);
assert.equal(fromCalls,3,'concurrent assignment must not create links, offers or tasks');
assert.equal(noiseFilter,true);
console.log('Automation repair: currency evidence, no-provider cost guard, batched receipts, validation, thread conflicts and concurrent-write guards passed.');

const health=fs.readFileSync('pristeel-automation-health-v1.js','utf8');
const browser={window:{addEventListener(){}},document:{addEventListener(){},getElementById(){return null;}},setTimeout(){},Date,console};
vm.runInNewContext(health.replace(/\}\)\(\);\s*$/,'window.testOperatingRows=operatingRows;})();'),browser);
const rendered=browser.window.testOperatingRows({operating:{runtime:{
 memory_synthesis:{configured:false,http_status:200,at:'2026-10-06T04:25:00Z'},
 event_intelligence:{provider_configured:false,http_status:200},
 project_intake:{http_status:200,linked:0,unmatched:10}
},commands_7d:[{status:'failed',count:3}],tender_fetch:[{status:'queued',count:19}],steel_discovery:[]}});
assert.match(rendered,/I bllokuar/,'HTTP 200 must not hide an unconfigured provider');
assert.match(rendered,/Me rregulla/);
assert.match(rendered,/19 në pritje/);
assert.match(rendered,/3 për shqyrtim/);
assert.match(health,/Date\.now\(\)-last<300000/,'health loads must be cached for five minutes');
console.log('Automation health evidence rendering passed.');

// A health panel created on Home must move into the current visible System page.
const systemPage={classList:{contains:()=>true},style:{},appendChild(node){node.parentElement=this;}};
const cachedPanel={parentElement:{id:'page-home'}};
const relocation={window:{addEventListener(){}},document:{head:{appendChild(){}},addEventListener(){},getElementById(id){return id==='page-workspace-apps'?systemPage:id==='pst-auto-health'?cachedPanel:id==='pst-ah-css'?{}:null;}},setTimeout(){},Date,console};
vm.runInNewContext(health.replace(/\}\)\(\);\s*$/,'last=Date.now();window.testLoad=load;})();'),relocation);
await relocation.window.testLoad(false);
assert.equal(cachedPanel.parentElement,systemPage,'cached panel must remain visible after navigation');
assert.match(health,/\[data-sys="automation"\]/,'System automation control must open health');
console.log('Automation health navigation and cached-panel relocation passed.');
