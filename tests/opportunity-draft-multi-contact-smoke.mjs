import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveTedRecipients, recipientGreeting, normalizeEmail } from '../supabase/functions/pppp-opportunity-draft-generator/recipient-policy.mjs';
import { encodeRfc2047Header } from '../supabase/functions/pppp-opportunity-draft-generator/mime-headers.mjs';

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

const src=fs.readFileSync(new URL('../supabase/functions/pppp-opportunity-draft-generator/index.ts',import.meta.url),'utf8');
assert(src.includes('recipient-policy.mjs'),'generator must use canonical recipient policy');
assert(src.includes('mime-headers.mjs'),'generator must use canonical MIME subject encoder');
assert(src.includes('encodeRfc2047Header'),'generator subject must use RFC 2047 encoding');
assert(src.includes('gmail_drafts'),'generator must persist per-recipient draft registry');
assert(src.includes('separate_draft_per_recipient:true'),'result must explicitly report separate-draft behavior');
assert(src.includes('human_send_required:true'),'human send gate must remain explicit');
assert(src.includes("auto_send:false"),'generator must state that auto-send is disabled');
assert(src.includes('/drafts'),'Gmail draft endpoint must remain in use');
assert(!src.includes('/messages/send'),'Gmail send endpoint must not be introduced');
assert(!src.includes('gmail.send'),'Gmail send scope/action must not be introduced');
assert(src.includes('To: ${headerSafe(to)}'),'each draft must have exactly its own recipient');
assert(!src.includes(".not('target_email','is',null)"),'TED actions with enrichment contacts must not require one preselected email');
assert(src.includes("action_id"),'narrow action-scoped production verification must be supported');

console.log('TED multi-contact RFC2047/personalization Gmail draft policy smoke passed.');
