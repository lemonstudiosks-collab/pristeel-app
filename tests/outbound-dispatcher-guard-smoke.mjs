import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const migration=await readFile(new URL('../supabase/migrations/20260919233500_guarded_outbound_dispatcher_v1.sql',import.meta.url),'utf8');
const edge=await readFile(new URL('../supabase/functions/pppp-outbound-dispatch/index.ts',import.meta.url),'utf8');

for(const token of [
  'pppp_outbound_internal_recipient_guard_v1',
  'pppp_outbound_approve_rows_v1',
  'pppp_outbound_claim_for_dispatch_v1',
  'pppp_outbound_mark_dispatch_failed_v1',
  'pppp_outbound_mark_sent_v1',
  'pppp_outbound_dispatch_internal_request',
  "if not p.send_enabled then return jsonb_build_object('ok',false,'reason','send_disabled')",
  "if not q.approved_for_send then return jsonb_build_object('ok',false,'reason','not_human_approved')",
  "d.captured_at>=now()-interval '4 hours'",
  'v_sent_today>=p.daily_limit',
  'p.min_gap_minutes',
  'p.max_per_domain_per_day',
  "internal_pristeel_recipient",
  '-- Important: no cron.schedule here.'
]) assert.ok(migration.includes(token),'missing dispatcher DB guard: '+token);

assert.equal(migration.includes('cron.schedule('),false,'dispatcher migration must not enable a cron schedule');
assert.equal(migration.includes("set send_enabled=true"),false,'dispatcher migration must not enable sending');
assert.equal(migration.includes("send_enabled=true"),false,'dispatcher migration must not flip global send gate');

for(const token of [
  'pppp_outbound_claim_for_dispatch_v1',
  '/drafts/send',
  'live_draft_recipient_mismatch',
  'pppp_outbound_mark_dispatch_failed_v1',
  'pppp_outbound_mark_sent_v1',
  'urn:ietf:params:oauth:grant-type:jwt-bearer'
]) assert.ok(edge.includes(token),'missing dispatcher edge safeguard: '+token);

assert.ok(edge.indexOf('pppp_outbound_claim_for_dispatch_v1') < edge.indexOf('/drafts/send'),'DB claim must happen before Gmail send');
assert.ok(edge.indexOf('live_draft_recipient_mismatch') < edge.indexOf('const sent=await gmail("/drafts/send"'),'live recipient check must happen before Gmail send');
assert.ok(edge.indexOf('/drafts/send') < edge.indexOf('pppp_outbound_mark_sent_v1'),'canonical sent state must only be marked after Gmail send');
assert.equal(edge.includes('for(const queue'),false,'dispatcher must not batch-send multiple queue rows per invocation');
assert.equal(edge.includes('db.auth.getUser'),false,'dispatcher must not accept a general authenticated user as an execution trigger');
assert.ok(edge.includes('return "internal_cron"'),'dispatcher must require the canonical internal cron secret');

console.log('guarded outbound dispatcher smoke: ok');
