import fs from 'node:fs';

function assert(cond,msg){if(!cond)throw new Error(msg);}
const html=fs.readFileSync('pristeel-procurement.html','utf8');
const js=fs.readFileSync('pristeel-mobile-responsive-v1.js','utf8');
const manifest=JSON.parse(fs.readFileSync('pristeel.webmanifest','utf8'));

assert((html.match(/pristeel-mobile-responsive-v1\.js/g)||[]).length===1,'mobile runtime must be loaded exactly once');
assert(/rel="manifest"\s+href="pristeel\.webmanifest"/.test(html),'web manifest must be linked');
assert(html.includes('viewport-fit=cover'),'viewport must support safe areas');
assert(html.includes('apple-mobile-web-app-capable'),'iOS install metadata missing');
assert(!/supaFetch\s*\(/.test(js),'mobile shell must not add Supabase calls');
assert(!/setInterval\s*\(/.test(js),'mobile shell must not poll');
assert(!/MutationObserver/.test(js),'mobile shell must not install a UI ownership observer');
assert(!/serviceWorker\.register/.test(js),'responsive phase must not register a service worker');
assert(!/body\s+\.sidebar\s*\{\s*display\s*:\s*none/i.test(js),'must not globally hide generic sidebars');
for(const key of ['home','tenders','projects','contacts','finance','apps']){
  assert(js.includes("key:'"+key+"'"),'missing mobile route '+key);
}
assert(js.includes('#pst-ws-canonical-nav .pst-ws-navbtn[data-key="'), 'mobile navigation must delegate to canonical nav');
assert(manifest.display==='standalone','manifest must use standalone display');
assert(typeof manifest.start_url==='string'&&manifest.start_url.includes('pristeel-procurement.html'),'manifest start_url must open PPPP');
console.log('mobile-responsive-shell-smoke: ok');
