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
assert.equal(out.event,'template_selection_required');assert.equal(out.recipients,1);assert.equal(writes,0);
assert.deepEqual(out.templates.map(t=>t.id),['gc_epc','steel_fabricator']);
for(const selected of ['gc_epc','steel_fabricator']){
 const preview=await processAction(action,{writes:0},false,true,true,false,selected);
 assert.equal(preview.event,'preview_ready');assert.equal(preview.previews[0].approved_template,selected);assert.equal(preview.previews[0].company_role,'other_unclear');assert.equal(writes,0);
}
assert.equal((await processAction(action,{writes:0},false,true,false,false,'invalid')).event,'template_selection_required','approval cannot bypass template selection');
action.payload.manual_draft_template='gc_epc';
assert.equal((await processAction(action,{writes:0},false,true,true)).event,'template_selection_required','stored overrides cannot be reused silently');
delete action.payload.manual_draft_template;
assert.equal(assessment.draft_eligible,false,'preview never upgrades the company assessment');
assert.equal((await processAction(action,{writes:0},false,false,true)).event,'readiness_blocked');
communication='waiting';assert.equal((await processAction(action,{writes:0},false,true,true)).event,'communication_history_blocked');communication='new';
currentAssessment={...assessment,decision_state:'no_outreach'};assert.equal((await processAction(action,{writes:0},false,true,true)).event,'readiness_blocked');
console.log('Approved GC/producer template selection preview and protected gates: OK (no Gmail/business writes)');
