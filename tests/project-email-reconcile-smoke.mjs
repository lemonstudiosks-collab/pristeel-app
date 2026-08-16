import assert from 'node:assert/strict';
import { loadIdentityTools,autoEligibleHit,ownerMap,classifyEmail } from '../scripts/project-email-reconcile.mjs';

const tools=await loadIdentityTools();
const projects=[
  {id:'p8910',name:'EVOSYS Laser — ANF-8910 Schweißbaugruppen/-gestell 05510',client:'Evosys Laser GmbH',ref:'ANF-8910',business_ref:'ANF-8910'},
  {id:'p8915',name:'EVOSYS Laser — ANF-8915 Schweißbaugruppen/-gestell',client:'Evosys Laser GmbH',ref:'ANF-8915',business_ref:'ANF-8915'},
  {id:'pbunt',name:'PROJEKT TENNET · SPIE',client:'Spie',ref:'PROJEKT TENNET',business_ref:'BUNT'}
];
const index=tools.buildIndex(projects);
let owners=ownerMap([],[]);

let d=classifyEmail({id:1,gmail_thread_id:'t1',subject:'Re: ANF-8910 Anfrage Schweißbaugruppen',snippet:'',match_method:null},index,owners,tools,{allowThread:false});
assert.equal(d.target,'p8910');
assert.equal(d.reason,'strong-identity');
assert(autoEligibleHit(d.result.hits[0]));
assert.equal(autoEligibleHit({anchors:[{kind:'business_ref',key:'bunt'}]}),false,'Short generic refs without digits must never be auto-link grade');

d=classifyEmail({id:2,gmail_thread_id:'t2',subject:'AW: ANF-8910 / ANF-08915 Schweißbaugruppen',snippet:'',match_method:null},index,owners,tools,{allowThread:false});
assert.equal(d.target,'');
assert.equal(d.reason,'mixed','Mixed sibling references must fail closed');

d=classifyEmail({id:3,gmail_thread_id:'t3',subject:'Stahlbau-Kapazitäten für BUNTE',snippet:'',match_method:null},index,owners,tools,{allowThread:false});
assert.equal(d.target,'');
assert.equal(d.reason,'weak-identity-anchor','Short generic BUNT must not auto-link merely because BUNTE contains it');

owners=ownerMap([{gmail_thread_id:'t4',project_id:'p8910'}],[]);
d=classifyEmail({id:4,gmail_thread_id:'t4',subject:'Danke für die Rückmeldung',snippet:'',match_method:null},index,owners,tools,{allowThread:true});
assert.equal(d.target,'p8910');
assert.equal(d.reason,'single-project-thread');

d=classifyEmail({id:5,gmail_thread_id:'t4',subject:'Neue Anfrage ANF-9999',snippet:'',match_method:null},index,owners,tools,{allowThread:true});
assert.equal(d.target,'');
assert.equal(d.reason,'unknown-reference','Unknown strong ref must block thread inheritance');

d=classifyEmail({id:6,gmail_thread_id:'t4',subject:'Delivery Status Notification',snippet:'',match_method:null},index,owners,tools,{allowThread:true});
assert.equal(d.reason,'system-mail');

d=classifyEmail({id:7,gmail_thread_id:'t4',subject:'ANF-8910',snippet:'',match_method:'manual-ignored'},index,owners,tools,{allowThread:true});
assert.equal(d.reason,'manual-ignored');

console.log('Project email reconciliation safety smoke test passed.');
