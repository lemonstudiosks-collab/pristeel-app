import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const src=fs.readFileSync('pristeel-daily-safe-v2.js','utf8');
assert(src.includes('homeRoute'),'Daily must gate itself by the visible Home route');
assert(src.includes("attributeFilter:['class','style','hidden']"),'Daily must react to route visibility changes');
assert(!/supaFetch\([^)]*kek_tender_watch|pppp_opportunity/i.test(src),'Daily visibility guard must not add opportunity data reads');

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<section id="page-workspace-home" class="page active" style="display:block"></section>
<section id="page-kek-tenders" class="page" style="display:none"></section>
</body></html>`,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});

const {window}=dom;
window.console=console;
window.requestAnimationFrame=fn=>{fn();return 1;};
window.supaFetch=async()=>[];

window.eval(src);
if(window.document.readyState==='loading')window.document.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));
window.PSTDailySafeV2.apply();

assert(window.document.getElementById('pst-daily-launch'),'The PriSteel Daily launcher must exist on Home');
await window.PSTDailySafeV2.open();
assert.equal(window.PSTDailySafeV2._state.open,true,'Daily may open on Home');

const home=window.document.getElementById('page-workspace-home');
const opp=window.document.getElementById('page-kek-tenders');
home.style.display='none';
opp.classList.add('active');
opp.style.display='block';
await new Promise(r=>setTimeout(r,0));

assert.equal(window.document.getElementById('pst-daily-launch'),null,'Daily launcher must disappear on Opportunities');
assert.equal(window.PSTDailySafeV2._state.open,false,'An open Daily overlay must close when leaving Home');
assert.equal(await window.PSTDailySafeV2.open(),false,'Daily must refuse to open on a non-Home route');

opp.style.display='none';
opp.classList.remove('active');
home.style.display='block';
await new Promise(r=>setTimeout(r,0));

assert(window.document.getElementById('pst-daily-launch'),'Daily launcher must return when Home becomes visible again');
dom.window.close();
console.log('PriSteel Daily Home-only smoke passed.');
