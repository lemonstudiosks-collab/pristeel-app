import fs from 'node:fs';
import assert from 'node:assert/strict';

const home = fs.readFileSync('pristeel-project-control-home-v1.js','utf8');
const finalizer = fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');
const homeHappy = fs.readFileSync('pristeel-home-happy-v1.js','utf8');
const pages = JSON.parse(fs.readFileSync('pages-artifact-manifest.json','utf8'));

assert.match(finalizer,/pristeel-project-control-home-v1\.js\?v=20260826-1/,'finalizer must load Project Control Home');
assert.match(finalizer,/projectControlHome\(\)/,'finalizer must apply Project Control Home');
assert.match(homeHappy,/pristeel-project-control-home-v1\.js\?pst_home=['"]?\+Date\.now\(\)/,'cache-busted final Home owner must load Control Room');
assert.match(homeHappy,/window\.__pstProjectControlHomeV2&&window\.PSTProjectControlHomeV1/,'final Home owner must reject a stale v1 Home API');
assert.match(homeHappy,/ensureControlRoom\(true\)/,'final Home route/decorator must re-apply Control Room');
assert.ok((pages.additionalPublicAssets||[]).some(x=>x.path==='pristeel-project-control-home-v1.js'),'production Pages artifact must ship Project Control Home');
assert.ok((pages.referenceChecks||[]).some(x=>x.source==='pristeel-redesign-finalizer-v1.js'&&x.contains==='pristeel-project-control-home-v1.js'),'Pages audit must verify the finalizer dependency');

assert.match(home,/__pstProjectControlHomeV2/,'Control Room v2 runtime marker is required');
assert.match(home,/PSTProjectControlHomeV1/,'module export is required');
assert.match(home,/project_emails\?select=/,'Home must read project email activity');
assert.match(home,/direction===['"]outgoing['"]/,'Home must distinguish sent email');
assert.match(home,/pppp_project_context_current_v/,'Home must read confirmed project context');
assert.match(home,/documents_registry/,'Home must read commercial documents');
assert.match(home,/offers\?select=/,'Home must read offers');
assert.match(home,/files\?select=/,'Home must read project files');
assert.match(home,/PSTOpenAIAssistantV1/,'Home input must reuse authenticated PPPP AI');
assert.match(home,/pppp-project-operator-update/,'operator statements must use the safe project update boundary');
assert.match(home,/data-cr-project/,'project rows must be whole-row navigation targets');
assert.match(home,/#page-workspace-home>\*:not\(#pst-project-control-home-v2\)\{display:none!important\}/,'old Home wall must be removed from daily presentation');
assert.match(home,/PPPP CONTROL ROOM/,'new Home must expose the Control Room identity');
assert.match(home,/Pamja e punës, jo e sistemit\./,'new Home must be visually and conceptually distinct');
assert.match(home,/RADARI I PROJEKTEVE/,'new Home must include the project radar');
assert.match(home,/LIVE STREAM/,'new Home must include the real activity stream');
assert.match(home,/AKTIVITET SOT/,'new Home must expose current activity metrics');
assert.match(home,/noActionFact/,'confirmed no-action context must be able to suppress false urgency');
assert.doesNotMatch(home,/MutationObserver/,'Home must not use MutationObserver');
assert.doesNotMatch(home,/setInterval\s*\(/,'Home must not poll');
assert.doesNotMatch(home,/gmail.*send|send.*gmail/i,'Home must not implement outbound mail sending');
assert.doesNotMatch(home,/\bBLLOKUES\b|\bVONUAR\b|\[AUTO\]/,'new Home must not reproduce heuristic alarm labels');

console.log('Project Control Room Home smoke: OK');
