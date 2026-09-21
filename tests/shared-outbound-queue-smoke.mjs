import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const sql=await readFile(new URL('../supabase/migrations/20260919213500_shared_outbound_queue_v1.sql',import.meta.url),'utf8');
const live=await readFile(new URL('../supabase/migrations/20260919224500_outbound_live_draft_preflight_v1.sql',import.meta.url),'utf8');
const truth=await readFile(new URL('../supabase/migrations/20260919231500_outbound_stale_truth_preflight_v1.sql',import.meta.url),'utf8');
const canonical=(await readFile(new URL('../supabase/migrations/20260921170821_outbound_sync_server_canonical_v1.sql',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
const effective=sql+'\n'+canonical;

for(const token of [
  'create table if not exists public.pppp_outbound_policy_v1',
  "starts_on date not null default date '2026-09-21'",
  'daily_limit integer not null default 50',
  'min_gap_minutes integer not null default 5',
  'planned_gap_minutes integer not null default 10',
  'max_per_domain_per_day integer not null default 1',
  'send_enabled boolean not null default false',
  'human_send_required boolean not null default true',
  'create table if not exists public.pppp_outbound_queue_v1',
  "source in ('TED','GC')",
  'pppp_opportunity_outreach_registry_v1',
  'pppp_gc_prospects_v1',
  'pppp_outbound_sync_v1',
  'pppp_outbound_plan_day_v1',
  'pppp_outbound_review_v1',
  'pppp_outbound_status_v1',
  'recipient_cooldown_days',
  'domain_cooldown_days',
  'company_reply_requires_human_followup',
  'approved_for_send=false',
  'canonical_source_not_send_ready'
]) assert.ok(sql.includes(token),'missing shared outbound safeguard: '+token);

assert.ok(sql.includes("q.recipient_email !~* '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'"),'email validator must use one regex escape before the domain dot');
assert.equal(sql.includes("q.recipient_email !~* '^[^[:space:]@]+@[^[:space:]@]+\\\\.[^[:space:]@]+$'"),false,'email validator must not require a literal backslash in addresses');
assert.ok(sql.includes('partition by lower(q.recipient_email)'),'daily plan must dedupe exact recipients across sources');
assert.ok(sql.includes('partition by lower(coalesce(q.company_domain'),'daily plan must coordinate same-domain candidates');
assert.ok(sql.includes('at time zone v_policy.timezone'),'planned slots must use the shared timezone');
assert.ok(sql.includes('make_interval(mins=>v_policy.planned_gap_minutes'),'planned sends must be spaced by the policy gap');
assert.ok(sql.includes('not (h.source=q.source and h.source_record_id=q.source_record_id)'),'same GC campaign follow-up must not be blocked by its own first touch');
assert.ok(effective.includes("update public.pppp_outbound_queue_v1 q\n     set status='candidate'"),'planner reset update must use a table alias');
assert.ok(effective.includes("q.approved_for_send=false"),'planner reset must qualify approved_for_send to avoid PL/pgSQL output-column ambiguity');

for(const forbidden of [
  '/messages/send',
  '/drafts/send',
  'gmail.send',
  'send_email(',
  'send_draft(',
  'net.http_post(',
  'net.http_get('
]) assert.equal(sql.includes(forbidden),false,'shared queue must not contain an email execution path: '+forbidden);

console.log('shared TED + GC outbound queue smoke: ok');

for(const token of [
  'create table if not exists public.pppp_outbound_live_drafts_v1',
  'pppp_outbound_reconcile_live_drafts_v1',
  'gmail_draft_missing',
  'manual_live_draft',
  "lower(public.pppp_outbound_domain_v1(d.recipient_email,null)) <> 'prissteel.com'",
  'exists (',
  'public.pppp_outbound_live_drafts_v1 d where d.draft_id=q.gmail_draft_id',
  'approved_for_send=false',
  'human_send_required',
  'auto_send'
]) assert.ok(live.includes(token),'missing live draft preflight safeguard: '+token);

for(const forbidden of ['/messages/send','/drafts/send','gmail.send','send_email(','send_draft('])
  assert.equal(live.includes(forbidden),false,'live draft preflight must never send mail: '+forbidden);


for(const token of [
  "suppression_reason='gmail_draft_missing'",
  "then 'stale'",
  "when q.status='stale' and q.suppression_reason='gmail_draft_missing' then 'candidate'",
  'pppp_outbound_preflight_v1',
  "'missing_draft_count'",
  "'duplicate_recipient_count'",
  "'duplicate_domain_count'",
  "'ready_to_dispatch_count'",
  "'auto_send',false"
]) assert.ok(truth.includes(token),'missing stale-truth/preflight safeguard: '+token);

for(const forbidden of ['/messages/send','/drafts/send','gmail.send','send_email(','send_draft('])
  assert.equal(truth.includes(forbidden),false,'stale-truth/preflight migration must not send mail: '+forbidden);
