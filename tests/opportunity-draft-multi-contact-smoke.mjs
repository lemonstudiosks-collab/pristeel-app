import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveTedRecipients, recipientGreeting, normalizeEmail } from '../supabase/functions/pppp-opportunity-draft-generator/recipient-policy.mjs';
import { encodeRfc2047Header } from '../supabase/functions/pppp-opportunity-draft-generator/mime-headers.mjs';
import { buildTedDraftContent, resolveDraftLanguage, tedReference, PRISTEEL_SIGNATURE, PRISTEEL_SIGNATURE_HTML, PRISTEEL_LOGO_URL } from '../supabase/functions/pppp-opportunity-draft-generator/draft-content.mjs';

const action={
  id:'11111111-1111-4111-8111-111111111111',
  route:'TED_GC',
  target_company:'Acme Steel GmbH',
  target_email:'wrong.person@unrelated-vendor.com'
};
const payload={
  winner:{
    email:'INFO@ACME-STEEL.DE',
    emails:['info@acme-steel.de','procurement@acme-steel.de'],
    website:'https://www.acme-steel.de/',
    country:'DEU',
    contact_enrichment:{organizations:[{
      name:'Acme Steel GmbH',domain:'acme-steel.de',contacts:[
        {type:'email',value:'sales@acme-steel.de',score:96,confidence:'high',purpose:'tender'},
        {type:'email',value:'person2@acme-steel.de',score:88,confidence:'medium',purpose:'person'},
        {type:'email',value:'max.mustermann@acme-steel.de',score:95,confidence:'high',purpose:'person'},
        {type:'email',value:'office.team@acme-steel.de',score:95,confidence:'high',purpose:'person'},
        {type:'email',value:'external@agency.example',score:96,confidence:'high',purpose:'person'},
        {type:'email',value:'bad@acme',score:96,confidence:'high'}
      ]
    }]}
  },
  winner_contacts:[
    {email:'alice@acme-steel.de',full_name:'Alice Example',job_title:'Procurement Manager',verification_status:'verified',source_type:'official_website',source_url:'https://www.acme-steel.de/team'},
    {email:'verified.but.wrong@agency.net',full_name:'Wrong Person',verification_status:'verified',source_type:'official_website',source_url:'https://agency.net/profile'},
    {email:'someone@gmail.com',full_name:'Free Mail',verification_status:'verified',source_type:'official_website',source_url:'https://www.acme-steel.de/team'},
    {email:'ALICE@ACME-STEEL.DE',full_name:'Alice Example',verification_status:'verified'},
    {email:'bob@acme-steel.de',contact_name:'Bob Example',confidence:'high',source_type:'TED'}
  ]
};

const recipients=resolveTedRecipients(action,payload,20);
const emails=recipients.map(r=>r.email);
assert.equal(new Set(emails).size,emails.length,'recipient emails must be unique');
for(const expected of ['info@acme-steel.de','procurement@acme-steel.de','sales@acme-steel.de','person2@acme-steel.de','max.mustermann@acme-steel.de','office.team@acme-steel.de','alice@acme-steel.de','bob@acme-steel.de'])assert(emails.includes(expected),`missing ${expected}`);
assert(!emails.includes('external@agency.example'),'unrelated external-domain enrichment email must be excluded');
assert(!emails.includes('bad@acme'),'invalid email must be excluded');
assert(!emails.includes('wrong.person@unrelated-vendor.com'),'wrong target_email must not validate itself as a company domain');
assert(!emails.includes('verified.but.wrong@agency.net'),'verified label alone must not bypass company attribution');
assert(!emails.includes('someone@gmail.com'),'free consumer email must never become an automatic B2B draft recipient');
const unsafePayload={winner:{website:'https://www.example-steel.com/',contact_enrichment:{organizations:[{name:'Example Steel',domain:'example-steel.com',verified:true,contacts:[
  {type:'email',value:'investorrelations@example-steel.com',source_type:'official_website',confidence:'high',purpose:'general'},
  {type:'email',value:'werken@example-steel.com',source_type:'official_website',confidence:'high',purpose:'general'},
  {type:'email',value:'imie.nazwisko@example-steel.com',source_type:'official_website',confidence:'high',purpose:'person'},
  {type:'email',value:'u003einfo@example-steel.com',source_type:'official_website',confidence:'high',purpose:'general'},
  {type:'email',value:'procurement@example-steel.com',source_type:'official_website',confidence:'high',purpose:'procurement'}
]}]}}};
const safeOnly=resolveTedRecipients({route:'TED_GC',target_company:'Example Steel'},unsafePayload,20).map(r=>r.email);
assert.deepEqual(safeOnly,['procurement@example-steel.com'],'unsafe/placeholder recipients must be excluded before draft creation');

