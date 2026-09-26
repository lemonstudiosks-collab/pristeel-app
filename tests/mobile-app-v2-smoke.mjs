import fs from 'node:fs';

function assert(cond,msg){if(!cond)throw new Error(msg);}
const html=fs.readFileSync('pristeel-procurement.html','utf8');
const js=fs.readFileSync('pristeel-mobile-app-v2.js','utf8');
const runtime=JSON.parse(fs.readFileSync('runtime-manifest.json','utf8'));

assert((html.match(/pristeel-mobile-app-v2\.js/g)||[]).length===1,'mobile app v2 must load exactly once');
assert(html.indexOf('pristeel-mobile-control-tower-v1.js')<html.indexOf('pristeel-mobile-app-v2.js'),'mobile app v2 must load after compatibility mobile layers');
assert(runtime.applicationDirectRuntime.includes('pristeel-mobile-app-v2.js'),'mobile app v2 missing from direct runtime');
const home=(runtime.areas||[]).find(x=>x.area==='home');
assert(home&&home.finalOwners.includes('pristeel-mobile-app-v2.js'),'mobile app v2 must be a Home presentation owner');

assert(!/supaFetch\s*\(/.test(js),'mobile app v2 must not add direct Supabase reads/writes');
assert(!/setInterval\s*\(/.test(js),'mobile app v2 must not poll');
assert(!/MutationObserver/.test(js),'mobile app v2 must not observe/clobber DOM continuously');
assert(!/\bfetch\s*\(/.test(js),'mobile app v2 must not add independent network fetches');

assert(js.includes('PSTHomeCanonicalV1'),'Home must reuse canonical Home');
assert(js.includes('PSTTenderPriorityActionsV2'),'Discover must reuse tender priority owner');
assert(js.includes('PSTProjectsModernV2'),'Projects must reuse Projects owner/cache');
assert(js.includes('PSTGmailLiveInboxV2'),'Inbox must reuse Gmail owner');
assert(js.includes('PSTDachSteelSalesV3'),'Material Trade must reuse existing owner');
assert(js.includes('PSTRepresentationsV1'),'Representations must reuse existing owner');

for(const label of ['Home','Projects','Discover','Inbox','Pyet PPPP…','Swipe ndërron faqen','Mundësi të reja për PriSteel','Përgatit kontakt','GO · Krijo projekt','Material','Përfaqësime']){
  assert(js.includes(label),'approved mobile v2 label/flow missing: '+label);
}
assert(js.includes('TAB_ORDER')&&js.includes("['home','projects','discover','inbox']"),'primary full-page pager order missing');
assert(js.includes('data-pma-page-track')&&js.includes('bindPageSwipe'),'full-page pager contract missing');
assert(js.includes('touchstart')&&js.includes('touchmove')&&js.includes('touchend'),'full-page pager must support real touch swipe');
assert(js.includes("document.body.appendChild(r)"),'mobile root must mount outside the legacy app shell');
assert(js.includes('body.pst-mobile-v2-active #app-shell-root{visibility:hidden!important'),'legacy app shell must be fully hidden under the mobile shell');
assert(js.includes('.pma-page-track{display:flex;width:400%;height:100%'),'four full-screen pages must share one horizontal track');
assert(!js.includes('scroll-snap-type:x mandatory'),'nested Home carousel must not compete with full-page swipe');
assert(js.includes('grid-template-columns:1fr 1fr 58px 1fr 1fr'),'bottom nav must have four primary tabs plus central +');
assert(js.includes('#pst-mobile-nav-v1,#pst-mobile-utility-dock-v1{display:none!important}'),'legacy six-tab nav and old utility dock must yield');
assert(js.includes('body.pst-mobile-v2-active #pst-mobile-control-tower-v1'),'old Control Tower must be hidden under mobile v2');
assert(js.includes('body.pst-mobile-v2-active #pst-mobile-home-v1'),'old information dashboard must be hidden under mobile v2');
assert(js.includes('data-pma-util="weather"')&&js.includes('data-pma-util="fx"')&&js.includes('data-pma-util="market"'),'fixed utility icons missing');
assert(js.includes('data-pma-more'),'secondary Partner/Finance/System access missing');
assert(js.includes("if(kind==='nogo'){if(!confirm("),'No-Go must remain an explicit human action');

console.log('mobile-app-v3-fullpage-swipe-smoke: ok');
