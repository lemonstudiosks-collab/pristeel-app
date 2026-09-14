import fs from 'node:fs';
import assert from 'node:assert/strict';

const sql=fs.readFileSync('supabase/migrations/20260913163500_opportunities_waiting_registry_and_retire_undp.sql','utf8');
assert.match(sql,/grant select\s*\([\s\S]*tender_watch_id[\s\S]*recipient_email[\s\S]*status[\s\S]*draft_created_at[\s\S]*sent_at[\s\S]*gmail_thread_id[\s\S]*gmail_message_id[\s\S]*updated_at[\s\S]*\) on table public\.pppp_opportunity_outreach_registry_v1 to authenticated/i,'only lifecycle/linkage columns should be browser-readable');
assert.match(sql,/pppp_opportunity_outreach_registry_authenticated_read/,'authenticated SELECT policy must exist');
assert.match(sql,/where source='UNDP_KOSOVO'/,'UNDP Kosovo must be retired from active source policy');
assert.match(sql,/home_eligible=false/,'retired UNDP source must be excluded from Home');
console.log('Opportunities waiting registry migration smoke: OK');
