import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../supabase/migrations/20260907162000_restore_future_opportunity_draft_cron_v1.sql',import.meta.url),'utf8');
const generator=fs.readFileSync(new URL('../supabase/functions/pppp-opportunity-draft-generator/index.ts',import.meta.url),'utf8');
const content=fs.readFileSync(new URL('../supabase/functions/pppp-opportunity-draft-generator/draft-content.mjs',import.meta.url),'utf8');

assert(migration.includes("'opportunity-gmail-drafts-15m'"),'cron job name must be explicit');
assert(migration.includes("'11,26,41,56 * * * *'"),'draft cron must run one minute after sent-sync');
assert(migration.includes("created_at >= timestamptz '2026-09-07 14:15:00+00'"),'existing actions/drafts must be excluded by immutable rollout cutoff');
assert(migration.includes("action_id=' || q.id::text"),'cron must invoke one action at a time');
assert(migration.includes("limit 20"),'cron must remain bounded');
assert(migration.includes("gmail_tracker_cron_secret"),'cron must retain protected secret auth');

assert(generator.includes("method:'POST'"),'new Gmail drafts must be created with POST');
assert(!generator.includes("method:'PUT'"),'existing Gmail drafts must never be rewritten');
assert(generator.includes('pppp_opportunity_outreach_registry_v1'),'durable action+recipient registry must prevent duplicates');
assert(generator.includes('Content-Type: multipart/alternative'),'new drafts must be multipart/alternative');
assert(generator.includes('Content-Type: text/html; charset=UTF-8'),'new drafts must include HTML');
assert(generator.includes('human_send_required:true'),'human-send gate must remain explicit');
assert(generator.includes('gmail_auto_send:false'),'persisted state must keep auto-send disabled');
assert(generator.includes("auto_send:false"),'runtime result must state auto-send is disabled');
assert(!generator.includes('/messages/send'),'Gmail send endpoint must not exist');
assert(!generator.includes('/drafts/send'),'Gmail draft-send endpoint must not exist');
assert(!generator.includes('gmail.send'),'gmail.send scope must not exist');

assert(content.includes('PRISTEEL_LOGO_URL'),'HTML signature must include canonical PRISTEEL logo');
assert(content.includes('Zusätzliche Stahlbau-Fertigungskapazität'),'German subject policy must remain present');
assert(!content.includes('TED-Referenz:'),'customer body template must not contain TED reference block');
assert(!content.includes('Auftraggeber:'),'customer body template must not contain contracting-authority block');

console.log('Future-only Opportunity draft cron policy smoke passed.');
