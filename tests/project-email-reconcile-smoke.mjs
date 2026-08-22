import assert from 'node:assert/strict';
import {
  loadIdentityTools,autoEligibleHit,trustedMethod,ownerMap,classifyEmail,
  normalizeContactEmail,isExternalContactEmail,deriveProjectContacts,mergeProjectContact,projectContactPatchChanged
} from '../scripts/project-email-reconcile.mjs';

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
assert.equal(trustedMethod('verified-thread-repair-v1',100),true);
assert.equal(trustedMethod('verified-thread-continuity-v1',100),true);
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

assert.equal(normalizeContactEmail('Buyer <BUYER@Example.com>'),'buyer@example.com');
assert.equal(isExternalContactEmail('oltian.vllahiu@prissteel.com'),false,'Any PRISTEEL mailbox must be excluded from project relationships');
assert.equal(isExternalContactEmail('other@sub.prissteel.com'),false,'PRISTEEL subdomains must be excluded too');
assert.equal(isExternalContactEmail('noreply@vendor.com'),false,'System no-reply addresses must be excluded');
assert.equal(isExternalContactEmail('postmaster@vendor.com'),false,'Postmaster addresses must be excluded');
assert.equal(isExternalContactEmail('buyer@vendor.com'),true);

const contactEmails=[
  {id:'e1',gmail_message_id:'m1',project_id:'p1',sent_at:'2026-08-01T10:00:00Z',from_email:'buyer@example.com',from_name:'Buyer From Gmail',to_emails:['sales@prissteel.com','supplier@example.com'],cc_emails:['cc@example.com','noreply@vendor.com']},
  {id:'e2',gmail_message_id:'m2',project_id:'p1',sent_at:'2026-08-03T12:00:00Z',from_email:'arianit.vllahiu@prissteel.com',from_name:'Arianit',to_emails:['buyer@example.com'],cc_emails:['cc@example.com']},
  {id:'e3',gmail_message_id:'m3',project_id:'p2',sent_at:'2026-08-02T08:00:00Z',from_email:'notifications@system.com',to_emails:['sales@prissteel.com'],cc_emails:[]},
  {id:'e4',gmail_message_id:'m4',project_id:null,sent_at:'2026-08-04T08:00:00Z',from_email:'unlinked@example.com',to_emails:['sales@prissteel.com'],cc_emails:[]}
];
const globalContacts=[
  {email:'buyer@example.com',person:'Christian Meyer',company:'RSB',role:'Buyer'},
  {email:'supplier@example.com',person:'Supplier Person',company:'Supplier GmbH',role:'Sales'}
];
const derived=deriveProjectContacts(contactEmails,globalContacts);
assert.equal(derived.length,3,'Only external people on linked project emails should become project contacts');
assert(!derived.some(x=>x.email.endsWith('@prissteel.com')),'Internal PRISTEEL mailboxes leaked into project contacts');
assert(!derived.some(x=>x.email==='notifications@system.com'),'System notification mailbox leaked into project contacts');
assert(!derived.some(x=>x.email==='unlinked@example.com'),'Unlinked email participant leaked into project contacts');

const buyer=derived.find(x=>x.email==='buyer@example.com');
assert(buyer);
assert.equal(buyer.project_id,'p1');
assert.equal(buyer.name,'Christian Meyer','Canonical global contact identity must outrank sender display text');
assert.equal(buyer.company,'RSB');
assert.equal(buyer.role,'Buyer');
assert.equal(buyer.email_count,2);
assert.equal(buyer.direct_count,2);
assert.equal(buyer.cc_count,0);
assert.equal(buyer.first_seen,'2026-08-01T10:00:00.000Z');
assert.equal(buyer.last_seen,'2026-08-03T12:00:00.000Z');
assert.deepEqual(buyer.source_message_ids,['m1','m2']);

const cc=derived.find(x=>x.email==='cc@example.com');
assert(cc);
assert.equal(cc.email_count,2);
assert.equal(cc.direct_count,0);
assert.equal(cc.cc_count,2);

const manualExisting={id:'pc1',project_id:'p1',email:'buyer@example.com',name:'Manual Name',company:'Manual Co',role:'Decision maker',first_seen:'2026-07-01T00:00:00Z',last_seen:'2026-07-02T00:00:00Z',email_count:1,direct_count:1,cc_count:0,source_message_ids:['old'],is_primary:true,source:'manual',status:'vip'};
const manualPatch=mergeProjectContact(manualExisting,buyer);
assert.equal(manualPatch.name,'Manual Name');
assert.equal(manualPatch.company,'Manual Co');
assert.equal(manualPatch.role,'Decision maker');
assert.equal(manualPatch.source,'manual');
assert.equal(Object.hasOwn(manualPatch,'status'),false,'Manual status must not be overwritten');
assert.equal(Object.hasOwn(manualPatch,'is_primary'),false,'Primary-contact choice must never be overwritten by email reconciliation');
assert.equal(projectContactPatchChanged(manualExisting,manualPatch),true,'Changed email statistics must be detected');

const autoExisting={...buyer,id:'pc2',name:'',company:'',role:'',source:'email-auto',status:'inactive',is_primary:false};
const autoPatch=mergeProjectContact(autoExisting,buyer);
assert.equal(autoPatch.name,'Christian Meyer');
assert.equal(autoPatch.company,'RSB');
assert.equal(autoPatch.role,'Buyer');
assert.equal(autoPatch.source,'email-auto');
assert.equal(autoPatch.status,'active');
assert.equal(projectContactPatchChanged({...autoExisting,...autoPatch},autoPatch),false,'An already synchronized row must not generate another write');

console.log('Project email and project contact reconciliation safety smoke test passed.');
