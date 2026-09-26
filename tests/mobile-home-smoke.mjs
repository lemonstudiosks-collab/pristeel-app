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
assert(!/setInterval\s*\(/.test(js),'mobile Home must not poll');
assert(!/MutationObserver/.test(js),'mobile Home must not add a DOM ownership observer');
assert(!/serviceWorker\.register/.test(js),'mobile Home must not add service-worker caching');
assert((js.match(/\bfetch\s*\(/g)||[]).length===2,'mobile Home may use only bounded public weather and ECB FX fetches');
assert(js.includes('api.open-meteo.com'),'mobile Home weather must use the public Open-Meteo source');
assert(js.includes('www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'),'currency converter must use the official ECB daily reference-rate feed');
assert(js.includes('WEATHER_TTL=30*60*1000'),'weather data must be cached for 30 minutes');
assert(js.includes('FX_TTL=12*60*60*1000'),'ECB FX data must be cached for 12 hours');
assert(js.includes("pst_mobile_weather_cache_v1"),'weather cache key missing');
assert(js.includes("pst_mobile_ecb_fx_cache_v1"),'FX cache key missing');

assert(js.includes("Math.min(iw,sw)<=900"),'mobile Home must use physical or viewport width for phone/tablet detection');
assert(js.includes("document.body&&document.body.classList.add('pst-mobile-home-active')"),'mobile Home activation class missing');
assert(!js.includes("document.getElementById('pst-native-home-v4')"),'mobile Home must not depend on optional native Home container');
assert(js.includes("var host=home();if(!host)return false;"),'mobile Home must mount on canonical Home page');
assert(js.includes("host.insertBefore(root,host.firstChild||null)"),'mobile Home must insert itself directly into canonical Home');
assert(js.includes("#page-workspace-home>*:not(#pst-mobile-home-v1){display:none!important}"),'legacy Home owners must be hidden inside canonical Home while mobile Home is active');

for(const label of [
  'Pyet PPPP…','Prishtinë','Tregu i Çelikut','Mjete të dobishme',
  'Kalkulator peshe','Konvertues mm ↔ inch','Incoterms','Shënim i shpejtë',
  'Burime të tregut','SteelBenchmarker','Lajmet e industrisë','Moti','Konvertues valutor'
]){
  assert(js.includes(label),'approved mobile Home label missing: '+label);
}
for(const oldLabel of [
  'PRISTEEL Daily','Çfarë të shohësh sot','Veprime të shpejta','Vazhdo punën',
  'Në pritje','Krijo projekt','Krijo draft','Shto partner','Shiko tenderët'
]){
  assert(!js.includes(oldLabel),'old business-workflow Home clutter must stay removed: '+oldLabel);
}
assert(js.includes("data-pmh-tool=\"weight\""),'weight calculator entry missing');
assert(js.includes("data-pmh-tool=\"convert\""),'unit converter entry missing');
assert(js.includes("data-pmh-source=\"steelbenchmarker\""),'SteelBenchmarker resource missing');
assert(!js.includes('Mostra publike e fundit'),'stale public sample steel prices must not be shown on Home');
assert(js.includes('Hap çmimin aktual'),'steel rows must open the current external market source instead of showing stale numbers');
assert(!js.includes("value:'$504.5/t'"),'stale HRC sample price must be removed');
assert(!js.includes("value:'$592.5/t'"),'stale rebar sample price must be removed');
assert(js.includes("data-pmh-tool=\"currency\""),'currency converter entry missing');
assert(js.includes('Ky shënim është lokal dhe nuk regjistrohet në PPPP.'),'quick note must not pretend to write into PPPP');
assert(!/<img\b/i.test(js),'approved mobile Home must not include decorative/structure photos');

console.log('mobile-home-smoke: ok');
