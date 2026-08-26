import fs from 'node:fs';
import assert from 'node:assert/strict';

const home = fs.readFileSync('pristeel-project-control-home-v1.js','utf8');
const finalizer = fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');
const homeHappy = fs.readFileSync('pristeel-home-happy-v1.js','utf8');
const pages = JSON.parse(fs.readFileSync('pages-artifact-manifest.json','utf8'));

assert.match(finalizer,/pristeel-project-control-home-v1\.js/,'finalizer must load the final Home owner');
assert.match(finalizer,/projectControlHome\(\)/,'finalizer must apply the final Home owner');
assert.match(homeHappy,/pristeel-project-control-home-v1\.js\?pst_home=['"]?\+Date\.now\(\)/,'final Home owner must be cache-busted on recovery');
assert.match(homeHappy,/window\.__pstProjectControlHomeV2&&window\.PSTProjectControlHomeV1/,'compatibility marker must remain supported');
assert.ok((pages.additionalPublicAssets||[]).some(x=>x.path==='pristeel-project-control-home-v1.js'),'production Pages artifact must ship the live Home');

assert.match(home,/__pstProjectControlHomeV2/,'compatibility runtime marker is required');
assert.match(home,/__pstLiveHomeV3/,'live Home v3 marker is required');
assert.match(home,/PSTProjectControlHomeV1/,'module export is required');
assert.match(home,/pppp_home_current_actions_v1/,'Home must read the current-action projection, not the legacy task wall');
assert.match(home,/project_emails\?project_id=not\.is\.null/,'Home must read linked Gmail movement');
assert.match(home,/direction.*outgoing/,'Home must distinguish sent email');
assert.match(home,/pppp_project_context_current_v/,'Home must read current project context');
assert.match(home,/PSTOpenAIAssistantV1/,'Home input must reuse authenticated PPPP AI');
assert.match(home,/pppp-project-operator-update/,'operator statements must use the safe project update boundary');
assert.match(home,/data-live-project/,'action and movement rows must open the project');
assert.match(home,/KËRKON VEPRIMIN TËND/,'Home must answer what needs the user now');
assert.match(home,/LËVIZJET E FUNDIT/,'Home must answer what changed recently');
assert.match(home,/PPPP LIVE/,'Home must expose live-state identity');
assert.match(home,/Nuk ka veprime të konfirmuara/,'Home must allow a calm empty state');

// Blank-screen regression guard: the live module may only replace the old Home after it mounts.
assert.doesNotMatch(home,/#page-workspace-home>\*:not\(#pst-project-control-home-v2\)\{display:none!important\}/,'Home must never hide fallback content before the live root mounts');
assert.doesNotMatch(home,/classList\.contains\(['"]active['"]\)/,'Home visibility must not depend on a fragile active CSS class');
assert.match(home,/getComputedStyle/,'Home mount must use actual visibility as a fallback');
assert.match(home,/var root=ensureRoot\(page\);if\(!root\)return false;/,'Home must confirm the live root exists before rendering/loading');

assert.doesNotMatch(home,/RADARI I PROJEKTEVE|AKTIVITET SOT|PROJEKTE AKTIVE/,'Home must not revert to project-register metrics');
assert.doesNotMatch(home,/MutationObserver/,'Home must not use MutationObserver');
assert.doesNotMatch(home,/setInterval\s*\(/,'Home must not poll');
assert.doesNotMatch(home,/gmail.*send|send.*gmail/i,'Home must not implement outbound mail sending');
assert.doesNotMatch(home,/\bBLLOKUES\b|\bVONUAR\b|\[AUTO\]/,'Home must not reproduce heuristic alarm labels');

console.log('PPPP Live Home v3 fail-open smoke: OK');