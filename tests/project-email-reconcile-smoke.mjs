import assert from 'node:assert/strict';
import { loadIdentityTools,autoEligibleHit,trustedMethod,ownerMap,classifyEmail } from '../scripts/project-email-reconcile.mjs';

const tools=await loadIdentityTools();
const projects=[
  {id:'p8910',name:'EVOSYS Laser — ANF-8910 Schweißbaugruppen/-gestell 05510',client:'Evosys Laser GmbH',ref:'ANF-8910',business_ref:'ANF-8910',identity_aliases:[]},
  {id:'p8915',name:'EVOSYS Laser — ANF-8915 Schweißbaugruppen/-gestell',client:'Evosys Laser GmbH',ref:'ANF-8915',business_ref:'ANF-8915',identity_aliases:[]},
  {id:'pbunt',name:'PROJEKT TENNET · SPIE',client:'Spie',ref:'PROJEKT TENNET',business_ref:'BUNT',identity_aliases:[]},
  {id:'pairbus',name:'Halle 24X ModOps — Übergänge Ebene 1 & 2',client:'Stacon GmbH & Co. KG',ref:'25007HH',business_ref:'25007HH',identity_aliases:['260784','260784_Airbus H24X_Anfrage Fertigung']},
  {id:'psemantic',name:'Pristeel–Friedrich 30 Proposal — For Your Review',client:'Friedrich 30',ref:'',business_ref:null,identity_aliases:[]},
  {id:'pstandard',name:'Kooperationsanfrage Stahlbau nach EN 1090-2 EXC4',client:'Knapp Engineering',ref:'',business_ref:null,identity_aliases:[]}
];
const index=tools.buildIndex(projects);
let owners=ownerMap([],[]);

assert.equal(trustedMethod('manual',100),true);
assert.equal(trustedMethod('verified-identity-reconcile-v1',100),true);
assert.equal(trustedMethod('project-identity-audit-ssp',100),true);
assert.equal(trustedMethod('gmail-panel',100),true);
assert.equal(trustedMethod('email',90),false,'Old email-only matching must never seed thread inheritance');
assert.equal(trustedMethod('email+snippet+snippet',100),false,'Old contact/snippet scoring must not seed thread inheritance');

let d=classifyEmail({id:1,gmail_thread_id:'t1',subject:'Re: ANF-8910 Anfrage Schweißbaugruppen',snippet:'',match_method:null},index,owners,tools,{allowThread:false});
assert.equal(d.target,'p8910');
assert.equal(d.reason,'strong-identity');
assert(autoEligibleHit(d.result.hits[0]));
assert.equal(autoEligibleHit({anchors:[{kind:'business_ref',key:'bunt'}]}),false,'Short generic refs without digits must never be auto-link grade');
assert.equal(autoEligibleHit({anchors:[{kind:'semantic',key:'pristeel'}]}),false,'Semantic brand wording may suggest but must never auto-write a project relation');
assert.equal(autoEligibleHit({anchors:[{kind:'name_ref',key:'en1090'}]}),false,'Standards such as EN1090 are not project identities');

d=classifyEmail({id:2,gmail_thread_id:'t2',subject:'AW: ANF-8910 / ANF-08915 Schweißbaugruppen',snippet:'',match_method:null},index,owners,tools,{allowThread:false});
assert.equal(d.target,'');
assert.equal(d.reason,'mixed','Mixed sibling references must fail closed');

d=classifyEmail({id:3,gmail_thread_id:'t3',subject:'Kapazitäten für BUNTE',snippet:'',match_method:null},index,owners,tools,{allowThread:false});
assert.equal(d.target,'');
assert.equal(d.reason,'insufficient-identity','Short generic BUNT must not match inside the unrelated word BUNTE');

d=classifyEmail({id:9,gmail_thread_id:'ts',subject:'Structural Steel Capacity by PRISTEEL',snippet:'',match_method:null},index,owners,tools,{allowThread:false});
assert.equal(d.target,'');
assert.equal(d.reason,'weak-identity-anchor','PRISTEEL brand wording alone may never auto-link to a project');

d=classifyEmail({id:10,gmail_thread_id:'te',subject:'Stahlbau nach EN 1090-2 EXC4',snippet:'',match_method:null},index,owners,tools,{allowThread:false});
assert.equal(d.target,'');
assert.equal(d.reason,'weak-identity-anchor','EN1090/EXC wording alone may never auto-link to a project');

d=classifyEmail({id:8,gmail_thread_id:'ta',subject:'Re: 260784_Airbus H24X_Anfrage Fertigung',snippet:'',match_method:null},index,owners,tools,{allowThread:false});
assert.equal(d.target,'pairbus','Historical request reference must resolve through canonical project identity_aliases');
assert.equal(d.reason,'strong-identity');
assert(d.result.hits[0].anchors.some(a=>a.key==='260784'),'Alias reference 260784 must be indexed as a strong known project identity');

owners=ownerMap([{gmail_thread_id:'t4',project_id:'p8910',match_method:'manual',match_confidence:100}],[]);
d=classifyEmail({id:4,gmail_thread_id:'t4',subject:'Danke für die Rückmeldung',snippet:'',match_method:null},index,owners,tools,{allowThread:true});
assert.equal(d.target,'p8910');
assert.equal(d.reason,'single-project-thread');

d=classifyEmail({id:5,gmail_thread_id:'t4',subject:'Neue Anfrage ANF-9999',snippet:'',match_method:null},index,owners,tools,{allowThread:true});
assert.equal(d.target,'');
assert.equal(d.reason,'unknown-reference','Unknown strong ref must block thread inheritance');

owners=ownerMap([{gmail_thread_id:'t5',project_id:'p8910',match_method:'email',match_confidence:90}],[]);
d=classifyEmail({id:11,gmail_thread_id:'t5',subject:'Danke für die Rückmeldung',snippet:'',match_method:null},index,owners,tools,{allowThread:true});
assert.equal(d.target,'');
assert.equal(d.reason,'insufficient-identity','Untrusted historical email-only links must not propagate through the thread');

d=classifyEmail({id:6,gmail_thread_id:'t4',subject:'Delivery Status Notification',snippet:'',match_method:null},index,owners,tools,{allowThread:true});
assert.equal(d.reason,'system-mail');

d=classifyEmail({id:7,gmail_thread_id:'t4',subject:'ANF-8910',snippet:'',match_method:'manual-ignored'},index,owners,tools,{allowThread:true});
assert.equal(d.reason,'manual-ignored');

console.log('Project email reconciliation safety smoke test passed.');
