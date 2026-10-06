import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html id="pst-spie-platform" class="pst-spie-standard"><head></head><body><div id="pst-ws-sidebar"><div class="pst-ws-create"></div></div><section id="page-workspace-home" class="page active"><div id="pst-home-launcher-v4"><button class="phl-main-card"><span class="phl-main-copy"><b>Main</b><small>Description</small></span></button><button class="phl-small-card"><span><b>Other</b><small>Description</small></span></button></div></section></body></html>',{runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
w.scrollTo=()=>{};
w.eval(fs.readFileSync('pristeel-primary-nav-resilience-v1.js','utf8'));
w.PSTPrimaryNavResilienceV10.repairSidebar();
const nav=d.getElementById('pst-ws-canonical-nav'),html=nav.innerHTML,buttons=[...nav.querySelectorAll('button')];
let mutations=0;
const observer=new w.MutationObserver(rs=>{mutations+=rs.length});
observer.observe(nav,{subtree:true,childList:true,characterData:true,attributes:true});
w.eval(fs.readFileSync('pristeel-platform-readability-v1.js','utf8'));
d.dispatchEvent(new w.Event('DOMContentLoaded'));
for(let i=0;i<4;i++){
 w.PSTPlatformReadabilityV1.apply(d);
 w.PSTPrimaryNavResilienceV10.repairSidebar();
 buttons[0].dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
}
await new Promise(r=>setTimeout(r,3400));
assert.equal(mutations,0,'Repeated and delayed readability passes must not mutate canonical navigation');
assert.equal(nav.innerHTML,html);
assert.deepEqual([...nav.querySelectorAll('button')],buttons);
assert.equal(d.querySelectorAll('#pst-ws-sidebar [class*="pst-rd-"],#pst-home-launcher-v4 [class*="pst-rd-"]').length,0);
// Existing document exclusions and legacy readability remain operational.
const legacy=new JSDOM('<!doctype html><html><head></head><body><button style="font-size:10px">Test</button></body></html>',{runScripts:'outside-only'});
legacy.window.eval(fs.readFileSync('pristeel-platform-readability-v1.js','utf8'));
legacy.window.PSTPlatformReadabilityV1.apply(legacy.window.document);
assert(legacy.window.document.querySelector('button').classList.contains('pst-rd-control'));
legacy.window.close();observer.disconnect();w.close();
console.log('Sidebar/Home typography stability: PASS (click delays, unchanged navigation, legacy fallback)');
