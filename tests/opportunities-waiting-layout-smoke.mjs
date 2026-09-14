import fs from 'node:fs';
import assert from 'node:assert/strict';

const bridge=fs.readFileSync('pristeel-opportunities-waiting-bridge-v1.js','utf8');
const polish=fs.readFileSync('pristeel-opportunities-filter-polish-v1.js','utf8');
const interaction=fs.readFileSync('pristeel-home-canonical-interaction-v1.js','utf8');
const assistant=fs.readFileSync('supabase/functions/pppp-openai-assistant/index.ts','utf8');

assert.doesNotThrow(()=>new Function(bridge),'lifecycle truth bridge must be valid JavaScript');
assert.doesNotThrow(()=>new Function(polish),'filter polish must be valid JavaScript');

assert.match(bridge,/draft_pending\|draft_created/,'draft-created registry rows must still be recognized');
assert.doesNotMatch(bridge,/row\.status\s*=\s*['"]waiting_for_send['"]/,'a draft must never be promoted to waiting/sent in memory');
assert.doesNotMatch(bridge,/next\s*===\s*['"]draft['"]\s*\?\s*['"]waiting['"]/,'draft lifecycle must never normalize to waiting');
assert.match(bridge,/data-pcw-lifecycle=\\?"draft\\?"/,'draft lifecycle must remain addressable');
assert.match(bridge,/display['"],['"]inline-flex['"],['"]important['"]/,'draft lifecycle control must be visible despite legacy polish CSS');
assert.doesNotMatch(bridge,/addEventListener\s*\(\s*['"]click/,'truth bridge must not become a second click owner');

assert.match(polish,/data-pcw-source='all'/,'duplicate source-level Të gjitha must be hidden');
assert.match(polish,/data-pcw-source='UNDP_KOSOVO'/,'UNDP Kosovo must remain removed from the visible source row');
assert.match(polish,/flex-wrap:wrap!important;overflow:visible!important/,'source controls must remain fully visible instead of horizontal scrolling');
assert.doesNotMatch(polish,/overflow-x:auto!important/,'source row must not require horizontal scrolling');
assert.match(polish,/data-pcw-source='WORLD_BANK'/,'World Bank source must retain a compact icon');
assert.match(polish,/data-pcw-source='KRPP'/,'KRPP source must retain a compact icon');
assert.match(polish,/data-pcw-source='TED'/,'TED source must retain a compact icon');
assert.match(interaction,/pristeel-opportunities-filter-polish-v1\.js\?v=20260914-truth1/,'runtime must cache-bust the Opportunities truth fix');
assert.match(interaction,/pristeel-opportunities-waiting-bridge-v1\.js\?v=20260914-truth1/,'runtime must load the truth bridge with a fresh URL');

assert.match(assistant,/function deterministicOpportunity\(/,'assistant must have an opportunity-only response path');
assert.match(assistant,/body\?\.context\?\.tender/,'tender context must be detected before project inference');
assert.match(assistant,/return J\(deterministicOpportunity\(body\.context\)\)/,'tender context must bypass global/project command-center inference');
assert.match(assistant,/provider:\{name:'pppp-opportunity-context'/,'opportunity response must identify its isolated provider');
assert.match(assistant,/navigation:\{project_id:null,project_name:null,area:null\}/,'projectless opportunity analysis must not navigate to an unrelated project');

console.log('Opportunities truth/layout smoke: OK');
