import fs from 'node:fs';
import assert from 'node:assert/strict';

const src=fs.readFileSync('supabase/functions/pppp-openai-assistant/index.ts','utf8');

assert.doesNotMatch(src,/provider_unconfigured|required_secret/,'provider/secret failures must never leak to the UI');
assert.match(src,/pppp_command_center_v1/,'global assistant context must come from the bounded Command Center RPC');
assert.match(src,/projects\?select=[^\n]+limit=50/,'project inference must use a bounded canonical project list');
assert.match(src,/pppp_project_brief_v1/,'resolved project questions must use the bounded project brief RPC');
assert.match(src,/deterministicProject\(question,selected,brief\)/,'project questions must retain the deterministic PPPP v4 response path');
assert.match(src,/deterministicGlobal\(command\)/,'global questions must retain the deterministic Command Center response path');
assert.match(src,/function deterministicOpportunity\(/,'TED opportunities must have an isolated deterministic context path');
assert.match(src,/if\(body\?\.context\?\.tender&&T\(body\?\.scope,30\)!==['"]project['"]\)return J\(deterministicOpportunity\(body\.context\)\)/,'tender context must bypass project inference and project briefs');
assert.match(src,/navigation:\{project_id:null,project_name:null,area:null\}/,'projectless opportunity analysis must never navigate to an unrelated project');
assert.match(src,/['"]pristeel['"]\]\)/,'generic PRISTEEL token must be excluded from project-word inference');
assert.doesNotMatch(src,/limit=500|limit=700|limit=300|limit=250/,'assistant must not restore legacy broad table scans');
assert.doesNotMatch(src,/OPENAI_API_KEY|required_secret/,'the live deterministic assistant must not depend on an AI-provider secret');

console.log('PPPP assistant bounded deterministic live-data contract: OK');
