import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const src=fs.readFileSync('pristeel-finance-mindmap-v1.js','utf8');
assert(!/supaFetch|\/rest\/v1\/|\.insert\(|\.update\(|\.delete\(|showCreateInvoice|showAddExpense/.test(src),'Finance mindmap must not own finance data writes or create actions');
assert(src.includes("window.finSwitchTab(tab)"),'Finance mindmap must delegate tab opening to existing finSwitchTab');

const dom=new JSDOM(`<!doctype html><html><head></head><body><div class="page active" id="page-finance"><div id="fin-hub"><div class="fin-hub-grid">legacy cards</div></div><div id="fin-tabs" style="display:none"><button class="fin-tab">tab</button></div><div id="fin-tab-income"></div><div id="fin-tab-expenses"></div><div id="fin-tab-receipts"></div><div id="fin-tab-reports"></div></div></body></html>`,{url:'https://example.test/',runScripts:'outside-only'});
const {window}=dom;
const opened=[];
window.finSwitchTab=(tab)=>{
  opened.push(tab);
  window.document.getElementById('fin-hub').style.display='none';
  window.document.getElementById('fin-tabs').style.display='flex';
};
const ctx=dom.getInternalVMContext();
vm.runInContext(src,ctx,{filename:'pristeel-finance-mindmap-v1.js'});
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

const map=window.document.getElementById('pst-finance-mindmap');
assert(map,'Finance map must render inside the existing finance hub');
const nodes=[...map.querySelectorAll('[data-pst-finance-tab]')];
assert.equal(nodes.length,4,'Finance map must expose four functional branches');
for(const node of nodes){node.click();window.PSTFinanceMindmapV1.showMap();}
assert.deepEqual(opened,['income','expenses','receipts','reports'],'Finance branches must call only the existing tab router in the expected order');

const back=window.document.getElementById('pst-finance-map-return');
assert(back,'Finance detail view must expose a return-to-map control');
window.document.getElementById('fin-hub').style.display='none';
window.document.getElementById('fin-tabs').style.display='flex';
back.click();
assert.equal(window.document.getElementById('fin-hub').style.display,'block','Harta e Financave must restore the hub');
assert.equal(window.document.getElementById('fin-tabs').style.display,'none','Harta e Financave must hide finance tabs without changing finance data');

console.log('Finance mindmap interaction smoke passed.');
