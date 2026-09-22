import assert from 'node:assert/strict';
import { resolveTedRecipients, normalizeEmail } from '../supabase/functions/pppp-opportunity-draft-generator/recipient-policy.mjs';

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

console.log('opportunity TED high-confidence recipient policy smoke: ok');
