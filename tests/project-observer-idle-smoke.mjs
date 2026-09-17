import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const stability=fs.readFileSync('pristeel-project-stability-v2.js','utf8');
const skeleton=fs.readFileSync('pristeel-workspace-skeleton-v3.js','utf8');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

const stableDom=new JSDOM('<!doctype html><html><head></head><body><div id="picker"><select id="global-proj"></select></div><section id="page-workspace-project" class="active" style="display:block"></section><div></div><div></div><div></div><div></div><div></div></body></html>',{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
stableDom.window.eval(stability);
await pause(80);
const picker=stableDom.window.document.getElementById('picker');
assert.equal(picker.style.display,'none','Picker is hidden while project workspace is active');
let styleWrites=0;
const styleObserver=new stableDom.window.MutationObserver(records=>{styleWrites+=records.length;});
styleObserver.observe(picker,{attributes:true,attributeFilter:['style']});
await pause(220);
styleObserver.disconnect();
assert.equal(styleWrites,0,'Project stability observer must not rewrite an unchanged style');
stableDom.window.close();

const skeletonDom=new JSDOM('<!doctype html><html><head></head><body><section id="page-workspace-project" class="active" style="display:block"><button class="pst-ws-tab" data-tab="overview">Overview</button></section></body></html>',{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
const tracked=[];
const NativeObserver=skeletonDom.window.MutationObserver;
skeletonDom.window.MutationObserver=class extends NativeObserver{constructor(callback){super(callback);tracked.push(this);}};
skeletonDom.window.eval(skeleton);
await pause(80);
const tab=skeletonDom.window.document.querySelector('.pst-ws-tab');
assert.equal(tab.textContent,'Përmbledhja','Project tab is localized');
let childWrites=0;
const childObserver=new skeletonDom.window.MutationObserver(records=>{childWrites+=records.length;});
childObserver.observe(tab,{childList:true,subtree:true});
await pause(220);
childObserver.disconnect();
assert.equal(childWrites,0,'Project skeleton observer must not rewrite unchanged tab text');
tracked.forEach(observer=>observer.disconnect());
skeletonDom.window.close();
console.log('Project observers idle smoke passed.');
