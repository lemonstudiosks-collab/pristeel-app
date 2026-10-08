import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const context={URL,console,Date};vm.createContext(context);
vm.runInContext(fs.readFileSync('pristeel-ted-outreach-policy-v1.js','utf8'),context);
const P=context.PSTTedOutreachPolicyV1;
const transport={title:'Transport services (excl. Waste transport) – Third-Party Logistics (3PL) - Warehouse and freight-forwarding services',fpp:'60000000',source_url:'https://ted.europa.eu/en/notice/628114-2026/html',payload:{category:'steel_structure',match_reasons:['project term: warehouse'],winner:{company_type:'gc_epc'}}};
assert.equal(P.scope(transport).state,'excluded');
assert.equal(P.scope({...transport,title:'Transport services with structural steel',fpp:'60000000'}).state,'review');
assert.equal(P.scope({title:'Warehouse construction',source_url:transport.source_url}).ok,false);
const steel={title:'Structural steel erection',source_url:transport.source_url,payload:{}};
const company={company:{company_type:'gc_epc',verification_status:'verified',business_summary:'General contractor for building construction',domain:'example.de',source_urls:['https://example.de/about']}};
assert.equal(P.assess(steel,{},company).ok,true);
assert.equal(P.assess(steel,{},{}).ok,false);
assert.equal(P.assess(steel,{company_role:'trader_consortium'},{}).ok,false);
assert.equal(P.assess(steel,{}, {company:{...company.company,business_summary:'Example · gc_epc'}}).ok,false);
assert.equal(P.assess(steel,{}, {company:{...company.company,business_summary:'Transport services and freight forwarding'}}).state,'excluded');
for(const e of ['hr@example.de','careers@example.de','airfreight@example.de','privacy@example.de'])assert.equal(P.recipient(e,{}),false);
assert.equal(P.recipient('purchasing@example.de',{draft_eligible:true}),true);
assert.equal(P.recipient('purchasing@example.de',{do_not_contact:true}),false);
assert.equal(P.sendReadiness(null),false);
const now=Date.now(),ready={domain:'prissteel.com',spf:true,dkim:true,dmarc:true,opt_out_handling:true,campaign_approved:true,verified_at:new Date(now-1000).toISOString(),valid_until:new Date(now+10000).toISOString()};
assert.equal(P.sendReadiness(ready,now),true);
assert.equal(P.sendReadiness({...ready,dkim:false},now),false);
assert.equal(P.sendReadiness({...ready,valid_until:new Date(now-1).toISOString()},now),false);
let index=stripTypeScriptTypes(fs.readFileSync('supabase/functions/pppp-opportunity-draft-generator/index.ts','utf8'));
const from=index.indexOf('async function processAction('),to=index.indexOf('\nDeno.serve',from);
assert(from>=0&&to>from);
let reads=0,writes=0;
context.TED_POLICY=P;context.text=String;context.tenderContext=async()=>transport;context.opportunityIntelligence=async()=>{writes++;throw Error('must not enrich blocked tender');};
context.db={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>{reads++;return{data:null,error:null};}})})})};
vm.runInContext(index.slice(from,to),context);
const result=await context.processAction({id:'action',route:'TED_GENERAL',payload:{}},{writes:0},true,true,false,true,'gc_epc');
assert.equal(result.event,'readiness_blocked');assert.equal(result.created,0);assert.equal(writes,0);assert.equal(reads,1);
for(const name of ['pppp-opportunity-draft-generator','pppp-outbound-dispatch','pppp-opportunity-followup-v1'])stripTypeScriptTypes(fs.readFileSync('supabase/functions/'+name+'/index.ts','utf8'));
const html=fs.readFileSync('ted-sales.html','utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
console.log('TED policy regressions, explicit override resistance, zero-write transport gate, and TypeScript syntax: PASS');

const tender=(id,name,mail,title='Structural steel erection')=>({id,title,status:'new',source_url:'https://ted.europa.eu/en/notice/123456-2026/html',payload:{source:'TED',winner:{name,email:mail}}});
const deskRows=[tender('draft','Draft GmbH','info@draft.de'),tender('sent','Waiting GmbH','info@waiting.de'),tender('reply','Reply GmbH','info@reply.de'),tender('transport','Rosebrock','info@rosebrock.com',transport.title),tender('free-a','Alpha GmbH','alpha@gmail.com'),tender('free-b','Beta GmbH','beta@gmail.com')];
const deskState={rows:deskRows,projectRows:[],source:'all',field:'all',winner_group:'all',mode:'all',query:'',contactHistoryRows:[],communicationRows:[],communicationByTender:{},outreachByTender:{},emailByThread:{oldthread:[{direction:'outgoing',sent_at:'2026-10-03'}]},outreachRows:[{id:'draft1',tender_watch_id:'draft',status:'draft_created',recipient_email:'info@draft.de',recipient_company_name:'Draft GmbH',gmail_draft_id:'d1',gmail_thread_id:'oldthread',draft_created_at:'2026-10-01'},{id:'sent1',tender_watch_id:'sent',status:'sent',recipient_email:'info@waiting.de',recipient_company_name:'Waiting GmbH',sent_at:'2026-10-01'},{id:'reply1',tender_watch_id:'reply',status:'replied',recipient_email:'info@reply.de',recipient_company_name:'Reply GmbH',sent_at:'2026-10-01',replied_at:'2026-10-03'}]};
const w={PSTTedOutreachPolicyV1:P,PSTProjectCentricWorkflowV1:{_state:deskState,_test:{tenderSource:r=>r.payload.source,opportunityLifecycle:r=>r.lane||'new'}},PSTTenderPriorityActionsV2:{enrichedContacts:r=>r.payload.winner.email?[{email:r.payload.winner.email}]:[]}};
const dc={window:w,document:{readyState:'loading',addEventListener:()=>{}},URL,Date,console,setTimeout:()=>0};
vm.createContext(dc);vm.runInContext(fs.readFileSync('pristeel-opportunities-filter-polish-v1.js','utf8'),dc);
const T=w.PSTOpportunitiesDeskV1._test;
assert.equal(T.workRows('drafts').length,1,'thread activity cannot turn an existing draft into sent');
assert.equal(T.workRows('waiting').length,1,'only confirmed sending enters waiting');
assert.equal(T.workRows('attention').length,1,'replied company requires attention');
assert.equal(T.workRows('excluded').some(g=>g.row.id==='transport'),true);
assert.equal(T.groupWorkRows(deskRows.filter(r=>r.id.startsWith('free'))).length,2,'free email domains never merge two companies');
assert.match(T.workPanel(),/Reply GmbH/);
assert.doesNotMatch(T.workPanel(),/Draft GmbH/);
assert.match(T.workPanel(),/<h4>Shqyrto përgjigjen<\/h4>/);
assert.doesNotMatch(T.workPanel(),/class="pst-opp-work-row"|<table|një rresht për kompani/);
assert.equal(T.actionItems()[0].type,'reply');
assert.match(T.actionItems()[0].url,/from%3Ainfo%40reply.de/);
deskState.outreachRows.push({id:'draft2',tender_watch_id:'sent',status:'draft_created',recipient_email:'other@waiting.de',recipient_company_name:'Waiting GmbH',gmail_draft_id:'d2',draft_created_at:'2026-10-04'});
assert.equal(T.workRows('drafts').length,2,'older sent mail does not hide a second current draft');
deskState.outreachRows.push({id:'reply2',tender_watch_id:'reply',status:'replied',recipient_email:'other@reply.de',recipient_company_name:'Reply GmbH',gmail_thread_id:'thread2',sent_at:'2026-10-01',replied_at:'2026-10-04'});
assert.equal(T.actionItems().length,2,'two real conversations with one company remain distinct actions');
assert.equal(T.actionItems().find(x=>x.row.__pstContactMeta.thread==='thread2').url,'https://mail.google.com/mail/u/0/#all/thread2');
w.PSTProjectCentricWorkflowV1._test.ownedByProject=r=>r.id==='reply';
assert.equal(T.actionItems().length,0,'a signal already owned by a canonical Project is not duplicated in the Opportunities action center');
w.PSTProjectCentricWorkflowV1._test.ownedByProject=()=>false;
deskState.contactHistoryRows=[
 {id:'due',tender_watch_id:'sent',company_name:'Waiting GmbH',contact_email:'info@waiting.de',status:'sent',touch_1:'2026-10-01',follow_up_date:'2000-01-01',gmail_thread_id:'followthread'},
 {id:'future',company_name:'Future GmbH',contact_email:'info@future.de',status:'sent',touch_1:'2026-10-01',follow_up_date:'2999-01-01'},
 {id:'closed',company_name:'Closed GmbH',contact_email:'info@closed.de',status:'replied',replied:true,closed:true,touch_1:'2026-10-01'},
 {id:'meeting',company_name:'Meeting GmbH',contact_email:'info@meeting.de',status:'meeting',meeting:true,touch_1:'2026-10-01'}
];
assert.equal(T.actionItems().filter(x=>x.type==='followup').length,1);
assert(!T.actionItems().some(x=>/Future|Closed|Meeting/.test(x.row.__pstContactMeta.company)),'waiting, closed records and a meeting without a due action do not manufacture work');
deskState.source='KRPP';
assert.equal(T.actionItems().length,0,'source selection applies to actions');
assert.match(T.attentionPanel(),/Nuk ke veprime të konfirmuara tani/);
deskState.source='all';
const standalone={Intl,Date,document:{},window:{},URL,console};
vm.createContext(standalone);vm.runInContext(script.replace(/loadData\(\);\s*$/,''),standalone);
vm.runInContext('rows='+JSON.stringify([
 {tender_watch_id:'one',company_name:'Same GmbH',replied:true,latest_gmail_url:'https://mail.google.com/mail/u/0/#all/thread1'},
 {tender_watch_id:'two',company_name:'Same GmbH',replied:true,latest_gmail_url:'https://mail.google.com/mail/u/0/#all/thread2'},
 {tender_watch_id:'waiting',company_name:'Waiting GmbH',touch_1:'2026-10-01'},
 {tender_watch_id:'closed',company_name:'Closed GmbH',replied:true,closed:true},
 {tender_watch_id:'unknown',company_name:'Unknown GmbH',human_action_required:true}
 ])+';',standalone);
assert.equal(vm.runInContext("workData('attention').length",standalone),2,'standalone actions are conversations, not company groups or unknown-role backlog');
assert.match(vm.runInContext("actionMarkup(rows[0])",standalone),/Shqyrto përgjigjen/);
console.log('Action desk executable grouping, draft/sent separation, thread specificity and default attention rendering: PASS');