assert.equal(emails.filter(e=>e==='alice@acme-steel.de').length,1,'same email must not get duplicate drafts');
const alice=recipients.find(r=>r.email==='alice@acme-steel.de');
assert.equal(alice?.name,'Alice Example');
assert.equal(recipientGreeting(action.target_company,alice),'Dear Alice Example,','known contact name must be used');
const inferred=recipients.find(r=>r.email==='max.mustermann@acme-steel.de');
assert.equal(inferred?.name,'','email local-parts must never be promoted into an unverified person name');
assert.equal(recipientGreeting(action.target_company,inferred),'Dear Sir or Madam,','unnamed classified person email must use a formal generic greeting');
const general=recipients.find(r=>r.email==='info@acme-steel.de');
assert.equal(recipientGreeting(action.target_company,general),'Dear Sir or Madam,','unnamed contact must use a formal generic greeting');
const functional=recipients.find(r=>r.email==='office.team@acme-steel.de');
assert.equal(functional?.name,'','functional mailbox token must block name inference even when enrichment says person');
assert.equal(recipientGreeting(action.target_company,functional),'Dear Sir or Madam,','functional mailbox must retain a formal generic greeting');
assert.equal(normalizeEmail(' Alice@Example.COM '),'alice@example.com');
assert.equal(resolveTedRecipients(action,payload,2).length,2,'recipient cap must be respected');

const subject='PRISTEEL · Görres – München';
const encodedSubject=encodeRfc2047Header(subject);
assert(encodedSubject.includes('=?UTF-8?B?'),'international subject must use RFC 2047 encoded-word syntax');
for(const word of encodedSubject.split(/\s+/))assert(word.length<=75,'each RFC 2047 encoded-word must fit the 75-character limit');
const decodedSubject=encodedSubject.split(/\s+/).map(word=>{const m=/^=\?UTF-8\?B\?([^?]+)\?=$/i.exec(word);return m?Buffer.from(m[1],'base64').toString('utf8'):word;}).join('');
assert.equal(decodedSubject,subject,'RFC 2047 subject must round-trip international characters exactly');
assert.equal(encodeRfc2047Header('PRISTEEL Opportunity'),'PRISTEEL Opportunity','ASCII-only subject should remain readable ASCII');
const injected=encodeRfc2047Header('Safe\r\nBcc: attacker@example.com');
assert(!injected.includes('\r')&&!injected.includes('\n'),'subject encoder must strip header line breaks');

