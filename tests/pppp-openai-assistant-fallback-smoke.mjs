import fs from 'node:fs';
import assert from 'node:assert/strict';

const src=fs.readFileSync('supabase/functions/pppp-openai-assistant/index.ts','utf8');
assert.doesNotMatch(src,/required_secret|OPENAI_API_KEY[^\n]{0,120}503/,'missing AI provider must never become a 503 contract');
assert.match(src,/provider_key_missing/,'missing OpenAI provider must fall through to deterministic analysis');
assert.match(src,/pppp_assistant_identity_resolver_v1/,'project identity must use the bounded live identity resolver');
assert.match(src,/pppp_assistant_project_resolver_v2/,'ambiguous project evidence must use the bounded evidence resolver');
assert.match(src,/pppp_assistant_project_context_v1/,'project questions must use the rich bounded assistant project context');
assert.match(src,/projectFallback\(/,'project questions must retain a deterministic rich PPPP fallback without OpenAI');
assert.match(src,/globalFallback\(command/,'global questions must retain a deterministic Command Center fallback');
assert.match(src,/isAutoReply\(/,'automatic replies must be classified separately from meaningful project communication');
assert.match(src,/old_workflow_tasks_do_not_drive_current_priority:true/,'stale workflow backlog must not drive current project priority');
assert.match(src,/suggested_email_evidence_is_context_only:true/,'suggested-linked email evidence must remain contextual only');
assert.match(src,/payload=JSON\.stringify\(live\)\.slice\(0,60000\)/,'AI context payload must remain bounded for Free-plan egress');
assert.doesNotMatch(src,/limit=500|limit=700|limit=300|limit=250/,'assistant must not restore legacy broad table scans');
assert.doesNotMatch(src,/required_secret/,'secret names must never be exposed to the UI');
console.log('PPPP assistant rich live-data fallback v6: OK');
