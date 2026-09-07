import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FUTURE_DRAFT_CUTOFF,actionEligibleForFutureDrafts,shouldCreateFutureDraft} from '../supabase/functions/pppp-opportunity-draft-generator/draft-write-policy.mjs';

assert.equal(FUTURE_DRAFT_CUTOFF,'2026-09-07T11:57:00.000Z');
assert.equal(actionEligibleForFutureDrafts('2026-09-07T11:56:59.999Z'),false,'pre-rollout actions must never create or rewrite drafts');
assert.equal(actionEligibleForFutureDrafts('2026-09-07T11:57:00.000Z'),true,'cutoff action is eligible');
assert.equal(actionEligibleForFutureDrafts('2026-09-07T12:00:00.000Z'),true,'future actions are eligible');
assert.equal(actionEligibleForFutureDrafts(''),false,'unknown action age must fail closed');
assert.equal(shouldCreateFutureDraft({draft_id:'existing'}),false,'existing Gmail draft remains immutable');
assert.equal(shouldCreateFutureDraft({}),true,'missing draft may be created only after action cutoff gate passes');

const src=fs.readFileSync(new URL('../supabase/functions/pppp-opportunity-draft-generator/index.ts',import.meta.url),'utf8');
assert(src.includes("event:'historical_action_preserved'"),'generator must explicitly preserve historical actions');
assert(src.includes('actionEligibleForFutureDrafts(a.created_at)'),'action creation time must gate Gmail writes');
assert(src.includes('drafts_updated:0'),'generator must never rewrite drafts');
assert(!src.includes("method:'PUT'"),'Gmail drafts update must remain absent');
assert(!src.includes('/messages/send'),'send endpoint must remain absent');
assert(src.includes('gmail_auto_send:false')&&src.includes('human_send_required:true'),'human send gate must remain explicit');

const migration=fs.readFileSync(new URL('../supabase/migrations/20260907140500_opportunity_action_gmail_future_policy_preservation_v3.sql',import.meta.url),'utf8');
for(const key of ['gmail_drafts','gmail_draft_write_policy','gmail_draft_policy_cutoff','gmail_draft_html','gmail_auto_send','human_send_required'])assert(migration.includes(`'${key}'`),`migration must preserve ${key}`);
console.log('TED future-only cutoff/no-rewrite smoke passed.');
