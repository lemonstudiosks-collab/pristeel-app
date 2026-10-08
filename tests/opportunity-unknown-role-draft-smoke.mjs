import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../pristeel-ted-outreach-policy-v1.js';
import {canReviewTedDraftAssessment as canReviewUnknownRoleDraft} from '../supabase/functions/pppp-opportunity-draft-generator/draft-assessment-policy.mjs';
import {buildTedDraftContent} from '../supabase/functions/pppp-opportunity-draft-generator/draft-content.mjs';
import {resolveTedDraftRecipients,resolveTedRecipients,normalizeEmail,contactTier,contactQualityScore} from '../supabase/functions/pppp-opportunity-draft-generator/recipient-policy.mjs';

const action={id:'action',action_key:'fixture',route:'TED_GENERAL',target_company:'STAKO-Hallenbau GmbH',payload:{}};
const tender={title:'217-300 FWH Neubau Feuerwehrgerätehaus, Schlosserarbeiten Innen und Außen',publication_no:'687897-2026',country:'DE',winner:{name:action.target_company,identifier:'18368 Münster',identity_version:'ted-winner-canonical-v2',emails:['info@stako-hallenbau.de'],ted_declared_emails:['info@stako-hallenbau.de'],website:'https://stako-hallenbau.de/',company_type:'unknown'},winner_role_v2:{category:'other_unclear'}};
const assessment={workflow_track:'ted_award_outreach',decision_state:'ready_for_review',draft_eligible:false,offer_model:'fabricated_steel_package',company_role:'unknown',company_summary:{company_type:'unknown',legal_name:action.target_company,domain:'stako-hallenbau.de'},tender_summary:{title:tender.title},tender_facts:[{type:'scope',status:'confirmed',value:'Schlosserarbeiten Innen und Außen',source_url:'https://ted.europa.eu/en/notice/-/detail/687897-2026'},{type:'project',status:'confirmed',value:tender.title,source_url:'https://ted.europa.eu/en/notice/-/detail/687897-2026'}]};
assert(canReviewUnknownRoleDraft(assessment,action,tender,true));
assert(!canReviewUnknownRoleDraft(assessment,action,tender,false));
for(const decision_state of ['research_required','no_outreach','closed'])assert(!canReviewUnknownRoleDraft({...assessment,decision_state},action,tender,true));
assert(canReviewUnknownRoleDraft({...assessment,decision_state:'contact_research',company_summary:{...assessment.company_summary,domain:null}},action,tender,true));
assert(!canReviewUnknownRoleDraft(assessment,{...action,route:'DIRECT_RAW_MATERIAL'},tender,true));
assert(!canReviewUnknownRoleDraft(assessment,action,{...tender,winner:{...tender.winner,name:'Different GmbH'}},true));
assert(!canReviewUnknownRoleDraft({...assessment,tender_facts:[]},action,tender,true));
assert(!canReviewUnknownRoleDraft({...assessment,tender_facts:assessment.tender_facts.filter(f=>f.type!=='scope')},action,tender,true));
assert(canReviewUnknownRoleDraft({...assessment,tender_facts:assessment.tender_facts.map(f=>f.type==='scope'?{...f,value:'Published mechanical package'}:f)},action,tender,true));
assert(!canReviewUnknownRoleDraft({...assessment,tender_facts:[{...assessment.tender_facts[0],status:'inferred'}]},action,tender,true));
assert.throws(()=>buildTedDraftContent(action,tender,{email:'info@stako-hallenbau.de'}),/company_role_verification_required/,'unguarded targeted copy must remain blocked');
for(const manual_draft_template of ['gc_epc','steel_fabricator']){
 const copy=buildTedDraftContent({...action,payload:{manual_draft_template}},tender,{email:'info@stako-hallenbau.de'});
 assert.equal(copy.company_role,'other_unclear');
 assert.equal(copy.approved_template,manual_draft_template);
 assert.equal(copy.template_selected_manually,true);
 assert.equal(copy.offer_model,manual_draft_template==='gc_epc'?'fabricated_steel_package':'external_production_capacity');
 assert.match(copy.body,manual_draft_template==='gc_epc'?/vollständige Verantwortung für ein klar definiertes Stahlpaket/:/externe Fertigungskapazität einsetzen/);
 assert.doesNotMatch(copy.body,/Bevor wir einen konkreten|S355|EN 1090|Sie selbst fertigen/);
}
assert.throws(()=>buildTedDraftContent({...action,payload:{manual_draft_template:'invented'}},tender,{email:'info@stako-hallenbau.de'}),/company_role_verification_required/);
const legacyUnknown=buildTedDraftContent({...action,payload:{manual_draft_template:'steel_fabricator'}},{...tender,winner_role_v2:null},{email:'info@stako-hallenbau.de'});
assert.equal(legacyUnknown.company_role,'unknown');assert.equal(legacyUnknown.approved_template,'steel_fabricator');assert.equal(legacyUnknown.offer_model,'external_production_capacity');
assert.equal(resolveTedRecipients(action,tender,20).length,0,'send-grade recipient gate stays blocked');

