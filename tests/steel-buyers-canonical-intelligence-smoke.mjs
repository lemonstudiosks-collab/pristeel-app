import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/20260928101500_steel_buyers_canonical_intelligence_v1.sql','utf8');
const discovery=fs.readFileSync('supabase/functions/pppp-steel-buyer-discovery/index.ts','utf8');
const draft=fs.readFileSync('supabase/functions/pppp-dach-steel-draft-generator/index.ts','utf8');
const ui=fs.readFileSync('pristeel-dach-steel-sales-v1.js','utf8');

assert.match(migration,/create table if not exists public\.pppp_company_identity_v1/);
assert.match(migration,/pppp_dach_steel_targets_active_domain_uq/);
assert.match(migration,/cross_module_identity_review_required/);
assert.match(migration,/pppp_company_module_roles_v1/);
assert.match(migration,/pppp_steel_buyer_company_analysis_v1/);
assert.match(migration,/company_size_band/);
assert.match(migration,/consumption_potential/);
assert.match(migration,/annual_steel_tonnes_max/);
assert.match(migration,/pppp_register_steel_buyer_discovery_candidate_v1/);
assert.match(migration,/pppp_register_steel_buyer_discovery_batch_v1/);
assert.match(migration,/pppp_accept_steel_buyer_discovery_candidate_v1/);
assert.match(migration,/authenticated_user_required/);
assert.match(migration,/pppp-steel-buyer-discovery-daily/);
assert.match(migration,/'15 20 \* \* \*'/);
assert.match(migration,/'15 6,12,18 \* \* \*'/);
assert.match(discovery,/daily_run_already_exists/);
assert.match(discovery,/wikidata_public_sparql/);
assert.match(discovery,/outbound_created:false,gmail_draft_created:false,external_email_sent:false/);
assert.doesNotMatch(discovery,/gmailapis\.google\.com/);
assert.doesNotMatch(discovery,/pppp_outbound_queue_v1/);
assert.match(draft,/renderBuyerOutreach/);
assert.match(draft,/Missing package\/company detail selects the general-safe copy/);
assert.doesNotMatch(draft,/if\(Number\(tg\?\.message_evidence_score\|\|0\)<60\|\|facts\.length<2\)throw/);
assert.match(draft,/cross_module_identity_review_required/);
assert.match(draft,/followup_blocked_reply_classification/);
assert.match(draft,/positive_buyer_signal_confirmation_required/);
assert.match(ui,/verified_company_facts,missing_company_facts/);
assert.match(ui,/Fakte të verifikuara/);
assert.match(ui,/Kontakt ende i pagjetur/);
assert.match(ui,/confirm_positive_buyer_signal:true/);
assert.match(ui,/accept-discovery/);
assert.match(ui,/external_email_sent|Asnjë draft ose email nuk u krijua/i);

console.log('Steel Buyers canonical identity, intelligence, daily discovery and safe outreach smoke: OK');

