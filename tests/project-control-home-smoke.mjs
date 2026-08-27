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
assert.match(homeHappy,/window\.__pstLiveHomeV6&&window\.PSTProjectControlHomeV1/,'recovery loader must require the current Home generation');
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
assert.match(home,/Nuk ka veprime të konfirmuara për ty tani/,'Home must allow a compact calm empty action state');
assert.match(home,/PPPP po vazhdon të monitorojë projektet/,'empty state must explain that monitoring continues backstage');

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

console.log('PPPP Live Home v5 operator-signal + autonomous sync smoke: OK');

assert.match(home,/wait for client/,'Home must expose waiting-for-client state from current email evidence');
assert.match(home,/Në pritje të klientit/,'waiting-for-client state must be presented in Albanian');
assert.match(home,/pppp-live-fallback/,'Pyet PPPP must have a live-data fallback when the AI provider is unavailable');
assert.match(home,/identityScore/,'short project names must resolve against live project identity');
assert.match(home,/pristeel-openai-operating-assistant-v1\.js\?v=20260827-home1/,'Home must load the assistant on demand instead of racing it');

assert.match(home,/function looksLikeProjectLookup\(q\)/,'a short project name must be treated as a status lookup, not an operator update');
assert.match(home,/if\(isQuestion\(q\)\|\|looksLikeProjectLookup\(q\)\)/,'Home submit must route project-name lookups to read-only status');
assert.match(home,/var local=localAnswer\(q\);if\(local\)return local;/,'Home must prefer live PPPP data before calling an external AI provider');
assert.match(home,/friendlyAssistantError/,'Home must translate provider failures into operator-safe messages');
assert.doesNotMatch(home,/kind:'error',text:S\(e&&e\.message\|\|e\)/,'Home must never expose raw provider errors directly to the operator');

assert.match(home,/__pstLiveHomeV5/,'v5 compatibility marker must remain');
assert.match(home,/__pstLiveHomeV6/,'current Home runtime must expose the v6 marker');
assert.match(home,/function homeTitle\(\)/,'Home must provide a warmer time-aware greeting');
assert.match(home,/pst-live-command-shell/,'Pyet PPPP must be a first-class command surface');
assert.match(home,/function busyStages\(\)/,'Pyet PPPP must expose visible work stages');
assert.match(home,/Po identifikoj projektin dhe pyetjen/,'initial assistant work stage must be explicit');
assert.match(home,/Po lexoj gjendjen, emailat dhe dokumentet më të fundit/,'longer waits must explain what PPPP is doing');
assert.match(home,/Ende po punoj\. Po verifikoj/,'slow requests must reassure the operator without fake percentages');
assert.match(home,/pst-live-thinking-orb/,'assistant wait state must include a visible animated indicator');
assert.match(home,/@keyframes pst-live-pulse/,'thinking indicator must animate');
assert.match(home,/@keyframes pst-live-spin/,'submit control must animate while busy');
assert.match(home,/pst-live-needs\.is-empty>header\{display:none\}/,'empty actions state must collapse the oversized empty panel header');
assert.match(home,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,'project updates must use a modern two-column layout on desktop');
assert.match(home,/tone-wait|tone-action|tone-active/,'project state cards must have restrained visual state cues');
const busyBlock=(home.match(/function busyStages\(\)\{[\s\S]*?\n\}/)||[''])[0];
assert.doesNotMatch(busyBlock,/\d+%/,'Home loading messages must not show fake progress percentages');

assert.match(home,/if\(window\.__pstLiveHomeV6&&window\.PSTProjectControlHomeV1/,'only an already-current Home may short-circuit runtime loading');
assert.doesNotMatch(home,/if\(window\.__pstProjectControlHomeV2\)\{/,'a stale compatibility marker must never block a newer Home runtime');
assert.match(home,/data-pst-home-version/,'Home root must carry an explicit runtime generation');
assert.match(home,/getAttribute\('data-pst-home-version'\)!=='6'/,'Home v6 must replace a stale mounted root');
assert.match(finalizer,/__pstLiveHomeV6/,'finalizer must require current Home generation before reusing a global');
assert.match(finalizer,/data-pst-project-control-home-v6/,'finalizer must load v6 independently of stale script tags');