const beckAction={
  route:'TED_PRODUCER',
  target_company:'Beck Stahlbau GmbH',
  target_email:'info@beck-stahlbau.de',
  tender_title:'Germany – Structural steelworks – Sanierung Hermann-Greiner-Realschule 5. BA - Stahlbauarbeiten',
  authority:'Stadtverwaltung Neckarsulm',
  draft_brief:'INTERNAL ONLY: Ky tekst është në shqip dhe nuk duhet të dalë në email.'
};
const beckTender={
  title:beckAction.tender_title,
  authority:'Stadtverwaltung Neckarsulm',
  publication_no:'613835-2026',
  procurement_no:'TED-613835-2026',
  source_url:'https://ted.europa.eu/en/notice/613835-2026/html',
  place_of_performance:['DE118','DEU'],
  winner:{name:'Beck Stahlbau GmbH',country:'DEU'}
};
const beckPerson={email:'benjamin.beck@beck-stahlbau.de',name:'Benjamin Beck',purpose:'person'};
const beckGeneral={email:'info@beck-stahlbau.de',name:'',purpose:'general'};
assert.equal(resolveDraftLanguage(beckAction,beckTender,beckPerson),'de','German company/contact/market must resolve to German');
assert.equal(tedReference(beckTender),'613835-2026','internal publication reference must remain available for PPPP metadata');
const german=buildTedDraftContent(beckAction,beckTender,beckPerson);
assert.equal(german.language,'de');
assert.match(german.subject,/^Zusätzliche Fertigungskapazität – Sanierung Hermann-Greiner-Realschule/);
assert(german.subject.length<140,'subject should stay concise even when the project title is long');
assert(!/TED|613835-2026/i.test(german.subject),'customer-facing subject must not expose source name or notice reference');
assert(german.body.startsWith('Guten Tag Benjamin Beck,'),'German person draft must use a German personal greeting');
assert(german.body.includes('Sanierung Hermann-Greiner-Realschule'),'project may be referenced naturally in the prose');
assert(!/TED-Referenz|Auftraggeber|ted\.europa\.eu|613835-2026|\bTED\b/i.test(german.body),'plain body must not expose technical source metadata');
assert(!german.body.includes('Stadtverwaltung Neckarsulm'),'contracting authority metadata must not be inserted as a technical block');
assert(german.body.includes('Mit freundlichen Grüßen'),'German draft must close in German');
for(const line of ['Arianit Vllahiu','Head of Business Development','+383 (0) 44 244 699','arianit.vllahiu@prissteel.com','www.prissteel.com'])assert(german.body.toLowerCase().includes(line.toLowerCase()),`plain signature must include ${line}`);
assert(!/linkedin/i.test(german.body)&&!/linkedin/i.test(german.html_body),'LinkedIn must stay out of future drafts because it harmed deliverability');
assert(!german.body.includes('Ky tekst'),'internal Albanian draft brief must never leak into outgoing copy');
assert(!/\bBest regards\b|\bDear\b|\bwe became aware\b/i.test(german.body),'German draft must not mix English body copy');
assert(german.html_body.includes('<img'),'HTML body must include the PRISTEEL logo image');
assert(german.html_body.includes(PRISTEEL_LOGO_URL),'HTML signature must use the canonical PRISTEEL logo from the real Gmail signature');
assert(german.html_body.includes('Arianit Vllahiu')&&german.html_body.includes('Head of Business Development'),'HTML signature must be complete');
assert(!/TED-Referenz|Auftraggeber|ted\.europa\.eu|613835-2026|\bTED\b/i.test(german.html_body),'HTML body must not expose technical source metadata');
assert.equal(german.signature,PRISTEEL_SIGNATURE,'canonical plain signature must be reused exactly');
assert.equal(german.signature_html,PRISTEEL_SIGNATURE_HTML,'canonical HTML signature must be reused exactly');
const germanGeneral=buildTedDraftContent(beckAction,beckTender,beckGeneral);
assert(germanGeneral.body.startsWith('Sehr geehrte Damen und Herren,'),'functional German mailbox must use company/general greeting');
assert.equal(germanGeneral.recipient_kind,'general');
assert.match(germanGeneral.subject,/^Zusätzliche Fertigungskapazität – /);
assert(/zertifiziertes Produktionsnetzwerk/i.test(germanGeneral.body),'general producer inbox must receive the full professional capacity proposition');
assert(/Weiterleitung/i.test(germanGeneral.body),'general producer inbox must still make forwarding easy when another person is responsible');

