import assert from 'node:assert/strict';
import { buildTedDraftContent, PRISTEEL_SIGNATURE_HTML } from '../supabase/functions/pppp-opportunity-draft-generator/draft-content.mjs';

assert.equal(/linkedin/i.test(PRISTEEL_SIGNATURE_HTML),false,'signature must not contain LinkedIn');
assert.equal((PRISTEEL_SIGNATURE_HTML.match(/<img\b/gi)||[]).length,1,'signature must contain only the PriSteel logo image');

const readiness={
  winner_role_verified:true,exact_lot_match:true,pristeel_scope_fit:true,
  pristeel_scope:'rund 400 t Stahlbau inklusive Korrosionsschutz und Schutzgerüst',
  scope_evidence:'Die Vergabeunterlagen nennen rund 400 t Stahlbau für das DB-Schutzgerüst.',
  contact_identity_verified:true,verified_company_domain:'bug-se.de',
  buyer_function:'Projekteinkauf',contact_quality:'function_address_verified',
  timing_fit:true,previous_contact_guard:true,bounce_suppression_guard:true,
  self_perform_risk:'low',
  concrete_question:'Ist dieser Fertigungsumfang bereits vollständig vergeben oder bestehen noch klar abgegrenzte Pakete für externe Fertigung?'
};
const action={
  route:'TED_GC',target_company:'BUG Verkehrsbau SE',target_email:'ausschreibung@bug-se.de',
  tender_title:'Germany – Structural steelworks – B62 TB Rinsenau, Herstellung DB Schutzgerüst',
  payload:{outreach_readiness_v1:readiness}
};
const tender={
  title:action.tender_title,publication_no:'623898-2026',place_of_performance:['DEU'],
  winner:{name:'BUG Verkehrsbau SE',country:'DEU'}
};
const d=buildTedDraftContent(action,tender,{email:'ausschreibung@bug-se.de',purpose:'tender'});
assert.equal(d.language,'de');
assert.match(d.subject,/^Projekt B62 TB Rinsenau, Herstellung DB Schutzgerüst – Stahlpaket \| PRISTEEL$/);
assert(!/Germany|TED|623898-2026/i.test(d.subject),'subject must use a normal project name, not database/source prefixes');
assert(d.body.startsWith('Guten Tag,'),'verified function mailbox should use a neutral human greeting, not bulk salutation');
assert(d.body.includes(readiness.scope_evidence),'email must lead with the concrete scope fact');
assert(d.body.includes(readiness.concrete_question),'email must contain the one concrete project question');
assert(d.body.includes(readiness.pristeel_scope),'PriSteel capability sentence must be specific to this award');
assert(!/wir haben gesehen|möchte ich Ihnen PRISTEEL als möglichen|Sehr geehrte Damen und Herren/i.test(d.body),'old bulk-style opening must not return');
assert(!/EN 1090|ISO 3834|HPQ/i.test(d.body),'qualification claims must not be inserted unless explicitly evidenced');
assert(d.body.includes('Mit freundlichen Grüßen'));
assert(!/linkedin/i.test(d.html_body));

const named=buildTedDraftContent(
 {...action,target_email:'julian.bieker@b-h-bau.de',target_company:'B + H Bau GmbH',
  payload:{outreach_readiness_v1:{...readiness,verified_company_domain:'b-h-bau.de',
    scope_evidence:'Die Vergabe betrifft die Stahlüberbauten der EÜ Grünstraße.',
    pristeel_scope:'Stahlüberbauten und klar abgegrenzte Fertigungspakete',
    concrete_question:'Sind die Stahlüberbauten bereits vollständig intern bzw. extern vergeben, oder ist noch ein Fertigungspaket offen?'}}},
 {...tender,title:'Germany – Railway bridge construction work – Ern. EÜ Grünstraße Gengenbach',winner:{name:'B + H Bau GmbH',country:'DEU'}},
 {email:'julian.bieker@b-h-bau.de',name:'Julian Bieker',purpose:'procurement'}
);
assert(named.body.startsWith('Guten Tag Julian Bieker,'));
assert(!/Germany – Railway bridge construction work/i.test(named.subject));

const en=buildTedDraftContent(
 {...action,target_email:'buyer@example.co.uk',tender_title:'United Kingdom – Structural steelworks – Project Alpha',
  payload:{outreach_readiness_v1:{...readiness,verified_company_domain:'example.co.uk',
    scope_evidence:'The awarded lot includes fabricated structural steel assemblies.',
    pristeel_scope:'fabricated structural steel assemblies',
    concrete_question:'Is this fabrication package already fully placed, or is any defined external package still open?'}}},
 {...tender,title:'United Kingdom – Structural steelworks – Project Alpha',winner:{name:'Example Ltd',country:'GBR'}},
 {email:'buyer@example.co.uk',name:'Jane Doe',purpose:'procurement'}
);
assert(en.body.startsWith('Dear Jane Doe,'));
assert(en.body.includes('The awarded lot includes fabricated structural steel assemblies.'));
assert(en.body.includes('Is this fabrication package already fully placed'));

console.log('opportunity TED scope-first copy smoke: ok');
