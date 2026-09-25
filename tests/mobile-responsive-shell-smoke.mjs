import fs from 'node:fs';

function assert(cond,msg){if(!cond)throw new Error(msg);}
const html=fs.readFileSync('pristeel-procurement.html','utf8');
const js=fs.readFileSync('pristeel-mobile-responsive-v1.js','utf8');
const manifest=JSON.parse(fs.readFileSync('pristeel.webmanifest','utf8'));
assert(fs.existsSync('assets/pristeel-app-icon-192.png'),'192px raster icon file missing');
assert(fs.existsSync('assets/pristeel-app-icon-512.png'),'512px raster icon file missing');

assert((html.match(/pristeel-mobile-responsive-v1\.js/g)||[]).length===1,'mobile runtime must be loaded exactly once');
assert(/rel="manifest"\s+href="pristeel\.webmanifest"/.test(html),'web manifest must be linked');
assert(html.includes('viewport-fit=cover'),'viewport must support safe areas');
assert(html.includes('apple-mobile-web-app-capable'),'iOS install metadata missing');
assert(!html.includes('</title>\\n<meta'),'mobile metadata must use real line breaks');
assert(!html.includes('</script>\\n<script src="pristeel-mobile-responsive'),'mobile runtime tag must use a real line break');
assert(!/supaFetch\s*\(/.test(js),'mobile shell must not add Supabase calls');
assert(!/setInterval\s*\(/.test(js),'mobile shell must not poll');
assert(!/MutationObserver/.test(js),'mobile shell must not install a UI ownership observer');
assert(!/serviceWorker\.register/.test(js),'responsive phase must not register a service worker');
assert(js.includes('@media(max-width:900px)'),'phone/tablet shell must stay active through 900px');
assert(!js.includes('@media(max-width:640px)'),'phone-only shell breakpoint must not remain');
assert(js.includes('touch-action:manipulation'),'mobile shell must add touch-safe controls');
assert(js.includes('100dvh'),'mobile dialogs must respect the phone viewport');
assert(js.includes('.table-responsive'),'mobile shell must preserve horizontal table access');
assert(!/body\s+\.sidebar\s*\{\s*display\s*:\s*none/i.test(js),'must not globally hide generic sidebars');
for(const key of ['home','tenders','projects','contacts','finance','apps']){
  assert(js.includes("key:'"+key+"'"),'missing mobile route '+key);
}
assert(js.includes('#pst-ws-canonical-nav .pst-ws-navbtn[data-key="'), 'mobile navigation must delegate to canonical nav');
assert(manifest.display==='standalone','manifest must use standalone display');
assert(manifest.prefer_related_applications===false,'manifest must keep web-app installation primary');
assert(manifest.icons.some(i=>i.src==='assets/pristeel-app-icon-192.png'&&i.sizes==='192x192'),'manifest needs 192px raster icon');
assert(manifest.icons.some(i=>i.src==='assets/pristeel-app-icon-512.png'&&i.sizes==='512x512'),'manifest needs 512px raster icon');
assert(html.includes('rel="apple-touch-icon"'),'iOS touch icon metadata missing');
assert(typeof manifest.start_url==='string'&&manifest.start_url.includes('pristeel-procurement.html'),'manifest start_url must open PPPP');
console.log('mobile-responsive-shell-smoke: ok');
