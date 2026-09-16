import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const shell=fs.readFileSync('pristeel-global-fullwidth-shell-v1.js','utf8');
const surface=fs.readFileSync('pristeel-production-surface-owner-v1.js','utf8');
const loader=fs.readFileSync('pristeel-home-canonical-interaction-v1.js','utf8');
assert(!loader.includes('loadFinanceMindmap()'),'The obsolete four-branch Finance map must not load beside the ten-branch owner');

const dom=new JSDOM(`<!doctype html><html><head></head><body><div id="app-shell-root" class="app-shell"><aside id="app-sidebar" class="sidebar"></aside><main class="main"><div class="content">
<section id="page-workspace-home" class="page active" style="display:block">Home</section>
<section id="page-workspace-projects" class="page" style="display:none"><button id="project-one">Project</button></section>
<section id="page-workspace-project" class="page" style="display:none">Project detail</section>
<section id="page-kek-tenders" class="page" style="display:none">Opportunities</section>
<section id="page-finance" class="page" style="display:none"><div id="fin-hub"><div id="fin-hub-grid">Legacy cards</div><div id="pst-finance-tools"></div></div><div id="fin-tabs" style="display:none"></div>${['inv','supp','exp','atk','tax','aging','bg','oc'].map(id=>`<div id="fin-view-${id}"></div>`).join('')}<div id="fin-view-receipts-v1"></div></section>
</div></main></div></body></html>`,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
window.console=console;
const page=id=>window.document.getElementById(id);
const activate=id=>{window.document.querySelectorAll('.page').forEach(p=>{p.classList.toggle('active',p.id===id);p.style.display=p.id===id?'block':'none';});window.dispatchEvent(new window.Event('pst:page-opened'));};
let homeCalls=0;
window.PSTPrimaryNavResilienceV10={openHome(){homeCalls++;activate('page-workspace-home');return true;}};
window.finShowHub=()=>{page('fin-hub').style.display='block';page('fin-tabs').style.display='none';};
const opened=[];let receipts=0;let portal=0;
window.finSwitchTab=id=>{opened.push(id);page('fin-hub').style.display='none';page('fin-tabs').style.display='block';};
window.finReceiptShow=()=>{receipts++;page('fin-hub').style.display='none';};
window.open=url=>{if(String(url).includes('edeklarimi.atk-ks.org'))portal++;return {};};
window.eval(shell);
window.eval(surface);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
await new Promise(r=>setTimeout(r,30));

for(let cycle=0;cycle<3;cycle++){
  for(const id of ['page-kek-tenders','page-workspace-projects','page-workspace-project','page-finance']){
    activate(id);
    await new Promise(r=>setTimeout(r,35));
    assert.equal(window.document.querySelectorAll('#pst-global-back-home').length,1,'Exactly one Back button after rerender');
    window.document.querySelector('#pst-global-back-home').click();
    assert.equal(page('page-workspace-home').classList.contains('active'),true,'Back returns Home');
  }
  activate('page-finance');
  await new Promise(r=>setTimeout(r,35));
  const map=page('pst-finance-mindmap');
  assert.equal(map.querySelectorAll('[data-pst-finance-branch]').length,10,'All real Finance branches remain available');
  for(const id of ['inv','supp','exp','atk','tax','aging','bg','oc','receipts','portal']){
    map.querySelector(`[data-pst-finance-branch="${id}"]`).click();
    if(id!=='portal'){
      const back=page('pst-finance-map-return');
      assert(back&&back.style.display==='inline-flex','Finance detail has return-to-map control');
      back.click();
      assert.equal(page('fin-hub').style.display,'block','Finance map restored');
    }
  }
  assert.equal(page('pst-finance-mindmap'),map,'Finance map DOM is not replaced by repair');
  window.document.querySelector('#pst-global-back-home').click();
}
assert.equal(homeCalls,15,'One Home route per Back click, with no duplicate listener');
assert.equal(opened.length,24,'Each Finance tab branch dispatches exactly once per cycle');
assert.equal(receipts,3,'Receipts dispatch once per cycle');
assert.equal(portal,3,'Portal dispatch once per cycle');
assert.equal(window.document.querySelectorAll('#pst-production-surface-owner-v1-css').length,1,'One production stylesheet');
assert.equal(window.document.querySelectorAll('#pst-global-fullwidth-shell-v1-css').length,1,'One shell stylesheet');
await new Promise(r=>setTimeout(r,60));
let idleMutations=0;
const idleObserver=new window.MutationObserver(records=>{idleMutations+=records.length;});
idleObserver.observe(page('page-finance'),{subtree:true,childList:true,attributes:true});
await new Promise(r=>setTimeout(r,140));
idleObserver.disconnect();
assert.equal(idleMutations,0,'Presentation owners must settle without a self-triggered mutation loop');
window.close();
console.log('Runtime ownership multi-cycle smoke passed.');
