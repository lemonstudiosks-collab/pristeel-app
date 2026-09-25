import fs from 'node:fs';
import assert from 'node:assert';
import {JSDOM} from 'jsdom';

const src=fs.readFileSync('pristeel-ui-runtime-stability-v1.js','utf8');
const bootstrap=fs.readFileSync('pristeel-project-emails.js','utf8');
const html=fs.readFileSync('pristeel-procurement.html','utf8');
const startup=fs.readFileSync('pristeel-search.js','utf8');
assert.match(bootstrap,/pristeel-ui-runtime-stability-v1\.js\?v=20260925-no-page-clone1/,'global stability owner must be loaded by the production bootstrap');
assert.doesNotMatch(src,/document\.startViewTransition/,'route stabilization must not use root snapshots that can scale between different layouts');
assert.doesNotMatch(src,/cloneNode\s*\(/,'route stabilization must never clone the previous page');
assert.doesNotMatch(src,/preventDefault\s*\(|stopImmediatePropagation\s*\(/,'route stabilization must not cancel or replay canonical route clicks');
assert.doesNotMatch(src,/getBoundingClientRect\s*\(/,'route readiness checks must not force layout on every animation frame');
assert.match(src,/transition:none!important/,'runtime transitions must not animate layout or size');
assert.match(src,/animation-duration:\.001ms!important/,'runtime layout animations must finish immediately');
assert.match(src,/transform:none!important;scale:1!important/,'click and hover states must not zoom cards or controls');
assert.match(src,/scrollbar-gutter:stable!important/,'scrollbar space must remain stable between routes');
assert.doesNotMatch(html,/fonts\.googleapis\.com/,'production must not swap to a late-loading web font');
assert.match(html,/font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif/,'production must use one deterministic system-font stack');
assert.doesNotMatch(startup,/animation:pstStartupMove/,'startup indicator must not move while the platform loads');
assert.doesNotMatch(startup,/transform:translateY\(-2vh\)/,'startup card must not jump vertically');

const dom=new JSDOM(`<!doctype html><html class="pst-runtime-ready"><head></head><body><div id="app-shell-root">
  <section id="page-workspace-home" class="page active" style="display:block"><div id="pst-home-launchpad-v1"><button id="go" data-pst-launch-area="projects">Projektet</button></div><p>${'Ballina '.repeat(12)}</p></section>
  <section id="page-workspace-projects" class="page" style="display:none"></section>
</div></body></html>`,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://example.test/'});
const w=dom.window;
let routeCalls=0;
w.document.getElementById('go').addEventListener('click',function(){
  routeCalls++;
  const old=w.document.getElementById('page-workspace-home'),next=w.document.getElementById('page-workspace-projects');
  old.classList.remove('active');old.style.display='none';next.classList.add('active');next.style.display='block';
  w.setTimeout(()=>{next.innerHTML='<h1>Projektet</h1><p>'+('Projekt aktiv '.repeat(12))+'</p>';},25);
});
w.eval(src);
w.document.getElementById('go').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,button:0}));
await new Promise(r=>setTimeout(r,10));
assert(!w.document.querySelector('.pst-ui-stability-clone'),'previous page must never be cloned over the destination');
assert(w.document.documentElement.classList.contains('pst-ui-route-transitioning'),'route must remain marked as settling while destination content loads');
await new Promise(r=>setTimeout(r,170));
assert.strictEqual(routeCalls,1,'the canonical route click must run exactly once');
assert(w.document.getElementById('page-workspace-projects').classList.contains('active'),'destination page must become active');
assert(!w.document.documentElement.classList.contains('pst-ui-route-transitioning'),'transition lock must be released after stable layout');
assert(!w.PSTUiRuntimeStabilityV1.isRunning(),'runtime stability transaction must finish cleanly');

dom.window.close();

console.log('Global UI runtime stability smoke: PASS (font + startup + route + interaction)');
