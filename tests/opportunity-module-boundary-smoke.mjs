import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/20260926170000_opportunity_module_boundary_hardening_v1.sql','utf8');
const engine=fs.readFileSync('scripts/opportunity-engine-v2.mjs','utf8');
const representation=fs.readFileSync('pristeel-representation-opportunities-v2.js','utf8');
const materialTrade=fs.readFileSync('supabase/functions/pppp-dach-steel-draft-generator/index.ts','utf8');

const triggerFunction=migration.match(/create or replace function public\.pppp_tender_multiroute_screen_v2\(\)[\s\S]*?\n\$\$;/i)?.[0] ?? '';
const handoffFunction=migration.match(/create or replace function public\.pppp_register_representation_handoff_v1\([\s\S]*?\n\$\$;/i)?.[0] ?? '';

assert(triggerFunction,'Multi-route trigger function must be present');
assert(handoffFunction,'Explicit Representation handoff function must be present');
assert.doesNotMatch(triggerFunction,/insert\s+into|update\s+public\.|delete\s+from/i,'Tender routing trigger must only annotate its own row');
assert.match(migration,/drop trigger if exists trg_pppp_tender_partnership_expansion_sync_v1/i,'Hidden cross-module writer must be retired');
assert.match(migration,/with \(security_invoker = true\)/i,'The neutral handoff queue must obey caller RLS');
assert.match(migration,/partition by coalesce\(nullif\(btrim\(t\.procurement_no\),''\),nullif\(btrim\(t\.publication_no\),''\),t\.source_key\)/i,'Tender notices must deduplicate on canonical procurement identity');
assert.match(migration,/coalesce\(t\.status,'new'\)<>?'ignored'/i,'Ignored tenders must not enter the handoff queue');
assert.match(handoffFunction,/auth\.uid\(\)/i,'Handoff registration must require authentication');
assert.match(handoffFunction,/public\.can_write\(\)/i,'Handoff registration must require writer permission');
assert.doesNotMatch(handoffFunction,/pppp_representation_opportunity_targets_v1|\bprojects\b|\bpartners\b|\bsuppliers\b|\bcontacts\b|material_trade|outbound_queue|supplier_selection|purchase_orders|\bcontracts\b/i,'Handoff registration must not create downstream business objects or commitments');
assert.doesNotMatch(handoffFunction,/\b(won|lost|no_bid)\b/i,'Handoff registration must not decide Project outcomes');
assert.match(handoffFunction,/target_created',false[\s\S]*project_created',false[\s\S]*contact_created',false[\s\S]*outbound_created',false/i,'RPC response must make preserved human gates explicit');
assert.match(migration,/'direct_bid'[\s\S]*'jv_consortium'[\s\S]*'representation_market_entry'/i,'Routing must evaluate direct, JV and Representation routes independently');
assert.doesNotMatch(triggerFunction,/direct_bid\s*=\s*false|not\s+direct_bid/i,'A false direct-bid route must not suppress strategic partnership analysis');
assert.match(triggerFunction,/v_phase in \('pipeline','opportunity','award'\)/i,'Historical awards must remain eligible for partnership intelligence');
assert.match(triggerFunction,/v_low_fit[\s\S]*not v_low_fit[\s\S]*partnership_expansion_required/i,'False-positive filters must gate partnership expansion');
assert.match(migration,/cron\.unschedule/i,'Legacy automatic Project promotion schedules must be retired');
assert.match(migration,/revoke all on function public\.pppp_tender_project_promotion_reconcile_v2\(boolean,integer\)[\s\S]*service_role/i,'Automatic Project promotion must not remain callable by service automation');
assert.doesNotMatch(engine,/pppp_tender_project_promotion_reconcile_v[12]/i,'Scheduled opportunity processing must not invoke Project promotion');
assert.match(representation,/data-opp-consume/i,'Representation UI must expose an explicit consume action');
assert.match(representation,/window\.confirm/i,'Representation handoff must require confirmation');
assert.match(representation,/rpc\/pppp_register_representation_handoff_v1/i,'Representation UI must call the consumer-owned RPC');
assert.doesNotMatch(representation,/gmailSend|send_email|send_draft|outbound_queue/i,'Representation UI must not send or queue outreach');
assert.doesNotMatch(materialTrade,/kek_tender_watch|pppp_partnership_expansion_queue_v1|pppp_representation_opportunities_v1/i,'Material Trade must remain isolated from tender and Representation state');

console.log('Opportunity module boundary smoke: PASS');
