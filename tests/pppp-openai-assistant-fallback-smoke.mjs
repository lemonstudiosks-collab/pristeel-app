import fs from 'node:fs';
import assert from 'node:assert/strict';

const src=fs.readFileSync('supabase/functions/pppp-openai-assistant/index.ts','utf8');
assert.doesNotMatch(src,/provider_unconfigured|required_secret|OPENAI_API_KEY[^\n]{0,120}503/,'missing AI provider must never become a 503 contract');
assert.match(src,/if\(!key\)return null/,'OpenAI must be optional');
assert.match(src,/inferProject\(question,command\)/,'server fallback must resolve a project from the compact Command Center');
assert.match(src,/pppp_command_center_v1/,'global assistant context must come from the bounded Command Center RPC');
assert.match(src,/pppp_project_brief_v1/,'project questions must use the bounded project brief RPC');
assert.match(src,/deterministicProject\(selected,brief\)/,'project questions must retain a deterministic PPPP fallback without OpenAI');
assert.match(src,/deterministicGlobal\(command\)/,'global questions must retain a deterministic Command Center fallback');
assert.match(src,/payload=JSON\.stringify\(live\)\.slice\(0,60000\)/,'AI context payload must remain bounded for Free-plan egress');
assert.doesNotMatch(src,/limit=500|limit=700|limit=300|limit=250/,'assistant must not restore legacy broad table scans');
assert.doesNotMatch(src,/required_secret/,'secret names must never be exposed to the UI');
console.log('PPPP assistant compact live-data fallback: OK');
