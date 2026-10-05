import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const read=p=>fs.readFileSync(p,'utf8');
const destinations={opportunities:'page-kek-tenders',representations:'page-representations',direct:'page-eu-companies',buyers:'page-dach-steel-sales'};
const dom=new JSDOM(`<!doctype html><html class="pst-spie-standard"><head></head><body><div id="app-shell-root" class="app-shell"><aside id="app-sidebar" class="sidebar"><div id="pst-v2-sidebar"><div id="pst-ws-sidebar"><div class="pst-ws-create"></div></div></div></aside><main class="main"><div class="content"><section id="page-workspace-home" class="page active" style="display:block"></section>${Object.values(destinations).map(id=>`<section id="${id}" class="page" style="display:none">MODULE CONTENT</section>`).join('')}</div></main></div></body></html>`,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document,calls=[];
w.scrollTo=()=>{};
w.fetch=async()=>({ok:true,json:async()=>({current:{temperature_2m:7,weather_code:0}})});
w.PSTOperatingExperienceV1={apply(){}};
w.PSTContactMasterV1={};
function activate(key){calls.push(key);for(const p of d.querySelectorAll('.page')){const on=p.id===destinations[key];p.classList.toggle('active',on);p.style.display=on?'block':'none';}return true;}
w.pstTenderBizOpenMonitor=()=>activate('opportunities');
w.PSTRepresentationsV1={open:()=>activate('representations')};
w.PSTEUCompaniesV1={open:()=>activate('direct')};
w.PSTDachSteelSalesV3={open:()=>activate('buyers')};
w.eval(read('pristeel-primary-nav-resilience-v1.js'));
w.eval(read('pristeel-task-source-actions-v1.js'));
w.eval(read('pristeel-home-launcher-v4.js'));
d.dispatchEvent(new w.Event('DOMContentLoaded'));
await new Promise(r=>setTimeout(r,50));
const nav=d.getElementById('pst-ws-canonical-nav'),buttons=Array.from(nav.querySelectorAll('button'));
assert.equal(buttons.length,14);
let rebuilds=0;
const observer=new w.MutationObserver(rs=>{rebuilds+=rs.filter(r=>r.type==='childList').length;});
observer.observe(nav,{subtree:true,childList:true});
for(let i=0;i<5;i++){
 w.PSTTaskSourceActionsV1.decorate();
 w.PSTPrimaryNavResilienceV10.repairSidebar();
}
await new Promise(r=>setTimeout(r,1500));
assert.equal(rebuilds,0,'Late shell repairs must preserve the live navigation DOM');
assert.deepEqual(Array.from(nav.querySelectorAll('button')),buttons,'Focused/clickable buttons must retain identity');
assert.equal(nav.querySelector('[data-key="home"] .pst-nav-label').textContent,'Ballina');
observer.disconnect();
const root=d.getElementById('pst-home-launcher-v4');
for(const [key,id] of Object.entries(destinations)){
 const home=d.getElementById('page-workspace-home');
 for(const p of d.querySelectorAll('.page')){p.classList.remove('active');p.style.display='none';}
 home.classList.add('active');home.style.display='block';w.PSTHomeLauncherV4.render();
 root.querySelector(`[data-open="${key}"] b`).click();
 assert(d.getElementById(id).classList.contains('active'),key+' must open through its real Home button');
 assert.equal(home.style.display,'none');
}
assert.deepEqual(calls,['opportunities','representations','direct','buyers']);
for(const p of d.querySelectorAll('.page')){p.classList.remove('active');p.style.display='none';}
const home=d.getElementById('page-workspace-home');home.classList.add('active');home.style.display='block';w.PSTHomeLauncherV4.render();
w.__pstModulesReady=false;w.__pstBootstrapDiagnostics={completed:false};
root.querySelector('[data-open="opportunities"]').click();
root.querySelector('[data-open="buyers"]').click();
assert(home.classList.contains('active'),'A startup click must keep a usable Home until its owner loads');
assert.equal(calls.length,4);
w.__pstModulesReady=true;d.dispatchEvent(new w.Event('pst:modules-ready'));
assert.deepEqual(calls,['opportunities','representations','direct','buyers','buyers'],'Only the latest queued destination may execute once');
w.close();

const eu=new JSDOM('<!doctype html><html><head></head><body><div class="content"></div></body></html>',{url:'https://example.test/',runScripts:'outside-only'});
eu.window.scrollTo=()=>{};
let reads=0;
eu.window.supaFetch=async()=>{reads++;return[{id:'fixture-eu-company',company_name:'Fixture Fabricator',country:'Germany',business_scope:['fabrication_to_drawings'],contact_name:'Fixture Contact',contact_email:'fixture@example.test',stage:'replied',outreach_guard:'clear',priority_score:90}];};
eu.window.eval(read('pristeel-eu-companies-v1.js'));
eu.window.document.dispatchEvent(new eu.window.Event('DOMContentLoaded'));
await new Promise(r=>setTimeout(r,20));
const row=eu.window.document.querySelector('[data-eu-id="fixture-eu-company"]');
assert(row,'EU Direct must render a populated canonical row, without ReferenceError');
assert(row.textContent.includes('Prodhim sipas vizatimeve'));
assert(row.textContent.includes('Fixture Contact'));
row.click();
assert(eu.window.document.querySelector('.pst-eu-side').textContent.includes('Fixture Fabricator'),'Company details must open');
assert.equal(reads,1,'Rendering must not add database reads');
eu.window.close();

const boot=new JSDOM('<!doctype html><html><head></head><body><aside id="app-sidebar"></aside><section id="page-workspace-home" class="page" style="display:none"></section><section id="page-kek-tenders" class="page active" style="display:block">MODULE CONTENT</section></body></html>',{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
let homeActivations=0;
boot.window.PSTHomeCanonicalV1={activateHome(){homeActivations++;},render(){homeActivations++;return true;}};
boot.window.pstWorkspaceGo=()=>true;
boot.window.eval(read('pristeel-home-runtime-owner-guard-v1.js'));
boot.window.document.dispatchEvent(new boot.window.Event('DOMContentLoaded'));
boot.window.document.dispatchEvent(new boot.window.Event('pst:modules-ready'));
await new Promise(r=>setTimeout(r,450));
assert.equal(homeActivations,0,'Late startup completion must not steal the selected module');
assert(boot.window.document.getElementById('page-kek-tenders').classList.contains('active'));
assert(boot.window.PSTHomeRuntimeOwnerGuardV14.isVisualReady());
boot.window.close();
console.log('Home navigation stability regression: PASS (four routes, startup queue, stable sidebar, populated EU list/detail)');
