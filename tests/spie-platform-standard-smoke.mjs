import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('pristeel-procurement.html');
const css=read('pristeel-spie-standard.css');
const nav=read('pristeel-primary-nav-resilience-v1.js');

test('static standard ships before bootstrap and keeps authentication gate',()=>{
 assert.match(html,/<html[^>]*id="pst-spie-platform"[^>]*pst-spie-standard/);
 assert(html.indexOf('pristeel-spie-standard.css')<html.indexOf('<body'));
 assert.match(html,/<div class="app-shell" id="app-shell-root" style="display:none">/);
 assert.match(html,/<body class="pst-home-shell-owned">/);
 const manifest=JSON.parse(read('pages-artifact-manifest.json'));
 assert(manifest.additionalPublicAssets.some(a=>a.path==='pristeel-spie-standard.css'));
 assert(manifest.referenceChecks.some(a=>a.source==='pristeel-procurement.html'&&a.contains==='pristeel-spie-standard.css'));
});
test('standard shell owners defer geometry without changing legacy fallback',()=>{
 const source=read('pristeel-home-launcher-v4.js');
 const code=source.slice(source.indexOf('function homeShell(on){'),source.indexOf('function watchShell'));
 const flags={};let legacyReads=0;
 const context={document:{documentElement:{classList:{contains:()=>true}},getElementById(){legacyReads++;return null}},bodyFlag:(key,on)=>flags[key]=on};
 vm.createContext(context);vm.runInContext(code,context);
 context.homeShell(true);assert.equal(flags['pst-home-launcher-active'],true);
 context.homeShell(false);assert.equal(flags['pst-home-launcher-active'],false);
 assert.equal(flags['pst-home-shell-owned'],true);assert.equal(legacyReads,0);
 assert(read('pristeel-production-surface-owner-v1.js').includes("if(document.documentElement.classList.contains('pst-spie-standard'))return;"));
});
test('new navigation delegates to existing owners and requires explicit gesture',()=>{
 const code=nav.slice(nav.indexOf('function route(key){'),nav.indexOf('function intercept(e)'));
 const calls=[];
 const c={SPIE_STANDARD:true,S:String,window:{PSTHomeLauncherV4:{openModule:key=>{calls.push(key);return true}},PSTDocumentCenterStableV2:{open:()=>{calls.push('documents');return true}},pstWorkspaceGo:key=>calls.push(key)},mark:()=>{},stabilizeViewport:()=>{},console};
 vm.createContext(c);vm.runInContext(code,c);assert.equal(calls.length,0);
 for(const key of ['direct','buyers','spie','events','files','emails'])assert.equal(c.route(key),true,key);
 assert.deepEqual(calls,['direct','buyers','spie','events','documents','inbox']);
 c.window.PSTHomeLauncherV4.openModule=()=>false;assert.equal(c.route('direct'),false);
});
test('presentation does not add network, hide business controls or mutate records',()=>{
 assert(!/@import|url\(/.test(css),'No new external font or asset request');
 assert(!/fetch\(|supaFetch|setInterval|MutationObserver/.test(css));
 assert.match(css,/\.pst-fin-node[^}]*grid-column:auto!important/);
 assert.match(css,/\.phl-main-card[^}]*grid-template-columns:26px minmax\(0,1fr\) 20px/);
 assert.match(css,/@media\(max-width:900px\)/);
 const owner=JSON.parse(read('runtime-manifest.json')).areas.find(a=>a.area==='application-shell');
 assert.equal(owner.finalPresentationOwner,'pristeel-spie-standard.css');
});
