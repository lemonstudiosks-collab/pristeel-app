import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../supabase/migrations/20260907174500_gc_first_future_outreach_krpp_structure_v1.sql',import.meta.url),'utf8');
const generator=fs.readFileSync(new URL('../supabase/functions/pppp-opportunity-draft-generator/index.ts',import.meta.url),'utf8');

assert(migration.includes("'opportunity-gmail-drafts-15m'"),'future draft cron must remain explicit');
assert(migration.includes("action_type = 'gc_project_outreach_draft'"),'automatic future Gmail drafts must be GC/GU/EPC only');
assert(!migration.includes("action_type in ('gc_project_outreach_draft','producer_capacity_outreach_draft')"),'producer drafts must not share the automatic future Gmail lane');
assert(migration.includes("created_at >= timestamptz '2026-09-07 15:45:00+00'"),'new GC-first policy must be future-only from approval cutoff');
assert(migration.includes('order by relevance_score desc nulls last'),'stronger GC awards must be processed first');
assert(migration.includes('limit 20'),'future cron must remain bounded');
assert(migration.includes('gmail_tracker_cron_secret'),'future cron must retain protected secret auth');

assert(migration.includes('pppp_future_krpp_structure_fit_v1'),'future KRPP structure normalizer must be installed');
assert(migration.includes("v_source <> 'KRPP'"),'KRPP structure rule must not alter other tender sources');
assert(migration.includes("coalesce(new.created_at,new.first_seen_at,now()) < v_cutoff"),'KRPP structure rule must leave pre-cutoff rows unchanged');
assert(migration.includes('(konstruksion|konstrukcion|struktur)'),'KRPP structure rule must recognize local structure wording variants');
assert(migration.includes('(mbuloje|mbulese|mbulesë|carport|canopy|shelter|strehe|strehë)'),'KRPP structure rule must recognize canopy/carport/shelter wording');
assert(migration.includes("new.category := 'steel_structure'"),'clear future metal structures must be classified as steel_structure');
assert(migration.includes('greatest(coalesce(new.relevance_score,0),86)'),'clear future metal structures must reach strong relevance');
assert(migration.includes("'capability_fit','strong'"),'future KRPP structure payload must carry strong capability fit');
assert(migration.includes("'capability_review_required',false"),'clear future structures must not be held back by the old possible-only score');

assert(generator.includes('human_send_required:true'),'human-send gate must remain explicit');
assert(generator.includes('gmail_auto_send:false'),'auto-send must remain disabled');
assert(!generator.includes('/messages/send'),'Gmail send endpoint must remain absent');
assert(!generator.includes('/drafts/send'),'Gmail draft-send endpoint must remain absent');
assert(!generator.includes('gmail.send'),'gmail.send scope must remain absent');

console.log('GC-first future outreach + KRPP structure policy smoke passed.');
