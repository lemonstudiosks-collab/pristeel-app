import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const src=fs.readFileSync('pristeel-global-fullwidth-shell-v1.js','utf8');
assert(!/supaFetch|\/rest\/v1\/|\.insert\(|\.update\(|\.delete\(/.test(src),'Global shell must stay presentation/navigation only');
assert(src.includes('.app-shell>.sidebar')&&src.includes('display:none!important'),'Global shell must hide the persistent sidebar');
assert(src.includes("PSTPrimaryNavResilienceV10")&&src.includes("PSTHomeCanonicalV1")&&src.includes("pstWorkspaceGo('home')"),'Global back must use canonical Home navigation fallbacks');

const dom=new JSDOM(`<!doctype html><html><head></head><body><div class="app-shell"><aside class="sidebar">NAV</aside><main class="main"><div class="content"><div class="page active" id="page-dashboard">HOME</div><div class="page" id="page-finance">FINANCE</div><div class="page" id="page-workspace-projects"><button data-pmm-back>Kthehu</button></div></div></main></div></body></html>`,{url:'https://example.test/',runScripts:'outside-only'});
const {window}=dom;
window.requestAnimationFrame=(fn)=>{fn();return 1;};
let homeCalls=0;
window.PSTPrimaryNavResilienceV10={openHome(){homeCalls++;}};
const ctx=dom.getInternalVMContext();
vm.runInContext(src,ctx,{filename:'pristeel-global-fullwidth-shell-v1.js'});
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

assert(window.document.body.classList.contains('pst-global-fullwidth-shell'),'Global full-width class must be installed');
assert.equal(window.document.querySelectorAll('#pst-global-page-backbar').length,0,'Home must not show Kthehu');

window.document.getElementById('page-dashboard').classList.remove('active');
window.document.getElementById('page-finance').classList.add('active');
window.dispatchEvent(new window.Event('pst:page-opened'));
assert.equal(window.document.querySelectorAll('#pst-global-page-backbar').length,1,'A non-Home page must show exactly one Kthehu');
window.document.getElementById('pst-global-back-home').click();
assert.equal(homeCalls,1,'Kthehu must call canonical Home navigation exactly once');

window.document.getElementById('page-finance').classList.remove('active');
window.document.getElementById('page-workspace-projects').classList.add('active');
window.dispatchEvent(new window.Event('pst:page-opened'));
assert.equal(window.document.querySelectorAll('#pst-global-page-backbar').length,1,'Page changes must not duplicate Kthehu');

console.log('Global full-width shell smoke passed.');
