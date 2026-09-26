import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const source=fs.readFileSync('pristeel-representation-opportunities-v2.js','utf8');
assert(!/send_email|send_draft|gmailSend|outbound_queue/.test(source),'Opportunity extension must not send or queue email');
assert(source.includes('project verified')&&source.includes('procurement stage known')&&source.includes('company fit verified'),'Outreach gate must expose all three prerequisites');

const dom=new JSDOM('<!doctype html><html><head></head><body><div id="page-representations" class="page active"><div class="pst-rep-page"><header class="pst-rep-head"></header><div class="pst-rep-kpis"></div><div class="pst-rep-pipeline"></div><div class="pst-rep-toolbar"></div><div class="pst-rep-shell"></div></div></div></body></html>',{url:'https://example.test/',runScripts:'outside-only'});
const {window}=dom;
const rpcCalls=[];
window.PSTRepresentationsV1={open(){}};
window.confirm=()=>true;
window.supaFetch=async (path,method,body)=>{
  if(path.startsWith('pppp_representation_opportunities_v1'))return [{id:'o1',source_key:'ebrd:55387',project_name:'KOSTT 55387',status:'waiting_procurement',verification_status:'verified',procurement_stage:null,fact_evidence:{total_project_value:{status:'confirmed'}},total_project_value:42800000,currency:'EUR'}];
  if(path.startsWith('pppp_representation_opportunity_targets_v1'))return [{opportunity_id:'o1',target_id:'t1',candidate_role:'lead_epc_candidate',company_fit_status:'verified'}];
  if(path.startsWith('pppp_representation_targets_v1'))return [{id:'t1',company_name:'ENPROM',target_type:'lead_epc_candidate'}];
  if(path.startsWith('pppp_partnership_expansion_queue_v1'))return [{tender_watch_id:'tw1',source:'KRPP',title:'KEK steel',authority:'KEK',canonical_tender_identity:'KEK-1',representation_opportunity_id:null}];
  if(path==='rpc/pppp_register_representation_handoff_v1'){
    assert.equal(method,'POST');
    rpcCalls.push(body);
    return {ok:true,opportunity_id:'o2',created:true};
  }
  throw new Error(`Unexpected API path: ${path}`);
};
window.eval(source);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
await new Promise(resolve=>window.setTimeout(resolve,10));
window.document.querySelector('[data-rep-mode="opportunities"]').click();
await new Promise(resolve=>window.setTimeout(resolve,10));
assert.match(window.document.querySelector('[data-rep-opportunity-view]').textContent,/KOSTT 55387/);
assert.match(window.document.querySelector('[data-opp-detail]').textContent,/Outreach i bllokuar/,'Known project and verified fit must remain blocked while procurement stage is unknown');
assert.match(window.document.querySelector('[data-opp-detail]').textContent,/Confirmed/,'Confirmed facts must be visibly distinct');
assert.match(window.document.querySelector('[data-rep-opportunity-view]').textContent,/Regjistro për analizë/,'Pending handoffs must require an explicit user action');
window.document.querySelector('[data-opp-consume="tw1"]').click();
await new Promise(resolve=>window.setTimeout(resolve,10));
assert.equal(rpcCalls.length,1,'Explicit handoff action must call the consumer-owned RPC exactly once');
assert.equal(rpcCalls[0].p_tender_watch_id,'tw1');
const api=window.PSTRepresentationOpportunitiesV2;
assert.equal(api.readiness({verification_status:'verified',procurement_stage:'Tender Open'},{company_fit_status:'verified'}).ok,true);
assert.equal(api.readiness({verification_status:'verified',procurement_stage:''},{company_fit_status:'verified'}).ok,false);
assert.match(source,/pppp_partnership_expansion_queue_v1/,'Representation must read the neutral handoff queue');
assert.match(source,/rpc\/pppp_register_representation_handoff_v1/,'Representation must use the explicit handoff RPC');
dom.window.close();
console.log('Representation Opportunities v2 smoke: PASS');