const birchGcAction={route:'TED_GC',target_company:'Birchmeier Bau AG',target_email:'info@birchmeier-bau.ch',tender_title:'Switzerland – Construction work – UW Beznau PSU Los A Baumeister'};
const birchGcTender={title:birchGcAction.tender_title,publication_no:'642032-2026',winner:{name:'Birchmeier Bau AG',country:'CHE'},place_of_performance:['CHE']};
const birchGeneral=buildTedDraftContent(birchGcAction,birchGcTender,{email:'info@birchmeier-bau.ch',purpose:'general'});
assert.equal(birchGeneral.language,'de');
assert.equal(birchGeneral.recipient_kind,'general');
assert.match(birchGeneral.subject,/^Stahlbau & Fertigung – UW Beznau PSU Los A Baumeister \| PRISTEEL$/);
assert(/Fertigungs- und Lieferpartner/i.test(birchGeneral.body),'GC generic inbox must receive a substantive project-specific introduction');
assert(/Materialbeschaffung, Fertigung, Oberflächenschutz, Qualitätsdokumentation, Verpackung und Lieferung/i.test(birchGeneral.body),'GC draft must explain the coordinated supply scope');
assert(/Weiterleitung an den zuständigen Einkauf/i.test(birchGeneral.body),'GC draft must make forwarding to procurement easy');

const birchDirect=buildTedDraftContent(birchGcAction,birchGcTender,{email:'max.muster@birchmeier-bau.ch',name:'Max Muster',purpose:'procurement'});
assert.equal(birchDirect.recipient_kind,'direct');
assert.match(birchDirect.subject,/^Stahlbau & Fertigung – /);
assert(/Fertigungs- und Lieferpartner/i.test(birchDirect.body),'direct GC contact must receive the same professional project-specific proposition');
assert(/technisches und kommerzielles Angebot/i.test(birchDirect.body),'direct GC contact must receive a concrete quotation call-to-action');


