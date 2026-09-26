import fs from 'node:fs';

function assert(cond,msg){if(!cond)throw new Error(msg);}

const html=fs.readFileSync('pristeel-procurement.html','utf8');
const js=fs.readFileSync('pristeel-mobile-control-tower-v1.js','utf8');
const runtime=JSON.parse(fs.readFileSync('runtime-manifest.json','utf8'));

assert((html.match(/pristeel-mobile-control-tower-v1\.js/g)||[]).length===1,'mobile Control Tower must be loaded exactly once');
assert(html.indexOf('pristeel-mobile-home-v1.js')<html.indexOf('pristeel-mobile-control-tower-v1.js'),'Control Tower must load after the existing mobile Home utility provider');
assert(runtime.applicationDirectRuntime.includes('pristeel-mobile-control-tower-v1.js'),'Control Tower must be registered as direct runtime');

const home=(runtime.areas||[]).find(x=>x.area==='home');
assert(home&&home.finalOwners.includes('pristeel-mobile-control-tower-v1.js'),'Control Tower must be registered as a Home presentation owner');

assert(!/supaFetch\s*\(/.test(js),'Control Tower must not add direct Supabase reads or writes');
assert(!/\bfetch\s*\(/.test(js),'Control Tower must not add network fetches');
assert(!/setInterval\s*\(/.test(js),'Control Tower must not poll');
assert(!/MutationObserver/.test(js),'Control Tower must not create a DOM ownership observer');
assert(js.includes('PSTHomeCanonicalV1'),'Control Tower must reuse the canonical Home owner');
assert(js.includes("typeof H.snapshot==='function'"),'Control Tower must consume the canonical Home snapshot');
assert(js.includes('PSTHomeCanonicalV1.openBrief')||js.includes("typeof H.openBrief==='function'"),'project opening must delegate to the canonical Home project brief');
assert(js.includes('PSTMobileResponsiveV1'),'route changes must delegate to the existing mobile navigation owner');

assert(js.includes("legacyAction('[data-pmh-search]')"),'Ask PPPP must delegate to the existing mobile Home AI provider');
assert(js.includes("legacyAction('[data-pmh-weather]')"),'weather must delegate to the existing mobile Home provider');
assert(js.includes("legacyAction('[data-pmh-tool=\"currency\"]')"),'currency must delegate to the existing mobile Home provider');
assert(js.includes("legacyAction('[data-pmh-market-all]')"),'steel market must delegate to the existing mobile Home provider');

for(const label of [
  'PriSteel','Pyet PPPP…','Projekt, email, supplier, tender, financë',
  'Çfarë po ndodh','Veprime','Në pritje','Në punë','Moti','Konvertim','Tregu'
]){
  assert(js.includes(label),'approved Control Tower label missing: '+label);
}

assert(js.includes('pst-mobile-utility-dock-v1'),'persistent utility dock missing');
assert(js.includes('bottom:calc(66px + env(safe-area-inset-bottom))'),'utility dock must sit above the existing mobile bottom navigation');
assert(js.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),'utility dock must keep the three approved functional icons');
assert(js.includes("Math.min(iw,sw)<=900"),'Control Tower must remain phone/tablet-only');
assert(js.includes("document.addEventListener('pst:home-canonical-rendered',schedule)"),'Control Tower must rerender from canonical Home lifecycle events');
assert(js.includes("document.addEventListener('pst:mobile-pin-unlocked',schedule)"),'Control Tower must render after PIN unlock');
assert(js.includes("body.pst-mobile-home-active #pst-mobile-home-v1{display:none!important}"),'old mobile Home visual surface must yield while keeping its utility provider loaded');

console.log('mobile-control-tower-v1-smoke: ok');
