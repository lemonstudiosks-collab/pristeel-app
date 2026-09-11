const fs = require('fs');
const assert = require('assert');

const core = fs.readFileSync('pristeel-native-ui-v4-core.js', 'utf8');
const entry = fs.readFileSync('pristeel-native-ui-v3.js', 'utf8');
const operating = fs.readFileSync('pristeel-operating-experience-v1.js', 'utf8');

for (const token of ['Rrjedha e ditës', "lane('TANI'", "lane('MË PAS'", "lane('NË PRITJE'", 'Pulsi i biznesit', 'SOT NË PPPP', 'Projektet e fundit']) {
  assert(core.includes(token), `Daily Flow surface missing: ${token}`);
}
assert(core.includes("wait_for_client:'Në pritje të klientit'"), 'Home must show human Albanian statuses instead of database enum values');
assert(core.includes("['Jan','Shk','Mar','Pri','Maj','Qer','Kor','Gus','Sht','Tet','Nën','Dhj']"), 'Home dates must use stable Albanian month labels');
assert(core.includes("e.target.closest('[data-pn-action-id]')"), 'Priority cards must have a project-action route');
assert(core.includes("e.target.closest('[data-pn-project-id]')"), 'Timeline and recent projects must have a direct project route');
assert(core.includes("e.target.closest('[data-pn-area]')"), 'Portfolio and header controls must have an area route');
assert(core.includes("return window.pstOpenProjectWorkspace(filter)"), 'Project routes must call the canonical project opener');
assert(core.includes("return p.openOpportunities(filter||'')"), 'Opportunity routes must preserve their exact filter');
assert(core.includes("if(p.openFinance)p.openFinance(filter||'')"), 'Finance routes must preserve their exact filter');
assert(entry.includes('pristeel-native-ui-v4-core.js?v=20260911-fullredesign1'), 'Entry must cache-bust the full Daily Flow redesign owner');
assert(operating.includes("{key:'home',label:'Ballina'"), 'Primary navigation must be localized');
assert(!/new\s+MutationObserver|setInterval\s*\(/.test(core), 'Daily Flow presentation must remain bounded and event-driven');
assert(!/supaFetch\s*\([^)]*['\"](?:PATCH|PUT|DELETE)['\"]/.test(core), 'Daily Flow must not write business data');

console.log('Native UI v5 Daily Flow routing and safety smoke: OK');
