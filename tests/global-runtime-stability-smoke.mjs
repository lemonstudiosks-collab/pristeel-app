import fs from 'node:fs';
import assert from 'node:assert';
import {JSDOM} from 'jsdom';

const src=fs.readFileSync('pristeel-ui-runtime-stability-v1.js','utf8');
const bootstrap=fs.readFileSync('pristeel-project-emails.js','utf8');
assert.match(bootstrap,/pristeel-ui-runtime-stability-v1\.js\?v=20260924-global-stability1/,'global stability owner must be loaded by the production bootstrap');
assert.match(src,/document\.startViewTransition/,'route stabilization must use an atomic browser transition when available');
assert.match(src,/transition-property:background-color,color,border-color,box-shadow,opacity!important/,'interactive transitions must not animate size or transforms');
assert.match(src,/transform:none!important;scale:1!important/,'click and hover states must not zoom cards or controls');
assert.match(src,/scrollbar-gutter:stable!important/,'scrollbar space must remain stable between routes');

const dom=new JSDOM(`<!doctype html><html class="pst-runtime-ready"><head></head><body><div id="app-shell-root">
  <section id="page-workspace-home" class="page active" style="display:block"><div id="pst-home-launchpad-v1"><button id="go" data-pst-launch-area="projects">Projektet</button></div><p>${'Ballina '.repeat(12)}</p></section>
  <section id="page-workspace-projects" class="page" style="display:none"></section>
</div></body></html>`,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://example.test/'});
const w=dom.window;
let routeCalls=0,transitionCalls=0;
w.document.startViewTransition=function(update){
  transitionCalls++;
  const updateCallbackDone=Promise.resolve().then(update);
  return {updateCallbackDone,ready:Promise.resolve(),finished:updateCallbackDone};
};
w.document.getElementById('go').addEventListener('click',function(){
  routeCalls++;
  const old=w.document.getElementById('page-workspace-home'),next=w.document.getElementById('page-workspace-projects');
  old.classList.remove('active');old.style.display='none';next.classList.add('active');next.style.display='block';
  w.setTimeout(()=>{next.innerHTML='<h1>Projektet</h1><p>'+('Projekt aktiv '.repeat(12))+'</p>';},25);
});
w.eval(src);
w.document.getElementById('go').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,button:0}));
await new Promise(r=>setTimeout(r,180));
assert.strictEqual(transitionCalls,1,'one route click must start exactly one atomic transition');
assert.strictEqual(routeCalls,1,'the intercepted route must be replayed exactly once');
assert(w.document.getElementById('page-workspace-projects').classList.contains('active'),'destination page must become active');
assert(!w.document.documentElement.classList.contains('pst-ui-route-transitioning'),'transition lock must be released after stable layout');
assert(!w.PSTUiRuntimeStabilityV1.isRunning(),'runtime stability transaction must finish cleanly');

dom.window.close();

const fallbackDom=new JSDOM(`<!doctype html><html class="pst-runtime-ready"><head></head><body><div id="app-shell-root">
  <section id="page-workspace-home" class="page active" style="display:block"><div id="pst-home-launchpad-v1"><button id="fallback-go" data-pst-launch-area="projects">Projektet</button></div><p>${'Ballina '.repeat(12)}</p></section>
  <section id="page-workspace-projects" class="page" style="display:none"></section>
</div></body></html>`,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://example.test/'});
const fallbackWindow=fallbackDom.window;
let fallbackRouteCalls=0;
fallbackWindow.document.getElementById('fallback-go').addEventListener('click',function(){
  fallbackRouteCalls++;
  const old=fallbackWindow.document.getElementById('page-workspace-home'),next=fallbackWindow.document.getElementById('page-workspace-projects');
  old.classList.remove('active');old.style.display='none';next.classList.add('active');next.style.display='block';
  fallbackWindow.setTimeout(()=>{next.innerHTML='<h1>Projektet</h1><p>'+('Projekt aktiv '.repeat(12))+'</p>';},25);
});
fallbackWindow.eval(src);
fallbackWindow.document.getElementById('fallback-go').dispatchEvent(new fallbackWindow.MouseEvent('click',{bubbles:true,cancelable:true,button:0}));
await new Promise(r=>setTimeout(r,10));
assert.strictEqual(fallbackRouteCalls,1,'fallback route must be replayed exactly once');
assert(fallbackWindow.document.querySelector('.pst-ui-stability-clone'),'fallback must keep the previous page visible while the destination loads');
await new Promise(r=>setTimeout(r,180));
assert(!fallbackWindow.document.querySelector('.pst-ui-stability-clone'),'fallback snapshot must be removed after stable destination layout');
assert(!fallbackWindow.PSTUiRuntimeStabilityV1.isRunning(),'fallback stability transaction must finish cleanly');
fallbackDom.window.close();

console.log('Global UI runtime stability smoke: PASS (atomic + fallback)');
