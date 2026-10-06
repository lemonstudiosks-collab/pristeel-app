import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { renderBuyerOutreach,buyerLanguage,templates,signatureText } from '../supabase/functions/pppp-dach-steel-draft-generator/buyer-outreach.mjs';
import { publishedContacts,researchOfficialCompany,officialUrl } from '../supabase/functions/pppp-steel-buyer-discovery/contact-research.mjs';
import { prepareReadyDrafts } from '../supabase/functions/pppp-steel-buyer-discovery/draft-workflow.mjs';

for(const country of ['DE','AT','CH'])assert.equal(buyerLanguage({country}),'de');
for(const country of ['GB','NO','SE','HR','RS','ME','FR'])assert.equal(buyerLanguage({country}),'en');
assert.deepEqual(Object.keys(templates),['buyer_outreach_en','buyer_outreach_de']);
const target={id:'11111111-1111-4111-8111-111111111111',company_name:'Müller & Söhne',country:'DE',company_domain:'buyer.test',buyer_type:'Tier 1 – Stahlbau',primary_activity:'Aktiviteti kryesor: Stahlbau',last_verified_at:'2026-10-06',products:['high material relevance'],workflow_state:'ready_for_outreach',outreach_engine_version:'v2',company_fit_score:90,commercial_timing_score:50,contact_quality_score:90};
const contact={email:'procurement@buyer.test',person:'Jörg Müller',role:'Strategic Procurement',score:95,outreach_allowed:true};
const de=renderBuyerOutreach(target,contact,'<div>Arianit Vllahiu<br>PRISTEEL<img src="https://www.prissteel.com/logo.png"></div>');
assert.equal(de.subject,'Stahllieferung für Müller & Söhne | PRISTEEL');
assert.match(de.body,/Guten Tag Jörg Müller,/);assert.match(de.body,/im Stahlbau/);assert.match(de.body,/Güten|gewünschten/);
assert.doesNotMatch(de.body,/Tier|Aktiviteti|material relevance|source confidence|high|active in/);
assert.match(de.html_body,/Müller &amp; Söhne/);assert.equal((de.body.match(/Arianit Vllahiu/g)||[]).length,1);assert.match(de.html_body,/logo.png/);
const en=renderBuyerOutreach({...target,company_name:"O'Neil & Partners",country:'GB',buyer_type:'shipyard',primary_activity:'shipbuilding'},{});
assert.match(en.body,/shipbuilding/);assert.match(en.body,/heavy plate/);assert.doesNotMatch(en.body,/Guten Tag|Tier|Aktiviteti/);assert.match(en.html_body,/O&#39;Neil &amp; Partners/);assert.match(en.body,/PRISTEEL/);
assert.match(renderBuyerOutreach({...target,last_verified_at:null},{}).body,/möglicherweise/);
assert.match(renderBuyerOutreach(target,{}).body,/^Guten Tag,/);
for(const country of ['DE','GB'])for(const outreach_motion of ['external_production_capacity','future_supplier_qualification']){
 const routed=renderBuyerOutreach({...target,country,outreach_motion},{});assert.equal(routed.offer_model,outreach_motion);assert.equal(routed.approach_mode,outreach_motion);assert.doesNotMatch(routed.body,/Aktiviteti|Tier/);
 assert.match(routed.body,country==='DE'?/ProCredit Bank|Südosteuropa/:/ProCredit Bank|Southeast Europe/);
 if(outreach_motion==='external_production_capacity')assert.match(routed.body,country==='DE'?/externe Fertigung/:/external fabrication/);
 else assert.match(routed.body,country==='DE'?/Qualifizierung/:/qualification/);
}
assert.equal(officialUrl('https://127.0.0.1/x','127.0.0.1'),'');assert.equal(officialUrl('https://evil.test/x','buyer.test'),'');assert.equal(officialUrl('http://buyer.test/x','buyer.test'),'');
const html='<p>Purchasing: procurement@buyer.test</p><p>info@buyer.test</p><p>jobs@buyer.test</p><script type="application/ld+json">{"@type":"Person","name":"Jörg Müller","jobTitle":"Head of Procurement","email":"procurement@buyer.test"}</script>';
const found=publishedContacts(html,'https://buyer.test/contact','buyer.test');assert.equal(found.length,2);assert.equal(found[0].person,'Jörg Müller');assert.equal(found[0].email,'procurement@buyer.test');
const research=await researchOfficialCompany({company_domain:'buyer.test',company_name:'Buyer'},async()=>new Response('<h1>Buyer steel fabrication</h1>'+html,{headers:{'content-type':'text/html'}}));assert.equal(research.relevant,true);assert.equal(research.contacts.length,2);
const empty=await researchOfficialCompany({company_domain:'buyer.test'},async()=>new Response('<h1>Steel fabrication</h1>',{headers:{'content-type':'text/html'}}));assert.equal(empty.contacts.length,0);

// Exercise the actual TS draft implementation with mock Gmail and canonical DB.
let queue=null,created=0,mime='',sent=0;
const db={rpc:async(name)=>({data:name==='pppp_dach_steel_contact_intelligence_v1'?{selected:contact,candidates:[contact],company_domain:'buyer.test'}:{ok:true}}),from(table){let operation='select',filter={},limit=false;const chain=new Proxy({}, {get(_,method){if(method==='then')return(resolve)=>{let data=table==='pppp_dach_steel_targets_v1'?target:table==='pppp_outbound_policy_v1'?{recipient_cooldown_days:30,domain_cooldown_days:14}:table==='pppp_outbound_queue_v1'?(operation==='insert'||operation==='update'?queue:limit?[]:queue):[];resolve({data,error:null});};return(...args)=>{if(method==='limit')limit=true;if(method==='eq')filter[args[0]]=args[1];if(method==='insert'){operation='insert';queue={...args[0],id:'queue-1'};}if(method==='update'){operation='update';if(table==='pppp_outbound_queue_v1')queue={...queue,...args[0]};}return chain;};}});return chain;}};
const fetcher=async(url,options={})=>{
  if(/\/(messages|drafts)\/send(?:\?|$)/.test(url))sent++;
  if(url.includes('/settings/sendAs'))return Response.json({sendAs:[{sendAsEmail:'arianit.vllahiu@prissteel.com',signature:'<div>Arianit Vllahiu<br>PRISTEEL<img src="https://www.prissteel.com/logo.png"></div>'}]});
  if(url.includes('/drafts')&&options.method==='POST'){created++;mime=Buffer.from(JSON.parse(options.body).message.raw,'base64url').toString('utf8');return Response.json({id:'draft-1',message:{id:'message-1',threadId:'thread-1'}});}
  if(url.includes('/drafts/draft-1'))return Response.json({id:'draft-1',message:{id:'message-1',threadId:'thread-1'}});
  if(url.includes('/threads/'))return Response.json({messages:[]});
  return Response.json({messages:[]});
};
let edge=fs.readFileSync('supabase/functions/pppp-dach-steel-draft-generator/index.ts','utf8').replace(/^import .*;\r?\n/gm,'');
edge=stripTypeScriptTypes(edge,{mode:'strip'});
const ctx=vm.createContext({console,TextEncoder,TextDecoder,Uint8Array,URLSearchParams,Response,fetch:fetcher,crypto:globalThis.crypto,btoa,atob,renderBuyerOutreach,buyerLanguage,signatureText,createClient:()=>db,Deno:{env:{get:key=>({GMAIL_USER:'arianit.vllahiu@prissteel.com'})[key]||''},serve:()=>{}}});
vm.runInContext(edge+'\ntc={token:"fixture",exp:9999999999};stc={token:"fixture",exp:9999999999};globalThis.testBuyerDraft=buyerDraft;globalThis.testGuards=guards;',ctx);
const first=await ctx.testBuyerDraft(target,{id:'test-user'},{});assert.equal(first.created,true);assert.equal(created,1);assert.equal(sent,0);assert.match(mime,/charset=UTF-8/);assert.match(mime,/Müller &amp; Söhne/);assert.match(mime,/logo.png/);assert.match(mime,/Subject: =\?UTF-8\?B\?/);assert.equal(queue.approved_for_send,false);assert.equal(queue.human_send_required,true);
const second=await ctx.testBuyerDraft(target,{id:'test-user'},{});assert.equal(second.reused,true);assert.equal(created,1);
await assert.rejects(ctx.testGuards(target,{sent_at:'2026-10-06'},contact.email),/already_sent/);
await assert.rejects(ctx.testGuards(target,{replied_at:'2026-10-06'},contact.email),/already_replied/);
await assert.rejects(ctx.testBuyerDraft({...target,company_domain:'other.test'},{id:'test-user'},{}),/buyer_contact_required/);
assert.equal(sent,0);
let networkCalls=0;
const cronSkip=await prepareReadyDrafts(db,()=>'',null,async()=>{networkCalls++;});assert.equal(cronSkip.skipped,true);assert.equal(networkCalls,0);
console.log('Steel Buyers workflow: PASS (EN/DE, evidence-only contacts, no contact, MIME/signature, live draft reuse, sent/reply guards, no send).');
