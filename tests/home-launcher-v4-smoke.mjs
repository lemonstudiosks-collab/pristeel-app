import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('pristeel-home-launcher-v4.js','utf8');

assert(source.includes('Mirësevini në PRISTEEL'),'Home title must use PRISTEEL');
assert(!source.includes('Mirësevini në PPPP'),'Home title must not welcome into PPPP');
['Gmail','Gazeta PPPP','Kalkulatori','Mundësitë','Përfaqësime','Klientë të drejtpërdrejtë','Blerësit e çelikut','German-Kosovar Economic Forum 2026','Projektet','Partnerët','Financa','Kursi','Çmimet e çelikut'].forEach(label=>{
  assert(source.includes(label),'Missing launcher surface: '+label);
});
assert(source.includes('data-time')&&source.includes('data-date'),'Compact time/date must be present');
assert(source.includes('data-temp')&&source.includes('Prishtinë'),'Weather must be present');
assert(source.includes('pstOpenSearch')||source.includes('PSTSearchStableV2'),'Global search must delegate to the search owner');
assert(source.includes('PSTEUCompaniesV1'),'Direct clients must delegate to EU Direct owner');
assert(source.includes('PSTDachSteelSalesV3'),'Steel buyers must delegate to Material Trade owner');
assert(source.includes('PSTRepresentationsV1'),'Representations must delegate to Representation owner');
assert(source.includes('data-open="forum"')&&source.includes('28–29 tetor 2026'),'Forum must render as a distinct Home card');
assert(source.includes("if(k==='forum')return openForum()"),'Forum card must have an isolated route');
assert(source.includes('pstOpenProjectWorkspace'),'Forum must delegate to the canonical Project workspace');
assert(source.includes("projects?select=id,name,reference,status,deadline&name=eq."),'Forum project lookup must use exact canonical project identity');
assert(source.includes("pst-home-launcher-active")&&source.includes('.app-shell>.sidebar'),'Home must own generic sidebar hiding through the launcher-active body class');
assert(source.includes("page.insertBefore(r,page.firstChild||null)"),'Launcher must mount directly into page-workspace-home before legacy/native Home owners');
assert(source.includes('new MutationObserver'),'Launcher must repair itself if a later compatibility Home rerenders the Home page');
assert(!source.includes("window.addEventListener('focus',schedule)"),'Home must not remount on every window focus');
assert(!source.includes("visibilitychange"),'Home must not remount on visibility changes');
assert(!source.includes("if(!native)return false"),'Launcher must not depend on pst-native-home-v4 before it can render');
assert(!/background-image\s*:|url\([^)]*\.(png|jpg|jpeg|webp)/i.test(source),'Home launcher must not use photos or illustration backgrounds');
assert(source.includes('api.open-meteo.com'),'Weather must use free public source');
assert(source.includes('api.frankfurter.app'),'Currency must use free public source');
assert(source.includes('price_history'),'Steel-price tool must use existing internal PPPP reference history');
assert(source.includes('jo kuotime bursiere live'),'Steel-price utility must not misrepresent internal references as live market quotes');
assert((source.includes('translateY(-2px)')||source.includes('translateY(-3px)'))&&source.includes('box-shadow'),'Main modules must retain modern hover feedback');
assert(source.includes('min-height:158px'),'Primary Home modules must stay compact on desktop');
assert(source.includes('min-height:88px'),'Secondary Home utilities must stay compact on desktop');
assert(source.includes('body:not(.pst-home-launcher-active) .app-shell>.sidebar')&&source.includes('padding-top:12px!important'),'Work-module sidebar must sit slightly lower than before');
assert(source.includes('__pstHomeCommandCenterV2=true'),'Final Home must retire legacy command-center presentation');
assert(source.includes('__pstHomeVisualCleanupV3=true'),'Final Home must retire legacy visual-cleanup presentation');
assert(source.includes('__pstHomeOperatingGridV1=true'),'Final Home must retire legacy operating-grid presentation');
assert(source.includes('__pstHomeMorningCommandCenterV1=true'),'Final Home must retire legacy morning presentation');
assert(source.includes('__pstHomeOperatorDashboardV1=true'),'Final Home must retire legacy operator-dashboard presentation');
assert(!source.includes('#side-nav .active,[data-page="home"].active'),'Arbitrary sidebar active state must not be treated as Home');
assert(source.includes('position:fixed!important;inset:0!important;z-index:1000!important'),'Desktop Home must cover the full viewport');

new Function(source);
console.log('Home launcher v4 static smoke: PASS');
