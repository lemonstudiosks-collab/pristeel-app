import assert from 'node:assert/strict';
import fs from 'node:fs';
import {canReviewUnknownRoleDraft} from '../supabase/functions/pppp-opportunity-draft-generator/draft-assessment-policy.mjs';
import {buildTedDraftContent} from '../supabase/functions/pppp-opportunity-draft-generator/draft-content.mjs';
import {resolveTedDraftRecipients,resolveTedRecipients,normalizeEmail,contactTier,contactQualityScore} from '../supabase/functions/pppp-opportunity-draft-generator/recipient-policy.mjs';

const action={id:'action',action_key:'fixture',route:'TED_GENERAL',target_company:'STAKO-Hallenbau GmbH',payload:{}};
const tender={title:'217-300 FWH Neubau Feuerwehrgerätehaus, Schlosserarbeiten Innen und Außen',publication_no:'687897-2026',country:'DE',winner:{name:action.target_company,identifier:'18368 Münster',identity_version:'ted-winner-canonical-v2',emails:['info@stako-hallenbau.de'],ted_declared_emails:['info@stako-hallenbau.de'],website:'https://stako-hallenbau.de/',company_type:'unknown'},winner_role_v2:{category:'other_unclear'}};
const assessment={workflow_track:'ted_award_outreach',decision_state:'ready_for_review',draft_eligible:false,offer_model:'fabricated_steel_package',company_role:'unknown',company_summary:{company_type:'unknown',legal_name:action.target_company,domain:'stako-hallenbau.de'},tender_summary:{title:tender.title},tender_facts:[{type:'scope',status:'confirmed',value:'Schlosserarbeiten Innen und Außen',source_url:'https://ted.europa.eu/en/notice/-/detail/687897-2026'},{type:'project',status:'confirmed',value:tender.title,source_url:'https://ted.europa.eu/en/notice/-/detail/687897-2026'}]};
assert(canReviewUnknownRoleDraft(assessment,action,tender,true));
assert(!canReviewUnknownRoleDraft(assessment,action,tender,false));
for(const decision_state of ['research_required','no_outreach','closed','contact_research'])assert(!canReviewUnknownRoleDraft({...assessment,decision_state},action,tender,true));
assert(!canReviewUnknownRoleDraft({...assessment,company_summary:{...assessment.company_summary,domain:null}},action,tender,true));
assert(!canReviewUnknownRoleDraft(assessment,{...action,route:'TED_PRODUCER'},tender,true));
assert(!canReviewUnknownRoleDraft(assessment,action,{...tender,winner:{...tender.winner,name:'Different GmbH'}},true));
assert(!canReviewUnknownRoleDraft({...assessment,tender_facts:[]},action,tender,true));
assert(!canReviewUnknownRoleDraft({...assessment,tender_facts:assessment.tender_facts.filter(f=>f.type!=='scope')},action,tender,true));
assert(!canReviewUnknownRoleDraft({...assessment,tender_facts:assessment.tender_facts.map(f=>f.type==='scope'?{...f,value:'Vacuum pumps'}:f)},action,tender,true));
assert(!canReviewUnknownRoleDraft({...assessment,tender_facts:[{...assessment.tender_facts[0],status:'inferred'}]},action,tender,true));
assert.throws(()=>buildTedDraftContent(action,tender,{email:'info@stako-hallenbau.de'}),/company_role_verification_required/,'unguarded targeted copy must remain blocked');
const copy=buildTedDraftContent({...action,payload:{manual_role_clarification_draft:true}},tender,{email:'info@stako-hallenbau.de'});
assert.equal(copy.offer_model,'role_verification_required');
assert.match(copy.body,/Zuständigkeit|verantwort|zuständig/);
assert(!/Werkstoffe|S355|EN 1090|Sie selbst fertigen/.test(copy.body));
assert.equal(resolveTedRecipients(action,tender,20).length,0,'send-grade recipient gate stays blocked');

// Exercise the actual generator preview path; every potential write throws.
const source=fs.readFileSync('supabase/functions/pppp-opportunity-draft-generator/index.ts','utf8');
let previewSource=source.slice(source.indexOf('async function processAction('),source.indexOf('  await seedLegacyTenderDraft('));
previewSource=previewSource.replace(/:any\[\]/g,'').replace(/:any/g,'').replace(/:\{writes:number\}/g,'')+"throw new Error('approval phase reached');}";
let writes=0,communication='new',currentAssessment=assessment;
const deps={
 db:{from(table){const q={select(){return q},eq(){return q},async maybeSingle(){return{data:table==='pppp_opportunity_actions'?action:{communication_state:communication},error:null}}};return q}},
 text:(v,max=12000)=>String(v??'').trim().slice(0,max),tenderContext:async()=>tender,
 opportunityIntelligence:async()=>({assessment:currentAssessment,contacts:[],company:assessment.company_summary}),
 canReviewUnknownRoleDraft,expectedTedRoute:()=> 'TED_GENERAL',tedDraftReadiness:()=>({ok:true}),
 resolveTedDraftRecipients,resolveTedRecipients,contactTier,contactQualityScore,normalizeEmail,buildTedDraftContent,MAX_CONTACTS_PER_ACTION:20,
 retireObsoleteDrafts:async()=>{writes++;throw Error('Unexpected write')},persistActionState:async()=>{writes++;throw Error('Unexpected write')}
};
const processAction=new Function(...Object.keys(deps),previewSource+';return processAction;')(...Object.values(deps));
const out=await processAction(action,{writes:0},false,true,true);
assert.equal(out.event,'preview_ready');assert.equal(out.previews[0].offer_model,'role_verification_required');assert.equal(out.recipients,1);assert.equal(writes,0);
assert.equal(assessment.draft_eligible,false,'preview never upgrades the company assessment');
assert.equal((await processAction(action,{writes:0},false,false,true)).event,'readiness_blocked');
communication='waiting';assert.equal((await processAction(action,{writes:0},false,true,true)).event,'communication_history_blocked');communication='new';
currentAssessment={...assessment,decision_state:'no_outreach'};assert.equal((await processAction(action,{writes:0},false,true,true)).event,'readiness_blocked');
console.log('Unknown-role manual clarification preview and protected gates: OK (no Gmail/business writes)');
