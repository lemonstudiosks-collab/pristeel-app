import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveTedRecipients, resolveTedDraftRecipients, normalizeEmail } from '../supabase/functions/pppp-opportunity-draft-generator/recipient-policy.mjs';

const generatorSrc=fs.readFileSync('supabase/functions/pppp-opportunity-draft-generator/index.ts','utf8');
assert.match(generatorSrc,/MAX_CONTACTS_PER_ACTION=20/,'manual TED draft generation must allow all verified UI contacts, not only one');
assert.match(generatorSrc,/separate_draft_per_recipient:true/,'each verified recipient must receive a separate Gmail draft');
assert.match(generatorSrc,/MAX_DRAFT_WRITES_PER_RUN=25/,'one manual action must have enough write budget for all verified recipients');

const readiness={
  winner_role_verified:true,
  exact_lot_match:true,
  pristeel_scope_fit:true,
  pristeel_scope:'bridge steel superstructure',
  scope_evidence:'Awarded lot includes structural steel fabrication.',
  contact_identity_verified:true,
  verified_company_domain:'acme-steel.de',
  buyer_function:'Projekteinkauf',
  contact_quality:'named_person',
  timing_fit:true,
  previous_contact_guard:true,
  bounce_suppression_guard:true,
  self_perform_risk:'low',
  concrete_question:'Is the steel package still open for external fabrication?'
};
const action={
  route:'TED_GC',target_company:'Acme Steel GmbH',target_email:'wrong.person@unrelated-vendor.com',
  payload:{outreach_readiness_v1:readiness}
};
const payload={winner:{
  website:'https://www.acme-steel.de/',
  email:'info@acme-steel.de',
  emails:['info@acme-steel.de','procurement@acme-steel.de'],
  contact_enrichment:{organizations:[{name:'Acme Steel GmbH',domain:'acme-steel.de',contacts:[
    {type:'email',value:'alice@acme-steel.de',full_name:'Alice Example',job_title:'Procurement Manager',score:98,confidence:'high',purpose:'procurement',source_type:'official_website',source_url:'https://www.acme-steel.de/team'},
    {type:'email',value:'info@acme-steel.de',score:90,confidence:'high',purpose:'general',source_type:'official_website'},
    {type:'email',value:'external@agency.net',score:99,confidence:'high',purpose:'person',source_type:'official_website'}
  ]}]}
}};

const recipients=resolveTedRecipients(action,payload,20);
assert.equal(recipients.length,1,'high-confidence TED policy must create at most one recipient per opportunity');
assert.equal(recipients[0].email,'alice@acme-steel.de','verified procurement contact must outrank generic mailboxes');
assert.equal(recipients[0].recipient_company_domain,'acme-steel.de');
assert(!recipients.some(r=>r.email==='wrong.person@unrelated-vendor.com'),'cross-company target must be blocked');
assert(!recipients.some(r=>r.email==='info@acme-steel.de'),'generic info mailbox must not be used without explicit fallback review');

const genericReadiness={...readiness,contact_quality:'generic_fallback_reviewed'};
const genericAction={...action,target_email:'info@acme-steel.de',payload:{outreach_readiness_v1:genericReadiness}};
const genericPayload={winner:{website:'https://www.acme-steel.de/',email:'info@acme-steel.de',emails:['info@acme-steel.de']}};
assert.equal(resolveTedRecipients(genericAction,genericPayload,20)[0]?.email,'info@acme-steel.de','generic fallback is allowed only after explicit review');

const wrongDomain={...action,payload:{outreach_readiness_v1:{...readiness,verified_company_domain:'other-company.de'}}};
assert.equal(resolveTedRecipients(wrongDomain,payload,20).length,0,'verified company domain must control contact identity');
assert.equal(normalizeEmail(' Alice@Example.COM '),'alice@example.com');

const draftOnlyAction={route:'TED_GENERAL',target_company:'RB Impra GmbH',target_email:'info@rb-impra.de',payload:{}};
const draftOnlyPayload={winner:{name:'RB Impra GmbH',website:'https://rb-impra.de/',company_type:'unknown',contact_enrichment:{organizations:[{name:'RB Impra GmbH',domain:'rb-impra.de',contacts:[
  {type:'email',value:'info@rb-impra.de',score:88,confidence:'high',purpose:'general',source_type:'TED'},
  {type:'email',value:'anna.beispiel@rb-impra.de',name:'Anna Beispiel',salutation:'Frau',score:96,confidence:'high',purpose:'person',source_type:'official_website'},
  {type:'email',value:'procurement@rb-impra.de',score:91,confidence:'high',purpose:'procurement',source_type:'official_website'},
  {type:'email',value:'bad@unrelated.example.org',score:99,confidence:'high',purpose:'person',source_type:'official_website',draft_eligible:false}
]}]}}};
const draftRecipients=resolveTedDraftRecipients(draftOnlyAction,draftOnlyPayload,20);
assert.equal(draftRecipients.length,3,'manual draft policy must return every verified same-company email address, not only the top-ranked one');
assert.deepEqual(new Set(draftRecipients.map(r=>r.email)),new Set(['info@rb-impra.de','anna.beispiel@rb-impra.de','procurement@rb-impra.de']));
assert.equal(draftRecipients.find(r=>r.email==='anna.beispiel@rb-impra.de')?.salutation,'Frau','explicit contact salutation must survive recipient resolution for personalized drafts');
assert.equal(resolveTedRecipients(draftOnlyAction,draftOnlyPayload,1).length,0,'strict send-grade recipient policy must remain blocked without outreach readiness');

console.log('opportunity TED high-confidence recipient policy smoke: ok');
