import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const src=fs.readFileSync('pristeel-production-surface-owner-v1.js','utf8');
assert(!/supaFetch|\/rest\/v1\/|\.insert\(|\.update\(|\.delete\(/.test(src),'Production surface owner must stay presentation/navigation only');
assert(src.includes("data-pst-finance-branch")&&src.includes("finReceiptShow")&&src.includes("edeklarimi.atk-ks.org"),'Finance map must preserve existing finance destinations');

const dom=new JSDOM(`<!doctype html><html><head></head><body class="pst-ui-v2">
<div class="app-shell" id="app-shell-root"><aside class="sidebar" id="app-sidebar"><div id="pst-v2-sidebar"><div id="pst-ws-sidebar"></div></div></aside><main class="main"><div class="content">
  <section class="page" id="page-workspace-home" style="display:none">HOME</section>
  <section class="page active" id="page-kek-tenders" style="display:block">
    <button data-pst-opp-field="construction"><b>Ndërtim</b></button>
    <button data-pst-opp-field="services"><b>Shërbime</b></button>
    <div class="pst-opp-v4-results-head"><small></small></div>
    <div id="pst-opportunities-list"><article data-pcw-tender="c1">C1</article><article data-pcw-tender="s1">S1</article></div>
  </section>
  <section class="page" id="page-finance" style="display:none"><div id="fin-hub"><div id="fin-hub-grid">legacy</div><details id="pst-finance-tools"><summary>old</summary></details></div><div id="fin-tabs"></div>${['inv','supp','exp','atk','tax','aging','bg','oc'].map(x=>`<div id="fin-view-${x}"></div>`).join('')}<div id="fin-view-receipts-v1"></div></section>
</div></main></div>
<div id="pst-global-page-backbar"><button id="pst-global-back-home">← Kthehu</button></div>
</body></html>`,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
window.console=console;
window.PSTHomeCanonicalV1={activateHome(){window.document.querySelectorAll('.page').forEach(p=>{p.classList.remove('active');p.style.display='none';});const h=window.document.getElementById('page-workspace-home');h.classList.add('active');h.style.display='block';return h;},render(){return true;}};
window.PSTProjectCentricWorkflowV1={_state:{rows:[{id:'c1',kind:'construction'},{id:'s1',kind:'services'}]}};
window.PSTOpportunitiesMindmapV5={_test:{classifyField:r=>r.kind}};
const opened=[];let receiptCalls=0;let portalCalls=0;
window.finSwitchTab=id=>opened.push(id);
window.finReceiptShow=()=>{receiptCalls++;};
window.open=(url)=>{if(String(url).includes('edeklarimi.atk-ks.org'))portalCalls++;return {};};
window.eval(src);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
await new Promise(r=>setTimeout(r,20));

const sidebar=window.document.getElementById('app-sidebar');
assert.equal(sidebar.style.getPropertyValue('display'),'none','Final owner must hide the real #app-sidebar');
assert.equal(sidebar.style.getPropertyPriority('display'),'important','Sidebar hide must outrank late legacy !important rules');

window.document.querySelector('[data-pst-opp-field="construction"]').click();
await new Promise(r=>setTimeout(r,40));
assert.equal(window.document.querySelector('[data-pcw-tender="s1"]').hidden,false,'Production surface must not steal Opportunities field filtering from the mindmap owner');

const finMap=window.document.getElementById('pst-finance-mindmap');
assert(finMap,'Finance mindmap must exist');
assert.equal(finMap.querySelectorAll('[data-pst-finance-branch]').length,10,'Finance mindmap must expose all ten active destinations');
assert.equal(window.document.getElementById('pst-finance-tools').style.getPropertyValue('display'),'none','Legacy Finance card container must be hidden');
finMap.querySelector('[data-pst-finance-branch="inv"]').click();
finMap.querySelector('[data-pst-finance-branch="receipts"]').click();
finMap.querySelector('[data-pst-finance-branch="portal"]').click();
assert.deepEqual(opened,['inv'],'Finance register branch must delegate to finSwitchTab');
assert.equal(receiptCalls,1,'Receipt branch must delegate to existing receipt surface');
assert.equal(portalCalls,1,'ATK portal branch must retain the external portal action');

window.document.getElementById('pst-global-back-home').click();
await new Promise(r=>setTimeout(r,10));
assert(window.document.getElementById('page-kek-tenders').classList.contains('active'),'Production surface must not steal global Back navigation from the shell/router owner');

window.close();
console.log('Production surface owner smoke passed.');