const enAction={...beckAction,target_company:'Example Steel Ltd',target_email:'procurement@example.co.uk',tender_title:'United Kingdom – Structural steelworks'};
const enTender={...beckTender,title:enAction.tender_title,publication_no:'700001-2026',procurement_no:'TED-700001-2026',source_url:'https://ted.europa.eu/en/notice/700001-2026/html',winner:{name:'Example Steel Ltd',country:'GBR'},place_of_performance:['UK']};
const english=buildTedDraftContent(enAction,enTender,{email:'procurement@example.co.uk',purpose:'procurement'});
assert.equal(english.language,'en');
assert.match(english.subject,/^Additional steel fabrication capacity – Structural steelworks \| PRISTEEL$/);
assert(!/\bTED\b|700001-2026/i.test(english.subject),'English subject must not expose source metadata');
assert(english.body.includes('Structural steelworks'),'English copy may naturally mention the cleaned project title');
assert(english.body.includes('Kind regards'),'English draft must stay English');
assert(!/TED reference|Contracting authority|ted\.europa\.eu|700001-2026|\bTED\b/i.test(english.body),'English body must not expose technical source metadata');
assert(!/Përshëndetje|Me respekt|Mit freundlichen Grüßen/.test(english.body),'English draft must not mix Albanian or German copy');
const albaniaEnglish=buildTedDraftContent({...enAction,tender_title:'Albania – Structural steelworks – Industrial steel package'},{...enTender,title:'Albania – Structural steelworks – Industrial steel package',winner:{name:'Example SHPK',country:'ALB'}},{email:'info@example.al',purpose:'general'});
assert.equal(albaniaEnglish.language,'en','Albania must use English under the approved TED outreach language policy');
const bosniaEnglish=buildTedDraftContent({...enAction,tender_title:'Bosnia and Herzegovina – Structural steelworks – Bridge package'},{...enTender,title:'Bosnia and Herzegovina – Structural steelworks – Bridge package',winner:{name:'Example d.o.o.',country:'BIH'}},{email:'info@example.ba',purpose:'general'});
assert.equal(bosniaEnglish.language,'en','Bosnia and Herzegovina must use English under the approved TED outreach language policy');
const croatiaBcs=buildTedDraftContent({...enAction,tender_title:'Croatia – Structural steelworks – Bridge package'},{...enTender,title:'Croatia – Structural steelworks – Bridge package',winner:{name:'Example d.o.o.',country:'HRV'}},{email:'info@example.hr',purpose:'general'});
assert.equal(croatiaBcs.language,'bcs','Croatia must use Serbo-Croatian/BSC copy');
assert(/Poštovani/.test(croatiaBcs.body),'BCS draft must use a local-language greeting');
const englishGeneral=buildTedDraftContent({...enAction,route:'TED_GC',target_company:'Example Construction Ltd',tender_title:'France – Construction work – Project Alpha'},{...enTender,title:'France – Construction work – Project Alpha',winner:{name:'Example Construction Ltd',country:'FRA'}},{email:'info@example-construction.fr',purpose:'general'});
const englishNamed=buildTedDraftContent({...enAction,route:'TED_GC',target_company:'Example Construction Ltd',tender_title:'France – Construction work – Project Alpha'},{...enTender,title:'France – Construction work – Project Alpha',winner:{name:'Example Construction Ltd',country:'FRA'}},{email:'jane.doe@example-construction.fr',name:'Jane Doe',purpose:'procurement'});
assert(englishGeneral.body.startsWith('Dear Sir or Madam,'),'generic English mailbox must use Dear Sir or Madam');
assert(englishNamed.body.startsWith('Dear Jane Doe,'),'verified named contact must receive a personal greeting');
const namedButGeneric=buildTedDraftContent({...enAction,route:'TED_GC',target_company:'Example Construction Ltd',tender_title:'France – Construction work – Project Alpha'},{...enTender,title:'France – Construction work – Project Alpha',winner:{name:'Example Construction Ltd',country:'FRA'}},{email:'info@example-construction.fr',name:'Jane Doe',purpose:'person'});
assert(namedButGeneric.body.startsWith('Dear Sir or Madam,'),'generic mailbox must stay generic even if another source incorrectly associates a person name with it');
const projectBeta=buildTedDraftContent({...enAction,route:'TED_GC',target_company:'Example Construction Ltd',tender_title:'France – Construction work – Project Beta'},{...enTender,title:'France – Construction work – Project Beta',winner:{name:'Example Construction Ltd',country:'FRA'}},{email:'info@example-construction.fr',purpose:'general'});
assert.notEqual(englishGeneral.subject,projectBeta.subject,'different projects must produce different customer-facing subjects');
assert(englishGeneral.subject.includes('Project Alpha')&&projectBeta.subject.includes('Project Beta'),'subject must identify the specific project');
const longEast=buildTedDraftContent({...enAction,route:'TED_GC',tender_title:'Romania – Roadworks – Lucrari de intretinere multianuala vara a retelei de drumuri judetene din judetul Tulcea, zona Est, in perioada 2024-2027'},{...enTender,title:'Romania – Roadworks – Lucrari de intretinere multianuala vara a retelei de drumuri judetene din judetul Tulcea, zona Est, in perioada 2024-2027',winner:{name:'Example SRL',country:'ROU'}},{email:'info@example.ro',purpose:'general'});
const longWest=buildTedDraftContent({...enAction,route:'TED_GC',tender_title:'Romania – Roadworks – Lucrari de intretinere multianuala vara a retelei de drumuri judetene din judetul Tulcea, zona Vest, in perioada 2024-2027'},{...enTender,title:'Romania – Roadworks – Lucrari de intretinere multianuala vara a retelei de drumuri judetene din judetul Tulcea, zona Vest, in perioada 2024-2027',winner:{name:'Example SRL',country:'ROU'}},{email:'info@example.ro',purpose:'general'});
assert.notEqual(longEast.subject,longWest.subject,'long project titles that differ near the end must still yield different subjects');
assert(longEast.subject.includes('zona Est')&&longWest.subject.includes('zona Vest'),'subject truncation must preserve distinguishing project suffixes');
assert(english.html_body.includes(PRISTEEL_LOGO_URL),'English HTML signature must also include the PRISTEEL logo');

