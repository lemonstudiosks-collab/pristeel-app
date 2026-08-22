import fs from 'node:fs';
import assert from 'node:assert/strict';

const ui = fs.readFileSync('pristeel-contact-master-v1.js','utf8');
const migration = fs.readFileSync('supabase/migrations/20260822203500_toneatti_contact_reconcile.sql','utf8');

assert.match(ui,/return'Klient \/ Lead'/,'canonical client bucket must be labelled Klient / Lead');
assert.match(ui,/<option value="client">Klient \/ Lead<\/option>/,'client filter must use the same semantic label');

assert.match(migration,/759778400454/,'migration must preserve the current Toneatti HubSpot identity');
assert.match(migration,/758778400454/,'migration must explicitly reconcile the stale Toneatti HubSpot identity');
assert.match(migration,/legacy_hubspot_id/,'stale HubSpot identity must be retained in provenance');
assert.match(migration,/legacy_contact_id/,'stale canonical contact id must be retained in provenance');
assert.match(migration,/update public\.contact_activities[\s\S]*contact_id=v_keep/,'activities must move to the surviving canonical contact before deletion');
assert.match(migration,/delete from public\.contact_sources[\s\S]*delete from public\.contacts/,'source provenance row must be reconciled before the stale canonical row is deleted');
assert.match(migration,/crm_contacts[\s\S]*758778400454[\s\S]*raise exception/,'migration must abort if the retired HubSpot identity reappears in the current CRM feed');

console.log('Contact Master final cleanup smoke passed.');
