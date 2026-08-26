import fs from 'node:fs';
import assert from 'node:assert/strict';

const home = fs.readFileSync('pristeel-project-control-home-v1.js','utf8');
const legacyGrid = fs.readFileSync('pristeel-home-operating-grid-v1.js','utf8');
const finalizer = fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');
const homeHappy = fs.readFileSync('pristeel-home-happy-v1.js','utf8');
const pages = JSON.parse(fs.readFileSync('pages-artifact-manifest.json','utf8'));

assert.match(finalizer,/pristeel-project-control-home-v1\.js/,'finalizer must load the final Home owner');
assert.match(finalizer,/projectControlHome\(\)/,'finalizer must apply the final Home owner');
assert.match(homeHappy,/pristeel-project-control-home-v1\.js\?pst_home=['"]?\+Date\.now\(\)/,'final Home owner must be cache-busted on recovery');
assert.match(homeHappy,/window\.__pstProjectControlHomeV2&&window\.PSTProjectControlHomeV1/,'compatibility marker must remain supported');
assert.ok((pages.additionalPublicAssets||[]).some(x=>x.path==='pristeel-project-control-home-v1.js'),'production Pages artifact must ship the live Home');

assert.match(home,/__pstProjectControlHomeV2/,'compatibility runtime marker is required');
assert.match(home,/__pstLiveHomeV3/,'legacy-owner compatibility marker is required');
assert.match(home,/__pstLiveHomeV4/,'current Live Home marker is required');
assert.match(home,/PSTProjectControlHomeV1/,'module export is required');
assert.match(home,/pppp_home_current_actions_v1/,'Home must read the strict current-action projection');
assert.match(home,/pppp_project_context_current_v/,'Home must read current project context');
assert.match(home,/category=eq\.operator_update/,'Home project movement must come from operator/current-state context, not raw email rows');
assert.match(home,/evidence_status=eq\.confirmed/,'Home project movement must require confirmed context evidence');
assert.doesNotMatch(home,/project_emails\?/,'Home must not render a raw linked-email stream as project intelligence');
assert.match(home,/PSTOpenAIAssistantV1/,'Home input must reuse authenticated PPPP AI');
assert.match(home,/pppp-project-operator-update/,'operator statements must use the safe project update boundary');
assert.match(home,/data-live-project/,'action and current-state rows must open the project');
assert.doesNotMatch(home,/#page-workspace-home>\*:not\(#pst-project-control-home-v2\)\{display:none!important\}/,'Live Home must never hide fallback content before its root mounts');

assert.match(home,/PËR TY TANI/,'Home must answer what needs the user now');
assert.match(home,/Veprime të konfirmuara/,'Home actions must be explicitly described as confirmed');
assert.match(home,/GJENDJA E FUNDIT/,'Home must expose current project state');
assert.match(home,/Projektet që kanë ndryshuar/,'Home must show project-level change summaries');
assert.match(home,/jo listë emailash/,'Home must explicitly avoid an email-feed mental model');
assert.match(home,/Nuk ka asgjë të konfirmuar që kërkon veprimin tënd tani/,'Home must allow a calm empty action state');
assert.match(home,/Home nuk shfaq review queues, certifikata, follow-up automatik ose draft-e/,'empty state must explain that backstage mechanics are not operator work');

assert.doesNotMatch(home,/pst-live-moves|position:sticky/,'Home must not recreate the narrow sticky movement column');
assert.match(home,/\.pst-live-input\{[^}]*font-size:15px/,'AI input must be comfortably readable');
assert.match(home,/\.pst-live-action h3\{[^}]*font-size:17px/,'action titles must be readable');
assert.match(home,/\.pst-live-action p\{[^}]*font-size:14px/,'action explanation must be readable');
assert.match(home,/\.pst-live-update p\{[^}]*font-size:14\.5px/,'project-state summaries must be readable');
assert.doesNotMatch(home,/font-size:(?:8|8\.5|9|9\.5|10|10\.5)px/,'operational Home text must not use micro-fonts');

assert.doesNotMatch(home,/RADARI I PROJEKTEVE|AKTIVITET SOT|PROJEKTE AKTIVE/,'Home must not revert to project-register metrics');
assert.doesNotMatch(home,/MutationObserver/,'Home must not use MutationObserver');
assert.doesNotMatch(home,/setInterval\s*\(/,'Home must not poll');
assert.doesNotMatch(home,/gmail.*send|send.*gmail/i,'Home must not implement outbound mail sending');
assert.doesNotMatch(home,/\bBLLOKUES\b|\bVONUAR\b|\[AUTO\]/,'Home must not reproduce heuristic alarm labels');

// Browser regression 2026-08-26: the retired Home operating grid reclaimed the
// page after canonical render and hid Live Home with pst-home-action-only.
// The compatibility renderer must yield once a real Live Home root exists.
assert.match(legacyGrid,/Legacy compatibility fallback only/,'old Home grid must be explicitly classified as fallback');
assert.match(legacyGrid,/function liveHomeRoot\(/,'legacy grid must detect the mounted Live Home root');
assert.match(legacyGrid,/pst-project-control-home-v2/,'legacy grid must target the actual Live Home root');
assert.match(legacyGrid,/function retireForLiveHome\(/,'legacy grid must have a deterministic retirement path');
assert.match(legacyGrid,/classList\.remove\('pst-home-action-only','pst-home-grid-final'\)/,'retirement must clear the CSS classes that hid Live Home');
assert.match(legacyGrid,/if\(retireForLiveHome\(\)\)return false/,'legacy render must yield when Live Home already exists');
assert.match(legacyGrid,/function scheduleLiveHomeHandoff\(/,'legacy grid must retry the handoff for late Live Home mounts');
assert.match(legacyGrid,/\[0,100,350,900,1800,3000\]/,'handoff retries must stay bounded');
assert.doesNotMatch(legacyGrid,/MutationObserver|setInterval\s*\(/,'legacy handoff must not introduce persistent polling/observers');

console.log('PPPP Live Home v4 operator-signal smoke: OK');
