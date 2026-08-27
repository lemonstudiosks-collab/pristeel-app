import fs from 'node:fs';
import assert from 'node:assert/strict';

const ui = fs.readFileSync('pristeel-contact-master-v1.js','utf8');
const migration = fs.readFileSync('supabase/migrations/20260822203500_toneatti_contact_reconcile.sql','utf8');

assert.match(ui,/return'Klient'/,'canonical client bucket must use the Albanian label Klient');
assert(!ui.includes('id="pcm-kind"'),'Contact Master must not expose the legacy Role dropdown');
assert.match(ui,/businessCard\('all','Të gjithë'\)\+businessCard\('client','Klientë'\)\+businessCard\('supplier','Furnitorë'\)\+businessCard\('manufacturer','Prodhues'\)/,'business category cards must remain in Albanian and in the requested direct order');
assert.match(ui,/partners\?select=name,aliases,relation&limit=1000/,'manufacturer category must be derived from partner relationships');
assert.match(ui,/rel\.indexOf\('manufacturer'\)<0/,'manufacturer filter must require the manufacturer relation');
assert.match(ui,/mode==='manufacturer'&&isManufacturer\(r\)/,'manufacturer card must filter Contact Master rows directly');
assert.match(ui,/pcm-search-compact[^`]*max-width:300px/,'search control must stay compact');
assert.match(ui,/pcm-business-card\.active\{background:#4F9686/,'active business category must have a clearly visible Contact color');
assert.match(ui,/border-top:8px solid #4F9686/,'Contact page must have a visible module color strip even without the global finalizer');
assert.match(ui,/b\.dataset\.pstSection='contacts'/,'Contact Master must set its section identity directly');

assert.match(migration,/759778400454/,'migration must preserve the current Toneatti HubSpot identity');
assert.match(migration,/758778400454/,'migration must explicitly reconcile the stale Toneatti HubSpot identity');
assert.match(migration,/legacy_hubspot_id/,'stale HubSpot identity must be retained in provenance');
assert.match(migration,/legacy_contact_id/,'stale canonical contact id must be retained in provenance');
assert.match(migration,/update public\.contact_activities[\s\S]*contact_id=v_keep/,'activities must move to the surviving canonical contact before deletion');
assert.match(migration,/delete from public\.contact_sources[\s\S]*delete from public\.contacts/,'source provenance row must be reconciled before the stale canonical row is deleted');
assert.match(migration,/crm_contacts[\s\S]*758778400454[\s\S]*raise exception/,'migration must abort if the retired HubSpot identity reappears in the current CRM feed');

console.log('Contact Master native cards + final cleanup smoke passed.');

assert.match(ui,/DOSJA E KONTAKTIT/,'contact popup heading must be Albanian');
assert.match(ui,/pppp_contact_master_v1\?contact_id=eq\./,'contact popup must refresh the selected contact from the live canonical view');
assert.match(ui,/project_email_count/,'contact popup must expose real project email activity');
