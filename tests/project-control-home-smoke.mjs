import fs from 'node:fs';
import assert from 'node:assert/strict';

const home = fs.readFileSync('pristeel-project-control-home-v1.js','utf8');
const liveSync = fs.readFileSync('pristeel-home-live-sync-v1.js','utf8');
const legacyGrid = fs.readFileSync('pristeel-home-operating-grid-v1.js','utf8');
const finalizer = fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');
const homeHappy = fs.readFileSync('pristeel-home-happy-v1.js','utf8');
const pages = JSON.parse(fs.readFileSync('pages-artifact-manifest.json','utf8'));

assert.match(finalizer,/pristeel-project-control-home-v1\.js/,'finalizer must load the final Home owner');
assert.match(finalizer,/projectControlHome\(\)/,'finalizer must apply the final Home owner');
assert.match(finalizer,/pristeel-home-live-sync-v1\.js/,'finalizer must load autonomous Home sync');
assert.match(finalizer,/homeLiveSync\(\)/,'finalizer must apply autonomous Home sync');
assert.match(homeHappy,/pristeel-project-control-home-v1\.js\?pst_home=['"]?\+Date\.now\(\)/,'final Home owner must be cache-busted on recovery');
assert.match(homeHappy,/window\.__pstProjectControlHomeV2&&window\.PSTProjectControlHomeV1/,'compatibility marker must remain supported');
assert.ok((pages.additionalPublicAssets||[]).some(x=>x.path==='pristeel-project-control-home-v1.js'),'production Pages artifact must ship the live Home');
assert.ok((pages.additionalPublicAssets||[]).some(x=>x.path==='pristeel-home-live-sync-v1.js'),'production Pages artifact must ship autonomous Home sync');

assert.match(home,/__pstProjectControlHomeV2/,'compatibility runtime marker is required');
assert.match(home,/__pstLiveHomeV3/,'legacy-owner compatibility marker is required');
assert.match(home,/__pstLiveHomeV4/,'current Live Home marker is required');
assert.match(home,/PSTProjectControlHomeV1/,'module export is required');
assert.match(home,/pppp_home_current_actions_v1/,'Home must read the strict current-action projection');
assert.match(home,/pppp_project_context_current_v/,'Home must read current project context');
assert.match(home,/fact_status=eq\.observed/,'Home project movement must come from observed current context, not raw email rows');
assert.match(home,/cat==='operator update'/,'Home must preserve confirmed human operator truth');
assert.match(home,/cat==='email event ai'/,'Home must consume high-confidence email event intelligence');
assert.match(home,/v\.home_visible!==true/,'automated email events must opt in before Home displays them');
assert.match(home,/v\.suppressed_by_operator_update===true/,'events suppressed by newer operator truth must stay backstage');
assert.match(home,/Number\(v\.confidence\|\|0\)<90/,'automated Home updates require at least 90 percent confidence');
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
assert.doesNotMatch(home,/setInterval\s*\(/,'Home presentation itself must not poll');
assert.doesNotMatch(home,/gmail.*send|send.*gmail/i,'Home must not implement outbound mail sending');
assert.doesNotMatch(home,/\bBLLOKUES\b|\bVONUAR\b|\[AUTO\]/,'Home must not reproduce heuristic alarm labels');

// Autonomous refresh stays in a separate adapter so Home remains a calm presentation surface.
assert.match(liveSync,/INTERVAL_MS=5\*60\*1000/,'live sync must refresh at five-minute cadence');
assert.match(liveSync,/setInterval\(function\(\)\{refresh\(false\);\},INTERVAL_MS\)/,'live sync must schedule the bounded five-minute refresh');
assert.match(liveSync,/if\(busy\|\|!activeHome\(\)\)return false/,'live sync must not work while Home is hidden or another refresh is running');
assert.match(liveSync,/document\.hidden/,'live sync must pause while the browser tab is hidden');
assert.match(liveSync,/category=in\.\(operator_update,email_event_ai\)/,'live sync may combine confirmed operator truth with explicitly approved AI email events');
assert.match(liveSync,/N\(row\.category\)!=='operator_update'/,'live sync must identify the operator anchor explicitly');
assert.match(liveSync,/N\(row\.source_type\)!=='user'/,'operator anchor must be human/user sourced');
assert.match(liveSync,/N\(row\.evidence_status\)!=='confirmed'/,'operator anchor must be confirmed evidence');
assert.match(liveSync,/v\.home_visible!==true/,'AI email changes must opt in explicitly before Home can show them');
assert.match(liveSync,/v\.suppressed_by_operator_update===true/,'AI events suppressed by operator truth must stay backstage');
assert.match(liveSync,/confidence<90/,'AI email changes must meet the 90 percent threshold');
assert.match(liveSync,/eventAt<=operatorAt\[id\]/,'an email older than the operator anchor must never replace the current state');
assert.doesNotMatch(liveSync,/project_emails\?/,'live sync must not turn Home into a raw email feed');
assert.doesNotMatch(liveSync,/gmail.*send|send.*gmail/i,'live sync must never send outbound email');

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

console.log('PPPP Live Home v4 operator-signal + autonomous sync smoke: OK');

assert.match(home,/wait for client/,'Home must expose waiting-for-client state from current email evidence');
assert.match(home,/Në pritje të klientit/,'waiting-for-client state must be presented in Albanian');
assert.match(home,/pppp-live-fallback/,'Pyet PPPP must have a live-data fallback when the AI provider is unavailable');
assert.match(home,/identityScore/,'short project names must resolve against live project identity');
assert.match(home,/pristeel-openai-operating-assistant-v1\.js\?v=20260827-home1/,'Home must load the assistant on demand instead of racing it');
