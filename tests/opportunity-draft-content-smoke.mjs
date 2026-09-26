import assert from 'node:assert/strict';
import { buildTedDraftContent, PRISTEEL_SIGNATURE_HTML } from '../supabase/functions/pppp-opportunity-draft-generator/draft-content.mjs';

assert.equal(/linkedin/i.test(PRISTEEL_SIGNATURE_HTML),false,'signature must not contain LinkedIn');
assert.equal((PRISTEEL_SIGNATURE_HTML.match(/<img\b/gi)||[]).length,1,'signature must contain only the PriSteel logo image');
assert.match(PRISTEEL_SIGNATURE_HTML,/ci3\.googleusercontent\.com\/mail-sig\//,'signature must reuse the established Gmail-hosted PriSteel logo, not embed a new image payload');
assert.match(PRISTEEL_SIGNATURE_HTML,/href="tel:\+38344244699"/,'signature phone must stay a normal tel link');
assert.match(PRISTEEL_SIGNATURE_HTML,/href="mailto:arianit\.vllahiu@prissteel\.com"/,'signature email must stay a normal mailto link');
assert.match(PRISTEEL_SIGNATURE_HTML,/href="https:\/\/www\.prissteel\.com"/,'signature website must use the canonical HTTPS company link');
assert.equal(/data:image|base64,/i.test(PRISTEEL_SIGNATURE_HTML),false,'signature must not embed base64/data-URI images');
assert.equal(/pixel|tracking|utm_/i.test(PRISTEEL_SIGNATURE_HTML),false,'signature must not add tracking pixels or campaign parameters');

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
assert(d.body.startsWith('Sehr geehrte Damen und Herren,'),'verified function mailbox must use the formal German company salutation');
assert(d.body.includes(readiness.scope_evidence),'email must lead with the concrete scope fact');
assert(d.body.includes(readiness.concrete_question),'email must contain the one concrete project question');
assert(d.body.includes(readiness.pristeel_scope),'PriSteel capability sentence must be specific to this award');
assert(!/wir haben gesehen|möchte ich Ihnen PRISTEEL als möglichen/i.test(d.body),'old generic sales copy must not return');
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
 {email:'julian.bieker@b-h-bau.de',name:'Julian Bieker',salutation:'Herr',purpose:'procurement'}
);
assert(named.body.startsWith('Sehr geehrter Herr Bieker,'));
assert(!/Germany – Railway bridge construction work/i.test(named.subject));

const namedFemale=buildTedDraftContent(
 {...action,target_email:'anna.mueller@b-h-bau.de',target_company:'B + H Bau GmbH'},
 {...tender,winner:{name:'B + H Bau GmbH',country:'DEU'}},
 {email:'anna.mueller@b-h-bau.de',name:'Anna Müller',salutation:'Frau',purpose:'procurement'}
);
assert(namedFemale.body.startsWith('Sehr geehrte Frau Müller,'));

const namedUnknown=buildTedDraftContent(
 {...action,target_email:'kontakt.person@b-h-bau.de',target_company:'B + H Bau GmbH'},
 {...tender,winner:{name:'B + H Bau GmbH',country:'DEU'}},
 {email:'kontakt.person@b-h-bau.de',name:'Alex Beispiel',purpose:'procurement'}
);
assert(namedUnknown.body.startsWith('Sehr geehrte Damen und Herren,'),'PPPP must not guess Herr/Frau when the source has no explicit salutation');

const en=buildTedDraftContent(
 {...action,target_email:'buyer@example.co.uk',tender_title:'United Kingdom – Structural steelworks – Project Alpha',
  payload:{outreach_readiness_v1:{...readiness,verified_company_domain:'example.co.uk',
    scope_evidence:'The awarded lot includes fabricated structural steel assemblies.',
    pristeel_scope:'fabricated structural steel assemblies',
    concrete_question:'Is this fabrication package already fully placed, or is any defined external package still open?'}}},
 {...tender,title:'United Kingdom – Structural steelworks – Project Alpha',place_of_performance:['GBR'],winner:{name:'Example Ltd',country:'GBR'}},
 {email:'buyer@example.co.uk',name:'Jane Doe',purpose:'procurement'}
);
assert(en.body.startsWith('Dear Jane Doe,'));
assert(en.body.includes('The awarded lot includes fabricated structural steel assemblies.'));
assert(en.body.includes('Is this fabrication package already fully placed'));


const internalInstructionLeak=buildTedDraftContent(
  {
    route:'TED_CONSORTIUM',
    target_company:'CYTA',
    target_email:'andreas.makris@cyta.com.cy',
    tender_title:'Cyprus – Electrical machinery – Battery Storage Energy System at Athalassa Substation',
    personalization_facts:[
      'Cyprus – Electrical machinery – Battery Storage Energy System at Athalassa Substation',
      'CYTA është fitues/anëtar i kontratës. Përgatit draft profesional dhe mos e dërgo automatikisht.'
    ],
    outreach_motion:'awarded_project_gc',
    pristeel_offer_model:'fabricated_steel_package'
  },
  {
    title:'Cyprus – Electrical machinery – Battery Storage Energy System at Athalassa Substation',
    authority:'Electricity Authority of Cyprus',
    winner:{name:'CYTA',country:'CYP',company_type:'trader_consortium'}
  },
  {email:'andreas.makris@cyta.com.cy',name:'Mr. Antreas Makris',purpose:'person'}
);
assert.equal(internalInstructionLeak.language,'en');
assert.match(internalInstructionLeak.body,/published award information relates to/i,'fallback copy must use public award facts');
assert.match(internalInstructionLeak.body,/CYTA is identified in the award information/i,'fallback copy must identify the selected awarded company neutrally');
assert.doesNotMatch(internalInstructionLeak.body,/Përgatit draft|mos e dërgo|Draft vetëm|outreach/i,'internal PPPP instructions must never leak into external email copy');
assert.doesNotMatch(internalInstructionLeak.html_body,/Përgatit draft|mos e dërgo|Draft vetëm|outreach/i,'internal PPPP instructions must never leak into HTML email copy');

console.log('opportunity TED scope-first copy smoke: ok');
