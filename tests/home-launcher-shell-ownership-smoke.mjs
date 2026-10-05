import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const routes=['page-kek-tenders','page-representations','page-eu-companies','page-dach-steel-sales'];
const dom=new JSDOM(`<!doctype html><html><head></head><body><div id="app-shell-root" class="app-shell">
<aside id="app-sidebar" class="sidebar"><div id="pst-v2-sidebar"><div id="pst-ws-sidebar"><nav id="pst-ws-canonical-nav"><button data-key="home" class="active on">Home</button></nav></div></div></aside>
<main class="main"><div class="content">
${routes.map(id=>`<section id="${id}" class="page" style="display:none">MODULE</section>`).join('')}</div></main></div></body></html>`,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom,{document}=window;
let weatherReads=0,mutations=0;
window.fetch=async()=>{weatherReads++;return {ok:true,json:async()=>({current:{temperature_2m:7,weather_code:0}})}};
window.PSTPrimaryNavResilienceV10={syncSidebar(){return true}};
window.scrollTo=()=>{};
for(const path of ['pristeel-home-launcher-v4.js','pristeel-global-fullwidth-shell-v1.js','pristeel-production-surface-owner-v1.js','pristeel-representations-fullwidth-v2.js'])window.eval(fs.readFileSync(path,'utf8'));
document.dispatchEvent(new window.Event('DOMContentLoaded'));
const settle=()=>new Promise(r=>setTimeout(r,80));
await settle();
assert(!document.getElementById('pst-home-launcher-v4'),'Bootstrap may load the launcher before the Home host exists');
document.querySelector('.content').insertAdjacentHTML('afterbegin','<section id="page-workspace-home" class="page" style="display:none"><div id="late-legacy-home">Old Home</div></section>');
await settle();
document.getElementById('page-workspace-home').classList.add('active');
document.getElementById('page-workspace-home').style.display='block';
await settle();
const home=document.getElementById('page-workspace-home'),sidebar=document.getElementById('app-sidebar'),launcher=document.getElementById('pst-home-launcher-v4');
assert(launcher);
assert.equal(sidebar.style.display,'none','Home must have no sidebar after late shell owners load');
assert(document.body.classList.contains('pst-home-shell-owned'));
const legacy=document.createElement('div');legacy.id='pst-native-home-v4';home.appendChild(legacy);
// Exercise the real late claim functions without starting their unrelated providers.
window.eval(fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8').match(/^function retireOtherHomeChildren.*$/m)[0]);
window.retireOtherHomeChildren(home,legacy);
window.eval(fs.readFileSync('pristeel-native-ui-v4-core.js','utf8').match(/^function claimHome.*$/m)[0]);
window.claimHome();
assert(!launcher.hidden&&!launcher.hasAttribute('aria-hidden'),'Late native/finalizer owners must not retire the launcher');
launcher.hidden=true;launcher.setAttribute('aria-hidden','true');launcher.setAttribute('data-pst-retired-home-owner','1');launcher.style.display='none';
window.PSTHomeLauncherV4.render();
assert(!launcher.hidden&&!launcher.hasAttribute('aria-hidden')&&!launcher.hasAttribute('data-pst-retired-home-owner'),'Launcher must clear inherited legacy accessibility state');

for(let cycle=0;cycle<3;cycle++)for(const id of routes){
  home.classList.remove('active');home.style.display='none';
  // Reproduce the stale Home navigation marker left by a late compatibility layer.
  document.querySelector('[data-key="home"]').classList.add('active','on');
  const page=document.getElementById(id);page.classList.add('active');page.style.display='block';
  await settle();
  window.PSTProductionSurfaceOwnerV2.repair();
  window.PSTGlobalFullwidthShellV2.refresh();
  assert(!document.body.classList.contains('pst-home-launcher-active'),'Hidden Home must not cover '+id);
  assert.equal(sidebar.style.display,'flex','Module sidebar must survive both late shell owners: '+id);
  assert.equal(sidebar.style.width,'204px');
  page.classList.remove('active');page.style.display='none';home.classList.add('active');home.style.display='block';
  document.dispatchEvent(new window.Event('pst:home-canonical-rendered'));
  await settle();
  assert.equal(sidebar.style.display,'none');
  assert.equal(sidebar.style.width,'0px');
  assert.equal(document.getElementById('pst-home-launcher-v4'),launcher,'Return must retain the same launcher DOM');
}
const observer=new window.MutationObserver(records=>{mutations+=records.length});
observer.observe(document.body,{subtree:true,attributes:true,childList:true});
await settle();mutations=0;await settle();
assert.equal(mutations,0,'Settled Home must not keep mutating/reapplying sidebar state');
assert.equal(weatherReads,1,'Route/render events must reuse successful weather data until explicit refresh');
observer.disconnect();
await settle();dom.window.close();
console.log('Home launcher combined shell ownership: PASS (3 cycles, 4 modules, no idle mutations)');
