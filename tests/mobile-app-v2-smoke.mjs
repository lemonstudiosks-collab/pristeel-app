import fs from 'node:fs';

function assert(cond,msg){if(!cond)throw new Error(msg);}
const html=fs.readFileSync('pristeel-procurement.html','utf8');
const js=fs.readFileSync('pristeel-mobile-app-v2.js','utf8');
const gmail=fs.readFileSync('pristeel-gmail-live-inbox-v2.js','utf8');
const material=fs.readFileSync('pristeel-dach-steel-sales-v1.js','utf8');
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
assert(gmail.includes('loadCanonical')&&gmail.includes('project_emails?select='),'Gmail owner must expose canonical synced-email fallback');
assert(gmail.includes('connected:function(){return !!token()}'),'Gmail owner must expose connection state to mobile');
assert(material.includes('loadTargets:function(force){return loadTargets(!!force)}'),'Material owner must expose bounded target loader without lifecycle sync');

for(const label of ['Home','Projects','Discover','Inbox','Pyet PPPP…','Swipe ndërron faqen','Mundësi të reja për PriSteel','Përgatit kontakt','GO · Krijo projekt','Material','Përfaqësime']){
  assert(js.includes(label),'approved mobile v2 label/flow missing: '+label);
}
assert(js.includes('TAB_ORDER')&&js.includes("['home','projects','discover','inbox']"),'primary full-page pager order missing');
assert(js.includes('data-pma-page-track')&&js.includes('bindPageSwipe'),'full-page pager contract missing');
assert(js.includes('touchstart')&&js.includes('touchend'),'full-page pager must detect touch swipe without intercepting vertical movement');
assert(!js.includes("pager.addEventListener('touchmove'"),'pager must not own touchmove; native iPhone vertical scrolling keeps full control');
assert(js.includes('touch-action:pan-y'),'mobile pages must explicitly preserve native vertical pan');
assert(js.includes('overflow-y:scroll'),'each primary page must own a dedicated vertical scroll container');
assert(js.includes('touchcancel'),'pager must recover cleanly from cancelled iOS gestures');
assert(js.includes("document.body.appendChild(r)"),'mobile root must mount outside the legacy app shell');
assert(js.includes('body.pst-mobile-v2-active #app-shell-root{visibility:hidden!important'),'legacy app shell must be fully hidden under the mobile shell');
assert(js.includes("app&&!visible(app)&&!shellActive"),'mobile auth guard must ignore the intentionally hidden legacy app shell while v3 is active');
assert(js.includes("blockedRoot.style.display='none'"),'real auth/PIN blocking must hide the mobile shell');
assert(js.includes('.pma-page-track{display:flex;width:400%;height:100%'),'four full-screen pages must share one horizontal track');
assert(!js.includes('scroll-snap-type:x mandatory'),'nested Home carousel must not compete with full-page swipe');
assert(js.includes('grid-template-columns:1fr 1fr 58px 1fr 1fr'),'bottom nav must have four primary tabs plus central +');
assert(js.includes('#pst-mobile-nav-v1,#pst-mobile-utility-dock-v1{display:none!important}'),'legacy six-tab nav and old utility dock must yield');
assert(js.includes('body.pst-mobile-v2-active #pst-mobile-control-tower-v1'),'old Control Tower must be hidden under mobile v2');
assert(js.includes('body.pst-mobile-v2-active #pst-mobile-home-v1'),'old information dashboard must be hidden under mobile v2');
assert(js.includes('data-pma-util="weather"')&&js.includes('data-pma-util="fx"')&&js.includes('data-pma-util="market"'),'fixed utility icons missing');
assert(js.includes('pma-ask-copy'),'Ask PPPP mobile copy must stay in one stable grid cell');
assert(js.includes('pma-work-feed')&&js.includes('pma-work-card'),'Projects must use card-feed presentation');
assert(js.includes('pma-discover-feed')&&js.includes("rows.map(function(r,idx)"),'Discover tenders must render a vertical multi-opportunity feed');
assert(js.includes('targete Material Trade')&&js.includes('targete Përfaqësime'),'Discover secondary feeds must expose real target counts');
assert(js.includes('PPPP email sync')&&js.includes('canonicalRows'),'Inbox must fall back to canonical Gmail-synced project_emails');
assert(!js.includes('[0,80,220,600,1200].forEach'),'mobile startup must not repaint the full shell five times');
assert(js.includes('data-pma-more'),'secondary Partner/Finance/System access missing');
assert(js.includes('nativeProjectId')&&js.includes('projectDetailView'),'native mobile project detail state/view missing');
assert(js.includes('nativeCompanyMode')&&js.includes('companyListView')&&js.includes('companyDetailView'),'native company browser/detail missing');
assert(js.includes('PSTContactMasterV1')&&js.includes('contactMaster'),'company mobile surface must reuse Contact Master owner');
assert(js.includes('companyGroups')&&js.includes('companyPeople')&&js.includes('companyCapabilities'),'company relationship grouping missing');
assert(js.includes('data-pma-company-search')&&js.includes('data-pma-company-filter'),'company search/filter controls missing');
assert(js.includes('data-pma-company-project'),'company-to-project native navigation missing');
assert(js.includes("if(sk==='contacts'){openCompanies('');return;}"),'Partnerët secondary route must open native company browser');
assert(js.includes("if(kind==='company')return openCompanies('');"),'Company quick action must open native company browser');
assert(js.includes('projectStageInfo')&&js.includes('Timeline i projektit'),'project pipeline timeline missing');
assert(js.includes('data-pma-project-back'),'native project back control missing');
assert(js.includes('data-pma-project-legacy="files"')&&js.includes('data-pma-project-legacy="emails"')&&js.includes('data-pma-project-legacy="suppliers"'),'project detail bridge actions missing');
assert(js.includes('Kthehu në app')&&js.includes('data-pma-return-app'),'legacy project tool return bridge missing');
assert(js.includes("u.style.display=(state.nativeProjectId||state.nativeCompanyMode)?'none':'grid'"),'utility dock must yield on native project/company detail');
assert(js.includes("if(kind==='nogo'){if(!confirm("),'No-Go must remain an explicit human action');

console.log('mobile-app-v6-data-stability-smoke: ok');