// Manual copy composition never overrides the actual generator's eligibility policy.
const source=fs.readFileSync('supabase/functions/pppp-opportunity-draft-generator/index.ts','utf8');
let previewSource=source.slice(source.indexOf('async function processAction('),source.indexOf('  await seedLegacyTenderDraft('));
previewSource=previewSource.replace(/:any\[\]/g,'').replace(/:any/g,'').replace(/:\{writes:number\}/g,'')+"throw new Error('approval phase reached');}";
let writes=0,currentAssessment={...assessment,draft_eligible:true};
const evidencedTender={...tender,title:'Structural steel erection for the new building',source_url:'https://ted.europa.eu/en/notice/687897-2026/html'};
const deps={
 TED_POLICY:globalThis.PSTTedOutreachPolicyV1,
 db:{from(table){const q={select(){return q},eq(){return q},async maybeSingle(){return{data:table==='pppp_opportunity_actions'?action:{communication_state:'new'},error:null}}};return q}},
 text:(v,max=12000)=>String(v??'').trim().slice(0,max),tenderContext:async()=>evidencedTender,
 opportunityIntelligence:async()=>({assessment:currentAssessment,contacts:[],company:assessment.company_summary}),
 canReviewTedDraftAssessment:canReviewUnknownRoleDraft,effectiveTedRole:t=>t.winner.company_type||'unknown',expectedTedRoute:()=> 'TED_GENERAL',tedDraftReadiness:()=>({ok:true}),
 resolveTedDraftRecipients,resolveTedRecipients,contactTier,contactQualityScore,normalizeEmail,buildTedDraftContent,MAX_CONTACTS_PER_ACTION:20,
 retireObsoleteDrafts:async()=>{writes++;throw Error('Unexpected write')},persistActionState:async()=>{writes++;throw Error('Unexpected write')}
};
const processAction=new Function(...Object.keys(deps),previewSource+';return processAction;')(...Object.values(deps));
for(const selected of ['','gc_epc','steel_fabricator','invalid']){
 for(const previewOnly of [true,false]){
  const out=await processAction(action,{writes:0},true,true,previewOnly,true,selected);
  assert.equal(out.event,'readiness_blocked','explicit approval/template/cooldown override cannot override unknown company activity');
  assert.equal(out.reason,'company_role_unverified');
  assert.equal(out.created,0);assert.equal(writes,0);
 }
}
action.payload.manual_draft_template='gc_epc';
assert.equal((await processAction(action,{writes:0},false,true,true)).event,'readiness_blocked');
delete action.payload.manual_draft_template;
assert.equal(assessment.draft_eligible,false,'eligibility checks do not upgrade the assessment');
for(const decision_state of ['research_required','no_outreach','closed']){
 currentAssessment={...assessment,decision_state};
 assert.equal((await processAction(action,{writes:0},false,true,true)).event,'readiness_blocked');
}
assert.equal(writes,0);
console.log('Manual copy templates retained; actual generator blocks unverified company activity without Gmail/business writes: OK');
