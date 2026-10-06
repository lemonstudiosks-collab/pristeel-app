import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { runContactWorkflow } from '../supabase/functions/pppp-steel-buyer-discovery/contact-workflow.mjs';
import { prepareReadyDrafts } from '../supabase/functions/pppp-steel-buyer-discovery/draft-workflow.mjs';
const privateKey=generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({format:'pem',type:'pkcs8'});
const env=key=>key==='GOOGLE_SA_JSON'?JSON.stringify({private_key:privateKey,client_email:'fixture@service.test'}):key==='GMAIL_USER'?'fixture@buyer.test':key==='SUPABASE_URL'?'https://canonical.test':'fixture';
const company={id:'target-1',company_name:'Buyer',company_domain:'buyer.test',country:'DE',source_key:'eu:original-key',contact_status:'missing',target_status:'watch',evidence:[]};
let recent=[],receipts=[],history=[],appends=0,readbacks=0,values=[];
const db={from(table){const chain=new Proxy({}, {get(_,method){if(method==='then')return(resolve)=>resolve({data:table==='pppp_steel_buyer_discovery_runs_v1'?recent:table==='pppp_chatgpt_command_receipts'?receipts:table==='pppp_dach_steel_targets_v1'?[company]:table==='pppp_outbound_queue_v1'?history:[],error:null});return(...args)=>{if(['insert','upsert','update','delete'].includes(method))throw Error('Business write bypass detected');if(method==='in'&&table==='pppp_dach_steel_targets_v1'&&args[0]==='id')readbacks++;return chain;};}});return chain;}};
const mockFetch=async(url,options={})=>{
  if(url.includes('oauth2.googleapis.com'))return Response.json({access_token:'fixture'});
  if(url.includes('sheets.googleapis.com')){
    if(url.includes(':append')){appends++;values=JSON.parse(options.body).values;return Response.json({updates:{updatedRows:values.length}});}
    if(decodeURIComponent(url).endsWith('Commands!A1:Z1'))return Response.json({values:[['command_id','action_type','approval','value_json','requested_by']]});
    return Response.json({values:[]});
  }
  assert.equal(new URL(url).hostname,'buyer.test');
  return new Response('<h1>Buyer structural steel fabrication</h1><p>Purchasing: procurement@buyer.test</p><p>General contact: info@buyer.test</p>',{headers:{'content-type':'text/html'}});
};
const run=await runContactWorkflow(db,env,mockFetch,'2026-10-06');assert.equal(run.queued.length,1);assert.equal(appends,1);assert.equal(run.external_email_sent,false);
const payload=JSON.parse(values[0][3]);assert.equal(values[0][1],'dach_steel_target');assert.equal(values[0][2],'approved');assert.equal(payload.source_key,'eu:original-key');assert.equal(payload.contact_status,'found');assert.equal(payload.evidence.filter(x=>x.email).length,2);assert.equal(payload.material_scope.contact_research.contacts[0].email,'procurement@buyer.test');assert.ok(payload.material_scope.contact_research.retry_after);
recent=[{payload:{contact_workflow:{attempts:run.attempts}}}];receipts=[{command_id:run.queued[0],status:'failed',result:{}}];
const retry=await runContactWorkflow(db,env,mockFetch,'2026-10-07');assert.equal(retry.queued.length,0);assert.equal(appends,1);
receipts=[{command_id:run.queued[0],status:'succeeded',result:{target_id:'target-1'}}];
const verified=await runContactWorkflow(db,env,mockFetch,'2026-10-07');assert.equal(verified.verified[0].read_back_verified,true);assert.equal(readbacks,1);
recent=[];receipts=[];history=[{company_domain:'buyer.test',source_record_id:'target-1',sent_at:'2026-10-05'}];
const contacted=await runContactWorkflow(db,env,mockFetch,'2026-10-08');assert.equal(contacted.attempts[0].status,'existing_communication');assert.equal(appends,1);
let draftCalls=0;const skip=await prepareReadyDrafts(db,env,'fixture',async()=>{draftCalls++;});assert.equal(draftCalls,0);assert.equal(skip.items[0].reason,'existing_outreach');
console.log('Steel Buyers contact workflow: PASS (bounded research, evidence, bridge-only append, stable identity, stale retry, failed-command suppression, read-back, history guard).');
