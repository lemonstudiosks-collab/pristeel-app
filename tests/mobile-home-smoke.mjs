import fs from 'node:fs';

function assert(cond,msg){if(!cond)throw new Error(msg);}
const html=fs.readFileSync('pristeel-procurement.html','utf8');
const js=fs.readFileSync('pristeel-mobile-home-v1.js','utf8');
const runtime=JSON.parse(fs.readFileSync('runtime-manifest.json','utf8'));

assert((html.match(/pristeel-mobile-home-v1\.js/g)||[]).length===1,'mobile Home runtime must be loaded exactly once');
assert(!html.includes('</script>\\n<script src="pristeel-mobile-home-v1.js'),'mobile Home runtime tag must use a real line break');
assert(runtime.applicationDirectRuntime.includes('pristeel-mobile-home-v1.js'),'mobile Home must be registered as direct runtime');
const home=(runtime.areas||[]).find(x=>x.area==='home');
assert(home&&home.finalOwners.includes('pristeel-mobile-home-v1.js'),'mobile Home must be registered as a Home presentation owner');

assert(!/supaFetch\s*\(/.test(js),'mobile Home must not add Supabase calls');
assert(!/\bfetch\s*\(/.test(js),'mobile Home must not add network fetches');
assert(!/setInterval\s*\(/.test(js),'mobile Home must not poll');
assert(!/MutationObserver/.test(js),'mobile Home must not add a DOM ownership observer');
assert(!/serviceWorker\.register/.test(js),'mobile Home must not add service-worker caching');

assert(js.includes('PSTHomeMorningCommandCenterV1'),'mobile Home must reuse the existing Home in-memory provider');
assert(js.includes('opportunitySnapshot'),'mobile Home must reuse existing Opportunities snapshot data');
assert(js.includes("Math.min(iw,sw)<=900"),'mobile Home must use physical or viewport width for phone/tablet detection');
assert(js.includes("document.body&&document.body.classList.add('pst-mobile-home-active')"),'mobile Home activation class missing');
assert(js.includes("#pst-native-home-v4>*:not(#pst-mobile-home-v1){display:none!important}"),'legacy Home presentation must be hidden only while mobile Home is active');

for(const label of ['Pyet PPPP…','PRISTEEL Daily','Çfarë të shohësh sot','Veprime të shpejta','Vazhdo punën','Në pritje','Krijo projekt','Krijo draft','Shto partner','Shiko tenderët']){
  assert(js.includes(label),'approved mobile Home label missing: '+label);
}
for(const kind of ["kind==='project'","kind==='draft'","kind==='partner'","kind==='tender'"]){
  assert(js.includes(kind),'quick-action delegate missing: '+kind);
}
assert(js.includes('grid-template-columns:repeat(2,minmax(0,1fr))'),'quick actions should use a fuller 2x2 mobile layout');
assert(js.includes('visibleProjects()'),'mobile Home must show existing in-memory active projects');
assert(js.includes('waitingItems()'),'mobile Home must surface existing waiting items when present');
assert(!/<img\\b/i.test(js),'approved mobile Home must not include decorative/structure photos');
console.log('mobile-home-smoke: ok');