const src=fs.readFileSync(new URL('../supabase/functions/pppp-opportunity-draft-generator/index.ts',import.meta.url),'utf8');
assert(src.includes('recipient-policy.mjs'),'generator must use canonical recipient policy');
assert(src.includes('mime-headers.mjs'),'generator must use canonical MIME subject encoder');
assert(src.includes('draft-content.mjs'),'generator must use canonical language/content/signature policy');
assert(src.includes('encodeRfc2047Header'),'generator subject must use RFC 2047 encoding');
assert(src.includes('Content-Type: multipart/alternative'),'future drafts must use multipart HTML mail');
assert(src.includes('Content-Type: text/html; charset=UTF-8'),'future drafts must include a text/html MIME part');
assert(src.includes('Content-Type: text/plain; charset=UTF-8'),'future drafts must retain a plain-text fallback');
assert(src.includes("method:'POST'"),'drafts must be created through Gmail drafts POST');
assert(!src.includes("method:'PUT'"),'existing Gmail drafts must not be rewritten in place');
assert(src.includes('refresh_existing'),'explicit refresh mode must exist for user-approved replacement of old drafts');
assert(src.includes('deleteDraftForRefresh'),'refresh must replace an old draft without introducing a send path');
assert(src.includes("write_policy:'registry_state_machine_v1'"),'generator result must disclose registry-based behavior');
assert(src.includes("gmail_draft_write_policy:'registry_state_machine_v1'"),'PPPP state must persist the registry policy');
assert(src.includes('pppp_opportunity_outreach_registry_v1'),'durable registry must be canonical');
assert(src.includes('X-PPPP-Outreach-ID')&&src.includes('X-PPPP-Action-ID')&&src.includes('Message-ID'),'stable non-body identifiers must be embedded in MIME headers');
assert(src.includes('rfc822msgid:'),'generator must check Sent state before recreating a missing draft');
assert(src.includes('gmail_drafts'),'generator must mirror per-recipient registry state into action payload');
assert(src.includes('separate_draft_per_recipient:true'),'result must explicitly report separate-draft behavior');
assert(src.includes('human_send_required:true'),'human send gate must remain explicit');
assert(src.includes('gmail_auto_send:false'),'persisted state must keep Gmail auto-send disabled');
assert(src.includes("auto_send:false"),'generator must state that auto-send is disabled');
assert(src.includes('/drafts'),'Gmail draft endpoint must remain in use');
assert(!src.includes('/messages/send'),'Gmail send endpoint must not be introduced');
assert(!src.includes('/drafts/send'),'Gmail draft send endpoint must not be introduced');
assert(!src.includes('gmail.send'),'Gmail send scope/action must not be introduced');
assert(!src.includes('FUTURE_DRAFT_CUTOFF'),'deleted historical drafts must be eligible for approved regeneration');
assert(src.includes('To: ${headerSafe(to)}'),'each draft must have exactly its own recipient');
assert(!src.includes('draft_brief'),'internal draft brief must not be interpolated into the outgoing message generator');
assert(src.includes("actionId"),'narrow action-scoped production verification must be supported');
assert(src.includes('consortium_project_outreach_draft')&&src.includes('general_project_outreach_draft'),'generator must cover consortium and unresolved-role TED drafts when a verified recipient exists');
assert(src.includes('authorizationMode'),'draft generator must distinguish scheduler from explicit authenticated user requests');
assert(src.includes('action_id_required_for_user_request'),'authenticated UI requests must never trigger a broad batch without an explicit action id');
assert(src.includes("mode==='user'"),'user-triggered execution must remain action-scoped');


console.log('TED registry-tracked HTML/language/signature/no-source-metadata Gmail draft policy smoke passed.');
