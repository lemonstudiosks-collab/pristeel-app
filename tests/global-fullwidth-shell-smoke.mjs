import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const src=fs.readFileSync('pristeel-global-fullwidth-shell-v1.js','utf8');
assert(!/supaFetch|\/rest\/v1\/|\.insert\(|\.update\(|\.delete\(/.test(src),'Global shell must stay presentation/navigation only');
assert(src.includes('.app-shell>.sidebar')&&src.includes('display:none!important'),'Global shell must hide the persistent sidebar');
assert(src.includes("PSTPrimaryNavResilienceV10")&&src.includes("PSTHomeCanonicalV1")&&src.includes("pstWorkspaceGo('home')"),'Global back must use canonical Home navigation fallbacks');
assert(src.includes("attributeFilter:['class','style','hidden']"),'Global shell must react when routing changes page visibility without cleaning stale active classes');
assert(src.includes('childList:true'),'Global shell must notice when the Opportunities-local Back control mounts after the page route');
assert(!src.includes('#page-kek-tenders .pst-opp-v4-back{display:none!important}'),'Global shell must never hide the Opportunities-local Back control');


const dom=new JSDOM(`<!doctype html><html><head></head><body><div class="app-shell"><aside class="sidebar">NAV</aside><main class="main"><div class="content"><div class="page active" id="page-dashboard" style="display:block">HOME</div><div class="page" id="page-finance" style="display:none">FINANCE</div><div class="page" id="page-workspace-projects" style="display:none"><button data-pmm-back>Kthehu</button></div><div class="page" id="page-kek-tenders" style="display:none"><button class="pst-opp-v4-back" data-pst-opp-back>← Kthehu</button></div></div></main></div></body></html>`,{url:'https://example.test/',runScripts:'outside-only'});
const {window}=dom;
window.requestAnimationFrame=(fn)=>{fn();return 1;};
let homeCalls=0;
window.PSTPrimaryNavResilienceV10={openHome(){homeCalls++;}};
const ctx=dom.getInternalVMContext();
vm.runInContext(src,ctx,{filename:'pristeel-global-fullwidth-shell-v1.js'});
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

assert(window.document.body.classList.contains('pst-global-fullwidth-shell'),'Global full-width class must be installed');
assert.equal(window.document.querySelectorAll('#pst-global-page-backbar').length,0,'Home must not show Kthehu');

// Reproduce production routing: Home can keep a stale .active class while only display changes.
window.document.getElementById('page-dashboard').style.display='none';
window.document.getElementById('page-finance').classList.add('active');
window.document.getElementById('page-finance').style.display='block';
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(window.document.querySelectorAll('#pst-global-page-backbar').length,1,'A visibly active non-Home page must show exactly one Kthehu even with stale Home active');
assert.equal(window.document.getElementById('pst-global-page-backbar').parentNode.id,'page-finance','Kthehu must belong to the visibly active page');
window.document.getElementById('pst-global-back-home').click();
assert.equal(homeCalls,1,'Kthehu must call canonical Home navigation exactly once');

window.document.getElementById('page-finance').style.display='none';
window.document.getElementById('page-workspace-projects').classList.add('active');
window.document.getElementById('page-workspace-projects').style.display='block';
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(window.document.querySelectorAll('#pst-global-page-backbar').length,1,'Visibility-only page changes must not lose or duplicate Kthehu');
assert.equal(window.document.getElementById('pst-global-page-backbar').parentNode.id,'page-workspace-projects','Kthehu must follow the newly visible page');

window.document.getElementById('page-workspace-projects').style.display='none';
window.document.getElementById('page-kek-tenders').classList.add('active');
window.document.getElementById('page-kek-tenders').style.display='block';
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(window.document.querySelectorAll('#pst-global-page-backbar').length,0,'Global shell must defer to the Opportunities-local Back control instead of creating a second one');
assert(window.document.querySelector('#page-kek-tenders [data-pst-opp-back]'),'Opportunities-local Kthehu must remain present');


console.log('Global full-width shell smoke passed.');