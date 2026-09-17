import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const source=fs.readFileSync('pristeel-opportunities-filter-polish-v1.js','utf8');
const dom=new JSDOM(`<!doctype html><html><head></head><body><section id="page-kek-tenders" class="page active"><div id="pst-opportunities-focus"><header></header><div id="pst-pcw-opportunity-tools"></div><div id="pst-pcw-lifecycle-tabs">Legacy map</div><div id="pst-opportunities-list"></div></div></section></body></html>`,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
const nativeTimer=window.setTimeout.bind(window);
window.setTimeout=(callback,delay)=>nativeTimer(callback,Math.min(delay,1));
window.eval(source);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
const css=window.document.getElementById('pst-opportunities-filter-polish-v1-css')?.textContent||'';
assert(css.includes('#pst-opportunities-focus:has(#pst-opp-v4-map) #pst-pcw-lifecycle-tabs'),'Legacy map stays visible until the replacement exists');
assert.equal(window.document.querySelector('#pst-opp-v4-map'),null,'New map has not loaded before its owner');

// Wait longer than the old compressed 120-attempt readiness window.
await new Promise(resolve=>setTimeout(resolve,180));
window.PSTProjectCentricWorkflowV1={_state:{rows:[],source:'all',lifecycle:'all'},_test:{},renderOpportunities(){}};
await new Promise(resolve=>setTimeout(resolve,40));

assert.equal(window.document.querySelectorAll('#pst-opp-v4-map').length,1,'Mindmap owner still activates after the old startup timeout');
assert.equal(window.document.querySelectorAll('[data-pst-opp-back]').length,1,'Late activation restores one Kthehu control');
assert.equal(window.document.querySelectorAll('#pst-opportunities-filter-polish-v1-css').length,1,'One stylesheet remains');
window.close();
console.log('Opportunities deterministic late-owner fallback smoke passed.');
