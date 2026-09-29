import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=(p)=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/20260923_global_communication_guard.sql');
const tedBatch=read('supabase/migrations/20260929110000_ted_multicontact_batch_guard_v1.sql');
const ui=read('pristeel-project-centric-workflow-v1.js');
const dach=read('supabase/functions/pppp-dach-steel-draft-generator/index.ts');
const ted=read('supabase/functions/pppp-opportunity-draft-generator/index.ts');
const manual=read('supabase/functions/pppp-opportunity-draft-register/index.ts');
const gc=read('supabase/functions/pppp-gc-outreach/index.ts');
const dispatch=read('supabase/functions/pppp-outbound-dispatch/index.ts');

assert.match(sql,/pppp_global_communication_guard_v1/);
assert.match(sql,/project_emails/);
assert.match(sql,/pppp_opportunity_outreach_registry_v1/);
assert.match(sql,/pppp_gc_prospects_v1/);
assert.match(sql,/pppp_opportunity_communication_state_v1/);
assert.match(sql,/cross_source_recipient_cooldown/);
assert.match(sql,/cross_source_domain_cooldown/);
assert.match(tedBatch,/pppp_ted_action_communication_guard_v1/);
assert.match(tedBatch,/same_ted_action_draft_batch/);
assert.match(tedBatch,/r\.action_id=p_action_id/,'drafts belonging to one approved TED action must not block sibling recipients');

assert.match(dach,/pppp_global_communication_guard_v1/);
assert.match(ted,/pppp_ted_action_communication_guard_v1/);
assert.match(ted,/Promise\.all\(prepared\.map/,'recipient safety checks should run as one parallel preflight batch');
assert.match(ted,/domainChecks/,'one Gmail domain-history lookup should be reused for sibling recipients');
assert.match(ted,/recentSentToExact/);
assert.match(ted,/gmail_domain_cooldown_active/);
assert.match(ted,/pppp_opportunity_communication_state_v1/);
assert.match(ted,/communication_history_blocked/);
assert.match(manual,/pppp_global_communication_guard_v1/);
assert.match(manual,/recentSentTo/);
assert.match(manual,/gmail_domain_cooldown_active/);
assert.match(gc,/pppp_global_communication_guard_v1/);
assert.match(dispatch,/global_gmail_recipient_cooldown_active/);
assert.match(dispatch,/global_gmail_domain_cooldown_active/);
assert.match(dach,/gmail_domain_cooldown_active/);

assert.match(ui,/pppp_opportunity_communication_state_v1/);
assert.match(ui,/communication_state/);
assert.match(ui,/data-pcw-ti="communication"/);
assert.match(ui,/Kontaktuar · Hap Gmail/);
assert.match(ui,/Përgjigje e marrë · Hap Gmail/);

console.log('global communication guard smoke: ok');
