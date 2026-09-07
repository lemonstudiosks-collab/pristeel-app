import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveTedRecipients, recipientGreeting, normalizeEmail } from '../supabase/functions/pppp-opportunity-draft-generator/recipient-policy.mjs';
import { encodeRfc2047Header } from '../supabase/functions/pppp-opportunity-draft-generator/mime-headers.mjs';
import { buildTedDraftContent, resolveDraftLanguage, tedReference, PRISTEEL_SIGNATURE } from '../supabase/functions/pppp-opportunity-draft-generator/draft-content.mjs';

const action={
  id:'11111111-1111-4111-8111-111111111111',
  route:'TED_GC',
  target_company:'Acme Steel GmbH',
  target_email:'info@acme-steel.de'
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
    {email:'alice@acme-steel.de',full_name:'Alice Example',job_title:'Procurement Manager',verification_status:'verified',source_type:'official_website'},
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
assert.equal(emails.filter(e=>e==='alice@acme-steel.de').length,1,'same email must not get duplicate drafts');
const alice=recipients.find(r=>r.email==='alice@acme-steel.de');
assert.equal(alice?.name,'Alice Example');
assert.equal(recipientGreeting(action.target_company,alice),'Dear Alice Example,','known contact name must be used');
const inferred=recipients.find(r=>r.email==='max.mustermann@acme-steel.de');
assert.equal(inferred?.name,'Max Mustermann','clear firstname.lastname person email may infer a conservative name');
assert.equal(recipientGreeting(action.target_company,inferred),'Dear Max Mustermann,','clear classified person must receive personal greeting');
const general=recipients.find(r=>r.email==='info@acme-steel.de');
assert.equal(recipientGreeting(action.target_company,general),'Dear Acme Steel GmbH team,','unnamed contact must use company greeting');
const functional=recipients.find(r=>r.email==='office.team@acme-steel.de');
assert.equal(functional?.name,'','functional mailbox token must block name inference even when enrichment says person');
assert.equal(recipientGreeting(action.target_company,functional),'Dear Acme Steel GmbH team,','functional mailbox must retain company greeting');
assert.equal(normalizeEmail(' Alice@Example.COM '),'alice@example.com');
assert.equal(resolveTedRecipients(action,payload,2).length,2,'recipient cap must be respected');

const subject='PriSteel · Görres – München';
const encodedSubject=encodeRfc2047Header(subject);
assert(encodedSubject.includes('=?UTF-8?B?'),'international subject must use RFC 2047 encoded-word syntax');
for(const word of encodedSubject.split(/\s+/))assert(word.length<=75,'each RFC 2047 encoded-word must fit the 75-character limit');
const decodedSubject=encodedSubject.split(/\s+/).map(word=>{const m=/^=\?UTF-8\?B\?([^?]+)\?=$/i.exec(word);return m?Buffer.from(m[1],'base64').toString('utf8'):word;}).join('');
assert.equal(decodedSubject,subject,'RFC 2047 subject must round-trip international characters exactly');
assert.equal(encodeRfc2047Header('PriSteel Opportunity'),'PriSteel Opportunity','ASCII-only subject should remain readable ASCII');
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
assert.equal(tedReference(beckTender),'613835-2026','TED publication reference must be canonicalized');
const german=buildTedDraftContent(beckAction,beckTender,beckPerson);
assert.equal(german.language,'de');
assert(german.subject.includes('TED 613835-2026'),'subject must carry the concrete TED reference');
assert(german.body.startsWith('Guten Tag Benjamin Beck,'),'German person draft must use a German personal greeting');
assert(german.body.includes('TED-Referenz: 613835-2026'),'German body must carry the concrete TED reference');
assert(german.body.includes('Stadtverwaltung Neckarsulm'),'German body must name the contracting authority');
assert(german.body.includes('https://ted.europa.eu/en/notice/613835-2026/html'),'German body must carry the TED notice link');
assert(german.body.includes('Mit freundlichen Grüßen,'),'German draft must close in German');
for(const line of ['Arianit Vllahiu','Head of Business Development','+383 (0) 44 244 699','arianit.vllahiu@prissteel.com','www.prissteel.com','linkedin.com/in/arianit-vllahiu-8a779b3b4'])assert(german.body.toLowerCase().includes(line.toLowerCase()),`signature must include ${line}`);
assert(!german.body.includes('Ky tekst'),'internal Albanian draft brief must never leak into outgoing copy');
assert(!/\bBest regards\b|\bDear\b|\bwe noted\b/i.test(german.body),'German draft must not mix English body copy');
const germanGeneral=buildTedDraftContent(beckAction,beckTender,beckGeneral);
assert(germanGeneral.body.startsWith('Sehr geehrte Damen und Herren,'),'functional German mailbox must use company/general greeting');
assert.equal(german.signature,PRISTEEL_SIGNATURE,'canonical signature must be reused exactly');

const enAction={...beckAction,target_company:'Example Steel Ltd',target_email:'procurement@example.co.uk',tender_title:'United Kingdom – Structural steelworks'};
const enTender={...beckTender,title:enAction.tender_title,publication_no:'700001-2026',procurement_no:'TED-700001-2026',source_url:'https://ted.europa.eu/en/notice/700001-2026/html',winner:{name:'Example Steel Ltd',country:'GBR'},place_of_performance:['UK']};
const english=buildTedDraftContent(enAction,enTender,{email:'procurement@example.co.uk',purpose:'procurement'});
assert.equal(english.language,'en');
assert(english.body.includes('TED reference: 700001-2026'),'English draft must carry TED reference');
assert(english.body.includes('Best regards,'),'English draft must stay English');
assert(!/Përshëndetje|Me respekt|Mit freundlichen Grüßen/.test(english.body),'English draft must not mix Albanian or German copy');

const src=fs.readFileSync(new URL('../supabase/functions/pppp-opportunity-draft-generator/index.ts',import.meta.url),'utf8');
assert(src.includes('recipient-policy.mjs'),'generator must use canonical recipient policy');
assert(src.includes('mime-headers.mjs'),'generator must use canonical MIME subject encoder');
assert(src.includes('draft-content.mjs'),'generator must use canonical language/TED/signature content policy');
assert(src.includes('encodeRfc2047Header'),'generator subject must use RFC 2047 encoding');
assert(src.includes('gmail_drafts'),'generator must persist per-recipient draft registry');
assert(src.includes('gmail_draft_generator_complete'),'generator must track completion of rewrite migration');
assert(src.includes("method:draftId?'PUT':'POST'"),'stale drafts must be rewritten in place rather than duplicated');
assert(src.includes('separate_draft_per_recipient:true'),'result must explicitly report separate-draft behavior');
assert(src.includes('human_send_required:true'),'human send gate must remain explicit');
assert(src.includes("auto_send:false"),'generator must state that auto-send is disabled');
assert(src.includes('/drafts'),'Gmail draft endpoint must remain in use');
assert(!src.includes('/messages/send'),'Gmail send endpoint must not be introduced');
assert(!src.includes('gmail.send'),'Gmail send scope/action must not be introduced');
assert(src.includes('To: ${headerSafe(to)}'),'each draft must have exactly its own recipient');
assert(!src.includes('draft_brief'),'internal draft brief must not be interpolated into the outgoing message generator');
assert(src.includes("action_id"),'narrow action-scoped production verification must be supported');

console.log('TED multi-contact RFC2047/personalization/language/reference/signature Gmail draft policy smoke passed.');
