import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildTedDraftContent,PRISTEEL_LOGO_URL} from '../supabase/functions/pppp-opportunity-draft-generator/draft-content.mjs';

const generator=await readFile(new URL('../supabase/functions/pppp-opportunity-draft-generator/index.ts',import.meta.url),'utf8');
const sync=await readFile(new URL('../supabase/functions/pppp-opportunity-outreach-sent-sync/index.ts',import.meta.url),'utf8');
const migration=await readFile(new URL('../supabase/migrations/20260907143500_opportunity_outreach_delivery_registry_v1.sql',import.meta.url),'utf8');

for(const token of ['Message-ID: ${headerSafe(rfcId)}','X-PPPP-Outreach-ID','X-PPPP-Action-ID','pppp_opportunity_outreach_registry_v1','status:\'draft_created\'','human_send_required:true','gmail_auto_send:false'])assert.ok(generator.includes(token),`generator missing ${token}`);
assert.ok(generator.includes('gmail.compose')&&generator.includes('gmail.readonly'),'generator must compose drafts and verify mailbox state');
for(const forbidden of ['/messages/send','/drafts/send','gmail.send'])assert.equal(generator.includes(forbidden),false,`automatic send surface forbidden: ${forbidden}`);
assert.equal(generator.includes('FUTURE_DRAFT_CUTOFF'),false,'historical cutoff must not block operator-approved regeneration');

for(const token of ['rfc822msgid:','X-PPPP-Outreach-ID','Message-ID','status:\'sent\'','gmail_message_id','gmail_thread_id','sent_at','gmail.readonly'])assert.ok(sync.includes(token),`sent sync missing ${token}`);
for(const forbidden of ['/messages/send','/drafts/send','gmail.send','gmail.compose'])assert.equal(sync.includes(forbidden),false,`sent sync must remain read-only: ${forbidden}`);

for(const token of ['create table if not exists public.pppp_opportunity_outreach_registry_v1','gmail_draft_id text','recipient_email text','action_id uuid','status text','draft_created','sent','human_send_required boolean not null default true','gmail_auto_send boolean not null default false','unique (action_id, recipient_email)','opportunity-outreach-sent-sync-15m'])assert.ok(migration.includes(token),`migration missing ${token}`);

const action={id:'11111111-1111-4111-8111-111111111111',route:'TED_GC',target_company:'Beispiel Stahlbau GmbH',target_email:'einkauf@beispiel.de',tender_title:'TED 123456-2026 – Neubau Stahlhalle'};
const tender={publication_no:'123456-2026',source_url:'https://ted.europa.eu/example',title:'TED 123456-2026 – Neubau Stahlhalle',winner:{country:'DE'}};
const recipient={email:'einkauf@beispiel.de',name:'Max Mustermann'};
const content=buildTedDraftContent(action,tender,recipient);
assert.equal(content.language,'de');
assert.equal(content.subject.includes('TED'),false);
assert.equal(content.subject.includes('123456-2026'),false);
for(const value of [content.body,content.html_body]){
  assert.equal(value.includes('TED-Referenz'),false);
  assert.equal(value.includes('Auftraggeber'),false);
  assert.equal(value.includes('ted.europa.eu'),false);
  assert.equal(value.includes('123456-2026'),false);
}
assert.ok(content.body.includes('Neubau Stahlhalle'),'project should be mentioned naturally');
assert.ok(content.html_body.includes(PRISTEEL_LOGO_URL),'HTML signature must include PRISTEEL logo');
assert.ok(content.html_body.includes('Arianit Vllahiu'));
assert.ok(content.html_body.includes('Head of Business Development'));

console.log('opportunity outreach delivery registry smoke: ok');
